/** Fault injection only into the dedicated local worker acceptance database. No login or supplier calls. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const connection = new URL(process.env.DATABASE_URL ?? "");
if (connection.hostname !== "127.0.0.1" || connection.port !== "55438" || !/^\/ans_product_verify_worker_isolation_r[1-9][0-9]*$/.test(connection.pathname)) throw new Error("Only dedicated local worker fixture database is allowed");
const round = connection.pathname.split("_").at(-1)!;
const out = ".workbuddy/evidence/project-worker-isolation" + (round === "r1" ? "" : "-" + round);
let stage = "initialization";
const report = { isolatedPostgres: true, productionChanged: false, accountLoginPerformed: false, supplierCalls: 0, realFunds: false, faultRemoved: false, checks: [] as string[] };
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { report.supplierCalls += 1; throw new Error("Supplier calls forbidden in worker fixture"); };
async function main() {
 const { db } = await import("../src/lib/db");
 const api = await import("../src/server/projects/resume-website");
 const { processProjectQueue } = await import("../src/server/projects/worker");
 const { RESUME_WEBSITE_EXAMPLE } = await import("../src/domain/projects/resume-website");
 const { RESUME_WEBSITE_WORKFLOW_ID } = await import("../src/contracts/resume-website");
 const prefix = "worker-fixture-" + randomUUID();
 const messages: unknown[][] = [];
 const logError = console.error;
 console.error = (...args) => { messages.push(args); };
 const fixtures: string[] = [];
 let functionCreated = false;
 try {
  assert.equal(await db.workflowRun.count(), 0, "Fixture DB must not contain old runs");
  stage = "create-admin";
  const admin = await db.user.create({ data: { email: prefix + '-admin@example.invalid', username: prefix + '-admin', role: 'ADMIN' } });
  fixtures.push(admin.id);
  stage = "create-member";
  const member = await db.user.create({ data: { email: prefix + "@example.invalid", username: prefix, quotaPoints: 100 } });
  fixtures.push(member.id);
  const runs: { id: string; projectId: string }[] = [];
  stage = "create-accepted-runs";
  for (const label of ["recovery-fault", "recoverable", "queued"]) {
   const project = await db.project.create({ data: { ownerId: member.id, title: "LOCAL_FIXTURE_ONLY/" + label, goal: "PORTFOLIO" } });
   await api.saveResumeWebsiteInput(project.id, member.id, { expectedRevision: 0, input: structuredClone(RESUME_WEBSITE_EXAMPLE) });
   const run = await api.enqueueResumeWebsite(project.id, member.id, { revision: 1, acknowledged: true, idempotencyKey: prefix + "-" + label });
   runs.push({ id: run.id, projectId: project.id });
  }
  stage = "prepare-states";
  const [faulty, recoverable, queued] = runs;
  const startedAt = new Date(Date.now() - 240_000);
  await db.workflowRun.update({ where: { id: faulty.id }, data: { status: "RUNNING", startedAt, error: "LOCAL_FAIL_RECOVERY" } });
  await db.workflowRun.update({ where: { id: recoverable.id }, data: { status: "RUNNING", startedAt } });
  await db.project.update({ where: { id: queued.projectId }, data: { status: "ARCHIVED" } });
  stage = "create-test-fault";
  await db.$executeRawUnsafe(`CREATE FUNCTION local_worker_recovery_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.error = 'LOCAL_FAIL_RECOVERY' AND OLD.status = 'RUNNING' AND NEW.status = 'FAILED' THEN RAISE EXCEPTION 'LOCAL_RECOVERY_TRANSACTION_FAILED'; END IF; RETURN NEW; END; $$`);
  functionCreated = true;
  await db.$executeRawUnsafe(`CREATE TRIGGER local_worker_recovery_fault BEFORE UPDATE ON workflow_runs FOR EACH ROW EXECUTE FUNCTION local_worker_recovery_fault()`);

  stage = "process-queue";
  await processProjectQueue();
  stage = "verify-statuses";
  const statuses = await Promise.all(runs.map(run => db.workflowRun.findUniqueOrThrow({ where: { id: run.id }, select: { status: true } })));
  assert.deepEqual(statuses.map(run => run.status), ["RUNNING", "FAILED", "CANCELLED"]);
  report.checks.push("A real PostgreSQL recovery exception leaves only its task running; another expired task and a queued archived task still finish");
  stage = "verify-balance";
  const account = await db.user.findUniqueOrThrow({ where: { id: member.id }, select: { quotaPoints: true } });
  assert.equal(account.quotaPoints, 98);
  const refunds = await Promise.all(runs.map(run => db.quotaLedger.count({ where: { refId: run.id, reason: "REFUND" } })));
  assert.deepEqual(refunds, [0, 1, 1]);
  report.checks.push("Only completed recovery/cancellation returns points; failed transaction neither changes the balance nor creates a refund");
  stage = "verify-no-supplier";
  assert.equal(await db.artifact.count(), 0);
  assert.equal(await db.workflowRun.count({ where: { workflow: { officialId: { not: RESUME_WEBSITE_WORKFLOW_ID } } } }), 0);
  assert.equal(report.supplierCalls, 0);
  report.checks.push("Queue work does not create outputs, touch another workflow, log in, or call any supplier");
  stage = "verify-safe-diagnostics";
  const workerRecoveryMessage = "ANS project recovery failed for one or more tasks; other queued work will continue.";
  const safeMessages = new Set([workerRecoveryMessage, "ANS database operation failed."]);
  assert.equal(messages.filter(args => args[0] === workerRecoveryMessage).length, 1);
  assert(messages.every(args => args.length === 1 && typeof args[0] === "string" && safeMessages.has(args[0])));
  assert(!JSON.stringify(messages).includes("LOCAL_RECOVERY_TRANSACTION_FAILED"));
  assert(!JSON.stringify(messages).includes(member.id));
  report.checks.push("Recovery diagnostics omit raw database failures and member identity");
  stage = "process-queue";
  await processProjectQueue();
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: member.id }, select: { quotaPoints: true } })).quotaPoints, 98);
  assert.equal(await db.quotaLedger.count({ where: { refId: recoverable.id, reason: "REFUND" } }), 1);
  report.checks.push("The next tick retries the failed recovery without re-refunding completed tasks");
 } finally {
  if (functionCreated) {
   await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS local_worker_recovery_fault ON workflow_runs`);
   await db.$executeRawUnsafe(`DROP FUNCTION local_worker_recovery_fault()`);
   report.faultRemoved = true;
  }
  if (fixtures.length) {
   await db.project.updateMany({ where: { ownerId: { in: fixtures } }, data: { status: "ARCHIVED" } });
   await db.user.updateMany({ where: { id: { in: fixtures } }, data: { flagged: true, deletedAt: new Date() } });
  }
  console.error = logError;
  globalThis.fetch = originalFetch;
  await db.$disconnect();
 }
 await mkdir(out, { recursive: true });
 await writeFile(out + "/integration.json", JSON.stringify({ ...report, passed: report.checks.length === 5 && report.faultRemoved, observedAt: new Date().toISOString() }, null, 2) + "\n", { flag: "wx" });
 console.log(JSON.stringify({ postgresChecks: report.checks.length, passed: true, supplierCalls: report.supplierCalls, accountLoginPerformed: false, productionChanged: false }));
}
main().catch(async error => {
 globalThis.fetch = originalFetch;
 const code = typeof error?.code === "string" && /^(?:P[0-9]{4}|ERR_ASSERTION)$/.test(error.code) ? error.code : null;
 const frame = error instanceof Error ? error.stack?.split("\n").find(line => line.includes("project-worker-isolation-integration.ts")) : null;
 const failure = { ...report, passed: false, stage, errorType: error instanceof Error ? error.name : "UnknownError", code, sourceFrame: frame ?? null };
 await mkdir(out, { recursive: true });
 await writeFile(out + "/failed.json", JSON.stringify(failure, null, 2) + "\n", { flag: "wx" });
 process.stderr.write(JSON.stringify({ failed: true, stage, errorType: failure.errorType, code, sourceFrame: failure.sourceFrame }) + "\n");
 process.exitCode = 1;
});