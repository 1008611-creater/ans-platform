// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  account: vi.fn(), expired: vi.fn(), interrupted: vi.fn(), pending: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  user: { findUnique: mocks.account },
  voiceResult: { deleteMany: mocks.expired },
  apiComputeRequest: { updateMany: mocks.interrupted, count: mocks.pending },
  $transaction: mocks.transaction,
} }));
import { readVoiceOffer, sweepVoiceUsage } from "@/server/voice/service";
import { VOICE_PROVIDER, VOICE_TIMEOUT_MS } from "@/server/voice/policy";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.account.mockResolvedValue({ id: "member", quotaPoints: 0, flagged: false, deletedAt: null });
  mocks.expired.mockResolvedValue({ count: 2 });
  mocks.interrupted.mockResolvedValue({ count: 3 });
  mocks.pending.mockResolvedValue(4);
  mocks.transaction.mockImplementation(() => { throw new Error("Unexpected interactive transaction"); });
});
afterEach(() => vi.useRealTimers());

describe("voice reads and maintenance release the shared connection pool", () => {
  it("checks the same account eligibility with one direct SELECT", async () => {
    await readVoiceOffer("member");
    expect(mocks.account).toHaveBeenCalledExactlyOnceWith({ where: { id: "member" }, select: { id: true, quotaPoints: true, flagged: true, deletedAt: true } });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each([
    [null, "ACCOUNT_UNAVAILABLE"],
    [{ id: "member", quotaPoints: 0, flagged: true, deletedAt: null }, "ACCOUNT_UNAVAILABLE"],
    [{ id: "member", quotaPoints: 0, flagged: false, deletedAt: new Date() }, "ACCOUNT_UNAVAILABLE"],
  ])("preserves account rejection for %j", async (account, code) => {
    mocks.account.mockResolvedValue(account);
    await expect(readVoiceOffer("member")).rejects.toMatchObject({ code });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("preserves expiry and provider/state predicates without an interactive transaction", async () => {
    vi.useFakeTimers(); const now = new Date("2026-10-14T12:00:00Z"); vi.setSystemTime(now);
    await expect(sweepVoiceUsage()).resolves.toEqual({ expiredAudio: 2, interrupted: 3, pending: 4 });
    expect(mocks.expired).toHaveBeenCalledExactlyOnceWith({ where: { expiresAt: { lte: now } } });
    expect(mocks.interrupted).toHaveBeenCalledExactlyOnceWith({ where: { provider: VOICE_PROVIDER, state: "RUNNING", startedAt: { lt: new Date(now.getTime() - 2 * VOICE_TIMEOUT_MS) } }, data: { state: "UNCERTAIN", outcome: "VOICE_INTERRUPTED_UNKNOWN" } });
    expect(mocks.pending).toHaveBeenCalledExactlyOnceWith({ where: { provider: VOICE_PROVIDER, state: "UNCERTAIN" } });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("coalesces overlapping callers and releases each query before the next starts", async () => {
    let finishDelete!: (result: { count: number }) => void;
    mocks.expired.mockReturnValue(new Promise(resolve => { finishDelete = resolve; }));
    const first = sweepVoiceUsage(); const second = sweepVoiceUsage();
    expect(second).toBe(first);
    expect(mocks.expired).toHaveBeenCalledTimes(1);
    expect(mocks.interrupted).not.toHaveBeenCalled();
    finishDelete({ count: 2 }); await Promise.all([first, second]);
    expect(mocks.interrupted).toHaveBeenCalledTimes(1);
    expect(mocks.pending).toHaveBeenCalledTimes(1);
    mocks.expired.mockResolvedValue({ count: 0 });
    await sweepVoiceUsage(); expect(mocks.expired).toHaveBeenCalledTimes(2);
  });

  it("shares maintenance across separately loaded route modules", async () => {
    let finishDelete!: (result: { count: number }) => void;
    mocks.expired.mockReturnValue(new Promise(resolve => { finishDelete = resolve; }));
    const first = sweepVoiceUsage();
    vi.resetModules();
    const reloaded = await import("@/server/voice/service");
    const second = reloaded.sweepVoiceUsage();
    expect(second).toBe(first); expect(mocks.expired).toHaveBeenCalledTimes(1);
    finishDelete({ count: 0 }); await Promise.all([first, second]);
  });

  it.each(["expired", "interrupted", "pending"] as const)("propagates %s failures and permits a safe subsequent retry", async phase => {
    const error = new Error("Maintenance unavailable"); mocks[phase].mockRejectedValueOnce(error);
    await expect(sweepVoiceUsage()).rejects.toBe(error);
    await expect(sweepVoiceUsage()).resolves.toEqual({ expiredAudio: 2, interrupted: 3, pending: 4 });
    expect(mocks.transaction).not.toHaveBeenCalled();
    // No settlement/refund or success fallback is introduced by the sweep.
    expect(mocks.interrupted.mock.calls.every(([args]) => args.data.state === "UNCERTAIN" && !("settledPoints" in args.data))).toBe(true);
  });
});
