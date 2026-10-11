// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ transaction: vi.fn(), read: vi.fn(), update: vi.fn(), balance: vi.fn(), ledger: vi.fn(), lock: vi.fn(), pool: vi.fn(), claimPool: vi.fn(), auth: vi.fn(), credit: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: m.transaction } }));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
import { adjustQuota, normalizeQuotaAmount, refundQuota } from "@/server/quota/service";
import { POST } from "@/app/api/quota/claim/route";
const tx = { user: { findUnique: m.read, updateMany: m.update, findUniqueOrThrow: m.balance, update: m.credit }, quotaLedger: { create: m.ledger }, $queryRaw: m.lock, quotaPool: { findFirst: m.pool, updateMany: m.claimPool } };
beforeEach(() => {
  vi.resetAllMocks(); m.transaction.mockImplementation(fn => fn(tx));
  m.auth.mockResolvedValue({ user: { id: "member" } });
  m.read.mockResolvedValue({ role: "ADMIN", flagged: false, deletedAt: null, adminPermissions: ["USERS_MANAGE"], quotaClaimedAt: null });
  m.update.mockResolvedValue({ count: 1 }); m.balance.mockResolvedValue({ quotaPoints: 0.25 });
  m.pool.mockResolvedValue({ id: "pool", name: "test", totalPoints: BigInt(100), claimedPoints: BigInt(0), perUserPoints: 1 });
  m.claimPool.mockResolvedValue({ count: 1 }); m.credit.mockResolvedValue({ quotaPoints: 1.125 });
});
describe("credit integrity", () => {
  it.each([NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER])("rejects unsafe amount %s", value => expect(() => normalizeQuotaAmount(value)).toThrow());
  it("keeps six-digit precision", () => expect(normalizeQuotaAmount(0.1234564)).toBe(0.123456));
  it.each([0, NaN, Infinity])("rejects invalid adjustment %s", async amount => {
    await expect(adjustQuota("admin", "member", amount, "correction")).rejects.toThrow(); expect(m.transaction).not.toHaveBeenCalled();
  });
  it("requires a meaningful note", async () => {
    await expect(adjustQuota("admin", "member", 1, " ")).rejects.toThrow(); expect(m.transaction).not.toHaveBeenCalled();
  });
  it.each([null, { role: "USER" }, { role: "ADMIN", flagged: true }, { role: "ADMIN", adminPermissions: [] }])("blocks unauthorized adjustment %j", async actor => {
    m.read.mockResolvedValue(actor); await expect(adjustQuota("actor", "member", 1, "correction")).rejects.toMatchObject({ status: 403 }); expect(m.update).not.toHaveBeenCalled();
  });
  it("guards negative adjustments atomically", async () => {
    await adjustQuota("admin", "member", -0.25, " correction ");
    expect(m.update).toHaveBeenCalledWith({ where: { id: "member", deletedAt: null, quotaPoints: { gte: 0.25 } }, data: { quotaPoints: { increment: -0.25 } } });
    expect(m.ledger).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: -0.25, balanceAfter: 0.25, refId: "admin", note: "correction" }) });
  });
  it("does not log rejected adjustments", async () => {
    m.update.mockResolvedValue({ count: 0 }); await expect(adjustQuota("admin", "member", -1, "correction")).rejects.toThrow(); expect(m.ledger).not.toHaveBeenCalled();
  });
  it("rejects negative refunds", async () => {
    await expect(refundQuota(tx as never, { userId: "member", costPoints: -1, ref: { type: "run", id: "r" }, note: "refund" })).rejects.toThrow(); expect(m.credit).not.toHaveBeenCalled();
  });
  it("locks eligibility and increments the actual balance", async () => {
    expect((await POST()).status).toBe(200);
    expect(m.lock.mock.invocationCallOrder[0]).toBeLessThan(m.read.mock.invocationCallOrder[0]);
    expect(m.credit).toHaveBeenCalledWith({ where: { id: "member" }, data: { quotaPoints: { increment: 1 }, quotaClaimedAt: expect.any(Date) }, select: { quotaPoints: true } });
    expect(m.ledger).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 1, balanceAfter: 1.125 }) });
  });
  it("rejects repeated claims", async () => {
    m.read.mockResolvedValue({ quotaClaimedAt: new Date() }); expect((await POST()).status).toBe(409); expect(m.claimPool).not.toHaveBeenCalled();
  });
  it("rejects flagged claims", async () => {
    m.read.mockResolvedValue({ flagged: true }); expect((await POST()).status).toBe(401); expect(m.claimPool).not.toHaveBeenCalled();
  });
  it("does not credit a lost pool race", async () => {
    m.claimPool.mockResolvedValue({ count: 0 }); expect((await POST()).status).toBe(410); expect(m.credit).not.toHaveBeenCalled(); expect(m.ledger).not.toHaveBeenCalled();
  });
});
