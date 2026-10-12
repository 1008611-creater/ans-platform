// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ transaction: vi.fn(), readOnly: vi.fn(), user: vi.fn(), anchor: vi.fn(), rows: vi.fn(), workflow: vi.fn(), api: vi.fn(), voice: vi.fn(), market: vi.fn(), template: vi.fn(), legacyWorkflow: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: m.transaction } }));
import { readQuotaHistory } from "@/server/quota/history";
import { quotaAdminOverview } from "@/server/quota/operations";
vi.mock("@/server/integrations/ldxp-recharge", () => ({ listLdxpRechargeOrders: vi.fn().mockResolvedValue([]), ldxpRechargeEnabled: () => false }));
import { personalQuotaLedgerWhere } from "@/server/quota/ledger-scope";
const exam = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/server/quota/exam-reservations", () => ({ readExamReservations: exam.read }));
const date = new Date("2026-10-10T00:00:00Z");
beforeEach(() => {
  vi.resetAllMocks(); exam.read.mockResolvedValue({ reservedPoints: 0, pendingCount: 0, items: [] }); m.user.mockResolvedValue({ quotaPoints: 1.25, deletedAt: null });
  m.voice.mockResolvedValue([]);
  m.anchor.mockResolvedValue({ id: "entry-anchor", createdAt: date }); m.rows.mockResolvedValue([]);
  m.workflow.mockResolvedValue({ _sum: { authorizedPoints: 0.25 }, _count: { _all: 1 } });
  m.api.mockResolvedValue({ _sum: { authorizedPoints: 0.1 }, _count: { _all: 2 } });
  m.market.mockResolvedValue({ _sum: { amount: 10 }, _count: { _all: 1 } });
  m.template.mockResolvedValue({ _sum: { costPoints: 0 }, _count: { _all: 0 } });
  m.legacyWorkflow.mockResolvedValue({ _sum: { costPoints: 0 }, _count: { _all: 0 } });
  m.transaction.mockImplementation(fn => fn({ $executeRaw: m.readOnly, user: { findUnique: m.user }, quotaLedger: { findFirst: m.anchor, findMany: m.rows }, computeTask: { aggregate: m.workflow }, apiComputeRequest: { aggregate: m.api, findMany: m.voice }, marketPointsEscrow: { aggregate: m.market }, run: { aggregate: m.template }, workflowRun: { aggregate: m.legacyWorkflow } }));
});
it("combines pending reservations with the authoritative spendable balance", async () => {
  expect(await readQuotaHistory("member")).toMatchObject({ availablePoints: 1.25, reservedPoints: 10.35, pendingCount: 4 });
  expect(m.api).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "member", state: { in: ["AUTHORIZED", "RUNNING", "UNCERTAIN"] } } }));
});
it.each([{ userId: "victim" }, { cursor: "bad" }, { limit: 100 }, null])("rejects invalid queries %j", async raw => {
  await expect(readQuotaHistory("member", raw)).rejects.toMatchObject({ status: 400 }); expect(m.transaction).not.toHaveBeenCalled();
});
it("rejects a foreign cursor without reading entries", async () => {
  m.anchor.mockResolvedValue(null);
  await expect(readQuotaHistory("member", { cursor: "foreign-entry" })).rejects.toMatchObject({ status: 400 });
  expect(m.anchor).toHaveBeenCalledWith({ where: { id: "foreign-entry", userId: "member", ...personalQuotaLedgerWhere() }, select: { id: true, createdAt: true } }); expect(m.rows).not.toHaveBeenCalled();
});
it("rejects deleted users", async () => {
  m.user.mockResolvedValue({ quotaPoints: 1, deletedAt: date }); await expect(readQuotaHistory("member")).rejects.toMatchObject({ status: 404 }); expect(m.rows).not.toHaveBeenCalled();
});
it("reads only member-safe fields and paginates in stable order", async () => {
  m.rows.mockResolvedValue(Array.from({ length: 31 }, (_, i) => ({ id: `entry-${i}`, amount: -0.1, balanceAfter: 1, reason: "RUN_COST", refType: "api_compute_request", createdAt: date })));
  const result = await readQuotaHistory("member", { cursor: "entry-anchor" });
  expect(result.entries).toHaveLength(30); expect(result.nextCursor).toBe("entry-29");
  expect(m.rows).toHaveBeenCalledWith(expect.objectContaining({ select: { id: true, amount: true, balanceAfter: true, reason: true, refType: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 31, where: expect.objectContaining({ userId: "member" }) }));
});

it("includes legacy template and workflow holds without double-counting zero-cost metered parents", async () => {
  m.template.mockResolvedValue({ _sum: { costPoints: 0.25 }, _count: { _all: 1 } });
  m.legacyWorkflow.mockResolvedValue({ _sum: { costPoints: 0.5 }, _count: { _all: 1 } });
  expect(await readQuotaHistory("member")).toMatchObject({ reservedPoints: 11.1, pendingCount: 6 });
  expect(m.template).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "member", status: { in: ["QUEUED", "RUNNING"] }, costPoints: { gt: 0 } } }));
});

