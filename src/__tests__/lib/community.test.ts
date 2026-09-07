import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { CheckIn, User, XpLedger } from "@prisma/client";
import { checkIn, getCommunityDay, getCommunityMe, getContributions } from "@/lib/community";
import { checkInBonus, XP_RULES } from "@/lib/level";

const mock = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mock.transaction } }));

type Member = Pick<User, "id" | "xp" | "nickname" | "emailVerified" | "flagged" | "deletedAt" | "lastCheckInAt" | "checkInStreak" | "verified">;
let users: Member[];
let checkIns: CheckIn[];
let ledger: XpLedger[];
let failLedger: boolean;
let tx: ReturnType<typeof transactionClient>;

function eligible(user: Member) {
  return !user.deletedAt && !user.flagged && user.emailVerified !== null;
}

function transactionClient() {
  let locked = false;
  return {
    $queryRaw: vi.fn(async (sql: TemplateStringsArray, ...values: unknown[]) => {
      expect(sql.join("?")).toMatch(/SELECT[\s\S]*FROM "users"[\s\S]*FOR UPDATE/);
      expect(values).toEqual(["self"]);
      locked = true;
      return users.filter((u) => u.id === values[0]).map((u) => ({ id: u.id }));
    }),
    user: {
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) => users.find((u) => u.id === where.id && eligible(u)) ?? null),
      findMany: vi.fn(async ({ take }: { take: number }) => users.filter(eligible).sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id)).slice(0, take)),
      count: vi.fn(async ({ where }: { where: { xp: { gt: number } } }) => users.filter((u) => eligible(u) && u.xp > where.xp.gt).length),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { xp: { increment: number }; checkInStreak: number; lastCheckInAt: Date } }) => {
        expect(locked).toBe(true);
        const user = users.find((u) => u.id === where.id)!;
        user.xp += data.xp.increment;
        user.checkInStreak = data.checkInStreak;
        user.lastCheckInAt = data.lastCheckInAt;
        return user;
      }),
    },
    checkIn: {
      findUnique: vi.fn(async ({ where }: { where: { userId_day: { userId: string; day: string } } }) => checkIns.find((c) => c.userId === where.userId_day.userId && c.day === where.userId_day.day) ?? null),
      create: vi.fn(async ({ data }: { data: Omit<CheckIn, "id" | "createdAt"> & { createdAt?: Date } }) => {
        expect(locked).toBe(true);
        if (checkIns.some((c) => c.userId === data.userId && c.day === data.day)) throw Object.assign(new Error("唯一约束冲突"), { code: "P2002" });
        const record = { id: `check-${checkIns.length}`, createdAt: new Date(), ...data };
        checkIns.push(record);
        return record;
      }),
    },
    xpLedger: {
      create: vi.fn(async ({ data }: { data: Pick<XpLedger, "userId" | "amount" | "reason"> & Partial<XpLedger> }) => {
        expect(locked).toBe(true);
        if (failLedger) throw new Error("流水写入失败");
        const record = { id: `ledger-${ledger.length}`, createdAt: new Date(), note: null, refId: null, refType: null, ...data };
        ledger.push(record);
        return record;
      }),
      findMany: vi.fn(async ({ where, take }: { where: { userId: string }; take: number }) => ledger.filter((l) => l.userId === where.userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id)).slice(0, take).map(({ id, amount, reason, note, createdAt }) => ({ id, amount, reason, note, createdAt }))),
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-07T16:00:00Z"));
  users = [{ id: "self", xp: 0, nickname: null, emailVerified: new Date(), flagged: false, deletedAt: null, lastCheckInAt: null, checkInStreak: 0, verified: false }];
  checkIns = [];
  ledger = [];
  failLedger = false;
  tx = transactionClient();
  let queue = Promise.resolve();
  mock.transaction.mockReset().mockImplementation((work: (client: typeof tx) => Promise<unknown>) => {
    const result = queue.then(async () => {
      const snapshot = structuredClone({ users, checkIns, ledger });
      try { return await work(tx); } catch (error) {
        users = snapshot.users; checkIns = snapshot.checkIns; ledger = snapshot.ledger;
        throw error;
      }
    });
    queue = result.then(() => undefined, () => undefined);
    return result;
  });
});
afterEach(() => vi.useRealTimers());

