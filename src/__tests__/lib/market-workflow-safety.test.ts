// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { stableWorkflowInput } from "@/domain/workflows/recipes";
import { Prisma } from "@prisma/client";
import { marketListingInputSchema, type MarketListingInput } from "@/contracts/marketplace";
import { MarketRuleError } from "@/domain/marketplace/order";
import type { DbTransaction } from "@/lib/db";
import { workflowDefinitionSchema } from "@/contracts/workflow";

const mocks = vi.hoisted(() => ({
  events: [] as string[], unified: false,
  db: {
    user: { findFirst: vi.fn() },
    workflow: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    marketListing: { findFirst: vi.fn(), findUnique: vi.fn() },
    workflowRun: { findFirst: vi.fn(), create: vi.fn(), findUniqueOrThrow: vi.fn(), findMany: vi.fn() },
    workflowNodeRun: { createMany: vi.fn() },
    auditLog: { findMany: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(), $transaction: vi.fn(),
  }, debit: vi.fn(), listingCreate: vi.fn(), listingSubmit: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/server/marketplace/listings", () => ({ createMarketListing: mocks.listingCreate, submitMarketListing: mocks.listingSubmit }));
vi.mock("@/server/growth/service", () => ({ safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/server/integrations/metered-cost", () => ({ unifiedModelBilling: () => mocks.unified }));
vi.mock("@/server/quota/service", async importOriginal => ({ ...await importOriginal<typeof import("@/server/quota/service")>(), debitQuota: mocks.debit }));
import { readReviewedWorkflow, assertMarketWorkflowBinding, workflowDefinitionHash } from "@/server/marketplace/workflow-binding";
import { runMarketWorkflow, listMarketWorkflowRuns, marketWorkflowDetails, runReviewedRecipe, listReviewedRecipeRuns, uploadWorkflowToMarket } from "@/server/marketplace/workflows";
import { RESUME_WORKFLOW_DEFINITION } from "@/domain/workflows/recipes";
import { createWorkflowRun } from "@/server/workflows/service";

const definition = workflowDefinitionSchema.parse({ version: 1, maxNodes: 2, nodes: [{ id: "copy", type: "template", label: "Own input", config: { template: "{{input.topic}}" } }, { id: "result", type: "output", label: "Result" }], edges: [{ id: "copy-result", from: "copy", to: "result" }] });
const v1 = { id: "version-one", version: 1, definition, createdAt: new Date("2026-10-01T00:00:00Z") };
let workflow: { id: string; slug: string; authorId: string; status: string; isOfficial: boolean; publishedVersion: number | null; estimatedCost: number; title: string; summary?: string | null; description?: string | null; versions: (typeof v1)[] };
let listing: { id: string; sellerId: string; status: string; publishedVersion: number; versions: { version: number; payload: Record<string, unknown> }[] };
const binding = () => ({ workflowId: "workflow-one", versionId: "version-one", version: 1, definitionHash: workflowDefinitionHash(definition) });
const request = () => ({ expectedVersion: 3, acknowledged: true, input: { topic: "Actual owner input" }, idempotencyKey: "safe-request-001" });
const tx = mocks.db as unknown as DbTransaction;
beforeEach(() => {
  vi.resetAllMocks(); mocks.events.length = 0; mocks.unified = false;
  vi.stubEnv("ANS_PROJECT_WORKER_DISABLED", "false"); vi.stubEnv("ANS_APIC_BILLING_ENABLED", "0");
  workflow = { id: "workflow-one", slug: "personal-recipe", authorId: "seller", status: "PUBLISHED", isOfficial: false, publishedVersion: 1, estimatedCost: 2, title: "My workflow", versions: [v1] };
  listing = { id: "listing-one", sellerId: "seller", status: "PUBLISHED", publishedVersion: 3, versions: [{ version: 3, payload: { slug: "personal-workflow", title: "My workflow", summary: "Reusable workflow based on real personal input", description: "A reusable reviewed workflow producing a recorded output.", category: "web", subcategory: "applications", fulfillment: "resource", priceMinor: 0, currency: "CNY", deliveryDays: 1, revisionLimit: 0, computeIncluded: false, deliverables: ["Recorded output"], licenseTerms: "Personal use under the author's license terms.", execution: binding() } }] };
  mocks.db.user.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === "seller" || where.id === "buyer" ? { id: where.id, role: "USER", adminPermissions: [] } : null);
  mocks.db.workflow.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
    if (where.id) return where.id === workflow.id && (where.authorId === undefined || where.authorId === workflow.authorId) && workflow.status === "PUBLISHED" && !workflow.isOfficial && workflow.publishedVersion !== null ? workflow : null;
    return where.slug === workflow.slug && workflow.status === "PUBLISHED" ? workflow : null;
  });
  mocks.db.marketListing.findFirst.mockImplementation(async ({ where }: { where: { id: string; publishedVersion?: number } }) => where.id === listing.id && listing.status === "PUBLISHED" && (where.publishedVersion === undefined || where.publishedVersion === listing.publishedVersion) ? listing : null);
  mocks.db.auditLog.findMany.mockResolvedValue([{ createdAt: new Date("2026-10-02T00:00:00Z"), after: { status: "PUBLISHED", publishedVersion: 1, versionId: v1.id } }]);
  mocks.db.workflow.findUnique.mockImplementation(async ({ where }: { where: { slug: string } }) => where.slug === workflow.slug ? { id: workflow.id, authorId: workflow.authorId } : null);
  mocks.db.workflowRun.findFirst.mockResolvedValue(null);
  mocks.db.workflowRun.create.mockImplementation(async ({ data }) => { mocks.events.push("create"); return { id: "run-one", ...data }; });
  mocks.db.workflowRun.findUniqueOrThrow.mockResolvedValue({ id: "run-one", status: "QUEUED", costPoints: 2 });
  mocks.db.workflowRun.findMany.mockResolvedValue([]);
  mocks.db.$transaction.mockImplementation(async (callback: (db: typeof mocks.db) => unknown) => callback(mocks.db));
  mocks.db.$queryRaw.mockImplementation(async (strings: TemplateStringsArray) => { mocks.events.push(strings.join("?").includes("market_listings") ? "lock-listing" : "lock-workflow"); return []; });
  mocks.debit.mockImplementation(async () => { mocks.events.push("debit"); });
});
afterEach(() => vi.unstubAllEnvs());

describe("reviewed version-bound market workflow", () => {
  it.each(["other-author", "DRAFT", "official", "no-published"])("rejects an unavailable or private source: %s", mode => {
    if (mode === "other-author") workflow.authorId = "another-author";
    if (mode === "DRAFT") workflow.status = "DRAFT";
    if (mode === "official") workflow.isOfficial = true;
    if (mode === "no-published") workflow.publishedVersion = null;
    return expect(readReviewedWorkflow(tx, workflow.id, "seller")).rejects.toMatchObject({ code: "WORKFLOW_NOT_AVAILABLE" });
  });
  it("requires the seller to be active and never queries a source for a forbidden actor", async () => {
    await expect(readReviewedWorkflow(tx, workflow.id, "missing")).rejects.toMatchObject({ code: "ACCOUNT_UNAVAILABLE" });
    expect(mocks.db.workflow.findFirst).not.toHaveBeenCalled();
  });
  it("does not treat self-publication or an AI PASS as a manual approval", async () => {
    mocks.db.auditLog.findMany.mockResolvedValue([]);
    await expect(readReviewedWorkflow(tx, workflow.id, "seller")).rejects.toMatchObject({ code: "WORKFLOW_REVIEW_REQUIRED" });
    expect(mocks.db.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ action: "WORKFLOW_APPROVED", resourceId: workflow.id }) }));
  });
  it("accepts historical manual approval only for the version latest at its timestamp", async () => {
    mocks.db.auditLog.findMany.mockResolvedValue([{ createdAt: new Date("2026-10-02T00:00:00Z"), after: { status: "PUBLISHED" } }]);
    await expect(readReviewedWorkflow(tx, workflow.id, "seller")).resolves.toMatchObject({ version: { id: v1.id } });
    workflow.versions.push({ ...v1, id: "version-two", version: 2, createdAt: new Date("2026-10-03T00:00:00Z") }); workflow.publishedVersion = 2;
    await expect(readReviewedWorkflow(tx, workflow.id, "seller")).rejects.toMatchObject({ code: "WORKFLOW_REVIEW_REQUIRED" });
  });
  it.each(["versionId", "version", "definitionHash"])("rejects a changed immutable binding field: %s", field => {
    const changed = { ...binding(), [field]: field === "version" ? 2 : "other" };
    return expect(assertMarketWorkflowBinding(tx, "seller", changed)).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  });
  it("hashes JSONB reordered keys consistently and detects changed content", async () => {
    const reordered = workflowDefinitionSchema.parse({ edges: definition.edges.map(e => ({ mapping: e.mapping, to: e.to, from: e.from, id: e.id })), nodes: definition.nodes.map(n => ({ maxRetries: n.maxRetries, timeoutMs: n.timeoutMs, config: n.config, label: n.label, type: n.type, id: n.id })), maxNodes: definition.maxNodes, version: 1 });
    expect(workflowDefinitionHash(reordered)).toBe(workflowDefinitionHash(definition));
    workflow.versions = [{ ...v1, definition: reordered }];
    await expect(assertMarketWorkflowBinding(tx, "seller", binding())).resolves.toMatchObject({ version: { id: v1.id } });
    workflow.versions = [{ ...v1, definition: { ...definition, nodes: definition.nodes.map(n => ({ ...n, label: "Changed" })) } }];
    await expect(assertMarketWorkflowBinding(tx, "seller", binding())).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  });
});

