// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ actor: vi.fn(), findUnique: vi.fn(), create: vi.fn(), audit: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { marketListing: { findMany: m.read, findFirst: m.read } } }));
vi.mock("@/server/growth/service", () => ({ safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/server/marketplace/shared", () => ({
  requireMarketActor: m.actor, requireMarketModerator: vi.fn(),
  marketTransaction: (run: (tx: unknown) => Promise<unknown>) => run({ marketListing: { findUnique: m.findUnique, create: m.create }, auditLog: { create: m.audit } }),
}));
import { createMarketListing, getMarketListing, listMarketListings } from "@/server/marketplace/listings";
const listing = { slug: "repository-tool", title: "Repository tool", summary: "An isolated project fixture for listing checks", description: "A repository tool fixture with documented files and usage instructions.", category: "web", subcategory: "documentation", fulfillment: "resource", priceMinor: 0, currency: "CNY", deliveryDays: 1, revisionLimit: 0, computeIncluded: false, deliverables: ["Repository"], licenseTerms: "Use according to the repository license.", githubUrl: "https://github.com/example/tool" };
beforeEach(() => { vi.resetAllMocks(); m.actor.mockResolvedValue({ id: "seller" }); m.findUnique.mockResolvedValue(null); m.create.mockResolvedValue({ id: "listing", versions: [] }); });
describe("project listing payloads and published reads", () => {
  it("saves free repository-only resources with a normalized empty tier set", async () => {
    await createMarketListing("seller", listing);
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ versions: { create: { version: 1, payload: { ...listing, pricingTiers: [] } } } }) }));
  });
  it("saves selected tier prices separately and derives the public starting price", async () => {
    const pricingTiers = [{ id: "source", title: "Source", description: "Source files", priceMinor: 1500, deliverables: ["Archive"] }, { id: "deploy", title: "Deploy", description: "Deployment", priceMinor: 3500, deliverables: ["Deployment"] }];
    await createMarketListing("seller", { ...listing, pricingTiers });
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ versions: { create: { version: 1, payload: { ...listing, priceMinor: 1500, pricingTiers } } } }) }));
  });
  it("allows a free HTTPS usage URL without a repository", async () => {
    const { githubUrl: _github, ...data } = listing; void _github;
    await createMarketListing("seller", { ...data, usageUrl: "https://example.org/tool" }); expect(m.create).toHaveBeenCalledOnce();
  });
  it.each([{ fulfillment: "service" }, { computeIncluded: true }, { githubUrl: undefined }, { subcategory: "unknown" }])("rejects invalid free offers or category %j before writes", async override => {
    await expect(createMarketListing("seller", { ...listing, ...override })).rejects.toThrow(); expect(m.create).not.toHaveBeenCalled();
  });
  it("shows the reviewed version while a newer draft exists with true stars", async () => {
    m.read.mockResolvedValue([{ id: "listing", slug: listing.slug, official: false, status: "PUBLISHED", currentVersion: 2, publishedVersion: 1, seller: { id: "seller", username: "seller", nickname: null, avatar: null }, _count: { stars: 4 }, stars: [{ userId: "viewer" }], versions: [{ version: 2, payload: { ...listing, title: "Unreviewed draft" } }, { version: 1, payload: listing }] }]);
    const results = await listMarketListings(undefined, "viewer");
    expect(results[0]).toMatchObject({ version: 1, starCount: 4, starred: true, listing: { title: listing.title } });
    expect(m.read).toHaveBeenCalledWith(expect.objectContaining({ include: expect.objectContaining({ stars: { where: { userId: "viewer" }, select: { userId: true } }, _count: { select: { stars: true } } }) }));
  });
  it("never serves an unavailable or withdrawn detail", async () => {
    m.read.mockResolvedValue(null); await expect(getMarketListing(listing.slug)).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(m.read).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: listing.slug, status: "PUBLISHED", seller: { deletedAt: null, flagged: false } } }));
  });
});
