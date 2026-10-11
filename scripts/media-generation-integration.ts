/** Actual media service + isolated PostgreSQL; provider start is a fixture.
 * No upstream requests, real model costs or production writes. */
import assert from "node:assert/strict";
import { randomBytes, createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { MediaSubmissionNotSentError } from "../src/lib/plugins/media-generators/types";
for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
  const url = new URL(process.env[key] || "");
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !/^\/ans_product_verify_audit3$/.test(url.pathname)) throw new Error("Refusing non-isolated database writes");
}
const prefix = `media-fixture-${randomBytes(6).toString("hex")}`;
const checks: string[] = [];
async function main() {
  const { db } = await import("../src/lib/db");
  const api = await import("../src/server/media/service");
  const { getMediaGeneratorPlugin } = await import("../src/lib/plugins/media-generators");
  const { verifyMediaTask } = await import("../src/lib/media-task-ownership");
  const plugin = getMediaGeneratorPlugin("wiro")!;
  const original = plugin.startGeneration;
  const ids: string[] = [];
  let calls = 0;
  const task = { taskId: "fixture-task", socketAccessToken: "fixture-private-provider-token" };
  const resetProvider = () => { calls = 0; plugin.startGeneration = async () => { calls++; return task; }; };
  const create = async (label: string, credits = 1, admin = false) => {
    const user = await db.user.create({ data: { email: `${prefix}-${label}@example.invalid`, username: `${prefix}-${label}`, role: admin ? "ADMIN" : "USER", generationCreditsRemaining: credits, dailyGenerationLimit: credits } });
    ids.push(user.id); return user;
  };
  const input = (key: string) => ({ idempotencyKey: `${prefix}-${key}`, prompt: "private fixture prompt", provider: "wiro", model: "fixture-model", type: "image" as const });
  const balance = async (id: string) => (await db.user.findUniqueOrThrow({ where: { id } })).generationCreditsRemaining;
  async function check(label: string, run: () => Promise<void>) { resetProvider(); await run(); checks.push(label); console.log(`[media] PASS ${label}`); }
  const admin = await create("admin", 1, true);
  try {
    await check("concurrent distinct requests spend the final credit only once", async () => {
      const user = await create("single-credit");
      const outcomes = await Promise.allSettled([api.submitMediaGeneration(user.id, input("single-a")), api.submitMediaGeneration(user.id, input("single-b"))]);
      assert.equal(outcomes.filter(o => o.status === "fulfilled").length, 1);
      assert.match(String((outcomes.find(o => o.status === "rejected") as PromiseRejectedResult).reason), /MEDIA_NO_CREDITS/);
      assert.equal(calls, 1); assert.equal(await balance(user.id), 0);
    });
    await check("concurrent same-key and lost-response retries submit and debit once", async () => {
      const user = await create("same-key", 3);
      const replies = await Promise.all(Array.from({ length: 8 }, () => api.submitMediaGeneration(user.id, input("same"))));
      assert.ok(replies.every(r => [200, 202].includes(r.status)));
      const again = await api.submitMediaGeneration(user.id, input("same"));
      assert.equal(again.status, 200); assert.equal(calls, 1); assert.equal(await balance(user.id), 2);
      const row = await db.mediaGeneration.findUniqueOrThrow({ where: { userId_idempotencyKey: { userId: user.id, idempotencyKey: input("same").idempotencyKey } } });
      assert.ok(!row.encryptedTask?.includes(task.socketAccessToken));
      assert.ok(!JSON.stringify(row).includes("private fixture prompt"));
      const result = again.body as { taskSig: string };
      assert.equal(verifyMediaTask(user.id, "wiro", task.socketAccessToken, result.taskSig), true);
    });
    await check("changed input conflicts and another owner cannot recover a task", async () => {
      const user = await create("owner", 2); const outsider = await create("outsider");
      await api.submitMediaGeneration(user.id, input("owned"));
      await assert.rejects(api.submitMediaGeneration(user.id, { ...input("owned"), prompt: "changed" }), /MEDIA_REQUEST_CONFLICT/);
      await assert.rejects(api.readMediaGeneration(outsider.id, input("owned").idempotencyKey), /TASK_NOT_FOUND/);
      assert.equal(calls, 1); assert.equal(await balance(user.id), 1);
    });
    await check("accepted task can be recovered with exhausted credits or disabled provider", async () => {
      const user = await create("exhausted"); await api.submitMediaGeneration(user.id, input("exhausted"));
      const old = process.env.WIRO_API_KEY; process.env.WIRO_API_KEY = "";
      try { assert.equal((await api.submitMediaGeneration(user.id, input("exhausted"))).status, 200); }
      finally { process.env.WIRO_API_KEY = old; }
      assert.equal(calls, 1); assert.equal(await balance(user.id), 0);
    });
    await check("uncertain upstream outcome is retained without retries, refunds or diagnostic leaks", async () => {
      const user = await create("uncertain"); const marker = "fixture_private_upstream_marker";
      plugin.startGeneration = async () => { calls++; throw new Error(marker); };
      const first = await api.submitMediaGeneration(user.id, input("uncertain"));
      assert.equal(first.status, 202); assert.ok(!JSON.stringify(first).includes(marker));
      for (let i = 0; i < 3; i++) assert.equal((await api.submitMediaGeneration(user.id, input("uncertain"))).status, 202);
      assert.equal(calls, 1); assert.equal(await balance(user.id), 0);
      assert.equal(await db.mediaGeneration.count({ where: { userId: user.id, status: "UNCERTAIN" } }), 1);
    });
    await check("provably not sent returns exactly one reservation and never resubmits", async () => {
      const user = await create("not-sent");
      plugin.startGeneration = async () => { calls++; throw new MediaSubmissionNotSentError(); };
      const first = await api.submitMediaGeneration(user.id, input("not-sent"));
      assert.equal(first.status, 409); assert.equal(await balance(user.id), 1);
      await api.submitMediaGeneration(user.id, input("not-sent"));
      assert.equal(calls, 1); assert.equal(await balance(user.id), 1);
    });
    await check("daily reset cannot receive an old reservation refund", async () => {
      const user = await create("epoch");
      let enter!: () => void; const entered = new Promise<void>(resolve => { enter = resolve; });
      let release!: () => void; const released = new Promise<void>(resolve => { release = resolve; });
      plugin.startGeneration = async () => { calls++; enter(); await released; throw new MediaSubmissionNotSentError(); };
      const pending = api.submitMediaGeneration(user.id, input("epoch")); await entered;
      await db.user.update({ where: { id: user.id }, data: { generationCreditsRemaining: 5, generationCreditsRevision: { increment: 1 } } });
      release(); const result = await pending;
      assert.equal(result.status, 409); assert.equal(await balance(user.id), 5);
      assert.equal((result.body as { creditReturned: boolean }).creditReturned, false);
    });
    await check("provider success followed by persistence failure does not duplicate the job", async () => {
      const user = await create("persist");
      const name = `media_fixture_${randomBytes(4).toString("hex")}`;
      await db.$executeRawUnsafe(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."userId" = '${user.id}' AND NEW.status = 'ACCEPTED' THEN RAISE EXCEPTION 'fixture acceptance save failure'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe(`CREATE TRIGGER ${name} BEFORE UPDATE ON media_generations FOR EACH ROW EXECUTE FUNCTION ${name}()`);
      try {
        assert.equal((await api.submitMediaGeneration(user.id, input("persist"))).status, 202);
        assert.equal((await api.submitMediaGeneration(user.id, input("persist"))).status, 202);
        assert.equal(calls, 1); assert.equal(await balance(user.id), 0);
      } finally {
        await db.$executeRawUnsafe(`DROP TRIGGER ${name} ON media_generations`); await db.$executeRawUnsafe(`DROP FUNCTION ${name}()`);
      }
    });
    await check("insert constraint failure rolls back the credit reservation", async () => {
      const user = await create("insert-failure");
      const name = `media_fixture_${randomBytes(4).toString("hex")}`;
      await db.$executeRawUnsafe(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."userId" = '${user.id}' THEN RAISE EXCEPTION 'fixture insertion failure'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe(`CREATE TRIGGER ${name} BEFORE INSERT ON media_generations FOR EACH ROW EXECUTE FUNCTION ${name}()`);
      try {
        await assert.rejects(api.submitMediaGeneration(user.id, input("insert-failure")));
        assert.equal(await balance(user.id), 1); assert.equal(calls, 0);
        assert.equal(await db.mediaGeneration.count({ where: { userId: user.id } }), 0);
      } finally {
        await db.$executeRawUnsafe(`DROP TRIGGER ${name} ON media_generations`); await db.$executeRawUnsafe(`DROP FUNCTION ${name}()`);
      }
    });
    await check("missing signing configuration fails before reservation and rejects public fallback forgery", async () => {
      const user = await create("no-secret"); const auth = process.env.AUTH_SECRET; const next = process.env.NEXTAUTH_SECRET;
      process.env.AUTH_SECRET = ""; process.env.NEXTAUTH_SECRET = "";
      try {
        await assert.rejects(api.submitMediaGeneration(user.id, input("no-secret")), /MEDIA_NOT_CONFIGURED/);
        const sig = createHmac("sha256", "pchat-media-task-fallback-secret").update(`${user.id.length}:${user.id}|4:wiro|5:token`).digest("hex");
        assert.equal(verifyMediaTask(user.id, "wiro", "token", sig), false);
        assert.equal(await balance(user.id), 1); assert.equal(calls, 0);
        assert.equal(await db.mediaGeneration.count({ where: { userId: user.id } }), 0);
      } finally { process.env.AUTH_SECRET = auth; process.env.NEXTAUTH_SECRET = next; }
    });
    await check("review permissions, atomic refund and conflicting repeated review", async () => {
      const user = await create("review");
      plugin.startGeneration = async () => { calls++; throw new Error("fixture timeout"); };
      const pending = await api.submitMediaGeneration(user.id, input("review"));
      const id = (pending.body as { generationId: string }).generationId;
      const decision = { resolution: "notAccepted", confirmedNotAccepted: true, reference: "fixture upstream audit reference" };
      await assert.rejects(api.reconcileMediaSubmission(user.id, id, decision), /FORBIDDEN/);
      const outcomes = await Promise.allSettled([api.reconcileMediaSubmission(admin.id, id, decision), api.reconcileMediaSubmission(admin.id, id, decision)]);
      assert.equal(outcomes.filter(o => o.status === "fulfilled").length, 1); assert.equal(await balance(user.id), 1);
      assert.equal(await db.auditLog.count({ where: { resourceId: id, action: "MEDIA_SUBMISSION_RECONCILED" } }), 1);
      assert.equal(calls, 1);
    });
    await check("confirmed upstream task recovers original acceptance with no submission", async () => {
      const user = await create("recover"); plugin.startGeneration = async () => { calls++; throw new Error("fixture timeout"); };
      const result = await api.submitMediaGeneration(user.id, input("recover"));
      const id = (result.body as { generationId: string }).generationId;
      await api.reconcileMediaSubmission(admin.id, id, { resolution: "accepted", task, reference: "fixture upstream confirmed task" });
      assert.equal((await api.readMediaGeneration(user.id, input("recover").idempotencyKey)).status, 200);
      assert.equal(calls, 1); assert.equal(await balance(user.id), 0);
    });
    await check("active submission cannot be resolved prematurely", async () => {
      const user = await create("active"); let enter!: () => void; const entered = new Promise<void>(resolve => { enter = resolve; });
      let release!: () => void; const released = new Promise<void>(resolve => { release = resolve; });
      plugin.startGeneration = async () => { calls++; enter(); await released; return task; };
      const pending = api.submitMediaGeneration(user.id, input("active")); await entered;
      const row = await db.mediaGeneration.findFirstOrThrow({ where: { userId: user.id } });
      try { await assert.rejects(api.reconcileMediaSubmission(admin.id, row.id, { resolution: "notAccepted", confirmedNotAccepted: true, reference: "fixture unverified decision" }), /MEDIA_REVIEW_CONFLICT/); }
      finally { release(); }
      assert.equal((await pending).status, 200); assert.equal(await balance(user.id), 0);
    });
    await check("late upstream success survives an earlier confirmed refund without a second debit", async () => {
      const user = await create("late-refunded"); let enter!: () => void; const entered = new Promise<void>(resolve => { enter = resolve; });
      let release!: () => void; const released = new Promise<void>(resolve => { release = resolve; });
      plugin.startGeneration = async () => { calls++; enter(); await released; return task; };
      const pending = api.submitMediaGeneration(user.id, input("late-refunded")); await entered;
      const row = await db.mediaGeneration.findFirstOrThrow({ where: { userId: user.id } });
      await db.mediaGeneration.update({ where: { id: row.id }, data: { updatedAt: new Date(Date.now() - 120_000) } });
      try { await api.reconcileMediaSubmission(admin.id, row.id, { resolution: "notAccepted", confirmedNotAccepted: true, reference: "fixture erroneous upstream confirmation" }); }
      finally { release(); }
      const result = await pending;
      assert.equal(result.status, 200); assert.equal((result.body as { taskId: string }).taskId, task.taskId);
      assert.equal(await balance(user.id), 1); assert.equal(calls, 1);
      const recovered = await db.mediaGeneration.findUniqueOrThrow({ where: { id: row.id } });
      assert.equal(recovered.creditReturned, true);
      assert.equal(await db.auditLog.count({ where: { resourceId: row.id, action: "MEDIA_LATE_ACCEPTANCE_CORRECTED" } }), 1);
      assert.equal((await api.readMediaGeneration(user.id, input("late-refunded").idempotencyKey)).status, 200);
    });
    await check("direct provider acceptance wins a contradictory reviewer task and records the correction", async () => {
      const user = await create("late-reviewed"); let enter!: () => void; const entered = new Promise<void>(resolve => { enter = resolve; });
      let release!: () => void; const released = new Promise<void>(resolve => { release = resolve; });
      plugin.startGeneration = async () => { calls++; enter(); await released; return task; };
      const pending = api.submitMediaGeneration(user.id, input("late-reviewed")); await entered;
      const row = await db.mediaGeneration.findFirstOrThrow({ where: { userId: user.id } });
      await db.mediaGeneration.update({ where: { id: row.id }, data: { updatedAt: new Date(Date.now() - 120_000) } });
      try { await api.reconcileMediaSubmission(admin.id, row.id, { resolution: "accepted", task: { taskId: "fixture-wrong-task", socketAccessToken: "fixture-wrong-token" }, reference: "fixture erroneous task mapping" }); }
      finally { release(); }
      const result = await pending;
      assert.equal(result.status, 200); assert.equal((result.body as { taskId: string }).taskId, task.taskId);
      assert.equal(await balance(user.id), 0); assert.equal(calls, 1);
      assert.equal(await db.auditLog.count({ where: { resourceId: row.id, action: "MEDIA_LATE_ACCEPTANCE_CORRECTED" } }), 1);
    });
    const directory = ".workbuddy/evidence/audits/round-3"; await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/integration.json`, JSON.stringify({ passed: true, checks, database: "isolated PostgreSQL", actualService: true, provider: "in-process deterministic fixture", upstreamCalls: 0, limits: "Not production writes, real provider quality, cost or payment acceptance" }, null, 2));
  } finally {
    plugin.startGeneration = original;
    await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error("MEDIA_INTEGRATION_FAILED", error instanceof assert.AssertionError ? error.message : error instanceof Error ? error.name : "Unknown"); process.exitCode = 1; });