describe("explicit charged run and recovery", () => {
  it.each([false, undefined])("requires an explicit acknowledgement (%s) before reads/writes", acknowledged => {
    return expect(runMarketWorkflow(listing.id, "buyer", { ...request(), acknowledged })).rejects.toThrow().then(() => { expect(mocks.db.workflowRun.create).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled(); });
  });
  it("rejects an inactive actor before enqueue or debit", async () => {
    await expect(runMarketWorkflow(listing.id, "missing", request())).rejects.toMatchObject({ code: "ACCOUNT_UNAVAILABLE" });
    expect(mocks.db.marketListing.findFirst).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("rejects a stale listing version without consuming compute", async () => {
    await expect(runMarketWorkflow(listing.id, "buyer", { ...request(), expectedVersion: 2 })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("does not silently move a listing to the author's newly published workflow version", async () => {
    workflow.versions.push({ ...v1, id: "version-two", version: 2 }); workflow.publishedVersion = 2;
    mocks.db.auditLog.findMany.mockResolvedValue([{ createdAt: new Date("2026-10-02"), after: { status: "PUBLISHED", publishedVersion: 2 } }]);
    await expect(runMarketWorkflow(listing.id, "buyer", request())).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("locks and rechecks listing/source inside the same transaction before creating and debiting", async () => {
    await expect(runMarketWorkflow(listing.id, "buyer", request())).resolves.toMatchObject({ run: { id: "run-one", costPoints: 2 }, listingVersion: 3, workflowVersion: 1 });
    expect(mocks.events).toEqual(["lock-listing", "lock-workflow", "lock-workflow", "create", "debit"]);
    expect(mocks.db.workflowRun.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "buyer", workflowId: workflow.id, versionId: v1.id, costPoints: 2, input: request().input, idempotencyKey: "market/listing-one/3/personal-recipe/safe-request-001" }) });
    expect(mocks.debit).toHaveBeenCalledWith(mocks.db, expect.objectContaining({ userId: "buyer", costPoints: 2, ref: { type: "workflow_run", id: "run-one" } }));
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId: "buyer", metadata: expect.objectContaining({ source: "market" }) }) }));
  });
  it("rejects a withdrawal between preflight and transaction before debit", async () => {
    mocks.db.$queryRaw.mockImplementation(async () => { listing.status = "WITHDRAWN"; return []; });
    await expect(runMarketWorkflow(listing.id, "buyer", request())).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect(mocks.db.workflowRun.create).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("rejects a worker outage and client-supplied prices rather than queueing unexecutable work", async () => {
    vi.stubEnv("ANS_PROJECT_WORKER_DISABLED", "true");
    await expect(runMarketWorkflow(listing.id, "buyer", request())).rejects.toMatchObject({ code: "WORKER_UNAVAILABLE" });
    vi.stubEnv("ANS_PROJECT_WORKER_DISABLED", "false");
    await expect(runMarketWorkflow(listing.id, "buyer", { ...request(), costPoints: 0 })).rejects.toThrow();
    expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("recovers the same run without debit when the key and canonical input match", async () => {
    mocks.db.workflowRun.findFirst.mockResolvedValue({ id: "existing", status: "RUNNING", costPoints: 2, versionId: v1.id, input: { nested: { b: 2, a: 1 }, topic: "Input" } });
    const raw = { ...request(), input: { topic: "Input", nested: { a: 1, b: 2 } } };
    await expect(runMarketWorkflow(listing.id, "buyer", raw)).resolves.toMatchObject({ run: { id: "existing" } });
    expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.db.workflowRun.create).not.toHaveBeenCalled();
  });
  it.each(["input", "version"])("rejects same-key changed %s without debit", async changed => {
    mocks.db.workflowRun.findFirst.mockResolvedValue({ id: "existing", status: "SUCCEEDED", costPoints: 2, versionId: changed === "version" ? "other-version" : v1.id, input: changed === "input" ? { topic: "Other input" } : request().input });
    await expect(runMarketWorkflow(listing.id, "buyer", request())).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("server run creation independently rejects a wrong expected immutable version", async () => {
    await expect(createWorkflowRun(workflow.slug, "buyer", { input: request().input, idempotencyKey: request().idempotencyKey }, { expectedVersionId: "other-version", expectedInput: true })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect(mocks.debit).not.toHaveBeenCalled();
  });
  it.each([{}, { topic: "   " }])("HR08 rejects missing generic input at the market boundary without enqueue/debit: %j", async input => {
    await expect(runMarketWorkflow(listing.id, "buyer", { ...request(), input })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(mocks.db.workflowRun.create).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled();
  });
  it.each([{}, { topic: "   " }])("HR08 rejects missing generic input in the run service without enqueue/debit: %j", async input => {
    await expect(createWorkflowRun(workflow.slug, "buyer", { input, idempotencyKey: request().idempotencyKey }, { expectedVersionId: v1.id, expectedInput: true })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(mocks.db.workflowRun.create).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("recovers a unique-key enqueue race after the transaction loses without another debit", async () => {
    const existing = { id: "concurrent-run", status: "QUEUED", costPoints: 2, versionId: v1.id, input: request().input };
    mocks.db.workflowRun.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    mocks.db.workflowRun.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Unique run key", { code: "P2002", clientVersion: "test" }));
    await expect(runMarketWorkflow(listing.id, "buyer", request())).resolves.toMatchObject({ run: { id: "concurrent-run" } });
    expect(mocks.db.workflowRun.create).toHaveBeenCalledTimes(1); expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("GET-like listing details never create a run and keep metered cost unknown instead of free", async () => {
    mocks.unified = true;
    const view = { seller: { id: "seller" }, listing: listing.versions[0].payload as never };
    await expect(marketWorkflowDetails(view)).resolves.toMatchObject({ available: true, estimatedCost: null, version: 1 });
    expect(mocks.db.workflowRun.create).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("history is owner-scoped and exposes neither incomplete output nor private error detail", async () => {
    mocks.db.workflowRun.findMany.mockResolvedValue([{ id: "failed", status: "FAILED", costPoints: 2, error: "PRIVATE_ERROR", output: { private: true }, createdAt: new Date("2026-10-12"), version: { version: 1 } }, { id: "complete", status: "SUCCEEDED", costPoints: 2, error: null, output: "Actual result", createdAt: new Date("2026-10-12"), version: { version: 1 } }]);
    const result = await listMarketWorkflowRuns(listing.id, "buyer");
    expect(mocks.db.workflowRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "buyer", idempotencyKey: { startsWith: "market/listing-one/" } } }));
    expect(result.runs[0]).toMatchObject({ output: null, error: "EXECUTION_FAILED" });
    expect(result.runs[1]).toMatchObject({ output: "Actual result" });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_ERROR"); expect(mocks.debit).not.toHaveBeenCalled();
  });
});

const resumeProfile = { fullName: "Fixture Author", headline: "Personal work", about: "My experience", location: "", email: "", contactUrl: "", education: "", skills: [], projects: [{ name: "Own project", role: "Author", description: "My contribution", url: "" }], style: "minimal", accent: "emerald", language: "en" };
function recipeRequest() { return { expectedVersion: 1, acknowledged: true, input: { profile: resumeProfile }, idempotencyKey: "recipe-request-001" }; }
describe("direct reviewed recipe Hub execution", () => {
  beforeEach(() => { workflow.versions = [{ ...v1, definition: structuredClone(RESUME_WORKFLOW_DEFINITION) }]; });
  it("HR09 rejects fixed recipes from the old unconfirmed run entry before enqueue/debit", async () => {
    await expect(createWorkflowRun(workflow.slug, "buyer", { input: { profile: resumeProfile }, idempotencyKey: "legacy-recipe-001" })).rejects.toMatchObject({ code: "RECIPE_CONFIRMATION_REQUIRED" });
    expect(mocks.db.workflowRun.create).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("locks the reviewed recipe before exact-version enqueue and original quota debit", async () => {
    await expect(runReviewedRecipe(workflow.slug, "buyer", recipeRequest())).resolves.toMatchObject({ run: { id: "run-one" } });
    expect(mocks.events).toEqual(["lock-workflow", "lock-workflow", "create", "debit"]);
    expect(mocks.db.workflowRun.create).toHaveBeenCalledWith({ data: expect.objectContaining({ versionId: v1.id, userId: "buyer", input: { profile: resumeProfile }, idempotencyKey: "reviewed/workflow-one/1/personal-recipe/recipe-request-001" }) });
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining({ source: "reviewed_workflow", confirmationScope: "reviewed/workflow-one/1" }) }) }));
  });
  it.each(["unacknowledged", "actor", "version", "review", "graph"])("rejects direct recipe %s failure without compute debit", async reason => {
    const raw = recipeRequest(); let actor = "buyer";
    if (reason === "unacknowledged") Object.assign(raw, { acknowledged: false });
    if (reason === "actor") actor = "missing";
    if (reason === "version") raw.expectedVersion = 2;
    if (reason === "review") mocks.db.auditLog.findMany.mockResolvedValue([]);
    if (reason === "graph") workflow.versions = [v1];
    await expect(runReviewedRecipe(workflow.slug, actor, raw)).rejects.toThrow();
    expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.db.workflowRun.create).not.toHaveBeenCalled();
  });
  it("rejects a changed source state discovered under the row lock", async () => {
    mocks.db.$queryRaw.mockImplementation(async () => { workflow.status = "DRAFT"; return []; });
    await expect(runReviewedRecipe(workflow.slug, "buyer", recipeRequest())).rejects.toMatchObject({ code: "WORKFLOW_NOT_AVAILABLE" });
    expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("direct recipe same-key changed personal facts is not a second charge", async () => {
    mocks.db.workflowRun.findFirst.mockResolvedValue({ id: "existing", versionId: v1.id, input: { profile: { ...resumeProfile, fullName: "Different author" } } });
    await expect(runReviewedRecipe(workflow.slug, "buyer", recipeRequest())).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("direct recipe history is owner-only, source scoped, and read-only", async () => {
    await expect(listReviewedRecipeRuns(workflow.slug, "buyer")).resolves.toEqual({ runs: [] });
    expect(mocks.db.workflowRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "buyer", idempotencyKey: { startsWith: "reviewed/workflow-one/" } } }));
    expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.db.workflowRun.create).not.toHaveBeenCalled();
    await expect(listReviewedRecipeRuns(workflow.slug, "missing")).rejects.toMatchObject({ code: "ACCOUNT_UNAVAILABLE" });
    expect(mocks.db.workflowRun.findMany).toHaveBeenCalledTimes(1);
  });
});

const uploadRequest = { expectedWorkflowVersion: 1, category: "web", subcategory: "applications", licenseTerms: "Author allows personal workflow use." };
describe("workflow upload metadata and duplicate recovery (HR05)", () => {
  beforeEach(() => {
    mocks.db.marketListing.findUnique.mockResolvedValue(null);
    mocks.listingCreate.mockImplementation(async (_actor: string, payload: MarketListingInput) => {
      marketListingInputSchema.parse(payload);
      return { id: "created-listing", slug: payload.slug };
    });
    mocks.listingSubmit.mockResolvedValue({ id: "created-listing", status: "PENDING" });
  });
  it.each([
    { title: "A", summary: null, description: null },
    { title: "Personal workflow", summary: " ", description: " " },
    { title: "Personal workflow", summary: "Own", description: "Own" },
  ])("creates only a real pending listing with factual instructions for sparse metadata: %j", async metadata => {
    Object.assign(workflow, metadata);
    await expect(uploadWorkflowToMarket(workflow.slug, "seller", uploadRequest)).resolves.toMatchObject({ id: "created-listing", status: "PENDING" });
    const payload = mocks.listingCreate.mock.calls[0][1];
    expect(marketListingInputSchema.safeParse(payload).success).toBe(true);
    expect(payload).toMatchObject({ priceMinor: 0, computeIncluded: false, execution: binding() });
    expect(payload.title).toContain(metadata.title); expect(payload.summary).toContain("v1");
    expect(mocks.listingSubmit).toHaveBeenCalledWith("created-listing", "seller", 1);
    expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.db.workflowRun.create).not.toHaveBeenCalled();
  });
  it("concurrent upload conflict recovers the same pending listing without a duplicate submission", async () => {
    let stored: { id: string; slug: string; sellerId: string; currentVersion: number; status: string; versions: { version: number; payload: MarketListingInput; submittedAt: Date | null; reviewedAt: null }[] } | null = null;
    mocks.db.marketListing.findUnique.mockImplementation(async () => stored);
    mocks.listingCreate.mockImplementation(async (_actor: string, payload: MarketListingInput) => {
      if (stored) throw new MarketRuleError("SLUG_TAKEN", 409);
      stored = { id: "only-listing", slug: payload.slug, sellerId: "seller", currentVersion: 1, status: "DRAFT", versions: [{ version: 1, payload: marketListingInputSchema.parse(payload), submittedAt: null, reviewedAt: null }] };
      return stored;
    });
    mocks.listingSubmit.mockImplementation(async () => { if (stored) { stored.status = "PENDING"; stored.versions[0].submittedAt = new Date(); } });
    const results = await Promise.all([uploadWorkflowToMarket(workflow.slug, "seller", uploadRequest), uploadWorkflowToMarket(workflow.slug, "seller", uploadRequest)]);
    expect(results.map(result => result.id)).toEqual(["only-listing", "only-listing"]);
    expect(mocks.listingCreate).toHaveBeenCalledTimes(2); expect(mocks.listingSubmit).toHaveBeenCalledTimes(1);
    expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.db.workflowRun.create).not.toHaveBeenCalled();
  });
});

it("history returns only a fingerprint of the normalized source facts for safe copy adoption",async()=>{
 mocks.db.workflowRun.findMany.mockResolvedValue([{id:"done",status:"SUCCEEDED",input:{profile:resumeProfile},costPoints:2,error:null,output:"Result",createdAt:new Date("2026-10-12"),version:{version:1}}]);
 const result=await listMarketWorkflowRuns(listing.id,"buyer");
 expect(result.runs[0].inputFingerprint).toBe(createHash("sha256").update(stableWorkflowInput({profile:resumeProfile})).digest("hex"));
 expect(JSON.stringify(result)).not.toContain("My experience");expect(result.runs[0]).not.toHaveProperty("input");
});
