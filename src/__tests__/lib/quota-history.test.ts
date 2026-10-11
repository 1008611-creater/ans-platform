// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ transaction: vi.fn(), readOnly: vi.fn(), user: vi.fn(), anchor: vi.fn(), rows: vi.fn(), workflow: vi.fn(), api: vi.fn(), market: vi.fn(), template: vi.fn(), legacyWorkflow: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: m.transaction } }));
import { readQuotaHistory } from "@/server/quota/history";
const date = new Date("2026-10-10T00:00:00Z");
beforeEach(() => {
  vi.resetAllMocks(); m.user.mockResolvedValue({ quotaPoints: 1.25, deletedAt: null });
  m.anchor.mockResolvedValue({ id: "entry-anchor", createdAt: date }); m.rows.mockResolvedValue([]);
  m.workflow.mockResolvedValue({ _sum: { authorizedPoints: 0.25 }, _count: { _all: 1 } });
  m.api.mockResolvedValue({ _sum: { authorizedPoints: 0.1 }, _count: { _all: 2 } });
  m.market.mockResolvedValue({ _sum: { amount: 10 }, _count: { _all: 1 } });
  m.template.mockResolvedValue({ _sum: { costPoints: 0 }, _count: { _all: 0 } });
  m.legacyWorkflow.mockResolvedValue({ _sum: { costPoints: 0 }, _count: { _all: 0 } });
  m.transaction.mockImplementation(fn => fn({ $executeRaw: m.readOnly, user: { findUnique: m.user }, quotaLedger: { findFirst: m.anchor, findMany: m.rows }, computeTask: { aggregate: m.workflow }, apiComputeRequest: { aggregate: m.api }, marketPointsEscrow: { aggregate: m.market }, run: { aggregate: m.template }, workflowRun: { aggregate: m.legacyWorkflow } }));
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
  expect(m.anchor).toHaveBeenCalledWith({ where: { id: "foreign-entry", userId: "member" }, select: { id: true, createdAt: true } }); expect(m.rows).not.toHaveBeenCalled();
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
