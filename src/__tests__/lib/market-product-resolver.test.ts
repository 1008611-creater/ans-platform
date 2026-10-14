// @vitest-environment node
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ recipe: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { marketListing: { findFirst: m.read } } }));
vi.mock("@/server/workflows/platform-recipes", () => ({ findPublishedPlatformRecipe: m.recipe }));
vi.mock("@/server/growth/service", () => ({ safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/server/marketplace/shared", () => ({ marketHash: (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex"), marketTransaction: vi.fn(), requireMarketActor: vi.fn(), requireMarketModerator: vi.fn() }));
import { getMarketListing } from "@/server/marketplace/listings";
import { marketProductPath } from "@/domain/marketplace/product-route";
import { PLATFORM_RESUME_RECIPE } from "@/domain/workflows/platform-recipes";
const binding = { workflowId: "attested-workflow", versionId: "fixed-version", version: 1, definitionHash: PLATFORM_RESUME_RECIPE.definitionHash };
const payload = { slug: "published-resume", title: "Resume website", summary: "A published official resume website product", description: "Real reviewed recipe with immutable execution binding.", category: "career", subcategory: "resume", fulfillment: "resource", priceMinor: 0, currency: "CNY", deliveryDays: 1, revisionLimit: 0, computeIncluded: false, deliverables: ["Website"], licenseTerms: "Personal use according to the published terms.", execution: binding };
const actualSlug = `workflow-${createHash("sha256").update(JSON.stringify(binding.workflowId)).digest("hex").slice(0,24)}-v1`;
function row() { return { id: "listing", slug: actualSlug, sellerId: "owner", official: true, status: "PUBLISHED", publishedVersion: 2, versions: [{ version: 2, reviewedAt: new Date(), payload }, { version: 1, reviewedAt: new Date(), payload }], seller: { id: "owner", username: "owner", nickname: null, avatar: null }, _count: { stars: 0 }, stars: [] }; }
beforeEach(() => { vi.resetAllMocks(); m.recipe.mockResolvedValue({ workflow: { id: binding.workflowId, authorId: "owner" }, version: { id: binding.versionId, version: 1 }, recipe: PLATFORM_RESUME_RECIPE }); m.read.mockResolvedValue(row()); });
describe("canonical product identity", () => {
 it("resolves the attested exact slug, active owner, official status and current reviewed binding", async () => {
   await expect(getMarketListing("resume-website")).resolves.toMatchObject({ slug: actualSlug, version: 2 });
   expect(m.read).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: actualSlug, status: "PUBLISHED", sellerId: "owner", official: true, seller: { deletedAt: null, flagged: false } } }));
 });
 it("never falls back to another listing when official registration is absent", async () => {
   m.recipe.mockResolvedValue(null); await expect(getMarketListing("resume-website")).rejects.toMatchObject({ code: "NOT_FOUND" }); expect(m.read).not.toHaveBeenCalled();
 });
 it.each(["workflowId", "versionId", "version", "definitionHash", "review"])("rejects current %s mismatch even if history matches", async field => {
   const item = row(); if (field === "review") item.versions[0].reviewedAt = null as never;
   else item.versions[0].payload = { ...payload, execution: { ...binding, [field]: field === "version" ? 2 : field === "definitionHash" ? "0".repeat(64) : "another-source" } };
   m.read.mockResolvedValue(item); await expect(getMarketListing("resume-website")).rejects.toMatchObject({ code: "NOT_FOUND" });
 });
 it("ordinary listings still resolve by their own slug without official registration lookup", async () => {
   await getMarketListing("other-product");expect(m.recipe).not.toHaveBeenCalled();expect(m.read).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ slug: "other-product" }) }));
 });
 it("canonical card routing is reserved for official matching recipes", () => {
   const offer = { slug: actualSlug, official: true, listing: payload } as Parameters<typeof marketProductPath>[0];
   expect(marketProductPath(offer)).toBe("/market/resume-website");expect(marketProductPath({ ...offer, official: false })).toBe(`/market/${actualSlug}`);
 });
});
