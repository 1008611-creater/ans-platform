/** Isolated loopback PostgreSQL only; no production writes, models or funds. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { AgriTaskEditable } from "../src/contracts/agri-tasks";
const reportDir = ".workbuddy/evidence/agri-tasks";
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  if (!value) throw new Error("Explicit isolated database required");
  const url = new URL(value);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/ans_product_verify_agri_tasks_r1") throw new Error("Refusing non-isolated timetable writes");
}
async function main() {
  const { db } = await import("../src/lib/db");
  const { listAgriTasks: list, getAgriTask: get, executeAgriTaskCommand: run } = await import("../src/server/competitions/agrihackathon/tasks");
  const { agriTaskTemplates } = await import("../src/domain/competitions/agri-task-templates");
  const checks: Array<{ label: string; passed: boolean }> = [];
  const check = async (label: string, fn: () => Promise<void>) => { await fn(); checks.push({ label, passed: true }); console.log("[agri] PASS " + label); };
  await mkdir(reportDir, { recursive: true });
  try {
    if (process.argv.includes("--persistence")) {
      const state = JSON.parse(await readFile(reportDir + "/persistence-fixture.json", "utf8")) as { competitionId: string; owner: string; recipient: string; taskId: string; expectedRevision: number; expectedTitle: string };
      process.env.ANS_AGRIHACKATHON_COMPETITION_ID = state.competitionId;
      await check("fresh Node process reads saved task, events, receipt and access boundaries", async () => {
        const detail = await get(state.owner, state.taskId); assert.equal(detail.task.title, state.expectedTitle); assert.equal(detail.task.revision, state.expectedRevision); assert.ok(detail.history.length >= 3);
        await assert.rejects(get(state.recipient, state.taskId), /NOT_FOUND/);
        assert.ok(await db.agriTaskCommandReceipt.count({ where: { taskId: state.taskId } }) >= 3);
      });
      await writeFile(reportDir + "/persistence.json", JSON.stringify({ checks, isolatedPostgres: true, freshNodeProcess: true, productionWrites: false, modelCalls: 0 }, null, 2)); return;
    }
    const prefix = "agri-fixture-" + randomUUID();
    const competition = await db.competition.create({ data: { title: prefix + " LOCAL FIXTURE", rewardXp: 10 }, select: { id: true } });
    const otherCompetition = await db.competition.create({ data: { title: prefix + " OTHER LOCAL FIXTURE" }, select: { id: true } });
    const makeUser = (suffix: string, role: "USER" | "ADMIN" = "USER") => db.user.create({ data: { email: prefix + suffix + "@example.invalid", username: prefix + suffix, role, quotaPoints: 101 }, select: { id: true, xp: true, quotaPoints: true } });
    const [owner, recipient, admin, outsider] = await Promise.all([makeUser("owner"), makeUser("recipient"), makeUser("admin", "ADMIN"), makeUser("outsider")]);
    process.env.ANS_AGRIHACKATHON_COMPETITION_ID = competition.id;
    const base = agriTaskTemplates("zh")[0].task;
    let taskId = ""; let lastRevision = 0;
    const update = async (task: AgriTaskEditable, revision: number, key = randomUUID()) => run(owner.id, { action: "update", taskId, expectedRevision: revision, idempotencyKey: key, task });
    await check("no edition fails closed; exact binding never falls back to another competition", async () => {
      delete process.env.ANS_AGRIHACKATHON_COMPETITION_ID; await assert.rejects(list(owner.id), /AGRI_EDITION_NOT_CONFIGURED/);
      process.env.ANS_AGRIHACKATHON_COMPETITION_ID = "missing-edition"; await assert.rejects(list(owner.id), /AGRI_EDITION_NOT_CONFIGURED/);
      process.env.ANS_AGRIHACKATHON_COMPETITION_ID = competition.id; assert.equal((await list(owner.id)).tasks.length, 0);
    });
    await check("concurrent initialization creates exactly six private tasks and one receipt", async () => {
      const command = { action: "initialize", locale: "zh", idempotencyKey: randomUUID() };
      const results = await Promise.all(Array.from({ length: 6 }, () => run(owner.id, command)));
      assert.equal(results.filter(r => !r.duplicate).length, 1); assert.ok(results.every(r => r.createdTaskCount === 6));
      const tasks = (await list(owner.id)).tasks; assert.equal(tasks.length, 6); assert.ok(tasks.every(t => t.status === "NOT_STARTED" && t.due.state === "UNKNOWN"));
      assert.equal(await db.agriTaskEvent.count({ where: { task: { ownerId: owner.id } } }), 6);
      taskId = tasks[0].id;
    });
    await check("saved task, unknown/tentative dates and input requirements read back; initialization never overwrites", async () => {
      const task = { ...base, title: prefix + " PRIVATE_INPUT_MARKER", status: "IN_PROGRESS" as const, due: { state: "TENTATIVE" as const, at: "2026-10-08T09:00:00+08:00" } };
      await update(task, 1); const saved = await get(owner.id, taskId); assert.equal(saved.task.title, task.title); assert.equal(saved.task.dueState, "TENTATIVE"); assert.deepEqual(saved.task.inputRequirements, task.inputRequirements);
      const repeated = await run(owner.id, { action: "initialize", locale: "en", idempotencyKey: randomUUID() }); assert.equal(repeated.createdTaskCount, 0); assert.equal((await get(owner.id, taskId)).task.revision, 2);
    });
    await check("ADMIN and other accounts cannot read, write, list or share another member's task", async () => {
      for (const id of [admin.id, outsider.id]) { assert.equal((await list(id)).tasks.length, 0); await assert.rejects(get(id, taskId), /NOT_FOUND/); await assert.rejects(run(id, { action: "update", taskId, expectedRevision: 2, task: base, idempotencyKey: randomUUID() }), /NOT_FOUND/); await assert.rejects(run(id, { action: "share", taskId, expectedRevision: 2, recipientId: recipient.id, expiresAt: null, idempotencyKey: randomUUID() }), /NOT_FOUND/); }
      process.env.ANS_AGRIHACKATHON_COMPETITION_ID = otherCompetition.id; await assert.rejects(get(owner.id, taskId), /NOT_FOUND/); process.env.ANS_AGRIHACKATHON_COMPETITION_ID = competition.id;
    });
    await check("competing revisions allow one update and preserve accepted history", async () => {
      const results = await Promise.allSettled([update({ ...base, title: prefix + " CAS_A" }, 2), update({ ...base, title: prefix + " CAS_B" }, 2)]);
      assert.equal(results.filter(r => r.status === "fulfilled").length, 1); assert.equal((await get(owner.id, taskId)).task.revision, 3);
      assert.match(String((results.find(r => r.status === "rejected") as PromiseRejectedResult).reason), /AGRI_REVISION_CONFLICT/);
    });
    await check("same-key update races append once; changed payload conflicts; later replay reports original revision", async () => {
      const key = randomUUID(); const task = { ...base, title: prefix + " REPLAY" };
      const results = await Promise.all(Array.from({ length: 6 }, () => update(task, 3, key))); assert.equal(results.filter(r => !r.duplicate).length, 1); assert.ok(results.every(r => r.appliedRevision === 4));
      await assert.rejects(update({ ...task, title: "changed" }, 3, key), /AGRI_IDEMPOTENCY_CONFLICT/);
      await update({ ...task, title: prefix + " LATER" }, 4); const replay = await update(task, 3, key); assert.equal(replay.appliedRevision, 4); assert.equal(replay.task!.revision, 5); assert.equal(replay.duplicate, true);
    });
    await check("explicit sharing is read-only; collaboration text is not authorization", async () => {
      await run(owner.id, { action: "share", taskId, expectedRevision: 5, recipientId: recipient.id, expiresAt: null, idempotencyKey: randomUUID() });
      const shared = await get(recipient.id, taskId); assert.equal(shared.task.access, "SHARED_READONLY"); assert.deepEqual(shared.history, []); assert.deepEqual(shared.shares, []); assert.equal((await list(recipient.id)).tasks.length, 1);
      await assert.rejects(run(recipient.id, { action: "update", taskId, expectedRevision: 6, task: base, idempotencyKey: randomUUID() }), /NOT_FOUND/);
      await assert.rejects(get(outsider.id, taskId), /NOT_FOUND/);
    });
    await check("stage and visibility filtering apply inside the authorized database query", async () => {
      const mine = await list(owner.id, undefined, { scope: "mine", stage: "PREPARATION" });
      assert.ok(mine.tasks.length > 0); assert.ok(mine.tasks.every(task => task.access === "OWNER" && task.stage === "PREPARATION"));
      assert.equal((await list(owner.id, undefined, { scope: "shared" })).tasks.length, 0);
      assert.equal((await list(recipient.id, undefined, { scope: "mine" })).tasks.length, 0);
      assert.deepEqual((await list(recipient.id, undefined, { scope: "shared", stage: "PREPARATION" })).tasks.map(task => task.id), [taskId]);
      assert.equal((await list(recipient.id, undefined, { scope: "shared", stage: "ARCHIVE" })).tasks.length, 0);
      assert.equal((await list(outsider.id, undefined, { scope: "all", stage: "PREPARATION" })).tasks.length, 0);
      assert.equal(mine.nextCursor, null);
    });
    await check("flagged recipients cannot read; owner can still revoke; history records expiry changes", async () => {
      await db.user.update({ where: { id: recipient.id }, data: { flagged: true } }); await assert.rejects(get(recipient.id, taskId), /ACCOUNT_UNAVAILABLE/);
      await run(owner.id, { action: "revokeShare", taskId, expectedRevision: 6, recipientId: recipient.id, idempotencyKey: randomUUID() });
      await db.user.update({ where: { id: recipient.id }, data: { flagged: false } }); await assert.rejects(get(recipient.id, taskId), /NOT_FOUND/);
      const expiry = new Date(Date.now() + 1300).toISOString();
      await run(owner.id, { action: "share", taskId, expectedRevision: 7, recipientId: recipient.id, expiresAt: expiry, idempotencyKey: randomUUID() });
      assert.equal((await get(owner.id, taskId)).history[0].shareChange?.expiresAt, expiry);
      await new Promise(resolve => setTimeout(resolve, 1400)); await assert.rejects(get(recipient.id, taskId), /NOT_FOUND/); assert.deepEqual((await get(owner.id, taskId)).shares, []); assert.equal((await list(recipient.id)).tasks.length, 0);
    });
    await check("completion requires evidence, blocking requires input; confirmed dates alone can be overdue", async () => {
      await assert.rejects(update({ ...base, status: "DONE" }, 8)); await assert.rejects(update({ ...base, status: "BLOCKED" }, 8));
      const completed = { ...base, status: "DONE" as const, completionResult: "LOCAL FIXTURE actual delivery accepted" };
      await update(completed, 8); let task = (await get(owner.id, taskId)).task; assert.equal(task.dueState, "DONE"); assert.ok(task.completedAt);
      await update({ ...base, due: { state: "CONFIRMED", at: "2020-01-01T00:00:00Z" } }, 9); task = (await get(owner.id, taskId)).task; assert.equal(task.dueState, "OVERDUE"); assert.equal(task.completedAt, null);
      lastRevision = 10;
    });
    await check("flagged and deleted actors are rejected, including receipt replays", async () => {
      const command = { action: "initialize", locale: "zh", idempotencyKey: randomUUID() }; await run(outsider.id, command);
      await db.user.update({ where: { id: outsider.id }, data: { flagged: true } }); await assert.rejects(run(outsider.id, command), /ACCOUNT_UNAVAILABLE/); await assert.rejects(list(outsider.id), /ACCOUNT_UNAVAILABLE/);
      await db.user.update({ where: { id: outsider.id }, data: { flagged: false, deletedAt: new Date() } }); await assert.rejects(get(outsider.id, taskId), /ACCOUNT_UNAVAILABLE/);
    });
    await check("failure saving receipt rolls back task, history and revision atomically", async () => {
      const key = randomUUID();
      await db.$executeRawUnsafe("CREATE FUNCTION agri_fixture_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FIXTURE_FAIL'; END; $$");
      await db.$executeRawUnsafe('CREATE TRIGGER agri_fixture_fault BEFORE INSERT ON agri_task_command_receipts FOR EACH ROW EXECUTE FUNCTION agri_fixture_fault()');
      try { await assert.rejects(update({ ...base, title: "MUST_ROLL_BACK" }, lastRevision, key)); }
      finally { await db.$executeRawUnsafe('DROP TRIGGER agri_fixture_fault ON agri_task_command_receipts'); await db.$executeRawUnsafe('DROP FUNCTION agri_fixture_fault()'); }
      assert.equal((await get(owner.id, taskId)).task.revision, lastRevision); assert.equal(await db.agriTaskCommandReceipt.count({ where: { idempotencyKey: key } }), 0);
    });
    await check("database rejects owner changes, missing revisions, fabricated completion, history rewrites and NULL receipts", async () => {
      await assert.rejects(db.$executeRaw`UPDATE agri_personal_tasks SET "ownerId" = ${recipient.id}, revision = revision + 1 WHERE id = ${taskId}`);
      await assert.rejects(db.$executeRaw`UPDATE agri_personal_tasks SET title = 'no revision' WHERE id = ${taskId}`);
      await assert.rejects(db.$executeRaw`UPDATE agri_personal_tasks SET status = 'DONE', revision = revision + 1 WHERE id = ${taskId}`);
      await assert.rejects(db.$executeRaw`DELETE FROM agri_task_events WHERE "taskId" = ${taskId}`);
      await assert.rejects(db.$executeRaw`DELETE FROM agri_personal_tasks WHERE id = ${taskId}`);
      await assert.rejects(db.$executeRaw`UPDATE agri_task_command_receipts SET "createdTaskCount" = 1 WHERE "actorId" = ${owner.id}`);
      await assert.rejects(db.$executeRaw`INSERT INTO agri_task_command_receipts (id,"competitionId","actorId",operation,"idempotencyKey","requestHash","createdTaskCount") VALUES (${randomUUID()},${competition.id},${owner.id},'initialize',${randomUUID()},${"a".repeat(64)},NULL)`);
      const [dates] = await db.$queryRaw<Array<{ invalid: boolean; valid: boolean }>>`SELECT ans_agri_task_date_valid('{"state":"CONFIRMED","at":"xxxxxxxxxxxxxxxxxxxx"}'::jsonb) AS invalid, ans_agri_task_date_valid('{"state":"CONFIRMED","at":"2026-10-08T09:00:00+08:00"}'::jsonb) AS valid`;
      assert.equal(dates.invalid, false); assert.equal(dates.valid, true);
    });
    await check("500 owned tasks plus shared task remains usable with stable pagination and owner cap", async () => {
      const ownCount = await db.agriPersonalTask.count({ where: { ownerId: owner.id, competitionId: competition.id } });
      await db.agriPersonalTask.createMany({ data: Array.from({ length: 500 - ownCount }, (_, i) => ({ competitionId: competition.id, ownerId: owner.id, title: prefix + " PAGE " + i, stage: "PREPARATION", status: "NOT_STARTED", priority: "NORMAL", dueState: "UNKNOWN", acceptanceCriteria: "fixture", inputRequirements: { schemaVersion: 1, items: [] } })) });
      const other = await run(recipient.id, { action: "create", task: { ...base, stage: "ARCHIVE" }, idempotencyKey: randomUUID() });
      await run(recipient.id, { action: "share", taskId: other.task!.id, expectedRevision: 1, recipientId: owner.id, expiresAt: null, idempotencyKey: randomUUID() });
      const page1 = await list(owner.id); assert.equal(page1.tasks.length, 500); assert.ok(page1.nextCursor);
      const page2 = await list(owner.id, page1.nextCursor!); assert.equal(page2.tasks.length, 1); assert.equal(page2.nextCursor, null); assert.equal(new Set([...page1.tasks, ...page2.tasks].map(t => t.id)).size, 501);
      // More than one unfiltered page: database filters must apply before take(501).
      const mine = await list(owner.id, undefined, { scope: "mine" });
      assert.equal(mine.tasks.length, 500); assert.equal(mine.nextCursor, null);
      assert.ok(mine.tasks.every(task => task.access === "OWNER"));
      const shared = await list(owner.id, undefined, { scope: "shared", stage: "ARCHIVE" });
      assert.deepEqual(shared.tasks.map(task => task.id), [other.task!.id]); assert.equal(shared.nextCursor, null);
      assert.equal((await list(owner.id, undefined, { scope: "shared", stage: "PREPARATION" })).tasks.length, 0);
      const expectedArchive = await db.agriPersonalTask.count({ where: { competitionId: competition.id, ownerId: owner.id, stage: "ARCHIVE" } });
      const archive = await list(owner.id, undefined, { scope: "all", stage: "ARCHIVE" });
      assert.equal(archive.tasks.length, expectedArchive + 1); assert.equal(archive.nextCursor, null);
      assert.ok(archive.tasks.every(task => task.stage === "ARCHIVE"));
      await assert.rejects(run(owner.id, { action: "create", task: base, idempotencyKey: randomUUID() }), /AGRI_TASK_LIMIT/);
    });
    await check("no XP, quota, public artifacts or global audit content side effects", async () => {
      const user = await db.user.findUniqueOrThrow({ where: { id: owner.id } }); assert.equal(user.xp, owner.xp); assert.equal(user.quotaPoints, owner.quotaPoints);
      assert.equal(await db.artifactVersion.count(), 0); assert.equal(await db.quotaLedger.count(), 0);
      const logs = await db.auditLog.findMany({ where: { actorId: owner.id } }); assert.ok(logs.length); assert.ok(!JSON.stringify(logs).includes("PRIVATE_INPUT_MARKER"));
      const task = await get(owner.id, taskId);
      await writeFile(reportDir + "/persistence-fixture.json", JSON.stringify({ competitionId: competition.id, owner: owner.id, recipient: recipient.id, taskId, expectedRevision: task.task.revision, expectedTitle: task.task.title }));
    });
    await writeFile(reportDir + "/integration.json", JSON.stringify({ checks, isolatedPostgres: true, productionWrites: false, modelCalls: 0, realFunds: false, fixturesRetainedInIsolatedDatabase: true }, null, 2));
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("[agri] integration failed; private diagnostics withheld"); process.exitCode = 1; });
