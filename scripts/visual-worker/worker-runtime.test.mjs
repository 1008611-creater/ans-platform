import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm, chmod } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { ModelJournal, createWorkerApi, createModelWorker, runWorkerLoop } from "./worker-runtime.mjs";
import { TripoAdapter, readCredentialFile } from "./tripo-adapter.mjs";
const id = "12345678-1234-4234-8234-123456789abc", other = "22345678-1234-4234-8234-123456789abc";
const workerId = "test-model-worker";
const options = { model: "P2-20260801", faceCount: 5000, texture: true, pbr: true, textureResolution: "2K" };
const job = { id, leaseToken: other, inputMime: "image/png", options, providerTaskId: null };
async function setup(t, overrides = {}) {
 const root = await mkdtemp(join(tmpdir(), "ans-model-test-"));
 t.after(() => rm(root, { recursive: true, force: true }));
 const journal = new ModelJournal(root), calls = [], counters = { submitted: 0, complete: 0 };
 const api = async (path, init) => {
  calls.push({ path, ...init });
  if(path.endsWith("/input")) return Buffer.from([1, 2]);
  if(path.endsWith("/complete")) counters.complete++;
  return {};
 };
 const adapter = {
  request: async () => ({ p: [{ value: options.model, face_min: 500, face_max: 25000 }] }),
  upload: async () => "image-token", submit: async () => { counters.submitted++; return "provider-1"; },
  status: async () => ({ status: "success", native_format: "glb" }), download: async () => Buffer.from([3, 4]), ...overrides
 };
 const worker = createModelWorker({ api, adapter, journal, workerId, sleep: async () => {} });
 return { root, journal, calls, counters, api, adapter, worker };
}
test("temporary provider 503/429 errors recover the same paid task", async t => {
 let attempts = 0;
 const h = await setup(t, { status: async () => { if(++attempts < 3) throw new Error("PROVIDER_UNAVAILABLE"); return { status: "success", native_format: "glb" }; } });
 assert.equal(await h.worker.work(job), true);
 assert.equal(h.counters.submitted, 1); assert.equal(h.counters.complete, 1);
 assert.equal((await h.journal.load(id)).done, true);
 assert.equal(h.calls.some(x => ["failed", "review"].includes(x.body?.type)), false);
});
test("HTTP errors from status reads never masquerade as confirmed task failure", async () => {
 for(const status of [429, 503]) {
  const adapter = new TripoAdapter({ fetcher: async () => new Response("{}", { status }) }); adapter.token = "test-token";
  await assert.rejects(adapter.status("task"), error => error.code === "PROVIDER_UNAVAILABLE");
 }
});
test("lost paid submission response never triggers a second submission or recovery guess", async t => {
 const h = await setup(t);
 h.adapter.submit = async () => { h.counters.submitted++; throw new Error("SUBMISSION_UNCERTAIN"); };
 assert.equal(await h.worker.work(job), false);
 assert.equal(h.counters.submitted, 1);
 assert.equal(h.calls.at(-1).body.type, "review");
 let recovery = 0; await h.journal.recover(async () => { recovery++; }); assert.equal(recovery, 0);
 assert.equal((await h.journal.load(id)).intent, true);
});
test("a known task survives process restart without another paid submission", async t => {
 const h = await setup(t, { status: async () => { throw new Error("PROVIDER_UNAVAILABLE"); } });
 assert.equal(await h.worker.work(job), false);
 let saved = await h.journal.load(id); assert.equal(saved.taskId, "provider-1");
 await h.journal.save(id, { ...saved, retryAt: 0 });
 let recovered; await h.journal.recover(async (path, init) => { recovered = { path, init }; });
 assert.equal(recovered.init.body.providerTaskId, "provider-1");
 h.adapter.status = async taskId => { assert.equal(taskId, "provider-1"); return { status: "success", native_format: "glb" }; };
 const restarted = createModelWorker({ api: h.api, adapter: h.adapter, journal: h.journal, workerId, sleep: async () => {} });
 assert.equal(await restarted.work({ ...job, providerTaskId: "provider-1" }), true);
 assert.equal(h.counters.submitted, 1);
});
test("non-GLB results are held for review and cannot starve the queue", async t => {
 const h = await setup(t, { status: async () => ({ status: "success", native_format: "fbx" }), download: async () => { throw new Error("MODEL_UNSUPPORTED"); } });
 await h.worker.work(job);
 assert.equal((await h.journal.load(id)).blocked, true);
 let recoveries = 0; await h.journal.recover(async () => { recoveries++; }); assert.equal(recoveries, 0);
 let claims = 0;
 const next = createModelWorker({ api: async path => { assert.equal(path, "/claim"); claims++; return null; }, adapter: h.adapter, journal: h.journal, workerId });
 await next.tick(); assert.equal(claims, 1);
});
test("only an explicit provider failed status closes a paid task as failed", async t => {
 const h = await setup(t, { status: async () => ({ status: "failed" }) });
 await h.worker.work(job);
 assert.equal(h.calls.at(-1).body.type, "failed");
 assert.equal((await h.journal.load(id)).done, true);
});
test("broken JSON and 404 records do not prevent another journal from recovering", async t => {
 const h = await setup(t);
 await writeFile(join(h.root, id + ".json"), "{truncated");
 await h.journal.save(other, { taskId: "stale", workerId });
 const third = "32345678-1234-4234-8234-123456789abc";
 await h.journal.save(third, { taskId: "good", workerId });
 const tasks = [];
 await h.journal.recover(async (path, init) => { tasks.push(init.body.providerTaskId); if(path.includes(other)) throw new Error("NOT_FOUND"); });
 assert.deepEqual(tasks.sort(), ["good", "stale"]); assert.equal((await h.journal.load(other)).blocked, true);
 assert.equal(await readFile(join(h.root, id + ".json"), "utf8"), "{truncated");
});
test("recovery respects durable backoff and manual review", async t => {
 const h = await setup(t);
 await h.journal.save(id, { taskId: "waiting", workerId, retryAt: Date.now() + 60000 });
 let calls = 0; await h.journal.recover(async () => { calls++; }); assert.equal(calls, 0);
 await h.journal.save(id, { taskId: "waiting", workerId, blocked: true });
 await h.journal.recover(async () => { calls++; }); assert.equal(calls, 0);
});
test("recovery limits persist across process restarts", async t => {
 const h = await setup(t);
 await h.journal.save(id, { taskId: "old", workerId, startedAt: Date.now() - 46 * 60000, attempts: 2 });
 await h.worker.work({ ...job, providerTaskId: "old" });
 assert.equal((await h.journal.load(id)).blocked, true);
 assert.equal(h.counters.submitted, 0); assert.equal(h.calls.at(-1).body.type, "review");
});
test("connection loss during claim backs off within the same process", async () => {
 const controller = new AbortController(); let ticks = 0; const waits = [];
 await runWorkerLoop({ signal: controller.signal, sleep: async ms => { waits.push(ms); }, tick: async () => { ticks++; if(ticks < 3) throw new Error("network"); controller.abort(); return true; } });
 assert.equal(ticks, 3); assert.deepEqual(waits, [5000, 10000]);
});
test("a lost lease before provider submission never sends the paid request", async t => {
 const h = await setup(t, { upload: async () => { await delay(15); return "token"; } });
 const api = async (path, init) => { if(init.body?.type === "heartbeat") throw new Error("LEASE_LOST"); return h.api(path, init); };
 const worker = createModelWorker({ api, adapter: h.adapter, journal: h.journal, workerId, heartbeatMs: 1 });
 await worker.work(job); assert.equal(h.counters.submitted, 0);
});
test("one transient heartbeat error is not a terminal model failure", async t => {
 const h = await setup(t, { status: async () => { await delay(15); return { status: "success", native_format: "glb" }; } });
 let heartbeats = 0;
 const api = async (path, init) => { if(init.body?.type === "heartbeat" && ++heartbeats === 1) throw new Error("ANS_UNAVAILABLE"); return h.api(path, init); };
 const worker = createModelWorker({ api, adapter: h.adapter, journal: h.journal, workerId, heartbeatMs: 1 });
 assert.equal(await worker.work(job), true); assert.equal(h.counters.submitted, 1);
});
test("worker API blocks redirects and emits safe fixed error codes", async () => {
 let init;
 const api = createWorkerApi({ server: "https://example.invalid", key: "test", fetcher: async (_url, options) => { init = options; return new Response("private error", { status: 503 }); } });
 await assert.rejects(api("/claim"), error => error.code === "ANS_UNAVAILABLE"); assert.equal(init.redirect, "error");
 assert.throws(() => createWorkerApi({ server: "http://external.invalid", key: "test" }), /INVALID_SERVER/);
});
test("private credentials are validated without including their contents in errors", async t => {
 const h = await setup(t); const path = join(h.root, "credentials.json");
 await writeFile(path, JSON.stringify({ username: "test-user", password: "private-test-password" }), { mode: 0o600 });
 assert.equal((await readCredentialFile(path)).username, "test-user");
 await writeFile(path, "private-invalid-json");
 await assert.rejects(readCredentialFile(path), error => error.message === "CREDENTIAL_UNAVAILABLE");
 await assert.rejects(readCredentialFile("relative.json"), /CREDENTIAL_UNAVAILABLE/);
});
test("Linux credentials reject group-readable secret files", { skip: process.platform === "win32" }, async t => {
 const h = await setup(t); const path = join(h.root, "credentials.json");
 await writeFile(path, JSON.stringify({ username: "test-user", password: "test-password" }), { mode: 0o600 });
 await chmod(path, 0o644);
 await assert.rejects(readCredentialFile(path), /CREDENTIAL_UNAVAILABLE/);
});

