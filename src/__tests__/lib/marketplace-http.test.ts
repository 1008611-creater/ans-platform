// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
import { auth } from "@/lib/auth";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
import { MarketRuleError } from "@/domain/marketplace/order";
const origin = "https://ans.example";
function request(body: string, headers: Record<string,string> = {}) { return new Request(origin + "/api/market/listings", { method: "POST", body, headers: { "Content-Type": "application/json", origin, ...headers } }); }
beforeEach(() => { vi.resetAllMocks(); for (const key of ["AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]) vi.stubEnv(key, ""); });
describe("market HTTP boundary", () => {
  it("uses the authenticated session identity only", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    await expect(marketUser()).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    vi.mocked(auth).mockResolvedValue({ user: { id: "real-user" } } as never);
    expect(await marketUser()).toBe("real-user");
  });
  it("rejects an old rendered actor before a new account can execute its command", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "seller-1" } } as never);
    await expect(marketUser(request("{}", { "x-ans-actor": "buyer-1" }))).rejects.toMatchObject({ code: "ACCOUNT_CHANGED", status: 409 });
    await expect(marketUser(request("{}"))).rejects.toMatchObject({ code: "ACCOUNT_CHANGED", status: 409 });
    expect(await marketUser(request("{}", { "x-ans-actor": "seller-1" }))).toBe("seller-1");
  });
  it("accepts same-origin JSON", async () => { expect(await marketJson(request('{"title":"offer"}'))).toEqual({ title: "offer" }); });
  it.each([{ origin: "https://evil.example" } as Record<string,string>, { "sec-fetch-site": "cross-site" } as Record<string,string>])("rejects cross-site mutation %s", async (headers) => { await expect(marketJson(request("{}", headers))).rejects.toMatchObject({ status: 403 }); });
  it("accepts configured public origin behind a proxy without trusting forwarded headers", async () => {
    vi.stubEnv("AUTH_URL", origin);
    const internal = new Request("http://internal:3107/api/market/listings", { method: "POST", body: "{}", headers: { "Content-Type": "application/json", origin } });
    expect(await marketJson(internal)).toEqual({});
    await expect(marketJson(request("{}", { origin: "https://evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" }))).rejects.toMatchObject({ status: 403 });
    await expect(marketJson(request("{}", { "sec-fetch-site": "cross-site" }))).rejects.toMatchObject({ status: 403 });
  });
  it("rejects absent browser origin context", async () => { await expect(marketJson(new Request(origin, { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } }))).rejects.toMatchObject({ status: 403 }); });
  it("limits actual UTF-8 bytes even without a Content-Length header", async () => { await expect(marketJson(request(JSON.stringify({ text: "\u4e2d".repeat(40000) })))).rejects.toMatchObject({ code: "REQUEST_TOO_LARGE", status: 413 }); });
  it("rejects forms and malformed JSON without leaking body content", async () => {
    await expect(marketJson(request("{}", { "Content-Type": "text/plain" }))).rejects.toMatchObject({ status: 415 });
    await expect(marketJson(request("not-json"))).rejects.toMatchObject({ code: "INVALID_JSON" });
  });
  it("sanitizes unexpected errors and disables response caching", async () => {
    const response = await marketResponse(async () => { throw new Error("postgres://private:secret@db"); });
    expect(response.status).toBe(500); expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.text(); expect(body).toContain("INTERNAL_ERROR"); expect(body).not.toContain("secret");
  });
  it("preserves intentional rule status and code", async () => {
    const response = await marketResponse(async () => { throw new MarketRuleError("PAYMENT_NOT_CONFIGURED", 503); });
    expect(response.status).toBe(503); expect((await response.json()).error.code).toBe("PAYMENT_NOT_CONFIGURED");
  });
});
