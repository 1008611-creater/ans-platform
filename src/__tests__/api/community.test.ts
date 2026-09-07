// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as me } from "@/app/api/community/me/route";
import { GET as contributions } from "@/app/api/community/contributions/route";
import { POST as checkIn } from "@/app/api/community/check-in/route";
import { CommunityError } from "@/lib/community";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), me: vi.fn(), contributions: vi.fn(), checkIn: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/community", async (original) => ({ ...await original<typeof import("@/lib/community")>(), getCommunityMe: mocks.me, getContributions: mocks.contributions, checkIn: mocks.checkIn }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "self", verified: false } });
  mocks.me.mockResolvedValue({ xp: 0, ledger: [] });
  mocks.contributions.mockResolvedValue({ top: [], me: { rank: 1 } });
  mocks.checkIn.mockResolvedValue({ alreadyCheckedIn: false, checkIn: { day: "2026-09-08" } });
});

const handlers = [
  { label: "me", handle: me, service: mocks.me, method: "GET" },
  { label: "contributions", handle: contributions, service: mocks.contributions, method: "GET" },
  { label: "check-in", handle: checkIn, service: mocks.checkIn, method: "POST" },
];

describe.each(handlers)("社区接口 $label", ({ label, handle, service, method }) => {
  it("未登录返回401且不查业务数据", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await handle(new Request(`http://localhost/api/community/${label}`, { method }));
    expect(response.status).toBe(401);
    expect(service).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("仅使用会话本人ID，忽略参数和伪造body；返回禁止缓存", async () => {
    const response = await handle(new Request(`http://localhost/api/community/${label}?userId=victim&take=999`, { method, ...(method === "POST" ? { body: JSON.stringify({ userId: "victim", xp: 999, day: "2030-01-01" }) } : {}) }));
    expect(response.status).toBe(200);
    expect(service).toHaveBeenCalledWith("self");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("账号资格拒绝返回403", async () => {
    service.mockRejectedValue(new CommunityError(403, "COMMUNITY_INELIGIBLE"));
    expect((await handle(new Request(`http://localhost/api/community/${label}`, { method }))).status).toBe(403);
  });
  it("内部错误不泄露数据库或用户信息", async () => {
    service.mockRejectedValue(new Error("email=private@example.test SQL secret"));
    const response = await handle(new Request(`http://localhost/api/community/${label}`, { method }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(/SQL|secret|private@example/);
  });
});

it("跨站签到请求拒绝", async () => {
  const response = await checkIn(new Request("http://localhost/api/community/check-in", { method: "POST", headers: { Origin: "https://untrusted.example", "Sec-Fetch-Site": "cross-site" } }));
  expect(response.status).toBe(403);
  expect(mocks.checkIn).not.toHaveBeenCalled();
});
it("同源签到正常且重复签到仍为200", async () => {
  mocks.checkIn.mockResolvedValue({ alreadyCheckedIn: true, checkIn: { id: "existing" } });
  const response = await checkIn(new Request("http://localhost/api/community/check-in", { method: "POST", headers: { Origin: "http://localhost", "Sec-Fetch-Site": "same-origin" } }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ alreadyCheckedIn: true, checkIn: { id: "existing" } });
});