it("includes outstanding exam holds and keeps account identifiers out of the statement", async () => {
 exam.read.mockResolvedValue({ reservedPoints: 0.125001, pendingCount: 2, items: [{ id: "private-ref", userId: "member", points: 0.125001, createdAt: date.toISOString() }] });
 const result = await readQuotaHistory("member");
 expect(result).toMatchObject({ reservedPoints: 10.475001, pendingCount: 6 });
 expect(exam.read).toHaveBeenCalledWith(expect.anything(), "member");
 expect(JSON.stringify(result)).not.toContain("private-ref");
});
it("labels exam debits while retaining ordinary refund labels", async () => {
 m.rows.mockResolvedValue([{ id: "debit", amount: -1, reason: "RUN_COST", refType: "exam-analysis", createdAt: date }, { id: "refund", amount: 1, reason: "REFUND", refType: "exam-analysis", createdAt: date }]);
 expect((await readQuotaHistory("member")).entries.map(e => e.category)).toEqual(["EXAM_ANALYSIS", "REFUND"]);
});

it("filters team allocations before pagination while retaining legacy null references", async () => {
  await readQuotaHistory("member", { cursor: "entry-anchor" });
  const scope = personalQuotaLedgerWhere();
  expect(scope).toEqual({ AND: [
    { reason: { not: "TEAM_GRANT" } },
    { OR: [{ refType: null }, { refType: { notIn: ["team", "team_member"] } }] },
  ] });
  expect(m.anchor).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "entry-anchor", userId: "member", ...scope } }));
  const request = m.rows.mock.calls[0][0];
  expect(request.where.AND).toEqual(scope.AND);
  expect(request.where.OR).toHaveLength(2);
  expect(request.where.OR[0]).toEqual({ createdAt: { lt: date } });
  expect(request.take).toBe(31);
});
it("rejects a same-account team cursor before querying the personal statement", async () => {
  m.anchor.mockResolvedValue(null);
  await expect(readQuotaHistory("member", { cursor: "team-allocation" })).rejects.toMatchObject({ status: 400 });
  expect(m.anchor.mock.calls[0][0].where.AND).toEqual(personalQuotaLedgerWhere().AND);
  expect(m.rows).not.toHaveBeenCalled();
});

it("shows free voice usage without inventing balance ledger entries", async () => {
 m.voice.mockResolvedValue([{ id: "voice1", state: "SETTLED", modelId: "mimo-v2.5-tts", settledPoints: 0, authorizedPoints: 0, maxUnits: 9, createdAt: date }]);
 const result = await readQuotaHistory("member");
 expect(result.voiceUsage).toEqual([{ id: "voice1", state: "SETTLED", modelId: "mimo-v2.5-tts", settledPoints: 0, authorizedPoints: 0, maxUnits: 9, createdAt: date.toISOString() }]);
 expect(result.entries).toEqual([]);
 expect(m.voice).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "member", provider: "mimo-tts" } }));
});

it("allows the full read-only statement to complete on a remote database within a bounded transaction", async () => {
 await readQuotaHistory("member");
 expect(m.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead", maxWait: 10000, timeout: 30000 });
});

it("keeps the expanded admin overview read-only and bounded while preserving numeric personal mismatches", async () => {
 const list = vi.fn().mockResolvedValue([]);
 const count = vi.fn().mockResolvedValue(0);
 const personalMismatch = vi.fn().mockResolvedValue([{ count: 2 }]);
 const stored = vi.fn().mockResolvedValue({ _sum: { byteLength: 52 } });
 const readonly = vi.fn();
 m.transaction.mockImplementationOnce(fn => fn({
  $executeRaw: readonly, $queryRaw: personalMismatch,
  user: { findMany: list }, quotaOperation: { findMany: list },
  apiComputeRequest: { count, findMany: list }, marketOrder: { findMany: list },
  voiceResult: { aggregate: stored },
 }));
 const overview = await quotaAdminOverview();
 expect(m.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead", maxWait: 10000, timeout: 30000 });
 expect(readonly).toHaveBeenCalledTimes(1);
 expect(Array.from(readonly.mock.calls[0][0]).join("")).toBe("SET TRANSACTION READ ONLY");
 expect(overview).toMatchObject({ mismatchCount: 2, pending: 0, voice: { pendingCount: 0, recentCalls: 0, cachedAudioBytes: 52 } });
 const sql = Array.from(personalMismatch.mock.calls[0][0]).join("");
 expect(sql).toContain("TEAM_GRANT");
 expect(sql).toContain('l."refType" IS NULL');
 expect(sql).toContain("team_member");
 expect(sql).not.toMatch(/UPDATE|INSERT|DELETE/);
 expect(count).toHaveBeenCalledTimes(3);
 expect(stored).toHaveBeenCalledWith({ _sum: { byteLength: true } });
});
