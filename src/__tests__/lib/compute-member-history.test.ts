// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), readOnly: vi.fn(), user: vi.fn(), anchor: vi.fn(), rows: vi.fn(), groups: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));
import { readComputeHistory } from "@/server/compute/member-history";

const date = new Date("2026-10-09T12:00:00.000Z");
function task(index: number, state = "AUTHORIZED") {
  return { id: `fixture-task-${String(index).padStart(3, "0")}`, modelId: "fixture-model", state, revision: 1,
    authorizedPoints: 10, settledPoints: state === "SETTLED" ? 4 : state === "RELEASED" ? 0 : null,
    maxUnits: 10, units: state === "SETTLED" ? 4 : null,
    price: { unit: "token", ratePoints: 1, rateUnits: 1, maxUnits: 10 },
    outcome: state === "SETTLED" ? "partial" : null, policyVersion: "fixture-policy", createdAt: date,
    startedAt: ["RUNNING", "UNCERTAIN", "SETTLED"].includes(state) ? date : null,
    finishedAt: ["SETTLED", "RELEASED"].includes(state) ? date : null,
    requestHash: "private-hash", idempotencyKey: "private-idempotency", events: [{ evidenceRef: "private-evidence" }],
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.readOnly.mockResolvedValue(0); mocks.user.mockResolvedValue({ quotaPoints: 99, deletedAt: null });
  mocks.anchor.mockResolvedValue({ id: "fixture-cursor", createdAt: date }); mocks.rows.mockResolvedValue([]); mocks.groups.mockResolvedValue([]);
  mocks.transaction.mockImplementation(async callback => callback({ $executeRaw: mocks.readOnly, user: { findUnique: mocks.user }, computeTask: { findFirst: mocks.anchor, findMany: mocks.rows, groupBy: mocks.groups } }));
});
describe("member-owned compute history", () => {
  it("uses an explicit read-only RepeatableRead snapshot for balance, page and full totals", async () => {
    expect(await readComputeHistory("member")).toEqual({ tasks: [], nextCursor: null, summary: { availablePoints: 99, reservedPoints: 0, consumedPoints: 0, refundedPoints: 0, taskCount: 0 } });
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" });
    expect(mocks.readOnly.mock.calls[0][0].join("")).toBe("SET TRANSACTION READ ONLY");
    expect(mocks.readOnly.mock.invocationCallOrder[0]).toBeLessThan(mocks.user.mock.invocationCallOrder[0]);
    expect(mocks.rows).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "member", provider: "toonflow" }, take: 21, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }));
  });
  it("returns 20 tasks plus a stable last-visible cursor without exposing the lookahead task", async () => {
    mocks.rows.mockResolvedValue(Array.from({ length: 21 }, (_, i) => task(100 - i)));
    const result = await readComputeHistory("member");
    expect(result.tasks).toHaveLength(20); expect(result.nextCursor).toBe("fixture-task-081");
    expect(result.tasks.some(t => t.taskId === "fixture-task-080")).toBe(false);
  });
  it("does not return a cursor when exactly one full page remains", async () => {
    mocks.rows.mockResolvedValue(Array.from({ length: 20 }, (_, i) => task(i)));
    expect((await readComputeHistory("member")).nextCursor).toBeNull();
  });
  it("validates cursor ownership/provider before seeking by timestamp and id", async () => {
    await readComputeHistory("member", { cursor: "fixture-cursor", filter: "active" });
    expect(mocks.anchor).toHaveBeenCalledWith({ where: { userId: "member", provider: "toonflow", id: "fixture-cursor" }, select: { id: true, createdAt: true } });
    expect(mocks.rows).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "member", provider: "toonflow", state: { in: ["AUTHORIZED", "RUNNING", "UNCERTAIN"] }, OR: [{ createdAt: { lt: date } }, { createdAt: date, id: { lt: "fixture-cursor" } }] } }));
  });
  it("uses the same stable error for absent, foreign or unsupported-provider cursors", async () => {
    mocks.anchor.mockResolvedValue(null);
    await expect(readComputeHistory("member", { cursor: "foreign-task" })).rejects.toMatchObject({ code: "COMPUTE_CURSOR_INVALID", status: 400 });
    expect(mocks.rows).not.toHaveBeenCalled(); expect(mocks.groups).not.toHaveBeenCalled();
  });
  it.each([{ cursor: "" }, { cursor: "short" }, { cursor: "x".repeat(161) }, { cursor: "private task" }, { cursor: 10 }, { filter: "RUNNING" }, { userId: "victim" }, { limit: 100 }, null])("rejects malformed or authority-bearing queries before any database access: %j", async query => {
    await expect(readComputeHistory("member", query)).rejects.toMatchObject({ code: "COMPUTE_CURSOR_INVALID", status: 400 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each([null, { quotaPoints: 99, deletedAt: date }])("rejects missing/deleted accounts before looking up any cursor", async account => {
    mocks.user.mockResolvedValue(account);
    await expect(readComputeHistory("member", { cursor: "fixture-cursor" })).rejects.toMatchObject({ code: "COMPUTE_ACCOUNT_UNAVAILABLE", status: 404 });
    expect(mocks.anchor).not.toHaveBeenCalled(); expect(mocks.rows).not.toHaveBeenCalled();
  });
  it("allows flagged accounts to read history and does not consult spending configuration", async () => {
    mocks.user.mockResolvedValue({ quotaPoints: 2, deletedAt: null, flagged: true });
    expect((await readComputeHistory("member")).summary.availablePoints).toBe(2);
    expect(mocks.user).toHaveBeenCalledWith({ where: { id: "member" }, select: { quotaPoints: true, deletedAt: true } });
  });
  it.each([["settled", "SETTLED"], ["released", "RELEASED"]])("filters %s while full summary stays independent of the page", async (filter, state) => {
    mocks.groups.mockResolvedValue([
      { state: "AUTHORIZED", _sum: { authorizedPoints: 200, settledPoints: null }, _count: { _all: 20 } },
      { state: "RUNNING", _sum: { authorizedPoints: 200, settledPoints: null }, _count: { _all: 20 } },
      { state: "UNCERTAIN", _sum: { authorizedPoints: 100, settledPoints: null }, _count: { _all: 10 } },
      { state: "SETTLED", _sum: { authorizedPoints: 100, settledPoints: 40 }, _count: { _all: 10 } },
      { state: "RELEASED", _sum: { authorizedPoints: 50, settledPoints: 0 }, _count: { _all: 5 } },
    ]);
    const result = await readComputeHistory("member", { filter });
    expect(mocks.rows).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "member", provider: "toonflow", state } }));
    expect(mocks.groups).toHaveBeenCalledWith({ by: ["state"], where: { userId: "member", provider: "toonflow" }, _sum: { authorizedPoints: true, settledPoints: true }, _count: { _all: true } });
    expect(result.summary).toEqual({ availablePoints: 99, reservedPoints: 500, consumedPoints: 40, refundedPoints: 110, taskCount: 65 });
  });
  it("whitelists taskView plus startedAt and derives refunds only for terminal states", async () => {
    mocks.rows.mockResolvedValue([task(1, "UNCERTAIN"), task(2, "SETTLED"), task(3, "RELEASED")]);
    const result = await readComputeHistory("member");
    expect(result.tasks.map(t => t.refundedPoints)).toEqual([0, 6, 10]);
    expect(result.tasks[0].startedAt).toBe(date.toISOString()); expect(result.tasks[2].startedAt).toBeNull();
    expect(Object.keys(result.tasks[0]).sort()).toEqual(["taskId", "modelId", "state", "revision", "authorizedPoints", "settledPoints", "refundedPoints", "maxUnits", "units", "unit", "outcome", "policyVersion", "createdAt", "startedAt", "finishedAt"].sort());
    expect(JSON.stringify(result)).not.toMatch(/private-|ratePoints|rateUnits|idempotencyKey|requestHash|evidenceRef|events/);
    const selected = mocks.rows.mock.calls[0][0].select;
    for (const key of ["userId", "provider", "requestHash", "idempotencyKey", "events"]) expect(selected).not.toHaveProperty(key);
  });
  it("rejects invalid authenticated subjects without querying an unrelated account", async () => {
    await expect(readComputeHistory("")).rejects.toMatchObject({ code: "COMPUTE_ACCOUNT_UNAVAILABLE", status: 404 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});