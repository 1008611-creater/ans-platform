// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgriPersonalTask, Prisma } from "@prisma/client";
import type { DbTransaction } from "@/lib/db";
import { agriTaskHistoryPageSchema, agriTaskHistoryQuerySchema, type AgriTaskEditable } from "@/contracts/agri-tasks";
const mocks = vi.hoisted(() => ({ locks: [] as string[], db: {
  user: { findUnique: vi.fn() }, competition: { findUnique: vi.fn() },
  agriPersonalTask: { findFirst: vi.fn() }, agriTaskShare: { findMany: vi.fn(), findFirst: vi.fn() },
  agriTaskEvent: { findMany: vi.fn(), findUnique: vi.fn() }, $transaction: vi.fn(), $queryRaw: vi.fn(),
} }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
import { getAgriTask, getAgriTaskHistory } from "@/server/competitions/agrihackathon/tasks";
const now = new Date("2026-10-14T00:00:00Z");
const editable: AgriTaskEditable = { title: "Private task", stage: "PREPARATION", status: "NOT_STARTED", priority: "NORMAL",
  due: { state: "UNKNOWN", at: null }, acceptanceCriteria: "Verify the result", collaborationNotes: "",
  inputRequirements: { schemaVersion: 1, items: [] }, blockingInput: null, completionResult: null };
const original: AgriPersonalTask = { id: "task-a", ownerId: "owner", competitionId: "edition", title: editable.title,
  stage: editable.stage, status: editable.status, priority: editable.priority, dueState: "UNKNOWN", dueAt: null,
  acceptanceCriteria: editable.acceptanceCriteria, collaborationNotes: null, inputRequirements: editable.inputRequirements,
  blockingInput: null, completionResult: null, completedAt: null, completedById: null, revision: 123,
  templateKey: null, createdAt: now, updatedAt: now };
type Event = { taskId: string; revision: number; action: string; snapshot: Prisma.JsonValue; createdAt: Date };
let row: AgriPersonalTask | null; let events: Event[];
function makeEvents(count: number, taskId = "task-a"): Event[] {
  return Array.from({ length: count }, (_, index) => {
    const revision = count - index;
    return { taskId, revision, action: revision === 1 ? "create" : "update", createdAt: now,
      snapshot: { schemaVersion: 1, task: revision === 2 ? { ...editable, status: "DONE", completionResult: "Early verified delivery" } : editable } };
  });
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.locks.length = 0; vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", "edition");
  row = { ...original }; events = makeEvents(123);
  mocks.db.user.findUnique.mockResolvedValue({ flagged: false, deletedAt: null });
  mocks.db.competition.findUnique.mockResolvedValue({ id: "edition" });
  mocks.db.agriPersonalTask.findFirst.mockImplementation(async () => row);
  mocks.db.agriTaskShare.findMany.mockResolvedValue([]);
  mocks.db.agriTaskShare.findFirst.mockResolvedValue({ id: "share" });
  mocks.db.$transaction.mockImplementation(async (run: (tx: DbTransaction) => unknown) => run(mocks.db as unknown as DbTransaction));
  mocks.db.$queryRaw.mockImplementation(async (strings: TemplateStringsArray) => {
    const sql = strings.join("?");
    if (sql.includes("clock_timestamp")) return [{ now }];
    if (sql.includes("SELECT EXISTS")) return [{ present: false }];
    mocks.locks.push(sql.includes("agri_workspaces") ? "workspace" : sql.includes("agri_personal_tasks") ? "task" : "account"); return [];
  });
  mocks.db.agriTaskEvent.findUnique.mockImplementation(async ({ where }: { where: { taskId_revision: { taskId: string; revision: number } } }) => {
    const cursor = where.taskId_revision;
    return events.some(event => event.taskId === cursor.taskId && event.revision === cursor.revision) ? { revision: cursor.revision } : null;
  });
  mocks.db.agriTaskEvent.findMany.mockImplementation(async ({ where, take }: { where: { taskId: string; revision?: { lt: number } }; take: number }) =>
    events.filter(event => event.taskId === where.taskId && (where.revision === undefined || event.revision < where.revision.lt)).slice(0, take));
});
afterEach(() => vi.unstubAllEnvs());
describe("owner-only task history pagination", () => {
  it("reads all 123 immutable events across 50/50/23 pages, including early completion", async () => {
    const first = await getAgriTaskHistory("owner", "task-a");
    const second = await getAgriTaskHistory("owner", "task-a", first.nextBeforeRevision!);
    const third = await getAgriTaskHistory("owner", "task-a", second.nextBeforeRevision!);
    expect([first.history.length, second.history.length, third.history.length]).toEqual([50, 50, 23]);
    expect([first.nextBeforeRevision, second.nextBeforeRevision, third.nextBeforeRevision]).toEqual([74, 24, null]);
    const revisions = [...first.history, ...second.history, ...third.history].map(event => event.revision);
    expect(revisions).toEqual(Array.from({ length: 123 }, (_, i) => 123 - i));
    expect(third.history.find(event => event.revision === 2)?.task.completionResult).toBe("Early verified delivery");
    expect(third.history.at(-1)?.action).toBe("create");
    expect([first, second, third].every(page => agriTaskHistoryPageSchema.safeParse(page).success)).toBe(true);
    expect(mocks.db.agriTaskEvent.findMany).toHaveBeenNthCalledWith(2, { where: { taskId: "task-a", revision: { lt: 74 } }, orderBy: { revision: "desc" }, take: 51, select: { revision: true, action: true, snapshot: true, createdAt: true } });
    expect(mocks.locks.slice(0, 3)).toEqual(["workspace", "account", "task"]);
    expect(mocks.db.$transaction).toHaveBeenCalledWith(expect.any(Function), { maxWait: 10000, timeout: 20000 });
  });
  it.each([0, 1, 49, 50, 51])("probes one extra event at a %s-event boundary", async count => {
    events = makeEvents(count); const result = await getAgriTaskHistory("owner", "task-a");
    expect(result.history).toHaveLength(Math.min(count, 50)); expect(result.nextBeforeRevision).toBe(count > 50 ? 2 : null);
    expect(mocks.db.agriTaskEvent.findMany.mock.calls[0][0].take).toBe(51);
  });
  it("seeds detail with exactly the same page and accurate truncation, regardless of task revision", async () => {
    const detail = await getAgriTask("owner", "task-a");
    expect(detail.history).toHaveLength(50); expect(detail.historyNextBeforeRevision).toBe(74); expect(detail.historyTruncated).toBe(true);
    events = makeEvents(50);
    const short = await getAgriTask("owner", "task-a");
    expect(short.history).toHaveLength(50); expect(short.historyTruncated).toBe(false); expect(short.historyNextBeforeRevision).toBeNull();
  });
  it.each(["shared-reader", "stranger"])("returns the same 404 to %s without reading history or shares", async actor => {
    await expect(getAgriTaskHistory(actor, "task-a", 74)).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(mocks.db.agriTaskEvent.findUnique).not.toHaveBeenCalled(); expect(mocks.db.agriTaskEvent.findMany).not.toHaveBeenCalled();
    expect(mocks.db.agriTaskShare.findFirst).not.toHaveBeenCalled(); expect(mocks.db.agriTaskShare.findMany).not.toHaveBeenCalled();
  });
  it("does not reveal missing-task history", async () => {
    row = null; await expect(getAgriTaskHistory("owner", "missing")).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(mocks.db.agriTaskEvent.findMany).not.toHaveBeenCalled();
  });
  it("requires the cursor event to exist in this task, not another task", async () => {
    events = [...makeEvents(10), ...makeEvents(74, "other-task")];
    await expect(getAgriTaskHistory("owner", "task-a", 74)).rejects.toMatchObject({ code: "INVALID_INPUT", status: 400 });
    expect(mocks.db.agriTaskEvent.findUnique).toHaveBeenCalledWith({ where: { taskId_revision: { taskId: "task-a", revision: 74 } }, select: { revision: true } });
    expect(mocks.db.agriTaskEvent.findMany).not.toHaveBeenCalled();
  });
  it.each([null, { flagged: true, deletedAt: null }, { flagged: false, deletedAt: now }])("rejects an unavailable owner before task/event reads: %j", async account => {
    mocks.db.user.findUnique.mockResolvedValue(account);
    await expect(getAgriTaskHistory("owner", "task-a")).rejects.toMatchObject({ code: "ACCOUNT_UNAVAILABLE" });
    expect(mocks.db.agriPersonalTask.findFirst).not.toHaveBeenCalled(); expect(mocks.db.agriTaskEvent.findMany).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1.5, NaN, Infinity, 2147483647])("rejects a non-finite/integer service cursor %s before a transaction", async cursor => {
    await expect(getAgriTaskHistory("owner", "task-a", cursor)).rejects.toMatchObject({ code: "INVALID_INPUT", status: 400 });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it.each([null, { schemaVersion: 2, task: editable }, { schemaVersion: 1, task: { ...editable, title: "" } }])("fails corrupt persisted history with a stable server error: %j", async snapshot => {
    events[0].snapshot = snapshot;
    await expect(getAgriTaskHistory("owner", "task-a")).rejects.toMatchObject({ code: "AGRI_TASK_HISTORY_INVALID", status: 500 });
  });
  it("keeps share/reference change metadata without expanding linked private content", async () => {
    events = [{ taskId: "task-a", revision: 1, action: "revokeShare", createdAt: now, snapshot: {
      schemaVersion: 1, task: editable,
      shareChange: { recipientId: "reader", expiresAt: null, previousExpiresAt: now.toISOString(), previouslyActive: true },
      referenceChange: { referenceId: "reference", action: "detach" },
    } }];
    const result = await getAgriTaskHistory("owner", "task-a");
    expect(result.history[0].shareChange?.previouslyActive).toBe(true);
    expect(result.history[0].referenceChange).toEqual({ referenceId: "reference", action: "detach" });
    expect(mocks.db.agriTaskShare.findFirst).not.toHaveBeenCalled();
  });
});
describe("strict history contracts", () => {
  it.each(["", "0", "01", "+1", "-1", "1.0", "1e2", " 1", "1 ", "2147483647", "999999999999"])("rejects cursor %j", beforeRevision => {
    expect(agriTaskHistoryQuerySchema.safeParse({ beforeRevision }).success).toBe(false);
  });
  it("accepts absent and maximum finite integer cursors only, with no extra keys", () => {
    expect(agriTaskHistoryQuerySchema.parse({})).toEqual({});
    expect(agriTaskHistoryQuerySchema.parse({ beforeRevision: "2147483646" })).toEqual({ beforeRevision: 2147483646 });
    expect(agriTaskHistoryQuerySchema.safeParse({ ownerId: "forged" }).success).toBe(false);
  });
});
