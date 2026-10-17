// Long-running self-hosted Node instances consume the durable project queue.
// Build/type-generation and edge workers must not start background database work.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build" && process.env.NODE_ENV !== "test" && process.env.ANS_PROJECT_WORKER_DISABLED !== "true") {
    const { startProjectWorker } = await import("@/server/projects/worker");
    startProjectWorker();
  }
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build" && process.env.NODE_ENV !== "test" && process.env.ANS_AGRI_EVIDENCE_ENABLED === "true") {
    const { startEvidenceWorker } = await import("@/server/competitions/agrihackathon/evidence-worker");
    startEvidenceWorker();
  }
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build" && process.env.NODE_ENV !== "test") {
    const { ensureDefaultAgriEditionBootstrapped } = await import("@/server/competitions/agrihackathon/bootstrap");
    void ensureDefaultAgriEditionBootstrapped();
    const { db } = await import("@/lib/db");
    const warmPool = () => {
      void Promise.all([
        db.$queryRaw`SELECT 1`,
        db.$queryRaw`SELECT 1`,
        db.$queryRaw`SELECT 1`,
        db.$queryRaw`SELECT 1`,
      ]).catch(() => null);
    };
    warmPool();
    const keepalive = setInterval(warmPool, 50_000);
    if (typeof keepalive.unref === "function") keepalive.unref();
  }
}

export function onRequestError() {}

