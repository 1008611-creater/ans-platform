/** Dedicated loopback PostgreSQL fixture only. No remote config or supplier calls. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { Prisma, PrismaClient, type ComputeTaskState } from "@prisma/client";
function guard(value: string | undefined) {
  if (!value) throw new Error("Explicit isolated database required");
  const url = new URL(value);
  if (url.hostname !== "127.0.0.1" || url.port !== "55438" || url.pathname !== "/ans_product_verify_compute_history_r1") throw new Error("Refusing non-isolated member-history writes");
}
guard(process.env.DATABASE_URL); guard(process.env.DIRECT_URL);
const checks: { label: string; passed: boolean }[] = [];
const prefix = `history-fixture-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
async function main() {
  const { db } = await import("../src/lib/db");
  const { readComputeHistory: history } = await import("../src/server/compute/member-history");
  const users: string[] = [];
  async function user(points = 123) {
    const row = await db.user.create({ data: { email: `${prefix}-${users.length}@example.invalid`, username: `${prefix}-${users.length}`, quotaPoints: points }, select: { id: true } });
    users.push(row.id); return row.id;
  }
  function fixture(userId: string, i: number, state: ComputeTaskState, createdAt = new Date("2026-10-09T00:00:00.000Z")) {
    return { id: `${prefix}-task-${String(i).padStart(3, "0")}`, userId, provider: "toonflow", idempotencyKey: `${prefix}-private-key-${i}`,
      requestHash: "a".repeat(64), modelId: "fixture-model", policyVersion: "fixture-policy-v1",
      price: { unit: "token", ratePoints: 1, rateUnits: 1, maxUnits: 10 }, maxUnits: 10, authorizedPoints: 10,
      state, revision: 1, createdAt,
      startedAt: ["RUNNING", "UNCERTAIN", "SETTLED"].includes(state) ? createdAt : null,
      finishedAt: ["SETTLED", "RELEASED"].includes(state) ? createdAt : null,
      settledPoints: state === "SETTLED" ? 4 : state === "RELEASED" ? 0 : null,
      units: state === "SETTLED" ? 4 : null, outcome: state === "SETTLED" ? "partial" : null,
    } satisfies Prisma.ComputeTaskCreateManyInput;
  }
  async function check(label: string, action: () => Promise<void>) { await action(); checks.push({ label, passed: true }); console.log(`[compute-history] PASS ${label}`); }
  try {
    const owner = await user(), outsider = await user(987), deleted = await user();
    const states: ComputeTaskState[] = ["AUTHORIZED", "RUNNING", "UNCERTAIN", "SETTLED", "RELEASED"];
    const fixtures = Array.from({ length: 65 }, (_, i) => fixture(owner, i, states[i % 5], new Date(i < 60 ? "2026-10-09T00:00:00.000Z" : "2026-10-10T00:00:00.000Z")));
    await db.computeTask.createMany({ data: fixtures });
    await db.computeTask.create({ data: fixture(outsider, 900, "AUTHORIZED") });
    await db.user.update({ where: { id: deleted }, data: { deletedAt: new Date() } });
    const expectedSummary = { availablePoints: 123, reservedPoints: 390, consumedPoints: 52, refundedPoints: 208, taskCount: 65 };
    await check("full 65-task summary includes all active reservations, settled usage and both refund kinds", async () => {
      const result = await history(owner);
      assert.equal(result.tasks.length, 20); assert.deepEqual(result.summary, expectedSummary);
      assert.notEqual(result.summary.taskCount, result.tasks.length);
    });
    await check("20+1 keyset pages cover all tied timestamps once in descending createdAt/id order", async () => {
      const ids: string[] = []; let cursor: string | undefined; const sizes: number[] = [];
      do {
        const result = await history(owner, { cursor }); sizes.push(result.tasks.length);
        ids.push(...result.tasks.map(t => t.taskId)); assert.deepEqual(result.summary, expectedSummary);
        cursor = result.nextCursor ?? undefined;
      } while (cursor);
      assert.deepEqual(sizes, [20, 20, 20, 5]); assert.equal(new Set(ids).size, 65);
      const expected = [...fixtures].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id)).map(x => x.id);
      assert.deepEqual(ids, expected);
    });
    await check("each filter paginates independently while summaries remain global and cursor can cross a state filter", async () => {
      for (const filter of ["active", "settled", "released"] as const) {
        const expectedStates = filter === "active" ? ["AUTHORIZED", "RUNNING", "UNCERTAIN"] : filter === "settled" ? ["SETTLED"] : ["RELEASED"];
        const ids: string[] = []; let cursor: string | undefined;
        do {
          const result = await history(owner, { filter, cursor }); assert.deepEqual(result.summary, expectedSummary);
          assert.ok(result.tasks.every(t => expectedStates.includes(t.state))); ids.push(...result.tasks.map(t => t.taskId)); cursor = result.nextCursor ?? undefined;
        } while (cursor);
        assert.equal(ids.length, filter === "active" ? 39 : 13); assert.equal(new Set(ids).size, ids.length);
      }
      const result = await history(owner, { filter: "active", cursor: fixtures[63].id });
      assert.ok(result.tasks.every(t => ["AUTHORIZED", "RUNNING", "UNCERTAIN"].includes(t.state)));
    });
    await check("foreign and nonexistent cursor errors are indistinguishable and never disclose owner data", async () => {
      for (const cursor of [fixtures[0].id, `${prefix}-task-absent`]) {
        await assert.rejects(history(outsider, { cursor }), e => e instanceof Error && "code" in e && e.code === "COMPUTE_CURSOR_INVALID" && "status" in e && e.status === 400);
      }
      const result = await history(outsider); assert.equal(result.tasks.length, 1); assert.equal(result.summary.taskCount, 1); assert.equal(result.summary.availablePoints, 987);
      assert.equal(JSON.stringify(result).includes(fixtures[0].id), false);
    });
    await check("malformed cursor and unexpected authority fields produce stable 400", async () => {
      for (const query of [{ cursor: "bad cursor" }, { cursor: "" }, { cursor: "x".repeat(161) }, { userId: owner }, { limit: 50 }, { filter: "UNKNOWN" }]) {
        await assert.rejects(history(owner, query), e => e instanceof Error && "code" in e && e.code === "COMPUTE_CURSOR_INVALID" && "status" in e && e.status === 400);
      }
    });
    await check("missing and deleted accounts are unavailable; flagged accounts retain history access", async () => {
      for (const id of [deleted, `${prefix}-missing`]) await assert.rejects(history(id), /COMPUTE_ACCOUNT_UNAVAILABLE/);
      await db.user.update({ where: { id: owner }, data: { flagged: true } });
      assert.deepEqual((await history(owner)).summary, expectedSummary);
    });
    await check("task DTO contains only the public task view plus startedAt, with no price/rate/event secrets", async () => {
      const result = await history(owner, { filter: "settled" }); const row = result.tasks[0];
      assert.deepEqual(Object.keys(row).sort(), ["taskId", "modelId", "state", "revision", "authorizedPoints", "settledPoints", "refundedPoints", "maxUnits", "units", "unit", "outcome", "policyVersion", "createdAt", "startedAt", "finishedAt"].sort());
      assert.equal(row.refundedPoints, 6); assert.ok(row.startedAt); assert.equal(row.unit, "token");
      assert.doesNotMatch(JSON.stringify(result), /private-key|requestHash|idempotencyKey|evidenceRef|events|ratePoints|rateUnits|"price"|"userId"|"provider"/);
      assert.ok((await history(owner, { filter: "active" })).tasks.every(t => t.refundedPoints === 0));
      assert.ok((await history(owner, { filter: "released" })).tasks.every(t => t.refundedPoints === 10));
    });
    await check("database scope rejects non-Toonflow tasks before they can become history cursors", async () => {
      await assert.rejects(db.computeTask.create({ data: { ...fixture(owner, 950, "AUTHORIZED"), provider: "unsupported-provider" } }));
      await assert.rejects(history(owner, { cursor: `${prefix}-task-950` }), /COMPUTE_CURSOR_INVALID/);
    });
    await check("RepeatableRead history sees one balance/task/summary snapshot during a concurrent settlement", async () => {
      const snapshotOwner = await user(90); const row = await db.computeTask.create({ data: fixture(snapshotOwner, 980, "RUNNING") });
      const writer = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
      const original = db.$transaction.bind(db); const originalMethod = db.$transaction; let intercepted = false;
      db.$transaction = new Proxy(originalMethod, { apply(target, thisArg, args) {
        const [callback, options] = args;
        if (typeof callback !== "function") return Reflect.apply(target, thisArg, args);
        return original(async tx => {
        const proxy = new Proxy(tx, { get(target, property, receiver) {
          if (property !== "user") return Reflect.get(target, property, receiver);
          return new Proxy(target.user, { get(delegate, method, delegateReceiver) {
            if (method !== "findUnique") return Reflect.get(delegate, method, delegateReceiver);
            return async (args: Prisma.UserFindUniqueArgs) => {
              const account = await delegate.findUnique(args);
              if (!intercepted) {
                intercepted = true;
                await writer.$transaction(async change => {
                  await change.user.update({ where: { id: snapshotOwner }, data: { quotaPoints: 84 } });
                  await change.computeTask.update({ where: { id: row.id }, data: { state: "SETTLED", revision: 2, settledPoints: 6, units: 6, outcome: "succeeded", finishedAt: new Date() } });
                });
              }
              return account;
            };
          } });
        } });
        return callback(proxy);
      }, options);
      } });
      try {
        const during = await history(snapshotOwner);
        assert.equal(intercepted, true); assert.equal(during.tasks[0].state, "RUNNING");
        assert.deepEqual(during.summary, { availablePoints: 90, reservedPoints: 10, consumedPoints: 0, refundedPoints: 0, taskCount: 1 });
      } finally { db.$transaction = originalMethod; await writer.$disconnect(); }
      const after = await history(snapshotOwner);
      assert.equal(after.tasks[0].state, "SETTLED");
      assert.deepEqual(after.summary, { availablePoints: 84, reservedPoints: 0, consumedPoints: 6, refundedPoints: 4, taskCount: 1 });
    });
    await check("reads leave all member balances, task revisions and event counts unchanged", async () => {
      const before = await db.computeTask.findMany({ where: { userId: owner }, orderBy: { id: "asc" } });
      await history(owner); await history(owner, { filter: "active" });
      assert.deepEqual(await db.computeTask.findMany({ where: { userId: owner }, orderBy: { id: "asc" } }), before);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: owner } })).quotaPoints, 123);
      assert.equal(await db.computeTaskEvent.count({ where: { task: { userId: owner } } }), 0);
    });
  } finally {
    await mkdir(".workbuddy/evidence/compute-member-history", { recursive: true });
    await writeFile(".workbuddy/evidence/compute-member-history/integration.json", JSON.stringify({ isolatedPostgres: true, providerCalls: 0, realFunds: false, remoteCredentialsRead: false, checks }, null, 2));
    await db.computeTask.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
}
main().catch(() => { console.error("[compute-history] FAILED (diagnostics withheld)"); process.exitCode = 1; });