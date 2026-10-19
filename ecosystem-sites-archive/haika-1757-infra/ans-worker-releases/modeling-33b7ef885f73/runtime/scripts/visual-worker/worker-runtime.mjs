import { mkdir, open, rename, readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { uploadGenerationInput } from "./tripo-adapter.mjs";

const validId = id => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id);
const validTask = id => typeof id === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(id);
const transientCodes = new Set(["ANS_UNAVAILABLE", "PROVIDER_UNAVAILABLE", "WORKER_INTERRUPTED"]);
export function transient(error) {
 return transientCodes.has(error?.code || error?.message) || ["TypeError", "TimeoutError", "AbortError"].includes(error?.name);
}
export class WorkerApiError extends Error {
 constructor(code) { super(code); this.code = code; }
}
export function createWorkerApi({ server, key, fetcher = fetch }) {
 const origin = new URL(server);
 if(origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/" || !(origin.protocol === "https:" || (origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))) throw new Error("INVALID_SERVER");
 return async (path, { method = "POST", body, lease, binary = false } = {}) => {
  let response;
  try {
   response = await fetcher(new URL(`/api/visual-worker${path}`, origin), {
    method, redirect: "error", headers: { authorization: `Bearer ${key}`, ...(lease ? { "x-ans-lease": lease } : {}), ...(body && !binary ? { "content-type": "application/json" } : {}) },
    body: binary ? body : body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000)
   });
  } catch { throw new WorkerApiError("ANS_UNAVAILABLE"); }
  if(!response.ok) {
   let envelope; try { envelope = await response.json(); } catch { /* Only log fixed error codes. */ }
   const code = envelope?.error?.code;
   const known = ["MODEL_UNSUPPORTED", "INVALID_MODEL", "LEASE_LOST", "GRID_DIMENSIONS_INVALID", "INVALID_IMAGE", "GRID_TOO_LARGE", "NOT_FOUND", "FORBIDDEN", "RESULT_CONFLICT", "INVALID_TRANSITION", "UNAUTHORIZED"];
   throw new WorkerApiError(known.includes(code) ? code : response.status >= 500 || [408, 429].includes(response.status) ? "ANS_UNAVAILABLE" : "ANS_REQUEST_FAILED");
  }
  try {
   if(binary && method === "GET") return Buffer.from(await response.arrayBuffer());
   const envelope = await response.json();
   if(envelope.ok !== true) throw new Error();
   return envelope.data;
  } catch { throw new WorkerApiError("ANS_UNAVAILABLE"); }
 };
}

export class ModelJournal {
 constructor(root) { this.root = resolve(root); }
 async save(id, value) {
  if(!validId(id)) throw new Error("INVALID_JOB");
  await mkdir(this.root, { recursive: true, mode: 0o700 });
  const target = join(this.root, id + ".json"), temp = target + "." + randomUUID() + ".tmp";
  const handle = await open(temp, "wx", 0o600);
  try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); } finally { await handle.close(); }
  await rename(temp, target);
  // Persist the rename as well as the file on Linux; Windows does not open directories.
  if(process.platform !== "win32") {
   const directory = await open(this.root, "r");
   try { await directory.sync(); } finally { await directory.close(); }
  }
 }
 async load(id) {
  try { return JSON.parse(await readFile(join(this.root, id + ".json"), "utf8")); } catch { return null; }
 }
 async recover(api, report = () => {}) {
  await mkdir(this.root, { recursive: true, mode: 0o700 });
  let degraded = false;
  for(const name of await readdir(this.root)) {
   const id = name.slice(0, -5);
   if(!name.endsWith(".json") || !validId(id)) continue;
   let value;
   try { value = JSON.parse(await readFile(join(this.root, name), "utf8")); }
   catch { report("journal_invalid"); continue; }
   if(!value || typeof value !== "object" || value.done || value.blocked || (value.retryAt ?? 0) > Date.now() || !validTask(value.taskId) || !/^[a-zA-Z0-9_-]{8,80}$/.test(value.workerId || "")) continue;
   try {
    await api(`/jobs/${id}/recover`, { body: { providerTaskId: value.taskId, workerId: value.workerId } });
   } catch(error) {
    if(["NOT_FOUND", "FORBIDDEN", "RESULT_CONFLICT", "INVALID_TRANSITION"].includes(error.code || error.message)) {
     await this.save(id, { ...value, blocked: true, reason: "RECOVERY_NOT_ALLOWED" });
     report("recovery_blocked");
    } else { degraded = true; report("recovery_waiting"); }
   }
  }
  return { degraded };
 }
}

