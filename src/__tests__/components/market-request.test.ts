// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarketRequestRejection, marketRequest } from "@/components/marketplace/request";
afterEach(() => vi.unstubAllGlobals());
describe("market request certainty", () => {
  it("treats the points-only policy as a confirmed rejection before a new charge", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: { code: "POINTS_ONLY" } }), { status: 400 })));
    await expect(marketRequest("/fixture", "POST", {}, { actorId: "buyer-1" })).rejects.toMatchObject({ name: "MarketRequestRejection", message: "POINTS_ONLY", status: 400 });
  });
  it("preserves a structured 409 rejection as a confirmed failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: { code: "VERSION_CONFLICT" } }), { status: 409 })));
    await expect(marketRequest("/fixture", "POST", {}, { actorId: "buyer-1" })).rejects.toBeInstanceOf(MarketRequestRejection);
  });
  it.each([{ status: 500, body: JSON.stringify({ ok: false, error: { code: "POINTS_ONLY" } }) }, { status: 403, body: JSON.stringify({ ok: false, error: { code: "ACCOUNT_UNAVAILABLE" } }) }, { status: 404, body: JSON.stringify({ ok: false, error: { code: "NOT_FOUND" } }) }, { status: 502, body: JSON.stringify({ ok: false, error: { code: "INTERNAL_ERROR" } }) }, { status: 409, body: "upstream html" }, { status: 409, body: "{}" }, { status: 200, body: "{}" }])("keeps uncertain or malformed replies recoverable: %j", async ({ status, body }) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status })));
    const error = await marketRequest("/fixture", "POST", {}, { actorId: "buyer-1" }).catch(caught => caught);
    expect(error).toBeInstanceOf(Error); expect(error).not.toBeInstanceOf(MarketRequestRejection);
  });
});
