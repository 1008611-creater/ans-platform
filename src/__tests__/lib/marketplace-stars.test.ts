// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ actor: vi.fn(), listing: vi.fn(), count: vi.fn(), find: vi.fn(), upsert: vi.fn(), remove: vi.fn() }));
vi.mock("@/server/marketplace/shared", () => ({
  requireMarketActor: m.actor,
  marketTransaction: (run: (tx: unknown) => Promise<unknown>) => run({ marketListing: { findFirst: m.listing }, marketListingStar: { count: m.count, findUnique: m.find, upsert: m.upsert, deleteMany: m.remove } }),
}));
import { MarketRuleError } from "@/domain/marketplace/order";
import { getMarketListingStar, setMarketListingStar } from "@/server/marketplace/stars";
beforeEach(() => { vi.resetAllMocks(); m.actor.mockResolvedValue({ id: "buyer" }); m.listing.mockResolvedValue({ id: "listing" }); m.count.mockResolvedValue(2); m.find.mockResolvedValue({ id: "star" }); });
describe("public project stars", () => {
  it("reads an anonymous count without inventing viewer state", async () => {
    expect(await getMarketListingStar("listing")).toEqual({ starCount: 2, starred: false });
    expect(m.find).not.toHaveBeenCalled(); expect(m.actor).not.toHaveBeenCalled();
    expect(m.listing).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "listing", status: "PUBLISHED", publishedVersion: { not: null }, seller: { deletedAt: null, flagged: false } } }));
  });
  it("upserts the same unique desired star for request retries", async () => {
    expect(await setMarketListingStar("listing", "buyer", { starred: true })).toEqual({ starCount: 2, starred: true });
    await setMarketListingStar("listing", "buyer", { starred: true });
    expect(m.upsert).toHaveBeenCalledTimes(2);
    for (const [input] of m.upsert.mock.calls) expect(input).toEqual({ where: { userId_listingId: { userId: "buyer", listingId: "listing" } }, create: { userId: "buyer", listingId: "listing" }, update: {}, select: { id: true } });
    expect(m.remove).not.toHaveBeenCalled();
  });
  it("uses idempotent deletion for desired unstar even if already absent", async () => {
    m.find.mockResolvedValue(null); m.count.mockResolvedValue(1);
    expect(await setMarketListingStar("listing", "buyer", { starred: false })).toEqual({ starCount: 1, starred: false });
    await setMarketListingStar("listing", "buyer", { starred: false });
    expect(m.remove).toHaveBeenCalledWith({ where: { userId: "buyer", listingId: "listing" } }); expect(m.upsert).not.toHaveBeenCalled();
  });
  it("refuses disabled accounts before listing lookup or writes", async () => {
    m.actor.mockRejectedValue(new MarketRuleError("ACCOUNT_UNAVAILABLE", 403));
    await expect(setMarketListingStar("listing", "disabled", { starred: true })).rejects.toMatchObject({ code: "ACCOUNT_UNAVAILABLE", status: 403 });
    expect(m.listing).not.toHaveBeenCalled(); expect(m.upsert).not.toHaveBeenCalled();
  });
  it("refuses withdrawn, unreviewed or unavailable seller projects", async () => {
    m.listing.mockResolvedValue(null);
    await expect(setMarketListingStar("listing", "buyer", { starred: true })).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(m.upsert).not.toHaveBeenCalled(); expect(m.count).not.toHaveBeenCalled();
  });
  it.each([{ starred: "true" }, { starred: true, userId: "other" }, { starred: false, listingId: "other" }])("rejects invalid desired state or hidden identity %j", async input => {
    await expect(setMarketListingStar("listing", "buyer", input)).rejects.toThrow(); expect(m.actor).not.toHaveBeenCalled(); expect(m.upsert).not.toHaveBeenCalled();
  });
});
