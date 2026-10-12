// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import type { DbTransaction } from "@/lib/db";
import { stableWorkflowInput } from "@/domain/workflows/recipes";
import { getPlatformRecipe, isPlatformRecipeMetadata, PLATFORM_RESUME_RECIPE as recipe } from "@/domain/workflows/platform-recipes";

const mocks = vi.hoisted(() => ({ db: {
  marketListing: { findUnique: vi.fn() },
  workflow: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  user: { findUnique: vi.fn() }, auditLog: { findFirst: vi.fn(), create: vi.fn() },
  $queryRaw: vi.fn(), $executeRaw: vi.fn(), $transaction: vi.fn(),
}, upload: vi.fn(), review: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/server/marketplace/workflows", () => ({ uploadWorkflowToMarket: mocks.upload }));
vi.mock("@/server/marketplace/listings", () => ({ reviewMarketListing: mocks.review }));
vi.mock("@/server/marketplace/shared", () => ({ marketHash: (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex") }));
import { findPublishedPlatformRecipe, readPlatformRecipe, registerPlatformResumeRecipe } from "@/server/workflows/platform-recipes";
import { parsePlatformRecipeArgs, verifyPlatformRecipeSource, publishPlatformResumeRecipe } from "../../../scripts/register-platform-resume-recipe";
const tx = mocks.db as unknown as DbTransaction;
const owner = () => ({ id: "real-owner", role: "ADMIN", deletedAt: null, flagged: false, adminPermissions: ["MARKETPLACE_MANAGE"], username: "owner", nickname: "Owner", avatar: null });
const version = () => ({ id: "fixed-v1", workflowId: "fixed-workflow", version: 1, createdById: "real-owner", definition: structuredClone(recipe.definition), createdAt: new Date("2026-10-12T00:00:00Z") });
const workflow = () => ({ id: "fixed-workflow", slug: recipe.slug, officialId: recipe.officialId, isOfficial: true, authorId: "real-owner", author: owner(), versions: [version()], status: "PUBLISHED", publishedVersion: 1, estimatedCost: 2, title: recipe.title, summary: recipe.summary, description: recipe.description });
const metadata = () => ({ officialId: recipe.officialId, workflowId: "fixed-workflow", ownerId: "real-owner", version: 1, versionId: "fixed-v1", definitionHash: recipe.definitionHash, sourceCodeHash: recipe.sourceCodeHash });
const audit = () => ({ id: "real-registration", actorId: "real-owner", action: "PLATFORM_RECIPE_REGISTERED", resourceType: "workflow", resourceId: "fixed-workflow", metadata: metadata() });
let row: ReturnType<typeof workflow> | null;
let evidence: ReturnType<typeof audit> | null;
beforeEach(() => {
  vi.resetAllMocks(); row = workflow(); evidence = audit();
  mocks.db.workflow.findFirst.mockImplementation(async () => row);
  mocks.db.workflow.findMany.mockResolvedValue([]);
  mocks.db.user.findUnique.mockResolvedValue(owner());
  mocks.db.auditLog.findFirst.mockImplementation(async () => evidence);
  mocks.db.workflow.create.mockImplementation(async () => row);
  mocks.db.auditLog.create.mockResolvedValue(audit());
  mocks.db.$transaction.mockImplementation(async (callback: (transaction: DbTransaction) => unknown) => callback(tx));
});
describe("source-reviewed platform recipe registry", () => {
  it("binds the exact canonical definition and LF-normalized committed renderer/input/prompt source", () => {
    const hash = (value: string) => createHash("sha256").update(value).digest("hex");
    expect(hash(stableWorkflowInput(recipe.definition))).toBe(recipe.definitionHash);
    for (const source of recipe.sourceFiles) expect(hash(readFileSync(source.path, "utf8").replace(/\r\n/g, "\n"))).toBe(source.sha256);
    expect(hash(stableWorkflowInput(recipe.sourceFiles))).toBe(recipe.sourceCodeHash);
    expect(recipe.definition.nodes).toHaveLength(2);
    expect(getPlatformRecipe(recipe.slug)).toBe(recipe);
    expect(getPlatformRecipe("official-anything")).toBeUndefined();
    expect(isPlatformRecipeMetadata(workflow())).toBe(true);
    expect(isPlatformRecipeMetadata({ ...workflow(), officialId: "legacy-official" })).toBe(false);
  });
  it("reads the exact registration by database ID without any writes", async () => {
    const value = await readPlatformRecipe(tx, "fixed-workflow", "real-owner");
    expect(value?.definition).toEqual(recipe.definition);
    expect(value?.version.id).toBe("fixed-v1");
    expect(value?.workflow.author).toEqual({ id: "real-owner", username: "owner", nickname: "Owner", avatar: null });
    expect(value?.workflow.author).not.toHaveProperty("adminPermissions");
    expect(mocks.db.workflow.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { OR: [{ id: "fixed-workflow" }, { slug: "fixed-workflow" }, { officialId: "fixed-workflow" }] } }));
    expect(mocks.db.workflow.create).not.toHaveBeenCalled();
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it.each(["officialId", "slug", "status", "isOfficial", "publishedVersion", "title", "summary", "description", "estimatedCost"])("fails closed on nonallowlisted %s", async key => {
    (row as unknown as Record<string, unknown>)[key] = key === "isOfficial" ? false : key === "publishedVersion" ? 2 : "invalid";
    expect(await readPlatformRecipe(tx, "fixed-workflow")).toBeNull();
  });
  it.each(["inactive", "flagged", "nonadmin", "no-permission"])("requires current active owner authority: %s", async mode => {
    if (mode === "inactive") row!.author.deletedAt = new Date() as unknown as null;
    if (mode === "flagged") row!.author.flagged = true;
    if (mode === "nonadmin") row!.author.role = "USER";
    if (mode === "no-permission") row!.author.adminPermissions = [];
    expect(await readPlatformRecipe(tx, "fixed-workflow")).toBeNull();
  });
  it("rejects changed graph even when metadata still claims its original hash", async () => {
    row!.versions[0].definition.nodes[0].timeoutMs = 80000;
    expect(await readPlatformRecipe(tx, "fixed-workflow")).toBeNull();
  });
  it("rejects extra versions, creator mismatch, and mismatched expected owner", async () => {
    row!.versions.push({ ...version(), id: "hidden-v2", version: 2 });
    expect(await readPlatformRecipe(tx, "fixed-workflow")).toBeNull();
    row = workflow(); row.versions[0].createdById = "other-author";
    expect(await readPlatformRecipe(tx, "fixed-workflow")).toBeNull();
    row = workflow();
    expect(await readPlatformRecipe(tx, "fixed-workflow", "other-owner")).toBeNull();
  });
  it("accepts JSONB reordered keys without weakening definition content binding", async () => {
    // Preserve nested objects: a recursive key reorder retains all fields and array order.
    const reorder = (value: unknown): unknown => Array.isArray(value) ? value.map(reorder) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reorder(child)])) : value;
    row!.versions[0].definition = reorder(recipe.definition) as typeof recipe.definition;
    expect(await readPlatformRecipe(tx, "fixed-workflow")).not.toBeNull();
  });
  it("rejects missing registration evidence", async () => {
    evidence = null; expect(await findPublishedPlatformRecipe()).toBeNull();
  });
  it.each(["officialId", "workflowId", "ownerId", "version", "versionId", "definitionHash", "sourceCodeHash"])("rejects stale or forged audit binding %s", async key => {
    (evidence!.metadata as unknown as Record<string, unknown>)[key] = "incorrect";
    expect(await readPlatformRecipe(tx, "fixed-workflow")).toBeNull();
  });
  it.each(["actorId", "resourceType", "resourceId", "action"])("rejects wrong audit identity %s", async key => {
    (evidence as unknown as Record<string, unknown>)[key] = "incorrect";
    expect(await readPlatformRecipe(tx, "fixed-workflow")).toBeNull();
  });
});
describe("explicit platform registration", () => {
  it("creates only real immutable platform source and provenance with no AI review claim", async () => {
    await registerPlatformResumeRecipe("real-owner");
    expect(mocks.db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(mocks.db.$executeRaw.mock.calls[0][0].join("?")).toContain("pg_advisory_xact_lock");
    expect(mocks.db.$queryRaw).toHaveBeenCalledTimes(2);
    const data = mocks.db.workflow.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ authorId: "real-owner", officialId: recipe.officialId, slug: recipe.slug, status: "PUBLISHED", publishedVersion: 1, estimatedCost: 2 });
    expect(data.reviewScore).toBeUndefined();
    expect(data.versions.create).toEqual({ version: 1, definition: recipe.definition, createdById: "real-owner" });
    expect(mocks.db.auditLog.create.mock.calls[0][0].data).toEqual({ actorId: "real-owner", action: "PLATFORM_RECIPE_REGISTERED", resourceType: "workflow", resourceId: "fixed-workflow", metadata: metadata() });
  });
  it("returns existing fully attested registration idempotently", async () => {
    mocks.db.workflow.findMany.mockResolvedValue([{ id: "fixed-workflow" }]);
    expect((await registerPlatformResumeRecipe("real-owner")).workflow.id).toBe("fixed-workflow");
    expect(mocks.db.workflow.create).not.toHaveBeenCalled();
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
  });
  it("does not fabricate evidence for preexisting unknown provenance", async () => {
    mocks.db.workflow.findMany.mockResolvedValue([{ id: "fixed-workflow" }]); evidence = null;
    await expect(registerPlatformResumeRecipe("real-owner")).rejects.toMatchObject({ code: "PLATFORM_RECIPE_REGISTRATION_CONFLICT" });
    expect(mocks.db.workflow.create).not.toHaveBeenCalled(); expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
  });
  it("rejects reserved identifier collision across two rows", async () => {
    mocks.db.workflow.findMany.mockResolvedValue([{ id: "slug-taken" }, { id: "official-taken" }]);
    await expect(registerPlatformResumeRecipe("real-owner")).rejects.toMatchObject({ code: "PLATFORM_RECIPE_REGISTRATION_CONFLICT" });
    expect(mocks.db.workflow.create).not.toHaveBeenCalled();
  });
  it.each([null, { ...owner(), role: "USER" }, { ...owner(), deletedAt: new Date() }, { ...owner(), flagged: true }, { ...owner(), adminPermissions: [] }])("rejects unauthorized registration actor %# before creation", async actor => {
    mocks.db.user.findUnique.mockResolvedValue(actor);
    await expect(registerPlatformResumeRecipe("real-owner")).rejects.toMatchObject({ code: "PLATFORM_RECIPE_OWNER_FORBIDDEN", status: 403 });
    expect(mocks.db.workflow.create).not.toHaveBeenCalled(); expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
  });
  it("fails the transaction if the newly read attestation cannot be verified", async () => {
    evidence = null;
    await expect(registerPlatformResumeRecipe("real-owner")).rejects.toMatchObject({ code: "PLATFORM_RECIPE_REGISTRATION_INVALID" });
  });
});

describe("authorized deployment CLI", () => {
  const listingSlug = "workflow-" + createHash("sha256").update(JSON.stringify("fixed-workflow")).digest("hex").slice(0, 24) + "-v1";
  const makeListing = () => ({
    id: "real-listing", slug: listingSlug, sellerId: "real-owner", official: true,
    currentVersion: 1, publishedVersion: null as number | null, status: "PENDING",
    versions: [{ version: 1, submittedAt: new Date(), reviewedAt: null as Date | null, reviewedById: null as string | null,
      payload: { slug: listingSlug, title: recipe.title, summary: recipe.summary, description: recipe.description, category: "career", subcategory: "portfolio", fulfillment: "resource", currency: "CNY", priceMinor: 0, deliveryDays: 1, revisionLimit: 0, computeIncluded: false, licenseTerms: "Only use your authorized personal information.", deliverables: ["HTML / resume-website-v1"], execution: { workflowId: "fixed-workflow", versionId: "fixed-v1", version: 1, definitionHash: recipe.definitionHash as string } },
    }],
  });
  let current: ReturnType<typeof makeListing> | null;
  beforeEach(() => {
    current = null;
    mocks.db.marketListing.findUnique.mockImplementation(async () => current);
    mocks.db.auditLog.findFirst.mockImplementation(async (query: { where: { resourceType: string } }) => query.where.resourceType === "workflow" ? evidence : { id: "published-record", actorId: "real-owner", resourceId: "real-listing", metadata: { version: 1 } });
    mocks.upload.mockImplementation(async () => { current ??= makeListing(); return { id: current.id }; });
    mocks.review.mockImplementation(async () => { current!.status = "PUBLISHED"; current!.publishedVersion = 1; current!.versions[0].reviewedAt = new Date(); current!.versions[0].reviewedById = "real-owner"; return current; });
  });
  it("requires an explicit existing owner argument, never defaults to first admin", () => {
    expect(parsePlatformRecipeArgs(["--owner-id", "real-owner"])).toEqual({ ownerId: "real-owner" });
    for (const args of [[], ["--owner-id", ""], ["--owner-id", " owner "], ["--other", "real-owner"], ["--owner-id", "real-owner", "--force"]]) expect(() => parsePlatformRecipeArgs(args)).toThrow();
  });
  it("verifies actual LF source bytes before registration and detects tampering", async () => {
    const directory = mkdtempSync(join(tmpdir(), "ans-platform-recipe-"));
    try {
      for (const source of recipe.sourceFiles) { const path = join(directory, source.path); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, readFileSync(source.path, "utf8").replace(/\r?\n/g, "\r\n")); }
      expect(verifyPlatformRecipeSource(directory)).toBe(recipe.sourceCodeHash);
      writeFileSync(join(directory, recipe.sourceFiles[1].path), "changed renderer");
      await expect(publishPlatformResumeRecipe("real-owner", directory)).rejects.toThrow("PLATFORM_RECIPE_SOURCE_CONFLICT");
      expect(mocks.db.$transaction).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled(); expect(mocks.review).not.toHaveBeenCalled();
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  it("submits and reviews the real bound official listing once", async () => {
    expect(await publishPlatformResumeRecipe("real-owner", process.cwd())).toMatchObject({ workflowId: "fixed-workflow", listingId: "real-listing", status: "PUBLISHED" });
    expect(mocks.upload).toHaveBeenCalledTimes(1); expect(mocks.review).toHaveBeenCalledTimes(1);
    expect(mocks.review).toHaveBeenCalledWith("real-listing", "real-owner", 1, true, expect.stringContaining(recipe.sourceCodeHash));
  });
  it("resumes already-submitted pending listing and never creates duplicate versions", async () => {
    current = makeListing();
    await publishPlatformResumeRecipe("real-owner", process.cwd());
    expect(mocks.review).toHaveBeenCalledTimes(1);
  });
  it("published repeat requires current binding and publication audit without re-review", async () => {
    current = makeListing(); current.status = "PUBLISHED"; current.publishedVersion = 1; current.versions[0].reviewedAt = new Date(); current.versions[0].reviewedById = "real-owner";
    await publishPlatformResumeRecipe("real-owner", process.cwd());
    expect(mocks.upload).not.toHaveBeenCalled(); expect(mocks.review).not.toHaveBeenCalled();
  });
  it.each(["seller", "unofficial", "withdrawn", "currentVersion", "binding", "paid", "included", "reviewer", "hidden-version"])("rejects existing listing conflict %s without review", async mode => {
    current = makeListing();
    if (mode === "seller") current.sellerId = "other";
    if (mode === "unofficial") current.official = false;
    if (mode === "withdrawn") current.status = "WITHDRAWN";
    if (mode === "currentVersion") current.currentVersion = 2;
    if (mode === "binding") current.versions[0].payload.execution.definitionHash = "b".repeat(64);
    if (mode === "paid") current.versions[0].payload.priceMinor = 100;
    if (mode === "included") current.versions[0].payload.computeIncluded = true;
    if (mode === "reviewer") { current.status = "PUBLISHED"; current.publishedVersion = 1; current.versions[0].reviewedAt = new Date(); current.versions[0].reviewedById = "other-reviewer"; }
    if (mode === "hidden-version") current.versions.push({ ...current.versions[0], version: 2 });
    await expect(publishPlatformResumeRecipe("real-owner", process.cwd())).rejects.toThrow("PLATFORM_RECIPE_LISTING_CONFLICT");
    expect(mocks.review).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("requires an actual publication audit for existing published registration", async () => {
    current = makeListing(); current.status = "PUBLISHED"; current.publishedVersion = 1; current.versions[0].reviewedAt = new Date(); current.versions[0].reviewedById = "real-owner";
    mocks.db.auditLog.findFirst.mockImplementation(async (query: { where: { resourceType: string } }) => query.where.resourceType === "workflow" ? evidence : null);
    await expect(publishPlatformResumeRecipe("real-owner", process.cwd())).rejects.toThrow("PLATFORM_RECIPE_LISTING_AUDIT_MISSING");
    expect(mocks.review).not.toHaveBeenCalled();
  });
});
