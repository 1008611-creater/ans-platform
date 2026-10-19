import { mkdir, writeFile, rename } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { TripoAdapter } from "./tripo-adapter.mjs";
import { processFourViewJob, FourViewJournal } from "./four-view-adapter.mjs";
import { createWorkerApi, ModelJournal, createModelWorker, runWorkerLoop } from "./worker-runtime.mjs";

const mode = process.argv[2] || "preflight";
const server = process.env.ANS_WORKER_SERVER || "http://localhost:3096";
const key = process.env.ANS_VISUAL_WORKER_KEY;
const api = createWorkerApi({ server, key });
const adapter = new TripoAdapter({ allowedHosts: (process.env.ANS_TRIPO_DOWNLOAD_HOSTS || "").split(",").map(x => x.trim()).filter(Boolean) });
const journal = new ModelJournal(process.env.ANS_WORKER_JOURNAL || join(process.env.LOCALAPPDATA || ".workbuddy", "ANS", "tripo-journal"));
const fourViewJournal = new FourViewJournal();
const workerId = process.env.ANS_WORKER_ID || "tripo-local-worker";
const controller = new AbortController();
process.once("SIGTERM", () => controller.abort());
process.once("SIGINT", () => controller.abort());
let statusWrite = Promise.resolve();
let lastLogged;
function report(state) {
 if(state !== lastLogged && state !== "working") { console.log(JSON.stringify({ state })); lastLogged = state; }
 if(process.env.ANS_WORKER_STATUS_FILE) {
  const target = resolve(process.env.ANS_WORKER_STATUS_FILE);
  // Serialize atomic health writes; errors stay generic and never include credentials.
  statusWrite = statusWrite.then(async () => {
   await mkdir(resolve(target, ".."), { recursive: true, mode: 0o700 });
   const temp = target + "." + randomUUID() + ".tmp";
   await writeFile(temp, JSON.stringify({ state, updatedAt: new Date().toISOString(), pid: process.pid, workerId }), { mode: 0o600 });
   await rename(temp, target);
  }).catch(() => { console.error("Worker health status could not be saved."); });
 }
}
const worker = createModelWorker({ api, adapter, journal, workerId, report });
try {
 if(!["preflight", "start", "once"].includes(mode)) throw new Error("INVALID_MODE");
 const readiness = await adapter.preflight(); console.log(JSON.stringify(readiness));
 if(mode !== "preflight") {
  if(process.env.ANS_TRIPO_ALLOW_SUBMISSIONS !== "true" || !key || key.length < 32) throw new Error("WORKER_NOT_ENABLED");
  if(mode === "once") {
   const jobId = process.env.ANS_WORKER_JOB_ID;
   if(!/^[a-f0-9-]{36}$/.test(jobId || "")) throw new Error("INVALID_JOB");
   const models = await adapter.request("/api/gen-models");
   if(models.p?.find(item => item.value === "P2-20260801")?.credits !== 100) throw new Error("PRICE_CHANGED");
   const before = (await adapter.request("/api/auth/me")).balance;
   if(!Number.isFinite(before) || before < 100) throw new Error("BALANCE_UNAVAILABLE");
   const job = await api("/claim", { body: { workerId, jobId } });
   if(!job || job.id !== jobId) throw new Error("JOB_UNAVAILABLE");
   const completed = await worker.work(job);
   const after = (await adapter.request("/api/auth/me")).balance;
   if(process.env.ANS_WORKER_TEST_EVIDENCE) await writeFile(resolve(process.env.ANS_WORKER_TEST_EVIDENCE), JSON.stringify({ jobId, balanceBefore: before, balanceAfter: after, creditsSpent: before - after, completedAt: new Date().toISOString() }, null, 2));
   console.log(JSON.stringify({ jobId, balanceBefore: before, balanceAfter: after, creditsSpent: before - after }));
   process.exitCode = completed ? 0 : 1;
  } else {
   console.log("Local task service ready.");
   await runWorkerLoop({ report, signal: controller.signal, tick: async () => {
    const result = await worker.tick();
    if(!result.busy && process.env.ANS_FOUR_VIEW_ENABLED === "true" && process.env.ANS_FOUR_VIEW_API_CONFIRMED === "true") {
     await fourViewJournal.recover(api);
     const preparation = await api("/four-views/claim", { body: { workerId } });
     if(preparation) { await processFourViewJob(preparation, { api, journal: fourViewJournal }); return { ...result, busy: true }; }
    }
    return result;
   } });
  }
 }
} catch { console.error("Service could not start or lost its connection. Check local credentials and service configuration."); process.exitCode = 1; }
await statusWrite;
