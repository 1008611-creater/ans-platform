// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as me } from "@/app/api/community/me/route";
import { GET as contributions } from "@/app/api/community/contributions/route";
import { POST as checkIn } from "@/app/api/community/check-in/route";
import { GET as growth } from "@/app/api/community/growth/route";
import { POST as equip } from "@/app/api/community/growth/equip/route";
import { CommunityError } from "@/lib/community";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), me: vi.fn(), contributions: vi.fn(), checkIn: vi.fn(), growth: vi.fn(), equip: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/community", async (original) => ({ ...await original<typeof import("@/lib/community")>(), getCommunityMe: mocks.me, getContributions: mocks.contributions, checkIn: mocks.checkIn }));

vi.mock("@/server/growth/service", () => ({ getGrowthProfile: mocks.growth, equipGrowthReward: mocks.equip }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "self", verified: false } });
  mocks.growth.mockResolvedValue({ xp: 10, checkIns: [], recentEvents: [] });
  mocks.equip.mockResolvedValue({ key: "mint" });
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
    const response = await handle(new Request(`http://localhost:3000/api/community/${label}`, { method, headers: { Origin: "http://localhost:3000", "Sec-Fetch-Site": "same-origin", "x-ans-actor": "self" } }));
    expect(response.status).toBe(401);
    expect(service).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("仅使用会话本人ID，忽略参数和伪造body；返回禁止缓存", async () => {
    const response = await handle(new Request(`http://localhost:3000/api/community/${label}?userId=victim&take=999`, { method, headers: { Origin: "http://localhost:3000", "Sec-Fetch-Site": "same-origin", "x-ans-actor": "self" }, ...(method === "POST" ? { body: JSON.stringify({ userId: "victim", xp: 999, day: "2030-01-01" }) } : {}) }));
    expect(response.status).toBe(200);
    expect(service).toHaveBeenCalledWith("self");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("账号资格拒绝返回403", async () => {
    service.mockRejectedValue(new CommunityError(403, "COMMUNITY_INELIGIBLE"));
    expect((await handle(new Request(`http://localhost:3000/api/community/${label}`, { method, headers: { Origin: "http://localhost:3000", "Sec-Fetch-Site": "same-origin", "x-ans-actor": "self" } }))).status).toBe(403);
  });
  it("内部错误不泄露数据库或用户信息", async () => {
    service.mockRejectedValue(new Error("email=private@example.test SQL secret"));
    const response = await handle(new Request(`http://localhost:3000/api/community/${label}`, { method, headers: { Origin: "http://localhost:3000", "Sec-Fetch-Site": "same-origin", "x-ans-actor": "self" } }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(/SQL|secret|private@example/);
  });
});

it("跨站签到请求拒绝", async () => {
  const response = await checkIn(new Request("http://localhost:3000/api/community/check-in", { method: "POST", headers: { Origin: "https://untrusted.example", "Sec-Fetch-Site": "cross-site", "x-ans-actor": "self" } }));
  expect(response.status).toBe(403);
  expect(mocks.checkIn).not.toHaveBeenCalled();
});
it("同源签到正常且重复签到仍为200", async () => {
  mocks.checkIn.mockResolvedValue({ alreadyCheckedIn: true, checkIn: { id: "existing" } });
  const response = await checkIn(new Request("http://localhost:3000/api/community/check-in", { method: "POST", headers: { Origin: "http://localhost:3000", "Sec-Fetch-Site": "same-origin", "x-ans-actor": "self" } }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ alreadyCheckedIn: true, checkIn: { id: "existing" } });
});

it("rejects a browser write with no verifiable same-origin context", async () => {
  const response = await checkIn(new Request("http://localhost:3000/api/community/check-in", { method: "POST", headers: { "x-ans-actor": "self" } }));
  expect(response.status).toBe(403); expect(mocks.checkIn).not.toHaveBeenCalled();
});


describe("社区成长、签到与装扮的账号绑定", () => {
  const readWrite = [...handlers, { label: "growth", handle: growth, service: mocks.growth, method: "GET" }, { label: "growth/equip", handle: equip, service: mocks.equip, method: "POST" }];
  function request(label: string, method: string, actor: string | undefined, extra: Record<string, string> = {}) {
    return new Request(`http://localhost:3000/api/community/${label}`, { method, headers: {
      Origin: "http://localhost:3000", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", ...extra,
      ...(actor === undefined ? {} : { "x-ans-actor": actor }),
    }, ...(method === "POST" ? { body: JSON.stringify({ kind: "avatar-frame", key: "mint", userId: "victim", xp: 999 }) } : {}) });
  }
  it.each(readWrite)("$label 在业务读写前拒绝缺失或旧账号头", async ({ label, handle, service, method }) => {
    for (const actor of [undefined, "previous-member"]) {
      const response = await handle(request(label, method, actor));
      expect(response.status).toBe(409); expect(await response.json()).toEqual({ error: "ACCOUNT_CHANGED" });
      expect(response.headers.get("cache-control")).toContain("no-store"); expect(service).not.toHaveBeenCalled();
    }
  });
  it.each(readWrite)("$label 的账号头不能替代登录", async ({ label, handle, service, method }) => {
    mocks.auth.mockResolvedValue(null);
    expect((await handle(request(label, method, "self"))).status).toBe(401); expect(service).not.toHaveBeenCalled();
  });
  it("读取成长历史使用验证后的 session 用户", async () => {
    const response = await growth(request("growth?userId=victim", "GET", "self"));
    expect(response.status).toBe(200); expect(mocks.growth).toHaveBeenCalledWith("self");
    expect(response.headers.get("cache-control")).toContain("private, no-store");
  });
  it("装扮仍只作用于 session 用户，不能用 body 指定另一个人", async () => {
    const response = await equip(request("growth/equip", "POST", "self"));
    expect(response.status).toBe(200); expect(mocks.equip).toHaveBeenCalledWith("self", "avatar-frame", "mint");
  });
  it("有效账号绑定仍不能绕过装扮的 CSRF 边界", async () => {
    const response = await equip(request("growth/equip", "POST", "self", { Origin: "https://untrusted.example", "Sec-Fetch-Site": "cross-site" }));
    expect(response.status).toBe(403); expect(mocks.equip).not.toHaveBeenCalled();
  });
  it("无可信同源上下文的装扮提交拒绝", async () => {
    const response = await equip(new Request("http://localhost:3000/api/community/growth/equip", { method: "POST", headers: { "x-ans-actor": "self", "Content-Type": "application/json" }, body: JSON.stringify({ kind: "avatar-frame", key: "mint" }) }));
    expect(response.status).toBe(403); expect(mocks.equip).not.toHaveBeenCalled();
  });
  it("锁定装扮保持服务端权限校验", async () => {
    mocks.equip.mockRejectedValue(new Error("REWARD_LOCKED"));
    const response = await equip(request("growth/equip", "POST", "self"));
    expect(response.status).toBe(403); expect(await response.json()).toEqual({ error: "REWARD_LOCKED" });
  });
});
