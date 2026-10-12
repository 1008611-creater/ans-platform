// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/marketplace/stars", () => ({ getMarketListingStar: vi.fn(), setMarketListingStar: vi.fn() }));
import { auth } from "@/lib/auth";
import { getMarketListingStar, setMarketListingStar } from "@/server/marketplace/stars";
import { GET, PUT } from "@/app/api/market/listings/[id]/star/route";
const origin = "https://ans.example";
const context = { params: Promise.resolve({ id: "listing" }) };
function request(actor = "buyer", requestOrigin = origin) { return new Request(origin + "/api/market/listings/listing/star", { method: "PUT", headers: { origin: requestOrigin, "Content-Type": "application/json", "x-ans-actor": actor }, body: JSON.stringify({ starred: true }) }); }
beforeEach(() => { vi.resetAllMocks(); for (const key of ["AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]) vi.stubEnv(key, ""); vi.mocked(setMarketListingStar).mockResolvedValue({ starCount: 1, starred: true }); });
describe("star route session and origin authority", () => {
  it("allows public state read", async () => {
    vi.mocked(auth).mockResolvedValue(null as never); vi.mocked(getMarketListingStar).mockResolvedValue({ starCount: 0, starred: false });
    expect((await GET(new Request(origin), context)).status).toBe(200); expect(getMarketListingStar).toHaveBeenCalledWith("listing", undefined);
  });
  it("requires login for desired state writes", async () => {
    vi.mocked(auth).mockResolvedValue(null as never); expect((await PUT(request(), context)).status).toBe(401); expect(setMarketListingStar).not.toHaveBeenCalled();
  });
  it("binds the write to the current actor and ignores URL identity", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "buyer" } } as never);
    expect((await PUT(request(), context)).status).toBe(200); expect(setMarketListingStar).toHaveBeenCalledWith("listing", "buyer", { starred: true });
  });
  it("rejects stale accounts and cross-origin writes before the service", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "buyer" } } as never);
    expect((await PUT(request("previous"), context)).status).toBe(409);
    expect((await PUT(request("buyer", "https://evil.example"), context)).status).toBe(403); expect(setMarketListingStar).not.toHaveBeenCalled();
  });
});
