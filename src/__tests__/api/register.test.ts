// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Prisma } from "@prisma/client";
import { POST } from "@/app/api/auth/register/route";
import { POST as sendCode } from "@/app/api/auth/register/code/route";
import { GET as publicConfig } from "@/app/api/auth/register/config/route";

const mocks = vi.hoisted(() => ({
  config: vi.fn(), fetch: vi.fn(), hash: vi.fn(), transaction: vi.fn(),
  lock: vi.fn(), createUser: vi.fn(), updateInvite: vi.fn(), redeem: vi.fn(),
}));
vi.mock("@/lib/config", () => ({ getConfig: mocks.config }));
vi.mock("bcryptjs", () => ({ default: { hash: mocks.hash } }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));

type Row = { identifier: string; token: string; expires: Date };
type User = { id: string; email: string; username: string; [key: string]: unknown };
let rows: Row[];
let users: User[];
let invites: { id: string; code: string; maxUses: number; usedCount: number; expiresAt: Date | null }[];
let redemptions: unknown[];
let lastCode: string;
let queue: Promise<unknown>;
const input = { name: "测试昵称", username: "test_user", email: "student@cau.edu.cn", password: "password123", code: "123456", turnstileToken: "challenge" };

function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Record<string, unknown>[]).some(w => matches(row, w));
    if (value && typeof value === "object" && !(value instanceof Date)) {
      const filter = value as Record<string, unknown>;
      if ("startsWith" in filter) return String(row[key]).startsWith(String(filter.startsWith));
      if ("lt" in filter) return Number(row[key]) < Number(filter.lt);
      if ("gt" in filter) return Number(row[key]) > Number(filter.gt);
      if ("lte" in filter) return Number(row[key]) <= Number(filter.lte);
    }
    return row[key] === value;
  });
}
function request(body: unknown = input) {
  return new Request("https://community.example/api/auth/register", { method: "POST", body: JSON.stringify(body) });
}
async function issue(email = input.email) {
  const response = await sendCode(request({ email, turnstileToken: "challenge" }));
  expect(response.status).toBe(200);
  return lastCode;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-07T00:00:00Z"));
  for (const [key, value] of Object.entries({ AUTH_URL: "https://community.example", TURNSTILE_SECRET_KEY: "test-secret", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "test-public", RESEND_API_KEY: "test-resend", EMAIL_FROM: "ANS <test@community.example>" })) vi.stubEnv(key, value);
  mocks.config.mockResolvedValue({ auth: { allowRegistration: true } });
  mocks.hash.mockResolvedValue("password-hash");
  rows = []; users = []; redemptions = []; lastCode = ""; queue = Promise.resolve();
  invites = [{ id: "invite-1", code: "INVITE", maxUses: 5, usedCount: 0, expiresAt: null }];
  mocks.fetch.mockImplementation(async (url: string, options: RequestInit) => {
    if (url.includes("siteverify")) return Response.json({ success: true, hostname: "community.example", action: "register" });
    const body = JSON.parse(String(options.body));
    lastCode = String(body.text).match(/\b\d{6}\b/)?.[0] ?? "";
    return Response.json({ id: "mail-1" });
  });
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.createUser.mockImplementation(async ({ data }) => {
    if (users.some(u => u.email === data.email || u.username === data.username)) throw new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "6", meta: { target: ["email"] } });
    const user = { id: `user-${users.length}`, ...data }; users.push(user); return user;
  });
  mocks.updateInvite.mockImplementation(async ({ where }) => {
    const invite = invites.find(i => matches(i, where));
    if (!invite) return { count: 0 };
    invite.usedCount++; return { count: 1 };
  });
  mocks.redeem.mockImplementation(async ({ data }) => { redemptions.push(data); return data; });
  const tx = {
    $executeRaw: mocks.lock,
    verificationToken: {
      findUnique: vi.fn(async ({ where }) => rows.find(r => r.token === where.token) ?? null),
      findFirst: vi.fn(async ({ where }) => rows.find(r => matches(r, where)) ?? null),
      create: vi.fn(async ({ data }) => { if (rows.some(r => r.token === data.token)) throw new Error("重复 token"); rows.push(data); return data; }),
      deleteMany: vi.fn(async ({ where }) => { const old = rows.length; rows = rows.filter(r => !matches(r, where)); return { count: old - rows.length }; }),
      update: vi.fn(async ({ where, data }) => { const row = rows.find(r => r.token === where.token)!; Object.assign(row, data); return row; }),
    },
    user: { create: mocks.createUser, findFirst: vi.fn(async ({ where }) => users.find(u => u.email.toLowerCase() === where.email.equals) ?? null) },
    inviteCode: { findUnique: vi.fn(async ({ where }) => invites.find(i => i.code === where.code) ?? null), updateMany: mocks.updateInvite },
    inviteRedemption: { create: mocks.redeem },
  };
  // 局部模型只验证应用事务边界与回滚；真实 PostgreSQL 竞争需集成测试。
  mocks.transaction.mockImplementation((fn) => {
    const result = queue.then(async () => {
      const snapshot = structuredClone({ rows, users, invites, redemptions });
      try { return await fn(tx); } catch (error) { ({ rows, users, invites, redemptions } = snapshot); throw error; }
    });
    queue = result.catch(() => undefined); return result;
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("REQ-AUTH 注册安全", () => {
  it("仅返回 public site key", async () => {
    expect(await (await publicConfig()).json()).toEqual({ siteKey: "test-public" });
  });
  it.each([POST, sendCode])("关闭注册同时保护建号和发码", async (handler) => {
    mocks.config.mockResolvedValue({ auth: { allowRegistration: false } });
    expect((await handler(request())).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["AUTH_URL", "TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "RESEND_API_KEY", "EMAIL_FROM"])("缺少 %s 时 fail closed", async (key) => {
    vi.stubEnv(key, "");
    expect((await POST(request())).status).toBe(503);
    expect((await sendCode(request())).status).toBe(503);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each([POST, sendCode])("非法 JSON 为 400，超大请求为 413", async (handler) => {
    expect((await handler(new Request("https://community.example", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await handler(request({ value: "x".repeat(17000) }))).status).toBe(413);
  });
  it.each(["密码".repeat(13), "x".repeat(73), "12345"])("拒绝不合规密码", async (password) => {
    expect((await POST(request({ ...input, password }))).status).toBe(400);
    expect(mocks.hash).not.toHaveBeenCalled();
  });
  it.each([{ success: false }, { success: true, hostname: "evil.example", action: "register" }, { success: true, hostname: "community.example", action: "login" }])("拒绝错误 Turnstile 结果 %j", async (result) => {
    mocks.fetch.mockImplementation(async () => Response.json(result));
    expect((await POST(request())).status).toBe(400);
    expect((await sendCode(request())).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("外部服务异常返回 503 且不记录秘密", async () => {
    mocks.fetch.mockRejectedValue(new Error("secret-provider-details"));
    expect((await POST(request())).status).toBe(503);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("没有 OTP 不允许建号", async () => {
    expect((await POST(request())).status).toBe(400);
    expect(users).toHaveLength(0);
  });
  it("邮箱精确域名直通，昵称和语言正确，验证码只存 SHA256", async () => {
    const code = await issue(" Student@CAU.EDU.CN ");
    expect(code).toMatch(/^\d{6}$/);
    expect(rows.every(r => /^[a-f0-9]{64}$/.test(r.token))).toBe(true);
    expect(rows.every(r => r.token !== code)).toBe(true);
    const response = await POST(request({ ...input, email: " Student@CAU.EDU.CN ", code }));
    expect(response.status).toBe(200);
    expect(users[0]).toMatchObject({ email: input.email, name: input.name, nickname: input.name, locale: "zh", emailVerified: expect.any(Date) });
    expect((await response.json()).password).toBeUndefined();
    expect(redemptions).toHaveLength(0);
    expect(mocks.lock).toHaveBeenCalled();
  });
  it("OTP 不能跨邮箱使用", async () => {
    const code = await issue();
    expect((await POST(request({ ...input, email: "other@cau.edu.cn", code }))).status).toBe(400);
  });
  it("过期边界和重放不得通过", async () => {
    const code = await issue();
    vi.setSystemTime(Date.now() + 600000);
    expect((await POST(request({ ...input, code }))).status).toBe(400);
    expect(users).toHaveLength(0);
  });
  it("并发提交同一 OTP 仅建一个用户，重放拒绝", async () => {
    const code = await issue();
    const results = await Promise.all([POST(request({ ...input, code })), POST(request({ ...input, code }))]);
    expect(results.map(r => r.status).sort()).toEqual([200, 400]);
    expect(users).toHaveLength(1);
    expect((await POST(request({ ...input, code }))).status).toBe(400);
  });
  it("60 秒重发冷却和并发发码只投递一次", async () => {
    const results = await Promise.all([sendCode(request(input)), sendCode(request(input))]);
    expect(results.map(r => r.status).sort()).toEqual([200, 429]);
    expect(mocks.fetch.mock.calls.filter(([url]) => String(url).includes("resend"))).toHaveLength(1);
    vi.setSystemTime(Date.now() + 60000);
    expect((await sendCode(request(input))).status).toBe(200);
  });
  it("5 次错误有状态锁定，正确码和重发也不能绕过", async () => {
    const code = await issue();
    const wrong = code === "000000" ? "000001" : "000000";
    for (let n = 0; n < 5; n++) expect([400, 429]).toContain((await POST(request({ ...input, code: wrong }))).status);
    expect((await POST(request({ ...input, code }))).status).toBe(429);
    vi.setSystemTime(Date.now() + 61000);
    expect((await sendCode(request(input))).status).toBe(429);
    expect(users).toHaveLength(0);
  });
  it("重发使旧码失效且不清除错误计数", async () => {
    const old = await issue();
    const wrong = old === "000000" ? "000001" : "000000";
    for (let n = 0; n < 4; n++) await POST(request({ ...input, code: wrong }));
    vi.setSystemTime(Date.now() + 60000);
    const code = await issue();
    await POST(request({ ...input, code: code === "000000" ? "000001" : "000000" }));
    expect((await POST(request({ ...input, code }))).status).toBe(429);
  });
  it.each(["user@sub.cau.edu.cn", "user@cau.edu.cn.evil.com", "user@example.com"])("%s 不享受精确域名直通", async (email) => {
    const code = await issue(email);
    expect((await POST(request({ ...input, email, code }))).status).toBe(400);
    expect(users).toHaveLength(0);
  });
  it("外部邮箱扣邀请码并记录兑换", async () => {
    const email = "user@example.com", code = await issue(email);
    expect((await POST(request({ ...input, email, code, inviteCode: "INVITE" }))).status).toBe(200);
    expect(invites[0].usedCount).toBe(1);
    expect(redemptions).toHaveLength(1);
    expect(mocks.updateInvite).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ usedCount: { lt: 5 }, maxUses: 5 }) }));
  });
  it.each(["expired", "exhausted", "cap", "zero"])("拒绝过期/耗尽/超过硬上限/零额度邀请码 %s", async (mode) => {
    if (mode === "expired") invites[0].expiresAt = new Date();
    if (mode === "exhausted") { invites[0].maxUses = 2; invites[0].usedCount = 2; }
    if (mode === "cap") { invites[0].maxUses = 100; invites[0].usedCount = 5; }
    if (mode === "zero") invites[0].maxUses = 0;
    const email = "user@example.com", code = await issue(email);
    expect((await POST(request({ ...input, email, code, inviteCode: "INVITE" }))).status).toBe(400);
    expect(users).toHaveLength(0);
  });
  it("邀请码竞争失败不消耗 OTP、不创建用户", async () => {
    const email = "user@example.com", code = await issue(email);
    mocks.updateInvite.mockResolvedValueOnce({ count: 0 });
    expect((await POST(request({ ...input, email, code, inviteCode: "INVITE" }))).status).toBe(400);
    expect(users).toHaveLength(0);
    expect((await POST(request({ ...input, email, code, inviteCode: "INVITE" }))).status).toBe(200);
  });
  it("建号失败回滚邀请码与 OTP，保留已有账号", async () => {
    const email = "user@example.com", code = await issue(email);
    mocks.createUser.mockRejectedValueOnce(new Error("数据库异常"));
    expect((await POST(request({ ...input, email, code, inviteCode: "INVITE" }))).status).toBe(500);
    expect(invites[0].usedCount).toBe(0);
    expect(redemptions).toHaveLength(0);
    expect((await POST(request({ ...input, email, code, inviteCode: "INVITE" }))).status).toBe(200);
  });
  it("邮箱已经注册时不覆盖老账号", async () => {
    const code = await issue();
    users.push({ id: "old", email: input.email, username: "old", password: "old-password", emailVerified: null });
    expect((await POST(request({ ...input, code }))).status).toBe(409);
    expect(users).toHaveLength(1);
    expect(users[0].password).toBe("old-password");
  });
  it("每个邮箱 10 分钟最多发送 5 封", async () => {
    for (let n = 0; n < 5; n++) { await issue(); vi.setSystemTime(Date.now() + 60000); }
    expect((await sendCode(request(input))).status).toBe(429);
  });
  it("重发的新码不能利用旧窗口结束重置错误次数", async () => {
    const first = await issue();
    const wrong = first === "000000" ? "000001" : "000000";
    for (let n = 0; n < 4; n++) await POST(request({ ...input, code: wrong }));
    vi.setSystemTime(Date.now() + 590000);
    const current = await issue();
    vi.setSystemTime(Date.now() + 11000);
    await POST(request({ ...input, code: current === "000000" ? "000001" : "000000" }));
    expect((await POST(request({ ...input, code: current }))).status).toBe(429);
  });
  it("锁定结束后重新发码可以正常注册", async () => {
    const code = await issue();
    for (let n = 0; n < 5; n++) await POST(request({ ...input, code: code === "000000" ? "000001" : "000000" }));
    vi.setSystemTime(Date.now() + 600000);
    const fresh = await issue();
    expect((await POST(request({ ...input, code: fresh, password: "密".repeat(24), username: undefined }))).status).toBe(200);
    expect(users[0].username).toMatch(/^u_[a-f0-9]{24}$/);
  });
  it("并发争抢邀请码最后一次仅成功一个，失败方 OTP 可重试", async () => {
    invites[0].usedCount = 4;
    const firstEmail = "first@example.com", secondEmail = "second@example.com";
    const first = await issue(firstEmail), second = await issue(secondEmail);
    const results = await Promise.all([
      POST(request({ ...input, username: "first", email: firstEmail, code: first, inviteCode: "INVITE" })),
      POST(request({ ...input, username: "second", email: secondEmail, code: second, inviteCode: "INVITE" })),
    ]);
    expect(results.map(r => r.status).sort()).toEqual([200, 400]);
    expect(invites[0].usedCount).toBe(5);
    expect(users).toHaveLength(1);
    expect(redemptions).toHaveLength(1);
  });
  it("兑换记录失败时整笔事务回滚", async () => {
    const email = "user@example.com", code = await issue(email);
    mocks.redeem.mockRejectedValueOnce(new Error("写入失败"));
    expect((await POST(request({ ...input, email, code, inviteCode: "INVITE" }))).status).toBe(500);
    expect(users).toHaveLength(0);
    expect(invites[0].usedCount).toBe(0);
    expect((await POST(request({ ...input, email, code, inviteCode: "INVITE" }))).status).toBe(200);
  });
  it("投递失败清除本次验证码但保留冷却", async () => {
    mocks.fetch.mockImplementation(async (url: string) => url.includes("siteverify") ? Response.json({ success: true, hostname: "community.example", action: "register" }) : Response.json({}, { status: 503 }));
    expect((await sendCode(request(input))).status).toBe(503);
    expect((await sendCode(request(input))).status).toBe(429);
    expect((await POST(request(input))).status).toBe(400);
  });
});
