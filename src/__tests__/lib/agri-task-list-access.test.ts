// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgriPersonalTask } from "@prisma/client";
import type { DbTransaction } from "@/lib/db";
const mocks = vi.hoisted(() => ({ events: [] as string[], db: {
  user: { findUnique: vi.fn() }, competition: { findUnique: vi.fn() },
  agriPersonalTask: { findMany: vi.fn() }, agriTaskShare: { findMany: vi.fn(), findFirst: vi.fn() },
  $transaction: vi.fn(), $queryRaw: vi.fn(),
} }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
import { listAgriTasks } from "@/server/competitions/agrihackathon/tasks";
const initial = new Date("2026-10-12T12:00:00.000Z");
const final = new Date("2026-10-12T12:00:00.100Z");
const at = (millis: number) => new Date(initial.getTime() + millis);
const task = (id: string, ownerId = "owner", millis = 0): AgriPersonalTask => ({
  id, ownerId, competitionId: "edition", title: "Private task " + id, stage: "PREPARATION", status: "NOT_STARTED", priority: "NORMAL",
  dueState: "CONFIRMED", dueAt: at(50), acceptanceCriteria: "Real acceptance criterion", collaborationNotes: null,
  inputRequirements: { schemaVersion: 1, items: [] }, blockingInput: null, completionResult: null, completedAt: null,
  completedById: null, revision: 1, templateKey: null, createdAt: new Date(initial.getTime() - millis), updatedAt: initial,
});
let rows: AgriPersonalTask[];
let shares: { taskId: string; userId: string; revokedAt: Date | null; expiresAt: Date | null }[];
beforeEach(() => {
  vi.resetAllMocks(); mocks.events.length = 0; vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", "edition");
  rows = [task("shared")]; shares = [{ taskId: "shared", userId: "reader", revokedAt: null, expiresAt: null }];
  mocks.db.user.findUnique.mockResolvedValue({ flagged: false, deletedAt: null });
  mocks.db.competition.findUnique.mockResolvedValue({ id: "edition" });
  mocks.db.$transaction.mockImplementation(async (fn: (tx: DbTransaction) => unknown) => fn(mocks.db as unknown as DbTransaction));
  let clockReads = 0;
  mocks.db.$queryRaw.mockImplementation(async (strings: TemplateStringsArray) => {
    const sql = strings.join("?");
    if (sql.includes("clock_timestamp")) { mocks.events.push("clock"); return [{ now: clockReads++ === 0 ? initial : final }]; }
    mocks.events.push(sql.includes("agri_workspaces") ? "workspace-lock" : "account-lock"); return [];
  });
  mocks.db.agriPersonalTask.findMany.mockImplementation(async () => { mocks.events.push("tasks"); return rows; });
  mocks.db.agriTaskShare.findMany.mockImplementation(async ({ where }: { where: { taskId: { in: string[] }; userId: string; revokedAt: null; OR: { expiresAt: null | { gt: Date } }[] } }) => {
    mocks.events.push("shares");
    return shares.filter(share => where.taskId.in.includes(share.taskId) && share.userId === where.userId && !share.revokedAt && (!share.expiresAt || share.expiresAt > initial)).map(({ taskId, expiresAt }) => ({ taskId, expiresAt }));
  });
});
afterEach(() => vi.unstubAllEnvs());
describe("task list share access at final database time", () => {
  it("removes a share that expires during page query before the response", async () => {
    shares[0].expiresAt = at(50);
    const result = await listAgriTasks("reader");
    expect(result.tasks).toEqual([]); expect(result.serverNow).toBe(final.toISOString());
    expect(mocks.events).toEqual(["workspace-lock", "account-lock", "clock", "tasks", "shares", "clock"]);
  });
  it("removes shares expiring during the batch query and strict final-time equality", async () => {
    mocks.db.agriTaskShare.findMany.mockResolvedValue([{ taskId: "shared", expiresAt: final }]);
    expect((await listAgriTasks("reader")).tasks).toEqual([]);
  });
  it("omits already-expired or revoked shares even if initial page included the row", async () => {
    rows = [task("expired"), task("revoked")];
    shares = [{ taskId: "expired", userId: "reader", revokedAt: null, expiresAt: initial }, { taskId: "revoked", userId: "reader", revokedAt: at(30), expiresAt: null }];
    expect((await listAgriTasks("reader")).tasks).toEqual([]);
    expect(mocks.db.agriTaskShare.findMany).toHaveBeenCalledTimes(1);
  });
  it("retains current shares and uses final time for due status", async () => {
    rows = [task("permanent"), task("valid")];
    shares = [{ taskId: "permanent", userId: "reader", revokedAt: null, expiresAt: null }, { taskId: "valid", userId: "reader", revokedAt: null, expiresAt: at(101) }];
    const result = await listAgriTasks("reader");
    expect(result.tasks.map(item => item.id)).toEqual(["permanent", "valid"]);
    expect(result.tasks.every(item => item.access === "SHARED_READONLY" && item.dueState === "OVERDUE")).toBe(true);
  });
  it("keeps owned rows even when adjacent shares expire", async () => {
    rows = [task("own", "reader"), task("shared")]; shares[0].expiresAt = at(50);
    const result = await listAgriTasks("reader");
    expect(result.tasks.map(item => item.id)).toEqual(["own"]); expect(result.tasks[0].access).toBe("OWNER");
    expect(mocks.db.agriTaskShare.findMany.mock.calls[0][0].where.taskId.in).toEqual(["shared"]);
  });
  it("does not add newly shared rows outside the fetched page or another reader's shares", async () => {
    shares = [{ taskId: "new-private-row", userId: "reader", revokedAt: null, expiresAt: null }, { taskId: "shared", userId: "other-reader", revokedAt: null, expiresAt: null }];
    expect((await listAgriTasks("reader")).tasks).toEqual([]);
    expect(mocks.db.agriTaskShare.findMany.mock.calls[0][0]).toMatchObject({ where: { taskId: { in: ["shared"] }, userId: "reader", revokedAt: null } });
  });
  it("advances cursor using raw page boundary when every page row loses access", async () => {
    rows = Array.from({ length: 501 }, (_, index) => task(`task-${index.toString().padStart(3, "0")}`, "owner", index)); shares = [];
    const result = await listAgriTasks("reader");
    expect(result.tasks).toEqual([]); expect(JSON.parse(result.nextCursor!)).toEqual({ id: "task-499", createdAt: rows[499].createdAt.toISOString() });
    expect(mocks.db.agriTaskShare.findMany.mock.calls[0][0].where.taskId.in).toHaveLength(500);
    expect(mocks.db.agriTaskShare.findMany.mock.calls[0][0].where.taskId.in).not.toContain("task-500");
    expect(mocks.db.agriTaskShare.findFirst).not.toHaveBeenCalled();
    rows = [rows[500]]; shares = [{ taskId: "task-500", userId: "reader", revokedAt: null, expiresAt: null }];
    const next = await listAgriTasks("reader", result.nextCursor!);
    expect(next.tasks.map(item => item.id)).toEqual(["task-500"]); expect(next.nextCursor).toBeNull();
    expect(mocks.db.agriPersonalTask.findMany.mock.calls[1][0].where.AND[1]).toEqual({ OR: [{ createdAt: { lt: new Date(JSON.parse(result.nextCursor!).createdAt) } }, { createdAt: new Date(JSON.parse(result.nextCursor!).createdAt), id: { lt: "task-499" } }] });
  });
  it("cursor remains raw last row when visible owned tail is not the original boundary", async () => {
    rows = Array.from({ length: 501 }, (_, index) => task(`task-${index}`, index === 0 ? "reader" : "owner", index)); shares = [];
    const result = await listAgriTasks("reader");
    expect(result.tasks).toHaveLength(1); expect(JSON.parse(result.nextCursor!).id).toBe("task-499");
  });
  it("handles empty and owner-only pages without unnecessary share reads", async () => {
    rows = []; expect((await listAgriTasks("reader")).tasks).toEqual([]); expect(mocks.db.agriTaskShare.findMany).not.toHaveBeenCalled();
    rows = [task("own", "reader")]; const result = await listAgriTasks("reader", undefined, { scope: "mine", stage: "PREPARATION" });
    expect(result.tasks[0].dueState).toBe("OVERDUE"); expect(result.serverNow).toBe(final.toISOString()); expect(mocks.db.agriTaskShare.findMany).not.toHaveBeenCalled();
  });
  it("preserves current edition/account rejection and finite existing task transaction budget", async () => {
    await listAgriTasks("reader"); expect(mocks.db.$transaction).toHaveBeenCalledWith(expect.any(Function), { maxWait: 10000, timeout: 20000 });
    mocks.db.user.findUnique.mockResolvedValue({ flagged: true, deletedAt: null });
    await expect(listAgriTasks("reader")).rejects.toMatchObject({ code: "ACCOUNT_UNAVAILABLE" });
    mocks.db.user.findUnique.mockResolvedValue({ flagged: false, deletedAt: null }); mocks.db.competition.findUnique.mockResolvedValue(null);
    await expect(listAgriTasks("reader")).rejects.toMatchObject({ code: "AGRI_EDITION_NOT_CONFIGURED" });
  });
});
