import { db } from "@/lib/db";
import { RESUME_WEBSITE_WORKFLOW_ID } from "@/contracts/resume-website";
import { officialWorkflowIds } from "@/contracts/projects";
import { executeResumeWebsiteRun } from "./resume-website";
import { executeProjectDocumentRun } from "./service";
import { executePersistedWorkflow, MAX_WORKFLOW_EXECUTION_MS, recoverInterruptedWorkflowRun } from "@/server/workflows/runner";
import { RUN_REASONING_EFFORTS, type RunReasoningEffort } from "@/lib/run-models";

async function executeQueuedRun(run: { id: string; userId: string; projectId: string | null; workflow: { officialId: string | null } }) {
  if (run.projectId) {
    return run.workflow.officialId === RESUME_WEBSITE_WORKFLOW_ID
      ? executeResumeWebsiteRun(run.id, run.userId)
      : executeProjectDocumentRun(run.id, run.userId);
  }
  // General workflows are started explicitly over HTTP. Only an interrupted, previously started run is resumed here.
  const started = await db.auditLog.findFirst({ where: { resourceType: "workflow_run", resourceId: run.id, action: "WORKFLOW_RUN_STARTED" }, orderBy: { createdAt: "desc" }, select: { metadata: true } });
  if (!started) return null;
  const raw = started.metadata && typeof started.metadata === "object" && !Array.isArray(started.metadata) ? started.metadata : {};
  return executePersistedWorkflow(run.id, run.userId, {
    ...(typeof raw.modelKey === "string" ? { modelKey: raw.modelKey } : {}),
    ...(typeof raw.credentialId === "string" ? { credentialId: raw.credentialId } : {}),
    ...(typeof raw.reasoningEffort === "string" && RUN_REASONING_EFFORTS.includes(raw.reasoningEffort as RunReasoningEffort) ? { reasoningEffort: raw.reasoningEffort as RunReasoningEffort } : {}),
  });
}

/** Queue rows and node checkpoints survive a process restart. */
export async function processProjectQueue() {
  const projectScope = { projectId: { not: null }, workflow: { officialId: { in: [RESUME_WEBSITE_WORKFLOW_ID, ...officialWorkflowIds] } } };
  const cutoff = new Date(Date.now() - MAX_WORKFLOW_EXECUTION_MS - 60_000);
  const expired = await db.workflowRun.findMany({ where: { status: "RUNNING", startedAt: { lt: cutoff }, OR: [{ projectId: null }, projectScope] }, orderBy: { startedAt: "asc" }, select: { id: true }, take: 20 });
  let recoveryFailed = false;
  for (const run of expired) {
    try { await recoverInterruptedWorkflowRun(run.id, cutoff); }
    catch { recoveryFailed = true; }
  }
  if (recoveryFailed) console.error("ANS workflow recovery failed for one or more tasks; other queued work will continue.");
  const projectRuns = await db.workflowRun.findMany({ where: { status: "QUEUED", ...projectScope }, orderBy: { createdAt: "asc" }, take: 2,
    select: { id: true, userId: true, projectId: true, workflow: { select: { officialId: true } } } });
  const genericCandidates = projectRuns.length < 2 ? await db.workflowRun.findMany({ where: { status: "QUEUED", projectId: null }, orderBy: { createdAt: "asc" },
    select: { id: true, userId: true, projectId: true, workflow: { select: { officialId: true } } } }) : [];
  const recovered = genericCandidates.length ? await db.auditLog.findMany({ where: { action: "WORKFLOW_RUN_RECOVERED", resourceType: "workflow_run", resourceId: { in: genericCandidates.map(run => run.id) } }, select: { resourceId: true } }) : [];
  const recoveredIds = new Set(recovered.map(item => item.resourceId));
  const genericRuns = genericCandidates.filter(run => recoveredIds.has(run.id)).slice(0, 2 - projectRuns.length);
  const outcomes = await Promise.allSettled([...projectRuns, ...genericRuns].map(executeQueuedRun));
  if (outcomes.some(outcome => outcome.status === "rejected")) console.error("ANS workflow execution failed for one or more tasks; persisted work will be retried.");
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
