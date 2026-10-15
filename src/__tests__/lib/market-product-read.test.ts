// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLATFORM_RESUME_RECIPE as recipe } from "@/domain/workflows/platform-recipes";

const m = vi.hoisted(() => ({
  auth: vi.fn(), unified: false,
  db: { workflow: { findFirst: vi.fn() }, auditLog: { findFirst: vi.fn() }, marketListing: { findFirst: vi.fn() } },
}));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/db", () => ({ db: m.db }));
vi.mock("@/server/growth/service", () => ({ safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/server/integrations/metered-cost", () => ({ unifiedModelBilling: () => m.unified }));
import { readMarketPage } from "@/server/marketplace/product-read";

function source() {
  const author = { id: "owner", username: "owner", nickname: "Owner", avatar: null, role: "ADMIN", deletedAt: null as Date | null, flagged: false, adminPermissions: ["MARKETPLACE_MANAGE"] };
  const version = { id: "fixed-v1", workflowId: "fixed-workflow", version: 1, createdById: "owner", definition: structuredClone(recipe.definition), createdAt: new Date("2026-10-12") };
  return { id: "fixed-workflow", slug: recipe.slug, officialId: recipe.officialId, isOfficial: true, authorId: author.id, author, versions: [version], status: "PUBLISHED", publishedVersion: 1, estimatedCost: recipe.estimatedCost, title: recipe.title, summary: recipe.summary, description: recipe.description };
}
function registration() {
  return { id: "registration", actorId: "owner", action: "PLATFORM_RECIPE_REGISTERED", resourceType: "workflow", resourceId: "fixed-workflow", metadata: { officialId: recipe.officialId, workflowId: "fixed-workflow", ownerId: "owner", version: 1, versionId: "fixed-v1", definitionHash: recipe.definitionHash, sourceCodeHash: recipe.sourceCodeHash as string } };
}
const slug = "workflow-" + createHash("sha256").update(JSON.stringify("fixed-workflow")).digest("hex").slice(0, 24) + "-v1";
function publishedListing() {
  return { id: "listing", slug, sellerId: "owner", official: true, status: "PUBLISHED", publishedVersion: 2,
    seller: { id: "owner", username: "owner", nickname: "Owner", avatar: null }, _count: { stars: 1 }, stars: [] as { userId: string }[],
    versions: [{ version: 2, reviewedAt: new Date() as Date | null, payload: { slug, title: recipe.title, summary: recipe.summary, description: recipe.description, category: "career", subcategory: "resume", fulfillment: "resource", priceMinor: 0, currency: "CNY", deliveryDays: 1, revisionLimit: 0, computeIncluded: false, deliverables: ["Website"], licenseTerms: "Personal use under the published license terms.", execution: { workflowId: "fixed-workflow", versionId: "fixed-v1", version: 1, definitionHash: recipe.definitionHash as string } } }],
  };
}
let workflow: ReturnType<typeof source> | null;
let audit: ReturnType<typeof registration> | null;
let listing: ReturnType<typeof publishedListing>;
let session: { user: { id: string } } | null;
beforeEach(() => {
  vi.resetAllMocks(); m.unified = false; vi.stubEnv("ANS_APIC_BILLING_ENABLED", "0");
  workflow = source(); audit = registration(); listing = publishedListing(); session = null;
  m.auth.mockImplementation(async () => session);
  m.db.workflow.findFirst.mockImplementation(async () => workflow);
  m.db.auditLog.findFirst.mockImplementation(async () => audit);
  m.db.marketListing.findFirst.mockImplementation(async ({ where, include }) => {
    if (listing.status !== where.status || listing.slug !== where.slug || listing.sellerId !== where.sellerId || listing.official !== where.official) return null;
    return { ...listing, stars: include.stars.where.userId === "viewer-a" ? [{ userId: "viewer-a" }] : [] };
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("one verified snapshot for the official resume product", () => {
  it("derives runnable details from the same attested recipe without repeating database reads", async () => {
    const result = await readMarketPage("resume-website");
    expect(result.offer).toMatchObject({ id: "listing", version: 2 });
    expect(result.runnable).toMatchObject({ available: true, recipe: "resume-website-v1", version: 1, estimatedCost: recipe.estimatedCost });
    expect(result.runnable?.variables).toBeDefined();
    expect(m.db.workflow.findFirst).toHaveBeenCalledTimes(1);
    expect(m.db.auditLog.findFirst).toHaveBeenCalledTimes(1);
    expect(m.db.marketListing.findFirst).toHaveBeenCalledTimes(1);
    expect(m.db.workflow.findFirst.mock.calls[0][0].where).toEqual({ OR: [{ id: recipe.officialId }, { slug: recipe.officialId }, { officialId: recipe.officialId }] });
  });
  it("keeps live viewer-specific stars separate between reads", async () => {
    session = { user: { id: "viewer-a" } };
    expect((await readMarketPage("resume-website")).offer.starred).toBe(true);
    session = { user: { id: "viewer-b" } };
    expect((await readMarketPage("resume-website")).offer.starred).toBe(false);
    expect(m.auth).toHaveBeenCalledTimes(2);
    expect(m.db.marketListing.findFirst.mock.calls.map(call => call[0].include.stars.where.userId)).toEqual(["viewer-a", "viewer-b"]);
  });
  it("preserves unified and metered pricing presentation", async () => {
    m.unified = true;
    expect((await readMarketPage("resume-website")).runnable?.estimatedCost).toBeNull();
    m.unified = false; vi.stubEnv("ANS_APIC_BILLING_ENABLED", "1");
    expect((await readMarketPage("resume-website")).runnable?.estimatedCost).toBe(.25);
  });
  it.each(["missing", "inactive", "flagged", "nonadmin", "permission", "withdrawn-recipe", "changed-definition", "hidden-version", "missing-audit", "forged-audit"])("rejects unavailable provenance before reading the listing: %s", async mode => {
    if (mode === "missing") workflow = null;
    if (mode === "inactive") workflow!.author.deletedAt = new Date();
    if (mode === "flagged") workflow!.author.flagged = true;
    if (mode === "nonadmin") workflow!.author.role = "USER";
    if (mode === "permission") workflow!.author.adminPermissions = [];
    if (mode === "withdrawn-recipe") workflow!.status = "DRAFT";
    if (mode === "changed-definition") workflow!.versions[0].definition.nodes[0].timeoutMs = 80000;
    if (mode === "hidden-version") workflow!.versions.push({ ...workflow!.versions[0], id: "hidden", version: 2 });
    if (mode === "missing-audit") audit = null;
    if (mode === "forged-audit") audit!.metadata.sourceCodeHash = "0".repeat(64);
    await expect(readMarketPage("resume-website")).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(m.db.marketListing.findFirst).not.toHaveBeenCalled();
  });
  it.each(["withdrawn", "unofficial", "other-seller", "unreviewed", "workflowId", "versionId", "version", "definitionHash"])("rejects changed publication or binding: %s", async mode => {
    if (mode === "withdrawn") listing.status = "WITHDRAWN";
    if (mode === "unofficial") listing.official = false;
    if (mode === "other-seller") listing.sellerId = "other";
    if (mode === "unreviewed") listing.versions[0].reviewedAt = null;
    const binding = listing.versions[0].payload.execution;
    if (mode === "workflowId") binding.workflowId = "other";
    if (mode === "versionId") binding.versionId = "other";
    if (mode === "version") binding.version = 2;
    if (mode === "definitionHash") binding.definitionHash = "0".repeat(64);
    await expect(readMarketPage("resume-website")).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });
  it("revalidates owner authority on a later read", async () => {
    await readMarketPage("resume-website");
    workflow!.author.adminPermissions = [];
    await expect(readMarketPage("resume-website")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("propagates authentication failures before product reads", async () => {
    m.auth.mockRejectedValue(new Error("AUTH_UNAVAILABLE"));
    await expect(readMarketPage("resume-website")).rejects.toThrow("AUTH_UNAVAILABLE");
    expect(m.db.workflow.findFirst).not.toHaveBeenCalled();
  });
});