export function createModelWorker({ api, adapter, journal, workerId, sleep = delay, now = Date.now, report = () => {}, pollMs = 5000, heartbeatMs = 20000, taskTimeoutMs = 45 * 60 * 1000 }) {
 async function retry(operation, attempts = 4) {
  for(let attempt = 0; ; attempt++) {
   try { return await operation(); }
   catch(error) {
    if(attempt >= attempts - 1 || !transient(error)) throw error;
    report("connection_retry");
    await sleep(Math.min(1000 * 2 ** attempt, 10000));
   }
  }
 }
 async function work(job) {
  if(!validId(job.id) || !validId(job.leaseToken)) throw new Error("INVALID_JOB");
  let submitted = !!job.providerTaskId, taskId = job.providerTaskId, stopped = false, leaseLost = false, terminalFailure = false, submitStageRequested = false;
  const previous = await journal.load(job.id);
  const startedAt = previous?.startedAt ?? now(), attempts = (previous?.attempts ?? 0) + 1;
  const durable = { workerId, startedAt, attempts };
  let accepted = !!job.providerTaskId;
  let lastHeartbeat = now();
  const stopHeartbeat = new AbortController();
  const event = body => api(`/jobs/${job.id}/event`, { body: { leaseToken: job.leaseToken, ...body } });
  const heartbeat = (async () => {
   while(!stopped) {
    await delay(heartbeatMs, undefined, { signal: stopHeartbeat.signal }).catch(() => {});
    if(stopped) break;
    try { await event({ type: "heartbeat" }); lastHeartbeat = now(); report("working"); }
    catch(error) { if(error.message === "LEASE_LOST" || now() - lastHeartbeat > 70000) { leaseLost = true; break; } }
   }
  })();
  const ensureLease = () => { if(leaseLost) throw new WorkerApiError("LEASE_LOST"); };
  try {
   if(previous?.blocked || (taskId && (attempts > 8 || now() - startedAt >= taskTimeoutMs))) throw new Error("RECOVERY_LIMIT");
   if(!taskId) {
    const bytes = await retry(() => api(`/jobs/${job.id}/input`, { method: "GET", lease: job.leaseToken, binary: true }));
    const catalog = await retry(() => adapter.request("/api/gen-models"));
    const current = [...(catalog.h ?? []), ...(catalog.p ?? [])].find(item => item.value === job.options.model);
    if(!current || job.options.faceCount < current.face_min || job.options.faceCount > (job.options.quad ? current.quad_max : current.face_max)) throw new Error("MODEL_UNSUPPORTED");
    const input = await uploadGenerationInput(adapter, bytes, job.inputMime, job.options);
    ensureLease();
    await journal.save(job.id, { intent: true, ...durable });
    submitStageRequested = true;
    const transition = await retry(() => event({ type: "stage", stage: "submit" }));
    if(transition?.cancelled) { await journal.save(job.id, { done: true, cancelled: true, ...durable }); return false; }
    ensureLease();
    submitted = true;
    // This paid call is deliberately outside retry(). Unknown responses require review.
    taskId = await adapter.submit(job.options, input, job.inputMime);
    let checkpointError;
    try { await journal.save(job.id, { taskId, ...durable }); } catch(error) { checkpointError = error; }
    // A failed disk checkpoint must not suppress the independent server acknowledgement.
    await retry(() => event({ type: "accepted", providerTaskId: taskId })); accepted = true;
    if(checkpointError) throw checkpointError;
   }
   const deadline = startedAt + taskTimeoutMs;
   let result;
   while(now() < deadline) {
    ensureLease();
    result = await retry(() => adapter.status(taskId));
    report("working");
    if(result.status === "success") break;
    if(["failed", "banned", "expired", "cancelled"].includes(result.status)) { terminalFailure = true; throw new Error("PROVIDER_FAILED"); }
    await sleep(pollMs);
   }
   if(result?.status !== "success") throw new Error("WORKER_INTERRUPTED");
   ensureLease();
   await retry(() => event({ type: "stage", stage: "download" }));
   const bytes = await retry(() => adapter.download(taskId, result.native_format));
   ensureLease();
   await retry(() => event({ type: "stage", stage: "persist" }));
   await retry(() => api(`/jobs/${job.id}/complete`, { body: bytes, binary: true, lease: job.leaseToken }));
   await journal.save(job.id, { taskId, ...durable, done: true });
   report("model_saved");
   return true;
  } catch(error) {
   const rawCode = error.code || error.message;
   const manual = ["MODEL_UNSUPPORTED", "INVALID_MODEL", "RESULT_CONFLICT", "RECOVERY_LIMIT"].includes(rawCode) || attempts >= 8 || now() - startedAt >= taskTimeoutMs;
   const uncertain = !terminalFailure && (submitted || submitStageRequested);
   const allowed = ["LOGIN_REQUIRED", "INPUT_REJECTED", "PROVIDER_FAILED", "SUBMISSION_UNCERTAIN", "DOWNLOAD_FAILED", "MODEL_UNSUPPORTED", "WORKER_INTERRUPTED"];
   const code = allowed.includes(rawCode) ? rawCode : "WORKER_INTERRUPTED";
   // Connection/lease loss before submission is safe to reclaim after lease expiry.
   if(!uncertain && !terminalFailure && (transient(error) || rawCode === "LEASE_LOST")) {
    report("task_deferred"); return false;
   }
   let recoverySaved = false;
   if(taskId) {
    await journal.save(job.id, { taskId, ...durable, retryAt: now() + 60000, ...(terminalFailure ? { done: true } : {}), ...(manual ? { blocked: true, reason: code } : {}) }).then(() => { recoverySaved = true; }).catch(() => { report("journal_unavailable"); });
    if(!accepted) await retry(() => event({ type: "accepted", providerTaskId: taskId })).then(() => { accepted = true; }).catch(() => {});
   }
   if(taskId && accepted && !recoverySaved && !manual && !terminalFailure) {
    // Server holds the ID. Leave RUNNING: lease expiry reclaims that same task even if local disk remains unavailable.
    report("task_deferred"); return false;
   }
   await event({ type: uncertain ? "review" : "failed", errorCode: code }).catch(() => {});
   report(uncertain ? "task_review" : "task_failed");
   return false;
  } finally { stopped = true; stopHeartbeat.abort(); await heartbeat; }
 }
 async function tick() {
  const recovery = await journal.recover(api, report);
  const job = await api("/claim", { body: { workerId } });
  if(job) await work(job);
  return { busy: !!job, degraded: recovery.degraded };
 }
 return { work, tick, retry };
}

/** Connection failures back off in this process; no AI/session is involved. */
export async function runWorkerLoop({ tick, sleep = delay, report = () => {}, signal }) {
 let failures = 0;
 while(!signal?.aborted) {
  try { const result = await tick(); const busy = typeof result === "object" ? result.busy : result; failures = 0; report(result?.degraded ? "recovery_waiting" : "ready"); if(!busy) await sleep(5000); }
  catch { failures++; report("connection_waiting"); await sleep(Math.min(5000 * 2 ** Math.min(failures - 1, 4), 60000)); }
 }
}
