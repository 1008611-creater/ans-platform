// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/marketplace/listings", () => ({ createMarketListing: vi.fn(), listMarketListings: vi.fn(), reviseMarketListing: vi.fn(), getOwnedMarketListing: vi.fn(), submitMarketListing: vi.fn(), withdrawMarketListing: vi.fn(), reviewMarketListing: vi.fn() }));
import { auth } from "@/lib/auth";
import { createMarketListing, listMarketListings, submitMarketListing, reviewMarketListing } from "@/server/marketplace/listings";
import { GET, POST } from "@/app/api/market/listings/route";
import { POST as action } from "@/app/api/market/listings/[id]/route";
import { POST as review } from "@/app/api/admin/market/[id]/route";
const origin = "https://ans.example";
function request(body: unknown) { return new Request(origin + "/api/market/listings", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => { vi.resetAllMocks(); for (const key of ["AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]) vi.stubEnv(key, ""); });
describe("market routes", () => {
  it("allows public browse but requires login for owner listings", async () => {
    vi.mocked(listMarketListings).mockResolvedValue([]); expect((await GET(new Request(origin + "/api/market/listings"))).status).toBe(200); expect(listMarketListings).toHaveBeenCalledWith(undefined);
    vi.mocked(auth).mockResolvedValue(null as never); expect((await GET(new Request(origin + "/api/market/listings?mine=1"))).status).toBe(401);
  });
  it("rejects anonymous creation before calling the write service", async () => { vi.mocked(auth).mockResolvedValue(null as never); expect((await POST(request({}))).status).toBe(401); expect(createMarketListing).not.toHaveBeenCalled(); });
  it("routes writes using the authenticated user, never a query identity", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "real" } } as never); vi.mocked(createMarketListing).mockResolvedValue({ id: "created" } as never);
    expect((await POST(request({ title: "draft" }))).status).toBe(201); expect(createMarketListing).toHaveBeenCalledWith("real", { title: "draft" });
  });
  it("rejects hidden authority fields and missing expected versions", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "real" } } as never);
    expect((await action(request({ action: "submit", expectedVersion: 1, sellerId: "fake" }),{ params: Promise.resolve({ id: "listing" }) })).status).toBe(400); expect(submitMarketListing).not.toHaveBeenCalled();
    expect((await review(request({ version: 1, approve: true, note: "ok", reviewerId: "fake" }),{ params: Promise.resolve({ id: "listing" }) })).status).toBe(400); expect(reviewMarketListing).not.toHaveBeenCalled();
  });
});
