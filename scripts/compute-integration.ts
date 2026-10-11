/** Loopback PostgreSQL only. No supplier requests or real funds. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
function guard(value: string | undefined) {
  if (!value) throw new Error("Explicit isolated database required");
  const url = new URL(value);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || !/^\/ans_product_verify_compute(?:_r[0-9]+)?$/.test(url.pathname)) throw new Error("Refusing non-isolated compute writes");
}
guard(process.env.DATABASE_URL); guard(process.env.DIRECT_URL);
const checks: { label: string; passed: boolean }[] = [];
const prefix = `compute-fixture-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
const basePolicy = { version: "fixture-v1", concurrentMax: 20, models: { "fixture-model": { unit: "token", ratePoints: 1, rateUnits: 1, maxUnits: 1000 } } };
function policy(value = basePolicy) { process.env.ANS_TOONFLOW_COMPUTE_ENABLED = "1"; process.env.ANS_TOONFLOW_COMPUTE_POLICY = JSON.stringify(value); }
async function main() {
  const { db } = await import("../src/lib/db");
  const { executeComputeCommand: run } = await import("../src/server/compute/service");
  const { computeResponse } = await import("../src/server/compute/http");
  const users: string[] = [];
  const balances = new Map<string, number>();
  async function user(balance = 100) {
    const row = await db.user.create({ data: { email: `${prefix}-${users.length}@example.invalid`, username: `${prefix}-${users.length}`, quotaPoints: balance }, select: { id: true } });
    users.push(row.id); balances.set(row.id, balance); return row.id;
  }
  const reserve = async (userId: string, key: string, maxUnits = 60) => {
    const result = await run({ action: "reserve", userId, modelId: "fixture-model", maxUnits, idempotencyKey: `${prefix}-${key}` });
    assert.ok("taskId" in result && "duplicate" in result); return result;
  };
  const event = (action: string, userId: string, taskId: string, expectedRevision: number, key: string, extra = {}) => run({ action, userId, taskId, expectedRevision, eventId: `${prefix}-${key}`, ...extra });
  async function check(label: string, action: () => Promise<void>) { policy(); await action(); checks.push({ label, passed: true }); console.log(`[compute] PASS ${label}`); }
  try {
    await check("concurrent reservations never overdraw and failed debit leaves no task", async () => {
      const id = await user(); const result = await Promise.allSettled([reserve(id, "race-a"), reserve(id, "race-b")]);
      assert.equal(result.filter(r => r.status === "fulfilled").length, 1);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id } })).quotaPoints, 40);
      assert.equal(await db.computeTask.count({ where: { userId: id } }), 1);
      assert.equal(await db.quotaLedger.count({ where: { userId: id } }), 1);
    });
    await check("duplicate concurrent reservation debits once; changed input conflicts", async () => {
      const id = await user(); const result = await Promise.all(Array.from({ length: 8 }, () => reserve(id, "same")));
      assert.equal(new Set(result.map(t => t.taskId)).size, 1); assert.equal(result.filter(t => !t.duplicate).length, 1);
      await assert.rejects(reserve(id, "same", 59), /COMPUTE_REQUEST_CONFLICT/);
      assert.equal(await db.quotaLedger.count({ where: { userId: id } }), 1);
    });
    await check("concurrency limit enforced under simultaneous requests", async () => {
      policy({ ...basePolicy, concurrentMax: 1 }); const id = await user();
      const result = await Promise.allSettled([reserve(id, "limit-a", 10), reserve(id, "limit-b", 10)]);
      assert.equal(result.filter(r => r.status === "fulfilled").length, 1); assert.match(String((result.find(r => r.status === "rejected") as PromiseRejectedResult).reason), /COMPUTE_CONCURRENCY_LIMIT/);
    });
    await check("ownership isolates reads, history and transition attempts", async () => {
      const owner = await user(), outsider = await user(); const task = await reserve(owner, "private");
      await assert.rejects(run({ action: "read", userId: outsider, taskId: task.taskId }), /COMPUTE_TASK_NOT_FOUND/);
      await assert.rejects(event("start", outsider, task.taskId, 1, "outsider"), /COMPUTE_TASK_NOT_FOUND/);
      assert.deepEqual(await run({ action: "history", userId: outsider }), { tasks: [] });
    });
    await check("timeout retains reservation and requires confirmed no-usage to release", async () => {
      const id = await user(); const task = await reserve(id, "timeout");
      await event("start", id, task.taskId, 1, "timeout-start"); await event("uncertain", id, task.taskId, 2, "timeout-unknown");
      assert.equal((await db.user.findUniqueOrThrow({ where: { id } })).quotaPoints, 40);
      await assert.rejects(event("release", id, task.taskId, 3, "timeout-invalid", { evidence: "not_started", evidenceRef: "fixture-evidence" }), /COMPUTE_RELEASE_REQUIRES_EVIDENCE/);
      await event("release", id, task.taskId, 3, "timeout-release", { evidence: "confirmed_no_usage", evidenceRef: "fixture-confirmed-no-usage" });
      assert.equal((await db.user.findUniqueOrThrow({ where: { id } })).quotaPoints, 100);
    });
    await check("not-started release and duplicate retries refund exactly once", async () => {
      const id = await user(); const task = await reserve(id, "release");
      const args = { evidence: "not_started", evidenceRef: "fixture-not-started" };
      const result = await Promise.all(Array.from({ length: 6 }, () => event("release", id, task.taskId, 1, "release-event", args)));
      assert.equal(result.filter(r => "duplicate" in r && !r.duplicate).length, 1);
      assert.equal(await db.quotaLedger.count({ where: { userId: id } }), 2);
      await assert.rejects(event("release", id, task.taskId, 1, "release-event", { ...args, evidenceRef: "fixture-mutated-evidence" }), /COMPUTE_EVENT_CONFLICT/);
    });
    await check("partial and failed consumed work settle actual units instead of full refund", async () => {
      for (const outcome of ["partial", "failed", "succeeded"]) {
        const id = await user(); const task = await reserve(id, `usage-${outcome}`);
        await event("start", id, task.taskId, 1, `usage-start-${outcome}`);
        await event("settle", id, task.taskId, 2, `usage-settle-${outcome}`, { units: 23, outcome, evidenceRef: "fixture-usage-evidence" });
        assert.equal((await db.user.findUniqueOrThrow({ where: { id } })).quotaPoints, 77);
      }
    });
    await check("settlement rejects unknown, zero, excessive usage and missing evidence", async () => {
      const id = await user(); const task = await reserve(id, "budget"); await event("start", id, task.taskId, 1, "budget-start");
      await assert.rejects(event("settle", id, task.taskId, 2, "budget-over", { units: 61, outcome: "succeeded", evidenceRef: "fixture-evidence" }), /COMPUTE_USAGE_EXCEEDS_BUDGET/);
      for (const units of [0, null, -1, 0.5]) await assert.rejects(event("settle", id, task.taskId, 2, "budget-invalid", { units, outcome: "succeeded", evidenceRef: "fixture-evidence" }));
      await assert.rejects(event("settle", id, task.taskId, 2, "budget-missing", { units: 20, outcome: "succeeded" }));
      assert.equal((await db.computeTask.findUniqueOrThrow({ where: { id: task.taskId } })).state, "RUNNING");
    });
    await check("CAS rejects out-of-order and competing events", async () => {
      const id = await user(); const task = await reserve(id, "cas");
      await assert.rejects(event("start", id, task.taskId, 2, "cas-wrong"), /COMPUTE_REVISION_CONFLICT/);
      const result = await Promise.allSettled([event("start", id, task.taskId, 1, "cas-start"), event("release", id, task.taskId, 1, "cas-release", { evidence: "not_started", evidenceRef: "fixture-evidence" })]);
      assert.equal(result.filter(r => r.status === "fulfilled").length, 1);
    });
    await check("historical quote survives rate changes and policy removal", async () => {
      const id = await user(); const task = await reserve(id, "old-price"); await event("start", id, task.taskId, 1, "price-start");
      policy({ ...basePolicy, version: "fixture-v2", models: { "fixture-model": { ...basePolicy.models["fixture-model"], ratePoints: 2 } } });
      delete process.env.ANS_TOONFLOW_COMPUTE_POLICY; process.env.ANS_TOONFLOW_COMPUTE_ENABLED = "0";
      const duplicate = await reserve(id, "old-price"); assert.equal(duplicate.taskId, task.taskId);
      await event("settle", id, task.taskId, 2, "price-settle", { units: 20, outcome: "succeeded", evidenceRef: "fixture-evidence" });
      assert.equal((await db.user.findUniqueOrThrow({ where: { id } })).quotaPoints, 80);
      await assert.rejects(reserve(id, "new-disabled"), /COMPUTE_NOT_CONFIGURED/);
    });
    await check("disabled switch preserves read and release while blocking starts", async () => {
      const id = await user(); const task = await reserve(id, "disabled"); process.env.ANS_TOONFLOW_COMPUTE_ENABLED = "0";
      await assert.rejects(event("start", id, task.taskId, 1, "disabled-start"), /COMPUTE_NOT_CONFIGURED/);
      assert.ok("taskId" in await run({ action: "read", userId: id, taskId: task.taskId }));
      await event("release", id, task.taskId, 1, "disabled-release", { evidence: "not_started", evidenceRef: "fixture-evidence" });
    });
    await check("flagged account restores old reservations but cannot initiate spending", async () => {
      const id = await user(); const task = await reserve(id, "flagged"); await db.user.update({ where: { id }, data: { flagged: true } });
      assert.equal((await reserve(id, "flagged")).taskId, task.taskId);
      await assert.rejects(reserve(id, "flagged-new"), /COMPUTE_ACCOUNT_DISABLED/);
      await assert.rejects(event("start", id, task.taskId, 1, "flagged-start"), /COMPUTE_ACCOUNT_DISABLED/);
      await event("release", id, task.taskId, 1, "flagged-release", { evidence: "not_started", evidenceRef: "fixture-evidence" });
      assert.deepEqual(await run({ action: "balance", userId: id }), { unit: "point", balance: 100, spendingEnabled: false });
    });
    await check("soft-deleted accounts reconcile running charges but cannot create or read", async () => {
      const id = await user(); const task = await reserve(id, "deleted"); await event("start", id, task.taskId, 1, "deleted-start");
      await db.user.update({ where: { id }, data: { deletedAt: new Date() } });
      await assert.rejects(reserve(id, "deleted-new"), /COMPUTE_ACCOUNT_UNAVAILABLE/);
      await assert.rejects(run({ action: "read", userId: id, taskId: task.taskId }), /COMPUTE_ACCOUNT_UNAVAILABLE/);
      await event("settle", id, task.taskId, 2, "deleted-settle", { units: 20, outcome: "failed", evidenceRef: "fixture-evidence" });
      assert.equal((await db.user.findUniqueOrThrow({ where: { id } })).quotaPoints, 80);
    });
    await check("transaction failure rolls back task, refund and ledger together", async () => {
      const id = await user(); const task = await reserve(id, "rollback");
      await db.$executeRawUnsafe(`CREATE FUNCTION ans_compute_fixture_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."eventId" = '${prefix}-fault' THEN RAISE EXCEPTION 'FIXTURE_EVENT_SAVE_FAILED'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe('CREATE TRIGGER ans_compute_fixture_fault BEFORE INSERT ON compute_task_events FOR EACH ROW EXECUTE FUNCTION ans_compute_fixture_fault()');
      try { await assert.rejects(event("release", id, task.taskId, 1, "fault", { evidence: "not_started", evidenceRef: "fixture-evidence" })); }
      finally { await db.$executeRawUnsafe('DROP TRIGGER ans_compute_fixture_fault ON compute_task_events'); await db.$executeRawUnsafe('DROP FUNCTION ans_compute_fixture_fault()'); }
      const after = await db.computeTask.findUniqueOrThrow({ where: { id: task.taskId } }); assert.equal(after.state, "AUTHORIZED"); assert.equal(after.revision, 1);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id } })).quotaPoints, 40); assert.equal(await db.quotaLedger.count({ where: { userId: id } }), 1);
    });
    await check("database prevents quote rewrites, invalid state and event mutation", async () => {
      const id = await user(); const task = await reserve(id, "db-protect");
      await assert.rejects(db.computeTask.update({ where: { id: task.taskId }, data: { authorizedPoints: 1 } }));
      await assert.rejects(db.computeTask.update({ where: { id: task.taskId }, data: { state: "SETTLED", revision: 2, startedAt: new Date(), finishedAt: new Date(), settledPoints: null, units: null, outcome: null } }));
      await event("start", id, task.taskId, 1, "db-start"); const evt = await db.computeTaskEvent.findFirstOrThrow({ where: { taskId: task.taskId } });
      await assert.rejects(db.computeTaskEvent.update({ where: { id: evt.id }, data: { evidenceRef: "fixture-mutated" } }));
    });
    await check("database rejects null and fractional price snapshots", async () => {
      const id = await user(); const data = { userId: id, provider: "toonflow", idempotencyKey: `${prefix}-bad-price`, requestHash: "0".repeat(64), modelId: "fixture-model", policyVersion: "fixture-v1", maxUnits: 10, authorizedPoints: 10 };
      for (const price of [{ ...basePolicy.models["fixture-model"], unit: null }, { unit: "token", ratePoints: 1.5, rateUnits: 1.5, maxUnits: 1000 }, { unit: "token", ratePoints: 1, rateUnits: 1 }]) {
        await assert.rejects(db.computeTask.create({ data: { ...data, price } }));
      }
    });
    await check("public error envelopes omit database diagnostics", async () => {
      const marker = "fixture-private-diagnostic";
      const response = await computeResponse(async () => { throw new Error(marker); });
      assert.equal(response.status, 500); assert.equal((await response.json()).error.code, "COMPUTE_INTERNAL_ERROR");
    });
    await check("approved quote rejects changed policy, price or unit atomically", async () => {
      const id = await user();
      const command = { action: "reserve", userId: id, modelId: "fixture-model", maxUnits: 20,
        idempotencyKey: `${prefix}-approved`, expectedPolicyVersion: "fixture-v1", maxAuthorizedPoints: 20, expectedUnit: "token" };
      policy({ ...basePolicy, version: "fixture-v2" });
      await assert.rejects(run(command), /COMPUTE_QUOTE_CHANGED/);
      policy({ ...basePolicy, models: { "fixture-model": { ...basePolicy.models["fixture-model"], ratePoints: 2 } } });
      await assert.rejects(run(command), /COMPUTE_QUOTE_CHANGED/);
      policy({ ...basePolicy, models: { "fixture-model": { ...basePolicy.models["fixture-model"], unit: "image" } } } as typeof basePolicy);
      await assert.rejects(run(command), /COMPUTE_QUOTE_CHANGED/);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id } })).quotaPoints, 100);
      assert.equal(await db.computeTask.count({ where: { userId: id } }), 0);
      assert.equal(await db.quotaLedger.count({ where: { userId: id } }), 0);
      policy(); const first = await run(command); assert.ok("taskId" in first);
      policy({ ...basePolicy, version: "fixture-v2" });
      const duplicate = await run(command); assert.ok("taskId" in duplicate); assert.equal(duplicate.taskId, first.taskId);
      await assert.rejects(run({ ...command, maxAuthorizedPoints: 21 }), /COMPUTE_REQUEST_CONFLICT/);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id } })).quotaPoints, 80);
    });
    await check("all accounts conserve balance, persisted ledger and settled consumption", async () => {
      for (const id of users) {
        const account = await db.user.findUniqueOrThrow({ where: { id } });
        const ledger = await db.quotaLedger.findMany({ where: { userId: id }, orderBy: { createdAt: "asc" } });
        assert.equal(account.quotaPoints, balances.get(id)! + ledger.reduce((n, e) => n + e.amount, 0));
        const tasks = await db.computeTask.findMany({ where: { userId: id } });
        const consumed = tasks.reduce((n, task) => n + (task.state === "RELEASED" ? 0 : task.state === "SETTLED" ? task.settledPoints! : task.authorizedPoints), 0);
        assert.equal(account.quotaPoints, balances.get(id)! - consumed);
      }
    });
  } finally {
    await mkdir(".workbuddy/evidence/compute", { recursive: true });
    await writeFile(".workbuddy/evidence/compute/integration.json", JSON.stringify({ isolatedPostgres: true, providerCalls: 0, realFunds: false, checks }, null, 2));
    await db.computeTask.deleteMany({ where: { userId: { in: users } } }); await db.quotaLedger.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
}
main().catch(() => { console.error("[compute] FAILED; see last completed check (diagnostics withheld)"); process.exitCode = 1; });
