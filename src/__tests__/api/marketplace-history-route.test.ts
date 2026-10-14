// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/marketplace/history", () => ({ getMarketOrderHistory: vi.fn() }));
import { auth } from "@/lib/auth";
import { getMarketOrderHistory } from "@/server/marketplace/history";
import { GET } from "@/app/api/market/orders/[id]/history/route";
const context = { params: Promise.resolve({ id: "order" }) };
function request(query = "kind=messages&before=old", actor = "buyer") { return new Request(`https://ans.example/api/market/orders/order/history?${query}`, { headers: { "x-ans-actor": actor } }); }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(auth).mockResolvedValue({ user: { id: "buyer" } } as never); });
describe("order history endpoint", () => {
  it("requires authentication before history reads", async () => {
    vi.mocked(auth).mockResolvedValue(null as never); expect((await GET(request(), context)).status).toBe(401); expect(getMarketOrderHistory).not.toHaveBeenCalled();
  });
  it("rejects stale actor before private reads", async () => {
    expect((await GET(request(undefined, "previous"), context)).status).toBe(409); expect(getMarketOrderHistory).not.toHaveBeenCalled();
  });
  it.each(["kind=messages&before=old&before=other", "kind=messages&before=old&userId=other", "kind=messages", "kind=private&before=old"])("rejects ambiguous or hidden query fields: %s", async query => {
    expect((await GET(request(query), context)).status).toBe(400); expect(getMarketOrderHistory).not.toHaveBeenCalled();
  });
  it("routes the validated query using only the authenticated account", async () => {
    vi.mocked(getMarketOrderHistory).mockResolvedValue({ orderId: "order", kind: "messages", items: [], nextCursor: null });
    const response = await GET(request(), context); expect(response.status).toBe(200);
    expect(getMarketOrderHistory).toHaveBeenCalledWith("order", "buyer", { kind: "messages", before: "old" });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
