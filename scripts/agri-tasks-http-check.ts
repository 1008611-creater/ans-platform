/** Loopback-only Next production HTTP, PostgreSQL and actual Credentials/CSRF. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import type { AgriTaskCommand, AgriTaskDetail, AgriTaskList, AgriTaskMutation } from "../src/contracts/agri-tasks";
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  const url = new URL(value ?? "http://invalid");
  if (url.hostname !== "127.0.0.1" || url.port !== "55438" || url.pathname !== "/ans_product_verify_agri_tasks_r1") throw new Error("Refusing non-isolated timetable HTTP writes");
}
const origin = "http://127.0.0.1:3146", api = "/api/competitions/agrihackathon/tasks", reportDir = ".workbuddy/evidence/agri-tasks";
// This fixed password belongs only to generated, loopback example.invalid fixtures.
const fixturePassword = "LocalTimetableOnly!2026";
class Client {
  private cookies = new Map<string, string>();
  constructor(readonly actorId: string | null) {}
  async fetch(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("cookie", Array.from(this.cookies, ([key, value]) => `${key}=${value}`).join("; "));
    const response = await fetch(origin + path, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(15_000) });
    for (const cookie of response.headers.getSetCookie()) {
      const entry = cookie.split(";", 1)[0], split = entry.indexOf("=");
      if (split > 0) this.cookies.set(entry.slice(0, split), entry.slice(split + 1));
    }
    return response;
  }
  async login(email: string, password = fixturePassword) {
    const csrf = await this.fetch("/api/auth/csrf"); assert.equal(csrf.status, 200);
    const { csrfToken } = await csrf.json() as { csrfToken: string }; assert.ok(csrfToken);
    const response = await this.fetch("/api/auth/callback/credentials", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1", origin }, body: new URLSearchParams({ csrfToken, email, password, callbackUrl: origin + "/competitions/agrihackathon/tasks" }) });
    assert.equal(response.status, 200);
    const loginResult = await response.json() as { url?: string };
    if (password === fixturePassword) assert.ok(loginResult.url && !new URL(loginResult.url).searchParams.has("error"), "Credentials callback: " + String(loginResult.url));
    const session = await (await this.fetch("/api/auth/session")).json() as { user?: { id: string } } | null;
    return session?.user?.id ?? null;
  }
  request(command?: AgriTaskCommand, suffix = "", extra: Record<string, string> = {}) {
    return this.fetch(api + suffix, { headers: { ...(this.actorId ? { "x-ans-task-actor": this.actorId } : {}), ...(command ? { "content-type": "application/json", origin } : {}), ...extra }, ...(command ? { method: "POST", body: JSON.stringify(command) } : {}) });
  }
  async data<T>(command?: AgriTaskCommand, suffix = ""): Promise<T> {
    const response = await this.request(command, suffix); assert.equal(response.status, 200);
    const body = await response.json() as { ok: boolean; data: T }; assert.equal(body.ok, true); return body.data;
  }
}
async function main() {
  const { db } = await import("../src/lib/db");
  const { agriTaskTemplates } = await import("../src/domain/competitions/agri-task-templates");
  const checks: { label: string; passed: boolean }[] = [];
  let current = "prepare", server: ChildProcess | null = null;
  async function stop() {
    const child = server; server = null; if (!child || child.exitCode !== null) return;
    child.kill(); await new Promise<void>(resolve => { child.once("exit", () => resolve()); setTimeout(resolve, 5000).unref(); });
    assert.notEqual(child.exitCode, undefined);
  }
  const prefix = "agri-http-" + randomUUID();
  const competition = await db.competition.create({ data: { title: prefix + " LOCAL FIXTURE" }, select: { id: true } });
  const password = await bcrypt.hash(fixturePassword, 10);
  const makeUser = (suffix: string, role: "USER" | "ADMIN" = "USER") => db.user.create({ data: { email: prefix + "-" + suffix + "@example.invalid", username: prefix + "-" + suffix, name: "LOCAL FIXTURE " + suffix, password, locale: "zh", role, quotaPoints: 101 }, select: { id: true, email: true } });
  const [owner, recipient, admin] = await Promise.all([makeUser("owner"), makeUser("recipient"), makeUser("admin", "ADMIN")]);
  async function start() {
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3146"], { env: { ...process.env, ANS_AGRIHACKATHON_COMPETITION_ID: competition.id, ANS_LOCAL_DIST_DIR: ".next-agri-tasks" }, windowsHide: true, stdio: "ignore" });
    let ended = false; server.once("exit", () => { ended = true; });
    for (let attempt = 0; attempt < 60; attempt++) {
      if (ended) throw new Error("Isolated Next failed to start");
      try { const response = await fetch(origin + "/api/health", { signal: AbortSignal.timeout(1000) }); if (response.ok) return; } catch { /* Readiness only. */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error("Isolated Next did not become ready");
  }
  const check = async (label: string, run: () => Promise<void>) => { current = label; await run(); checks.push({ label, passed: true }); console.log("[agri-http] PASS " + label); };
  const a = new Client(owner.id), b = new Client(recipient.id), c = new Client(admin.id), anon = new Client(null);
  const base = { ...agriTaskTemplates("zh")[0].task, title: prefix + " PRIVATE_INPUT_MARKER" };
  let taskId = ""; let lostCommand: AgriTaskCommand;
  await mkdir(reportDir, { recursive: true });
  try {
    await start();
    await check("anonymous requests cannot read or write tasks", async () => {
      assert.equal((await anon.request()).status, 401);
      assert.equal((await anon.request({ action: "initialize", locale: "zh", idempotencyKey: randomUUID() })).status, 401);
    });
    await check("actual Credentials CSRF login authenticates three distinct database accounts", async () => {
      assert.equal(await a.login(owner.email), owner.id); assert.equal(await b.login(recipient.email), recipient.id); assert.equal(await c.login(admin.email), admin.id);
      assert.equal(await new Client(null).login(owner.email, "WrongLocalPassword!"), null);
    });
    await check("visiting authenticated page does not initialize or expose private tasks to public HTML", async () => {
      const response = await a.fetch("/competitions/agrihackathon/tasks"); assert.equal(response.status, 200); assert.ok(!(await response.text()).includes(base.title));
      assert.equal((await a.data<AgriTaskList>()).tasks.length, 0);
    });
    await check("stale or missing actor headers reject before private service reads or writes", async () => {
      assert.equal((await a.fetch(api)).status, 409);
      assert.equal((await a.request(undefined, "", { "x-ans-task-actor": recipient.id })).status, 409);
      assert.equal((await a.request({ action: "initialize", locale: "zh", idempotencyKey: randomUUID() }, "", { "x-ans-task-actor": recipient.id })).status, 409);
    });
    await check("cross-origin writes and strict invalid commands are refused", async () => {
      const command = { action: "initialize", locale: "zh", idempotencyKey: randomUUID() } as const;
      assert.equal((await a.request(command, "", { origin: "https://untrusted.example.invalid" })).status, 403);
      for (const task of [{ ...base, ownerId: recipient.id }, { ...base, status: "DONE", completionResult: null }]) {
        const response = await a.fetch(api, { method: "POST", headers: { "x-ans-task-actor": owner.id, origin, "content-type": "application/json" }, body: JSON.stringify({ action: "create", task, idempotencyKey: randomUUID() }) }); assert.equal(response.status, 400);
      }
    });
    await check("explicit HTTP initialization is idempotent and creates exactly six unknown-date tasks", async () => {
      const command = { action: "initialize", locale: "zh", idempotencyKey: randomUUID() } as const;
      const first = await a.data<AgriTaskMutation>(command), replay = await a.data<AgriTaskMutation>(command);
      assert.equal(first.createdTaskCount, 6); assert.equal(replay.duplicate, true);
      const tasks = (await a.data<AgriTaskList>()).tasks; assert.equal(tasks.length, 6); assert.ok(tasks.every(task => task.status === "NOT_STARTED" && task.due.state === "UNKNOWN"));
    });
    await check("HTTP creation and concurrent exact replay append one event and receipt", async () => {
      const command = { action: "create", task: base, idempotencyKey: randomUUID() } as const;
      const results = await Promise.all(Array.from({ length: 3 }, () => a.data<AgriTaskMutation>(command)));
      assert.equal(results.filter(row => !row.duplicate).length, 1); assert.equal(new Set(results.map(row => row.task!.id)).size, 1); taskId = results[0].task!.id;
      assert.equal(await db.agriTaskEvent.count({ where: { taskId } }), 1);
      assert.equal((await a.request({ ...command, task: { ...base, title: "Different payload" } })).status, 409);
    });
    await check("revision conflicts preserve accepted data and append-only history", async () => {
      const changed = { ...base, title: prefix + " SAVED_REVISION_2" };
      await a.data({ action: "update", taskId, expectedRevision: 1, task: changed, idempotencyKey: randomUUID() });
      assert.equal((await a.request({ action: "update", taskId, expectedRevision: 1, task: base, idempotencyKey: randomUUID() })).status, 409);
      const detail = await a.data<AgriTaskDetail>(undefined, "/" + taskId); assert.equal(detail.task.title, changed.title); assert.equal(detail.history.length, 2);
    });
    await check("ADMIN has no private timetable bypass", async () => {
      assert.equal((await c.data<AgriTaskList>()).tasks.length, 0); assert.equal((await c.request(undefined, "/" + taskId)).status, 404);
      assert.equal((await c.request({ action: "update", taskId, expectedRevision: 2, task: base, idempotencyKey: randomUUID() })).status, 404);
    });
    await check("explicit recipient reads a limited projection but cannot edit or reshare", async () => {
      await a.data({ action: "share", taskId, expectedRevision: 2, recipientId: recipient.id, expiresAt: null, idempotencyKey: randomUUID() });
      const shared = await b.data<AgriTaskDetail>(undefined, "/" + taskId); assert.equal(shared.task.access, "SHARED_READONLY"); assert.deepEqual(shared.history, []); assert.deepEqual(shared.shares, []);
      assert.equal((await b.data<AgriTaskList>()).tasks.length, 1);
      const mine = await a.data<AgriTaskList>(undefined, "?scope=mine&stage=PREPARATION");
      assert.ok(mine.tasks.length > 0); assert.ok(mine.tasks.every(task => task.stage === "PREPARATION" && task.access === "OWNER"));
      assert.equal((await a.data<AgriTaskList>(undefined, "?scope=shared")).tasks.length, 0);
      assert.equal((await b.data<AgriTaskList>(undefined, "?scope=mine")).tasks.length, 0);
      assert.deepEqual((await b.data<AgriTaskList>(undefined, "?scope=shared&stage=PREPARATION")).tasks.map(task => task.id), [taskId]);
      assert.equal((await b.data<AgriTaskList>(undefined, "?scope=shared&stage=ARCHIVE")).tasks.length, 0);
      for (const query of ["?stage=UNKNOWN", "?scope=everyone", "?ownerId=forged"]) assert.equal((await b.request(undefined, query)).status, 400);
      assert.equal((await b.request({ action: "update", taskId, expectedRevision: 3, task: base, idempotencyKey: randomUUID() })).status, 404);
      assert.equal((await b.request({ action: "share", taskId, expectedRevision: 3, recipientId: admin.id, expiresAt: null, idempotencyKey: randomUUID() })).status, 404);
    });
    await check("share withdrawal immediately closes list and detail access", async () => {
      await a.data({ action: "revokeShare", taskId, expectedRevision: 3, recipientId: recipient.id, idempotencyKey: randomUUID() });
      assert.equal((await b.request(undefined, "/" + taskId)).status, 404); assert.equal((await b.data<AgriTaskList>()).tasks.length, 0);
    });
    await check("flagged accounts are rechecked despite an existing authenticated JWT", async () => {
      await db.user.update({ where: { id: owner.id }, data: { flagged: true } });
      try { assert.equal((await a.request()).status, 403); assert.equal((await a.request({ action: "initialize", locale: "zh", idempotencyKey: randomUUID() })).status, 403); }
      finally { await db.user.update({ where: { id: owner.id }, data: { flagged: false } }); }
    });
    await check("lost creation response is persisted before a real Next process restart", async () => {
      lostCommand = { action: "create", task: { ...base, title: prefix + " LOST_RESPONSE" }, idempotencyKey: randomUUID() };
      const response = await a.request(lostCommand); assert.equal(response.status, 200); await response.arrayBuffer();
      await stop(); await start();
    });
    await check("same authenticated cookie survives restart and exact replay recovers one durable creation", async () => {
      const replay = await a.data<AgriTaskMutation>(lostCommand); assert.equal(replay.duplicate, true); assert.equal(replay.task!.title, prefix + " LOST_RESPONSE");
      assert.equal(await db.agriTaskEvent.count({ where: { taskId: replay.task!.id } }), 1);
      const detail = await a.data<AgriTaskDetail>(undefined, "/" + taskId); assert.equal(detail.task.revision, 4); assert.equal(detail.history.length, 4); assert.equal(detail.shares.length, 0);
    });
    await check("task operations do not change quotas or create awards and publications", async () => {
      for (const user of [owner, recipient, admin]) {
        const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { quotaPoints: true, xp: true } }); assert.equal(row.quotaPoints, 101); assert.equal(row.xp, 0);
        assert.equal(await db.quotaLedger.count({ where: { userId: user.id } }), 0);
      }
      assert.equal(await db.artifactPublication.count({ where: { requestedById: { in: [owner.id, recipient.id, admin.id] } } }), 0);
    });
    await writeFile(reportDir + "/http-fixture.json", JSON.stringify({ localFixtureOnly: true, origin, competitionId: competition.id, owner, recipient, admin, taskId }, null, 2));
    current = "complete";
  } finally {
    await stop(); await db.$disconnect();
    await writeFile(reportDir + "/http.json", JSON.stringify({ completed: current === "complete", current, actualNextHttp: true, actualCredentialsCsrf: true, syntheticAuthCookies: false, isolatedPostgres: true, nextProcessRestart: true, databaseRestart: false, retainedLocalFixtures: true, productionWrites: false, providerCalls: 0, realFunds: false, checks }, null, 2));
  }
}
main().catch(error => { console.error("[agri-http] FAILED " + (error instanceof assert.AssertionError ? error.message : error instanceof Error ? error.name + ": " + error.message.replaceAll(process.env.DATABASE_URL ?? "[unused]", "[isolated-db]").slice(0, 500) : "diagnostics withheld")); process.exitCode = 1; });
