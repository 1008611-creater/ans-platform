import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { GET, PATCH } from "@/app/api/user/profile/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NICKNAME_COOLDOWN_MS } from "@/lib/display-name";

const mocks = vi.hoisted(() => ({
  lock: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const now = new Date("2026-09-07T00:00:00Z");
const current = () => ({
  id: "user1", name: "旧昵称", nickname: "旧昵称", nicknameSetAt: null as Date | null,
  username: "testuser", email: "test@example.com", avatar: null, bio: "旧简介",
  customLinks: [], role: "USER", createdAt: new Date("2024-01-01"),
  deletedAt: null as Date | null, flagged: false,
});
let user: ReturnType<typeof current>;

function patch(body: unknown) {
  return PATCH(new NextRequest("http://localhost:3000/api/user/profile", {
    method: "PATCH", body: JSON.stringify(body),
  }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  user = current();
  vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
  vi.mocked(db.user.findUnique).mockResolvedValue(user as never);
  // 仅模拟事务协议与返回值；不模拟锁调度，不作为真实数据库并发证明。
  mocks.lock.mockImplementation(async () => user ? [user] : []);
  mocks.update.mockImplementation(async ({ data }) => ({ ...user, ...data }));
  mocks.transaction.mockImplementation(async (callback) => callback({
    $queryRaw: mocks.lock, user: { update: mocks.update },
  }));
  vi.mocked(db.user.update).mockResolvedValue(user as never);
});
afterEach(() => vi.useRealTimers());

describe("本人 GET profile", () => {
  it("无会话返回 401", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect((await GET()).status).toBe(401);
  });
  it("无用户返回 404", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    expect((await GET()).status).toBe(404);
  });
  it.each(["deletedAt", "flagged"])("会话有效仍拒绝 %s 账号", async (field) => {
    Object.assign(user, { [field]: field === "deletedAt" ? now : true });
    expect((await GET()).status).toBe(403);
  });
  it("保留本人 email、昵称和冷却，不返回内部状态字段", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({ id: user.id, email: user.email, nickname: user.nickname });
    expect(result).not.toHaveProperty("flagged");
    expect(result).not.toHaveProperty("deletedAt");
    expect(db.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "user1" },
      select: expect.objectContaining({ email: true, deletedAt: true, flagged: true }),
    }));
  });
});