const activeWhere = { deletedAt: null, flagged: false, emailVerified: { not: null } };

describe("社区上海日期与事务签到", () => {
  it.each([
    ["2026-09-07T15:59:59.999Z", "2026-09-07"],
    ["2026-09-07T16:00:00Z", "2026-09-08"],
    ["2026-12-31T16:00:00Z", "2027-01-01"],
    ["2028-02-29T15:59:59Z", "2028-02-29"],
  ])("%s 按上海日期归属 %s", (instant, day) => expect(getCommunityDay(new Date(instant))).toBe(day));

  it("零级、无认证徽章但邮箱已验证的用户可签到，三个写入同事务", async () => {
    const result = await checkIn("self");
    expect(result.alreadyCheckedIn).toBe(false);
    expect(result.checkIn).toMatchObject({ day: "2026-09-08", streak: 1, xpAwarded: XP_RULES.CHECK_IN.base });
    expect(users[0].xp).toBe(XP_RULES.CHECK_IN.base);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ userId: "self", reason: "CHECK_IN", amount: XP_RULES.CHECK_IN.base, refId: checkIns[0].id });
    expect(mock.transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "self", ...activeWhere } }));
  });

  it("重复签到返回已有记录，不再修改XP、streak或流水", async () => {
    const first = await checkIn("self");
    const second = await checkIn("self");
    expect(second.alreadyCheckedIn).toBe(true);
    expect(second.checkIn).toEqual(first.checkIn);
    expect(checkIns).toHaveLength(1);
    expect(ledger).toHaveLength(1);
    expect(tx.user.update).toHaveBeenCalledTimes(1);
  });

  it("20个并发签到请求只计分一次（事务串行模拟）", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => checkIn("self")));
    expect(results.filter((r) => !r.alreadyCheckedIn)).toHaveLength(1);
    expect(new Set(results.map((r) => r.checkIn.id)).size).toBe(1);
    expect(checkIns).toHaveLength(1);
    expect(ledger).toHaveLength(1);
    expect(users[0].xp).toBe(XP_RULES.CHECK_IN.base);
  });

  it.each([2, 3, 7, 14, 30, 31])("昨日已签到时连续%d天，复用bonus规则", async (streak) => {
    users[0].lastCheckInAt = new Date("2026-09-06T16:01:00Z");
    users[0].checkInStreak = streak - 1;
    const result = await checkIn("self");
    expect(result.checkIn.streak).toBe(streak);
    expect(result.checkIn.xpAwarded).toBe(XP_RULES.CHECK_IN.base + checkInBonus(streak));
  });

  it("中断一天即重置连续天数，不按24小时时差误判", async () => {
    users[0].lastCheckInAt = new Date("2026-09-06T15:59:59Z");
    users[0].checkInStreak = 30;
    expect((await checkIn("self")).checkIn.streak).toBe(1);
  });

  it("跨上海午夜可再次签到并递增streak", async () => {
    vi.setSystemTime(new Date("2026-09-07T15:59:59Z"));
    await checkIn("self");
    vi.setSystemTime(new Date("2026-09-07T16:00:00Z"));
    expect((await checkIn("self")).checkIn.streak).toBe(2);
    expect(checkIns.map((c) => c.day)).toEqual(["2026-09-07", "2026-09-08"]);
  });

  it("流水失败回滚XP和签到，再次重试可成功", async () => {
    failLedger = true;
    await expect(checkIn("self")).rejects.toThrow("流水写入失败");
    expect(users[0].xp).toBe(0);
    expect(users[0].lastCheckInAt).toBeNull();
    expect(checkIns).toHaveLength(0);
    expect(ledger).toHaveLength(0);
    failLedger = false;
    expect((await checkIn("self")).alreadyCheckedIn).toBe(false);
  });

  it.each([
    { flagged: true }, { deletedAt: new Date() }, { emailVerified: null, verified: true },
  ])("数据库账号不合格则拒绝（%j）", async (patch) => {
    Object.assign(users[0], patch);
    await expect(checkIn("self")).rejects.toMatchObject({ status: 403 });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.checkIn.create).not.toHaveBeenCalled();
  });

  it("不存在的用户不能签到", async () => {
    users = [];
    await expect(checkIn("self")).rejects.toMatchObject({ status: 403 });
  });

  it("签到后被封禁的用户重复请求仍被拒绝", async () => {
    await checkIn("self");
    users[0].flagged = true;
    await expect(checkIn("self")).rejects.toMatchObject({ status: 403 });
    expect(ledger).toHaveLength(1);
  });
});

