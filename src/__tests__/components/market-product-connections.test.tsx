// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MarketOfferView } from "@/contracts/marketplace-view";
const read = vi.hoisted(() => vi.fn());
vi.mock("@/server/catalog/connections", () => ({ getMarketConnections: read }));
vi.mock("@/components/catalog/product-connections", () => ({ ProductConnectionsSection: () => null }));
import { MarketProductConnections } from "@/components/marketplace/market-product-connections";

afterEach(() => vi.restoreAllMocks());
describe("optional market discovery", () => {
  it("keeps recommendation failure out of the editor without returning stale or invented links", async () => {
    const diagnostic = vi.spyOn(console, "warn").mockImplementation(() => {});
    read.mockRejectedValueOnce(new Error("private database diagnostic"));
    expect(await MarketProductConnections({ offer: {} as MarketOfferView })).toBeNull();
    expect(diagnostic).toHaveBeenCalledWith("Market product connections unavailable.");
    expect(diagnostic.mock.calls.flat().join(" ")).not.toContain("private database diagnostic");
  });
});
