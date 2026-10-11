import { db } from "@/lib/db";
import { RESUME_WEBSITE_WORKFLOW_ID } from "@/contracts/resume-website";
import { executeResumeWebsiteRun, expireResumeWebsiteRun } from "./resume-website";

/** The DB queue is authoritative; this poller can restart without losing accepted work. */
export async function processProjectQueue() {
  const cutoff = new Date(Date.now() - 180_000);
  const expired = await db.workflowRun.findMany({ where: { status: "RUNNING", startedAt: { lt: cutoff }, workflow: { officialId: RESUME_WEBSITE_WORKFLOW_ID } }, select: { id: true }, take: 20 });
  let recoveryFailed = false;
  for (const run of expired) {
    try { await expireResumeWebsiteRun(run.id, cutoff); }
    catch { recoveryFailed = true; }
  }
  if (recoveryFailed) console.error("ANS project recovery failed for one or more tasks; other queued work will continue.");
  const runs = await db.workflowRun.findMany({ where: { status: "QUEUED", projectId: { not: null }, workflow: { officialId: RESUME_WEBSITE_WORKFLOW_ID } }, orderBy: { createdAt: "asc" }, take: 2, select: { id: true, userId: true } });
  // Wait for every claimed run before the next tick, even when one rejects.
  const outcomes = await Promise.allSettled(runs.map((run) => executeResumeWebsiteRun(run.id, run.userId)));
  if (outcomes.some(outcome => outcome.status === "rejected")) {
    console.error("ANS project execution failed for one or more tasks; persisted work will be retried.");
  }
}

type WorkerGlobal = typeof globalThis & { ansProjectWorkerStarted?: boolean };
export function startProjectWorker() {
  const state = globalThis as WorkerGlobal;
  if (state.ansProjectWorkerStarted) return;
  state.ansProjectWorkerStarted = true;
  const tick = async () => {
    try { await processProjectQueue(); }
    catch { console.error("ANS project queue tick failed; persisted work will be retried."); }
    const timer = setTimeout(() => void tick(), 2000);
    timer.unref();
  };
  const timer = setTimeout(() => void tick(), 2000);
  timer.unref();
}