describe("本人数据与贡献榜隐私", () => {
  it("本人仅返回最近50条流水，按创建时间和id稳定倒序", async () => {
    ledger = Array.from({ length: 61 }, (_, i) => ({ id: `l-${String(i).padStart(2, "0")}`, userId: i === 60 ? "other" : "self", amount: 1, reason: "CHECK_IN", note: null, refId: "private", refType: "private", createdAt: new Date(i * 1000) }));
    const result = await getCommunityMe("self");
    expect(result.xp).toBe(0);
    expect(result.level.level.index).toBe(0);
    expect(result.ledger).toHaveLength(50);
    expect(result.ledger[0].id).toBe("l-59");
    expect(result.ledger[49].id).toBe("l-10");
    expect(tx.xpLedger.findMany).toHaveBeenCalledWith({ where: { userId: "self" }, take: 50, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, amount: true, reason: true, note: true, createdAt: true } });
    expect(JSON.stringify(result)).not.toMatch(/email|username|nickname|userId|refId|refType/);
  });

  it("本人当日签到状态来自CheckIn唯一记录", async () => {
    await checkIn("self");
    const result = await getCommunityMe("self");
    expect(result.todayCheckIn).toMatchObject({ day: "2026-09-08", xpAwarded: 5 });
    expect(result.checkInStreak).toBe(1);
  });

  it("榜单最多20条，昵称空匿名，同分相同竞赛名次、id稳定，返回榜外本人位置", async () => {
    const self = { ...users[0], xp: 1 };
    users = [self, ...Array.from({ length: 25 }, (_, i) => ({ ...self, id: `u-${String(i).padStart(2, "0")}`, xp: 100 - Math.floor(i / 2), nickname: i === 1 ? " 小林 " : i === 2 ? "" : "  " })), { ...self, id: "banned", xp: 999, flagged: true }, { ...self, id: "deleted", xp: 999, deletedAt: new Date() }, { ...self, id: "unverified", xp: 999, emailVerified: null, verified: true }];
    const result = await getContributions("self");
    expect(result.top).toHaveLength(20);
    expect(result.top.slice(0, 4).map((u) => u.rank)).toEqual([1, 1, 3, 3]);
    expect(result.top.slice(0, 3).map((u) => u.id)).toEqual(["u-00", "u-01", "u-02"]);
    expect(result.top[0].nickname).toBe("匿名同学");
    expect(result.top[1].nickname).toBe("小林");
    expect(result.top[2].nickname).toBe("匿名同学");
    expect(result.me).toMatchObject({ id: "self", rank: 26, xp: 1 });
    expect(Object.keys(result.top[0]).sort()).toEqual(["id", "level", "nickname", "rank", "xp"]);
    expect(tx.user.findMany).toHaveBeenCalledWith({ where: activeWhere, select: { id: true, nickname: true, xp: true }, take: 20, orderBy: [{ xp: "desc" }, { id: "asc" }] });
    expect(tx.user.count).toHaveBeenCalledWith({ where: { ...activeWhere, xp: { gt: 1 } } });
    expect(mock.transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "RepeatableRead" }));
  });

  it("全员同分时本人即使在20名外也排名第一", async () => {
    users.push(...Array.from({ length: 25 }, (_, i) => ({ ...users[0], id: `a-${i}` })));
    const result = await getContributions("self");
    expect(result.top).toHaveLength(20);
    expect(result.top.every((u) => u.rank === 1)).toBe(true);
    expect(result.me.rank).toBe(1);
  });

  it.each([getCommunityMe, getContributions])("读取也校验数据库账号资格", async (read) => {
    users[0].emailVerified = null;
    await expect(read("self")).rejects.toMatchObject({ status: 403 });
  });
});