test("disk failure after paid submission still acknowledges the known task to ANS", async t => {
 const h = await setup(t); let saves = 0;
 const journal = { load: async () => null, save: async () => { if(++saves > 1) throw new Error("ENOSPC"); } };
 const worker = createModelWorker({ api: h.api, adapter: h.adapter, journal, workerId, sleep: async () => {} });
 assert.equal(await worker.work(job), false); assert.equal(h.counters.submitted, 1);
 assert.equal(h.calls.find(x => x.body?.type === "accepted").body.providerTaskId, "provider-1");
 assert.equal(h.calls.some(x => x.body?.type === "review"), false);
 assert.equal(h.calls.at(-1).body.type, "accepted");
});
test("failed recovery stays degraded while unrelated queue claims may continue", async t => {
 const h = await setup(t); await h.journal.save(id, { taskId: "existing", workerId });
 const api = async path => { if(path.endsWith("/recover")) throw new Error("ANS_UNAVAILABLE"); return null; };
 const worker = createModelWorker({ api, adapter: h.adapter, journal: h.journal, workerId });
 const result = await worker.tick(); assert.deepEqual(result, { busy: false, degraded: true });
 const controller = new AbortController(), states = [];
 await runWorkerLoop({ tick: async () => { controller.abort(); return result; }, signal: controller.signal, report: state => states.push(state), sleep: async () => {} });
 assert.deepEqual(states, ["recovery_waiting"]);
});

test("persistent disk failure leaves an ACKed task reclaimable after lease expiry", async t => {
 const h = await setup(t); let saves = 0, serverTask = null, state = "RUNNING";
 const journal = { load: async () => null, save: async () => { if(++saves > 1) throw new Error("ENOSPC"); } };
 const api = async (path, init) => {
  if(init.body?.type === "accepted") serverTask = init.body.providerTaskId;
  if(init.body?.type === "review") state = "NEEDS_REVIEW";
  return h.api(path, init);
 };
 const worker = createModelWorker({ api, adapter: h.adapter, journal, workerId, sleep: async () => {} });
 await worker.work(job); assert.equal(state, "RUNNING"); assert.equal(serverTask, "provider-1");
 // Existing server claim logic requeues an expired RUNNING lease with a known task ID.
 const reclaimed = { ...job, providerTaskId: serverTask };
 const restarted = createModelWorker({ api: h.api, adapter: h.adapter, journal: h.journal, workerId, sleep: async () => {} });
 assert.equal(await restarted.work(reclaimed), true); assert.equal(h.counters.submitted, 1);
});
