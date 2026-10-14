// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ raw: vi.fn(), actor: vi.fn(), moderator: vi.fn(), find: vi.fn(), unique: vi.fn(), listingCreate: vi.fn(), update: vi.fn(), updateMany: vi.fn(), versionFind: vi.fn(), versionCreate: vi.fn(), versionUpdate: vi.fn(), media: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/growth/service", () => ({ safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/server/marketplace/shared", () => ({ requireMarketActor: m.actor, requireMarketModerator: m.moderator,
  marketTransaction: (run: (tx: unknown) => Promise<unknown>) => run({
    $queryRaw: m.raw,
    marketListing: { findFirst: m.find, findUnique: m.unique, create: m.listingCreate, update: m.update, updateMany: m.updateMany },
    marketListingVersion: { findUniqueOrThrow: m.versionFind, create: m.versionCreate, update: m.versionUpdate },
    marketMedia: { findFirst: m.media }, auditLog: { create: m.audit },
  }),
}));
import { createMarketListing, reviseMarketListing, reviewMarketListing } from "@/server/marketplace/listings";
const coverUrl = "https://ans.example/api/market/media/image-1";
const payload = { slug: "owned-cover", title: "Owned cover project", summary: "An isolated fixture covering seller media access.", description: "This isolated resource checks uploaded media ownership before saving or publication.", category: "web", subcategory: "documentation", fulfillment: "resource", priceMinor: 0, currency: "CNY", deliveryDays: 1, revisionLimit: 0, computeIncluded: false, deliverables: ["Repository"], licenseTerms: "Use according to the stated repository license.", githubUrl: "https://github.com/example/project", coverUrl };
beforeEach(() => {
  vi.resetAllMocks(); m.raw.mockResolvedValue([]); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ans.example"); vi.stubEnv("AUTH_URL", "");
  m.unique.mockImplementation(async ({ where }) => where.slug ? null : { id: "listing", sellerId: "seller", currentVersion: 1, official: false });
  m.find.mockResolvedValue({ id: "listing", sellerId: "seller", currentVersion: 1, slug: payload.slug });
  m.listingCreate.mockResolvedValue({ id: "listing" }); m.updateMany.mockResolvedValue({ count: 1 });
  m.versionCreate.mockResolvedValue({ id: "version-2", version: 2 }); m.versionFind.mockResolvedValue({ id: "version-1", submittedAt: new Date(), reviewedAt: null, payload });
  m.update.mockResolvedValue({ id: "listing", sellerId: "seller" }); m.media.mockResolvedValue({ id: "image-1" });
});
describe("local market cover ownership", () => {
  it("checks the current seller inside creation and revision transactions", async () => {
    await createMarketListing("seller", payload);
    await reviseMarketListing("listing", "seller", { expectedVersion: 1, listing: payload });
    expect(m.media).toHaveBeenCalledTimes(2);
    expect(m.media).toHaveBeenCalledWith({ where: { id: "image-1", ownerId: "seller" }, select: { id: true } });
    expect(m.listingCreate).toHaveBeenCalledOnce(); expect(m.versionCreate).toHaveBeenCalledOnce();
  });
  it("rechecks ownership under the listing seller when a moderator publishes", async () => {
    await reviewMarketListing("listing", "moderator", 1, true, "Isolated review");
    expect(m.media).toHaveBeenCalledWith({ where: { id: "image-1", ownerId: "seller" }, select: { id: true } });
    expect(m.media).not.toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ownerId: "moderator" }) }));
    expect(m.versionUpdate).toHaveBeenCalledOnce(); expect(m.update).toHaveBeenCalledOnce();
  });
  it.each(["create", "revise", "publish"])("refuses another seller's or missing upload during %s before writes", async action => {
    m.media.mockResolvedValue(null);
    const run = action === "create" ? createMarketListing("seller", payload) : action === "revise" ? reviseMarketListing("listing", "seller", { expectedVersion: 1, listing: payload }) : reviewMarketListing("listing", "moderator", 1, true, "Isolated approval");
    await expect(run).rejects.toMatchObject({ code: "MEDIA_PERMISSION_REQUIRED", status: 403 });
    expect(m.listingCreate).not.toHaveBeenCalled(); expect(m.updateMany).not.toHaveBeenCalled(); expect(m.versionCreate).not.toHaveBeenCalled(); expect(m.versionUpdate).not.toHaveBeenCalled(); expect(m.update).not.toHaveBeenCalled(); expect(m.audit).not.toHaveBeenCalled();
  });
  it("allows rejection of an old invalid cover without making it public", async () => {
    m.media.mockResolvedValue(null); await reviewMarketListing("listing", "moderator", 1, false, "Cover not owned by seller");
    expect(m.media).not.toHaveBeenCalled(); expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "DRAFT" } }));
  });
  it.each(["https://external.example/image.png", "https://external.example/api/market/media/image-1"])("allows an external HTTPS cover %s without querying private local media", async external => {
    await createMarketListing("seller", { ...payload, coverUrl: external }); expect(m.media).not.toHaveBeenCalled(); expect(m.listingCreate).toHaveBeenCalledOnce();
  });
  it.each([coverUrl + "?download=1", coverUrl + "#preview", coverUrl + "/", "https://ans.example/api/market/media/%69mage-1"])("rejects malformed local references %s instead of publishing a broken/private cover", async malformed => {
    await expect(createMarketListing("seller", { ...payload, coverUrl: malformed })).rejects.toMatchObject({ code: "MEDIA_PERMISSION_REQUIRED", status: 403 }); expect(m.listingCreate).not.toHaveBeenCalled();
  });
  it("uses AUTH_URL fallback with the same local ownership boundary", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", ""); vi.stubEnv("AUTH_URL", "https://ans.example");
    await createMarketListing("seller", payload); expect(m.media).toHaveBeenCalledWith({ where: { id: "image-1", ownerId: "seller" }, select: { id: true } });
  });
});
