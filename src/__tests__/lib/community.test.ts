import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { CheckIn, User, XpLedger } from "@prisma/client";
import { checkIn, getCommunityDay, getCommunityMe, getContributions } from "@/lib/community";
import { checkInBonus, XP_RULES } from "@/lib/level";

const mock = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mock.transaction } }));

type Member = Pick<User, "id" | "xp" | "nickname" | "emailVerified" | "flagged" | "deletedAt" | "lastCheckInAt" | "checkInStreak" | "verified" | "communityPoints" | "avatarFrameKey" | "chatBubbleKey">;
let users: Member[];
let checkIns: CheckIn[];
let ledger: XpLedger[];
let failLedger: boolean;
let failCheckIn: boolean;
let failXp: boolean;
let growthEvents: Array<{ userId: string; type: string; sourceId: string; xp: number; points: number }>;
let tx: ReturnType<typeof transactionClient>;

function eligible(user: Member) {
  return !user.deletedAt && !user.flagged && user.emailVerified !== null;
}

function publicCheckIn(record: CheckIn) {
  const { id, day, streak, xpAwarded, createdAt } = record;
  return { id, day, streak, xpAwarded, createdAt };
}

function transactionClient() {
  let locked = false;
  // Model both SQL statements and their atomic effects without connecting to a database.
  return {
    $queryRaw: vi.fn(async (sql: TemplateStringsArray, ...values: unknown[]) => {
      const statement = sql.join("?");
      if (statement.includes("FOR UPDATE")) {
        expect(statement).toMatch(/SELECT[\s\S]*FROM users[\s\S]*FOR UPDATE/);
        expect(statement).toContain('"deletedAt" IS NULL AND flagged = false AND "emailVerified" IS NOT NULL');
        expect(values).toEqual(["self"]);
        locked = true;
        return users.filter((u) => u.id === values[0] && eligible(u)).map((u) => ({ ...u }));
      }
      expect(locked).toBe(true);
      expect(statement).toMatch(/WITH inserted AS[\s\S]*ON CONFLICT \("userId", day\) DO NOTHING/);
      expect(statement).toContain('ON CONFLICT ("userId", type, "sourceType", "sourceId") DO NOTHING');
      expect(statement).toContain('WHERE id = ? AND EXISTS (SELECT 1 FROM inserted)');
      expect(statement).toContain("'CHECK_IN', 'check_in'");
      expect(statement).toContain("'CHECK_IN'::\"XpReason\"");
      expect(statement).toContain('NOT EXISTS (SELECT 1 FROM inserted)');
      const [id, userId, day, streak, xpAwarded, createdAt] = values as [string, string, string, number, number, Date];
      expect([values[6], values[13], values[15], values[19], values[23]]).toEqual(Array(5).fill(userId));
      const prior = checkIns.find((record) => record.userId === userId && record.day === day);
      if (prior) {
        return [{ ...publicCheckIn(prior), alreadyCheckedIn: true }];
      }
      if (failCheckIn) throw new Error("签到写入失败");
      const record = { id, userId, day, streak, xpAwarded, createdAt };
      checkIns.push(record);
      const user = users.find((u) => u.id === userId)!;
      const rewards = JSON.parse(values[8] as string) as Array<{ sourceId: string; points: number }>;
      for (const reward of rewards) {
        if (!growthEvents.some((event) => event.userId === userId && event.type === "LEVEL_REWARD" && event.sourceId === reward.sourceId)) {
          growthEvents.push({ userId, type: "LEVEL_REWARD", sourceId: reward.sourceId, xp: 0, points: reward.points });
          user.communityPoints += reward.points;
        }
      }
      if (failXp) throw new Error("XP更新失败");
      user.xp += xpAwarded;
      user.checkInStreak = streak;
      user.lastCheckInAt = createdAt;
      growthEvents.push({ userId, type: "CHECK_IN", sourceId: id, xp: xpAwarded, points: 0 });
      if (failLedger) throw new Error("流水写入失败");
      ledger.push({ id: values[18] as string, userId, amount: xpAwarded, reason: "CHECK_IN", refType: "checkIn", refId: id, note: values[21] as string, createdAt });
      return [{ ...publicCheckIn(record), alreadyCheckedIn: false }];
    }),
    user: {
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) => users.find((u) => u.id === where.id && eligible(u)) ?? null),
      findMany: vi.fn(async ({ take }: { take: number }) => users.filter(eligible).sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id)).slice(0, take)),
      count: vi.fn(async ({ where }: { where: { xp: { gt: number } } }) => users.filter((u) => eligible(u) && u.xp > where.xp.gt).length),

    },
    checkIn: {
      findUnique: vi.fn(async ({ where }: { where: { userId_day: { userId: string; day: string } } }) => checkIns.find((c) => c.userId === where.userId_day.userId && c.day === where.userId_day.day) ?? null),

    },
    xpLedger: {
      findMany: vi.fn(async ({ where, take }: { where: { userId: string }; take: number }) => ledger.filter((l) => l.userId === where.userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id)).slice(0, take).map(({ id, amount, reason, note, createdAt }) => ({ id, amount, reason, note, createdAt }))),
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-07T16:00:00Z"));
  users = [{ id: "self", xp: 0, nickname: null, emailVerified: new Date(), flagged: false, deletedAt: null, lastCheckInAt: null, checkInStreak: 0, verified: false, communityPoints: 0, avatarFrameKey: "default", chatBubbleKey: "default" }];
  checkIns = [];
  ledger = [];
  failLedger = false;
  failCheckIn = false;
  failXp = false;
  growthEvents = [];
  tx = transactionClient();
  let queue = Promise.resolve();
  mock.transaction.mockReset().mockImplementation((work: (client: typeof tx) => Promise<unknown>) => {
    const result = queue.then(async () => {
      const snapshot = structuredClone({ users, checkIns, ledger, growthEvents });
      try { return await work(tx); } catch (error) {
        users = snapshot.users; checkIns = snapshot.checkIns; ledger = snapshot.ledger; growthEvents = snapshot.growthEvents;
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

  it("零级、无认证徽章但邮箱已验证的用户可签到，所有写入同事务", async () => {
    const result = await checkIn("self");
    expect(result.alreadyCheckedIn).toBe(false);
    expect(result.checkIn).toMatchObject({ day: "2026-09-08", streak: 1, xpAwarded: XP_RULES.CHECK_IN.base });
    expect(users[0].xp).toBe(XP_RULES.CHECK_IN.base);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ userId: "self", reason: "CHECK_IN", amount: XP_RULES.CHECK_IN.base, refId: checkIns[0].id });
    expect(mock.transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.$queryRaw.mock.calls[0][0].join("?")).toContain("FOR UPDATE");
    expect(tx.$queryRaw.mock.calls[1][0].join("?")).toContain("WITH inserted AS");
    expect(mock.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "ReadCommitted", timeout: 20000, maxWait: 10000 });
    expect(growthEvents).toEqual([{ userId: "self", type: "CHECK_IN", sourceId: checkIns[0].id, xp: XP_RULES.CHECK_IN.base, points: 0 }]);
  });

  it("重复签到返回已有记录，不再修改XP、streak或流水", async () => {
    const first = await checkIn("self");
    const second = await checkIn("self");
    expect(second.alreadyCheckedIn).toBe(true);
    expect(second.checkIn).toEqual(first.checkIn);
    expect(checkIns).toHaveLength(1);
    expect(ledger).toHaveLength(1);
    expect(users[0].xp).toBe(XP_RULES.CHECK_IN.base);
    expect(growthEvents.filter((event) => event.type === "CHECK_IN")).toHaveLength(1);
  });

  it("达到等级奖励只发一次，重复签到和次日签到不能重发", async () => {
    users[0].xp = 98;
    await checkIn("self");
    expect(users[0].communityPoints).toBe(20);
    expect(growthEvents.filter((event) => event.type === "LEVEL_REWARD")).toHaveLength(1);
    await checkIn("self");
    vi.setSystemTime(new Date("2026-09-08T16:00:00Z"));
    await checkIn("self");
    expect(users[0].communityPoints).toBe(20);
    expect(growthEvents.filter((event) => event.type === "LEVEL_REWARD")).toHaveLength(1);
    expect(growthEvents.filter((event) => event.type === "CHECK_IN")).toHaveLength(2);
  });

  it("等级积分、成长记录与签到流水一起回滚", async () => {
    users[0].xp = 98;
    failLedger = true;
    await expect(checkIn("self")).rejects.toThrow("流水写入失败");
    expect(users[0]).toMatchObject({ xp: 98, communityPoints: 0, checkInStreak: 0, lastCheckInAt: null });
    expect(growthEvents).toHaveLength(0);
    expect(checkIns).toHaveLength(0);
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

  it("等待行锁跨过午夜后使用获得锁时的上海日期", async () => {
    vi.setSystemTime(new Date("2026-09-07T15:59:59Z"));
    const original = tx.$queryRaw.getMockImplementation()!;
    tx.$queryRaw.mockImplementationOnce(async (...args) => {
      vi.setSystemTime(new Date("2026-09-07T16:00:01Z"));
      return original(...args);
    });
    expect((await checkIn("self")).checkIn.day).toBe("2026-09-08");
  });

  it("跨年时昨日判断仍连续", async () => {
    vi.setSystemTime(new Date("2026-12-31T16:00:00Z"));
    users[0].lastCheckInAt = new Date("2026-12-30T16:00:01Z");
    users[0].checkInStreak = 6;
    expect((await checkIn("self")).checkIn).toMatchObject({ day: "2027-01-01", streak: 7, xpAwarded: 10 });
  });

  it("签到写入失败不能更新XP或写入流水", async () => {
    failCheckIn = true;
    await expect(checkIn("self")).rejects.toThrow("签到写入失败");
    expect(users[0].xp).toBe(0);
    expect(checkIns).toHaveLength(0);
    expect(ledger).toHaveLength(0);
    expect(growthEvents).toHaveLength(0);
  });

  it("XP更新失败回滚已创建的签到", async () => {
    failXp = true;
    await expect(checkIn("self")).rejects.toThrow("XP更新失败");
    expect(checkIns).toHaveLength(0);
    expect(ledger).toHaveLength(0);
    expect(users[0].xp).toBe(0);
    expect(growthEvents).toHaveLength(0);
  });

  it("流水失败回滚XP和签到，再次重试可成功", async () => {
    failLedger = true;
    await expect(checkIn("self")).rejects.toThrow("流水写入失败");
    expect(users[0].xp).toBe(0);
    expect(users[0].lastCheckInAt).toBeNull();
    expect(checkIns).toHaveLength(0);
    expect(ledger).toHaveLength(0);
    expect(growthEvents).toHaveLength(0);
    failLedger = false;
    expect((await checkIn("self")).alreadyCheckedIn).toBe(false);
  });

  it.each([
    { flagged: true }, { deletedAt: new Date() }, { emailVerified: null, verified: true },
  ])("数据库账号不合格则拒绝（%j）", async (patch) => {
    Object.assign(users[0], patch);
    await expect(checkIn("self")).rejects.toMatchObject({ status: 403 });
    expect(checkIns).toHaveLength(0);
    expect(ledger).toHaveLength(0);
    expect(growthEvents).toHaveLength(0);
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
    expect(tx.xpLedger.findMany).toHaveBeenCalledWith({ where: { userId: "self" }, take: 50, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, amount: true, reason: true, note: true, createdAt: true, appeal: { select: { status: true } } } });
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
