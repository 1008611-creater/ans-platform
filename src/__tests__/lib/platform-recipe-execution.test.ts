// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DbTransaction } from "@/lib/db";
import { workflowDefinitionSchema } from "@/contracts/workflow";
import { PLATFORM_RESUME_RECIPE as recipe } from "@/domain/workflows/platform-recipes";
const mocks = vi.hoisted(() => ({
  events: [] as string[], onTransaction: null as (() => void) | null,
  debit: vi.fn(),
  db: {
    user: { findFirst: vi.fn() }, project: { findFirst: vi.fn() },
    workflow: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    marketListing: { findFirst: vi.fn() },
    auditLog: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    workflowRun: { findFirst: vi.fn(), create: vi.fn(), findUniqueOrThrow: vi.fn() },
    workflowNodeRun: { createMany: vi.fn() }, $transaction: vi.fn(), $queryRaw: vi.fn(),
  },
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/server/growth/service", () => ({ safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/server/integrations/metered-cost", () => ({ unifiedModelBilling: () => false }));
vi.mock("@/server/quota/service", async importOriginal => ({ ...await importOriginal<typeof import("@/server/quota/service")>(), debitQuota: mocks.debit }));
import { createWorkflowRun } from "@/server/workflows/service";
import { runMarketWorkflow, runReviewedRecipe } from "@/server/marketplace/workflows";
const owner = () => ({ id: "owner", role: "ADMIN", deletedAt: null as Date | null, flagged: false, adminPermissions: ["MARKETPLACE_MANAGE"], username: "owner", nickname: "Owner", avatar: null });
const makeWorkflow = () => ({ id: "recipe-workflow", slug: recipe.slug as string, officialId: recipe.officialId as string, isOfficial: true, authorId: "owner", author: owner(), versions: [{ id: "recipe-version", workflowId: "recipe-workflow", version: 1, createdById: "owner", definition: structuredClone(recipe.definition), createdAt: new Date("2026-10-12T00:00:00Z") }], title: recipe.title, summary: recipe.summary, description: recipe.description, status: "PUBLISHED", publishedVersion: 1, estimatedCost: recipe.estimatedCost });
const registration = () => ({ id: "actual-attestation", actorId: "owner", action: "PLATFORM_RECIPE_REGISTERED", resourceType: "workflow", resourceId: "recipe-workflow", metadata: { officialId: recipe.officialId, workflowId: "recipe-workflow", ownerId: "owner", version: 1, versionId: "recipe-version", definitionHash: recipe.definitionHash, sourceCodeHash: recipe.sourceCodeHash } });
const makeListing = () => ({ id: "recipe-listing", sellerId: "owner", official: true, status: "PUBLISHED", publishedVersion: 1, versions: [{ version: 1, reviewedAt: new Date(), payload: { slug: "bound-resume", title: recipe.title, summary: recipe.summary, description: recipe.description, category: "career", subcategory: "portfolio", fulfillment: "resource", currency: "CNY", priceMinor: 0, deliveryDays: 1, revisionLimit: 0, computeIncluded: false, licenseTerms: "Use your own authorized personal information.", deliverables: ["HTML"], execution: { workflowId: "recipe-workflow", versionId: "recipe-version", version: 1, definitionHash: recipe.definitionHash as string } } }] });
const profile = { fullName: "Personal Owner", headline: "Student", about: "My provided experience", location: "", email: "", contactUrl: "", education: "", skills: [], projects: [{ name: "Personal project", role: "author", description: "My own work", url: "" }], style: "editorial", accent: "emerald", language: "zh" };
const input = () => ({ input: { profile }, idempotencyKey: "own-confirmed-001" });
const options = () => ({ expectedInput: true, expectedVersionId: "recipe-version", confirmedSource: "reviewed_workflow" as const, idempotencyScope: "reviewed/recipe-workflow/1", beforeCreate: async () => undefined });
let workflow: ReturnType<typeof makeWorkflow>;
let attestation: ReturnType<typeof registration> | null;
let listing: ReturnType<typeof makeListing>;
beforeEach(() => {
  vi.resetAllMocks(); mocks.events.length = 0; mocks.onTransaction = null;
  vi.stubEnv("ANS_PROJECT_WORKER_DISABLED", "false"); vi.stubEnv("ANS_APIC_BILLING_ENABLED", "0");
  workflow = makeWorkflow(); attestation = registration(); listing = makeListing();
  mocks.db.user.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === "owner" || where.id === "buyer" ? { id: where.id, role: where.id === "owner" ? "ADMIN" : "USER", adminPermissions: ["MARKETPLACE_MANAGE"] } : null);
  mocks.db.workflow.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
    if (where.isOfficial === false) return null;
    if (where.OR) return workflow;
    return where.slug === workflow.slug || where.id === workflow.id ? workflow : null;
  });
  mocks.db.workflow.findUnique.mockImplementation(async () => ({ id: workflow.id, authorId: workflow.authorId }));
  mocks.db.auditLog.findFirst.mockImplementation(async () => attestation);
  mocks.db.project.findFirst.mockResolvedValue({ id: "owned-project" });
  mocks.db.marketListing.findFirst.mockImplementation(async ({ where }: { where: { id: string; status: string; publishedVersion?: number } }) => where.id === listing.id && listing.status === "PUBLISHED" && (where.publishedVersion === undefined || where.publishedVersion === listing.publishedVersion) ? listing : null);
  mocks.db.workflowRun.findFirst.mockResolvedValue(null);
  mocks.db.workflowRun.create.mockImplementation(async ({ data }: { data: unknown }) => { mocks.events.push("create"); return { id: "run-real", ...(data as object) }; });
  mocks.debit.mockImplementation(async () => { mocks.events.push("debit"); });
  mocks.db.workflowRun.findUniqueOrThrow.mockResolvedValue({ id: "run-real", status: "QUEUED", costPoints: 2 });
  mocks.db.$queryRaw.mockImplementation(async () => []);
  mocks.db.$transaction.mockImplementation(async (fn: (tx: DbTransaction) => unknown) => { mocks.onTransaction?.(); return fn(mocks.db as unknown as DbTransaction); });
});
afterEach(() => vi.unstubAllEnvs());
const noDebit = () => { expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.db.workflowRun.create).not.toHaveBeenCalled(); };
describe("real registered recipe execution chain", () => {
  it("rejects project-link bypass for managed recipe before debit", async () => {
    await expect(createWorkflowRun(recipe.slug, "buyer", input(), { ...options(), projectId: "owned-project" })).rejects.toMatchObject({ code: "PROJECT_LINK_NOT_SUPPORTED" }); noDebit();
  });
  it.each(["expectedInput", "confirmedSource", "expectedVersionId", "beforeCreate", "idempotencyScope"])("requires all explicit confirmation fields: %s", async key => {
    const missing = { ...options(), [key]: undefined };
    await expect(createWorkflowRun(recipe.slug, "buyer", input(), missing)).rejects.toMatchObject({ code: "PROJECT_LINK_REQUIRED" }); noDebit();
  });
  it.each(["reviewed/other-workflow/1", "reviewed/recipe-workflow/2", "market/recipe-listing/1"])("rejects mismatched reviewed source scope %s", async idempotencyScope => {
    await expect(createWorkflowRun(recipe.slug, "buyer", input(), { ...options(), idempotencyScope })).rejects.toMatchObject({ code: "INVALID_RUN_SOURCE" }); noDebit();
  });
  it("creates run/node records with confirmed scope and one actual quota debit", async () => {
    await expect(createWorkflowRun(recipe.slug, "buyer", input(), options())).resolves.toMatchObject({ id: "run-real", costPoints: 2 });
    expect(mocks.events).toEqual(["create", "debit"]);
    expect(mocks.debit).toHaveBeenCalledTimes(1);
    expect(mocks.db.workflowRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "buyer", workflowId: workflow.id, versionId: "recipe-version", input: { profile }, idempotencyKey: `reviewed/recipe-workflow/1/${recipe.slug}/own-confirmed-001` }) }));
    expect(mocks.db.workflowNodeRun.createMany.mock.calls[0][0].data).toHaveLength(2);
  });
  it.each(["audit", "owner-deleted", "owner-permission", "hash", "version"])("rejects source change in transaction before debit: %s", async mode => {
    mocks.onTransaction = () => {
      if (mode === "audit") attestation = null;
      if (mode === "owner-deleted") workflow.author.deletedAt = new Date();
      if (mode === "owner-permission") workflow.author.adminPermissions = [];
      if (mode === "hash") workflow.versions[0].definition.nodes[0].timeoutMs = 1234;
      if (mode === "version") workflow.publishedVersion = 2;
    };
    await expect(createWorkflowRun(recipe.slug, "buyer", input(), options())).rejects.toMatchObject({ code: "VERSION_CONFLICT" }); noDebit();
  });
  it("actual Hub recipe entry validates registration then queues confirmed own input", async () => {
    await runReviewedRecipe(recipe.slug, "buyer", { expectedVersion: 1, acknowledged: true, ...input() });
    expect(mocks.debit).toHaveBeenCalledTimes(1);
  });
  it("actual market entry validates source/review/version then queues with listing scope", async () => {
    await runMarketWorkflow(listing.id, "buyer", { expectedVersion: 1, acknowledged: true, ...input() });
    expect(mocks.debit).toHaveBeenCalledTimes(1);
    expect(mocks.db.workflowRun.create.mock.calls[0][0].data.idempotencyKey).toBe(`market/recipe-listing/1/${recipe.slug}/own-confirmed-001`);
  });
  it.each(["listing-withdrawn", "listing-version", "listing-binding", "owner-permission", "attestation"])("actual market chain rechecks transaction change %s before debit", async mode => {
    mocks.onTransaction = () => {
      if (mode === "listing-withdrawn") listing.status = "WITHDRAWN";
      if (mode === "listing-version") listing.publishedVersion = 2;
      if (mode === "listing-binding") listing.versions[0].payload.execution.definitionHash = "b".repeat(64);
      if (mode === "owner-permission") workflow.author.adminPermissions = [];
      if (mode === "attestation") attestation = null;
    };
    await expect(runMarketWorkflow(listing.id, "buyer", { expectedVersion: 1, acknowledged: true, ...input() })).rejects.toThrow(); noDebit();
  });
  it("direct source cannot relabel a reviewed scope as market", async () => {
    await expect(createWorkflowRun(recipe.slug, "buyer", input(), { ...options(), confirmedSource: "market" })).rejects.toMatchObject({ code: "INVALID_RUN_SOURCE" }); noDebit();
  });
  it("market scope cannot claim another unrelated listing even with a no-op callback", async () => {
    await expect(createWorkflowRun(recipe.slug, "buyer", input(), { ...options(), confirmedSource: "market", idempotencyScope: "market/other-listing/1" })).rejects.toMatchObject({ code: "VERSION_CONFLICT" }); noDebit();
  });
  it("keeps existing project-linked official workflow execution without new registration", async () => {
    workflow.slug = "legacy-project-workflow";
    workflow.officialId = "legacy-project-v1";
    workflow.versions[0].definition = workflowDefinitionSchema.parse({ version: 1, maxNodes: 1, nodes: [{ id: "output", type: "output", label: "Existing output" }], edges: [] });
    attestation = null;
    await createWorkflowRun(workflow.slug, "buyer", { input: {}, idempotencyKey: "legacy-project-001" }, { projectId: "owned-project", expectedVersionId: "recipe-version" });
    expect(mocks.debit).toHaveBeenCalledTimes(1);
    expect(mocks.db.auditLog.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.workflowRun.create.mock.calls[0][0].data.projectId).toBe("owned-project");
  });
});