describe("PATCH profile 昵称回归", () => {
  it("无会话返回 401 且不读写数据库", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect((await patch({ name: "新昵称", username: "testuser" })).status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("缺少会话用户 ID 返回 401", async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);
    expect((await patch({ name: "新昵称", username: "testuser" })).status).toBe(401);
  });
  it("非法 JSON 返回 400 而不是 500", async () => {
    const response = await PATCH(new NextRequest("http://localhost:3000/api/user/profile", {
      method: "PATCH", body: "{",
    }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("validation_error");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each([null, [], { username: "bad name" }, { username: "a".repeat(31) }, { name: "新昵称" }])(
    "非法输入返回 400：%j", async (body) => {
      expect((await patch(body)).status).toBe(400);
      expect(mocks.update).not.toHaveBeenCalled();
    },
  );
  it("未传 name/nickname 时允许更新其他字段", async () => {
    const response = await patch({ username: "test_user_123", bio: "新简介" });
    expect(response.status).toBe(200);
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({ username: "test_user_123", bio: "新简介" });
    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty("nicknameSetAt");
  });
  it.each(["name", "nickname"])("%s 新昵称首次修改同步双字段并记录冷却", async (field) => {
    const response = await patch({ [field]: "  新昵称  ", username: "testuser" });
    expect(response.status).toBe(200);
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({ name: "新昵称", nickname: "新昵称", nicknameSetAt: now });
    expect(await response.json()).toMatchObject({ name: "新昵称", nickname: "新昵称", email: user.email });
  });
  it("同时传入时以显式 nickname 为准，不允许 name 独立写入", async () => {
    expect((await patch({ name: "独立改名", nickname: "新昵称", username: "testuser" })).status).toBe(200);
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({ name: "新昵称", nickname: "新昵称" });
  });
  it.each(["name", "nickname"])("%s 不可绕过 30 天冷却", async (field) => {
    user.nicknameSetAt = new Date(now.getTime() - 10 * 86400000);
    const response = await patch({ [field]: "新昵称", username: "testuser" });
    expect(response.status).toBe(429);
    expect((await response.json()).error).toBe("nickname_cooldown");
    expect(response.headers.get("Retry-After")).toBe(String(20 * 86400));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });
  it.each([NICKNAME_COOLDOWN_MS, NICKNAME_COOLDOWN_MS + 1])("满 30 天边界允许修改（%i）", async (elapsed) => {
    user.nicknameSetAt = new Date(now.getTime() - elapsed);
    expect((await patch({ nickname: "新昵称", username: "testuser" })).status).toBe(200);
    expect(mocks.update.mock.calls[0][0].data.nicknameSetAt).toEqual(now);
  });
  it("距满 30 天尚差 1 毫秒仍拒绝", async () => {
    user.nicknameSetAt = new Date(now.getTime() - NICKNAME_COOLDOWN_MS + 1);
    const response = await patch({ nickname: "新昵称", username: "testuser" });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("1");
  });
  it.each(["name", "nickname"])("%s 与现有昵称相同不刷新冷却", async (field) => {
    user.nicknameSetAt = now;
    const response = await patch({ [field]: "  旧昵称  ", username: "testuser", bio: "新简介" });
    expect(response.status).toBe(200);
    const data = mocks.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("nicknameSetAt");
    expect(data.bio).toBe("新简介");
  });
  it("相同显式昵称可修正旧 name，不能顺带独立改 name", async () => {
    user.name = "内部旧名";
    user.nicknameSetAt = now;
    expect((await patch({ name: "绕过名", nickname: "旧昵称", username: "testuser" })).status).toBe(200);
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({ name: "旧昵称", nickname: "旧昵称" });
    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty("nicknameSetAt");
  });
  it.each(["旧昵称", null])("未传 nickname 且旧 name 相同可更新简介，即使旧 name 是邮箱（nickname=%s）", async (nickname) => {
    Object.assign(user, { name: "legacy@example.com", nickname, nicknameSetAt: now });
    const response = await patch({ name: "legacy@example.com", username: "testuser", bio: "新简介" });
    expect(response.status).toBe(200);
    const data = mocks.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("nicknameSetAt");
    expect(data).not.toHaveProperty("nickname");
    expect(data.bio).toBe("新简介");
  });
  it("旧 name 作为首个显式昵称且未改名不启动冷却", async () => {
    Object.assign(user, { nickname: null, nicknameSetAt: null });
    expect((await patch({ nickname: user.name, username: "testuser" })).status).toBe(200);
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({ name: user.name, nickname: user.name });
    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty("nicknameSetAt");
  });
  for (const field of ["name", "nickname"]) {
    it.each(["一", "a".repeat(41), "a\u0000b", "ab\n", "a\u007fb", "a\u0085b", "a\u200bb", "ab@example.com"])(
      `${field} 拒绝非法新昵称 %j`, async (value) => {
        const response = await patch({ [field]: value, username: "testuser" });
        expect(response.status).toBe(400);
        expect((await response.json()).error).toBe("validation_error");
        expect(mocks.update).not.toHaveBeenCalled();
        expect(db.user.update).not.toHaveBeenCalled();
      },
    );
  }
  it.each(["deletedAt", "flagged", "unknown"])("只改其他字段仍从数据库拒绝 %s 用户", async (field) => {
    if (field === "unknown") {
      mocks.lock.mockResolvedValue([]);
      vi.mocked(db.user.findUnique).mockResolvedValue(null);
    } else Object.assign(user, { [field]: field === "deletedAt" ? now : true });
    const response = await patch({ name: user.name, username: "testuser", bio: "新简介" });
    expect(response.status).toBe(field === "unknown" ? 404 : 403);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });
  it("数据库事务协议：参数化锁行后才更新，禁止事务外先查后写", async () => {
    expect((await patch({ name: "新昵称", username: "testuser" })).status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    const [strings, ...values] = mocks.lock.mock.calls[0];
    expect(strings.join("?")).toMatch(/FROM\s+"users"[\s\S]*WHERE\s+"id"\s*=\s*\?[\s\S]*FOR UPDATE/i);
    expect(values).toEqual(["user1"]);
    expect(mocks.lock.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
    expect(mocks.transaction.mock.calls[0][1]).toMatchObject({ isolationLevel: "ReadCommitted" });
  });
  it("锁后读取的冷却覆盖陈旧会话或事务外快照", async () => {
    mocks.lock.mockResolvedValue([{ ...user, nickname: "并发请求已写入", nicknameSetAt: now }]);
    const response = await patch({ name: "后来的修改", username: "testuser" });
    expect(response.status).toBe(429);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each([["username"], ["users_username_ci_unique"]])("保留用户名唯一冲突 409：%j", async (target) => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002", meta: { target }, clientVersion: "6.19.0",
    });
    mocks.update.mockRejectedValue(error);
    vi.mocked(db.user.update).mockRejectedValue(error);
    const response = await patch({ name: "新昵称", username: "takenuser" });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("username_taken");
  });
  it("省略可选字段不清空，显式空值仍可清空", async () => {
    expect((await patch({ nickname: "新昵称", username: "testuser" })).status).toBe(200);
    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty("bio");
    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty("avatar");
    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty("customLinks");
    expect((await patch({ name: user.name, username: "testuser", avatar: "", bio: "", customLinks: [] })).status).toBe(200);
    expect(mocks.update.mock.calls[1][0].data).toMatchObject({ avatar: null, bio: null, customLinks: Prisma.DbNull });
  });
});
