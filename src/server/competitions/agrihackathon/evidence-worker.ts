import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { lockAgriWorkspace, configuredAgriEditionId, agriDatabaseClock, assertAgriAuthorityCurrent } from "./workspace";
import { evidenceEnabled, evidenceFail, EvidenceRetryError, evidenceAfterCutoff, evidenceConfig } from "./evidence-config";
import { evidenceRequest, evidenceAuthority, evidenceTransition, evidenceBudget, evidenceSource, finalizeEvidenceObject, type EvidenceRow, requireEvidenceWriter } from "./evidence";
import { storeEvidence, inspectEvidence, reconcileEvidenceStorage, type StoredEvidence } from "./evidence-storage";
import { resolveGithubEvidence, githubArchiveGET, pinnedEvidenceGET, evidenceHttpHosts } from "./evidence-network";
const workerId = "agri-evidence:" + randomUUID();
const leaseMs = 60000;
async function claim(id: string, actorId?: string) {
    return db.$transaction(async (tx) => {
        const [candidate] = await tx.$queryRaw<EvidenceRow[]> `SELECT * FROM agri_evidence_requests WHERE id=${id} AND "competitionId"=${configuredAgriEditionId()}`;
        if (!candidate)
            return evidenceFail("AGRI_EVIDENCE_NOT_FOUND", 404);
        const ctx = await lockAgriWorkspace(tx, actorId ?? candidate.actorId);
        if (actorId && candidate.actorId !== actorId)
            return evidenceFail("AGRI_EVIDENCE_INTENT_INVALID", 403);
        const auth = await evidenceAuthority(tx, ctx, candidate.entryStageId, true, candidate.authority), initial = await evidenceRequest(tx, ctx, id), now = await agriDatabaseClock(tx);
        let row = initial;
        if (!evidenceEnabled() || !ctx.workspace.enabled)
            return evidenceFail("AGRI_EVIDENCE_DISABLED", 503);
        if (row.cancelRequested || row.state === "CANCELLED" || row.state === "STORED" || row.state === "UPLOADED" || row.state === "RESOLVED")
            return evidenceFail("AGRI_EVIDENCE_NOT_QUEUED");
        if (!row.submissionId && row.expiresAt && row.expiresAt <= now)
            return evidenceFail("AGRI_EVIDENCE_INTENT_EXPIRED");
        if (row.state === "RUNNING" && row.leaseExpiresAt && row.leaseExpiresAt > now)
            return evidenceFail("AGRI_EVIDENCE_BUSY");
        if (actorId && row.mode !== "UPLOAD" || !actorId && row.mode === "UPLOAD")
            return evidenceFail("AGRI_EVIDENCE_MODE_INVALID", 400);
        if (row.nextRunAt && row.nextRunAt > now || row.attempt >= row.maxAttempts && row.state !== "RUNNING")
            return evidenceFail("AGRI_EVIDENCE_RETRY_UNAVAILABLE");
        if (actorId && row.authority === "TEAM" && row.submissionId) {
            const source = await evidenceSource(tx, ctx, row.submissionId);
            if (!source.deadlineAt || source.windowState !== "CONFIRMED" || source.includesDeadline === null)
                return evidenceFail("AGRI_EVIDENCE_CUTOFF_UNKNOWN");
            if (evidenceAfterCutoff(now, source.deadlineAt, source.includesDeadline))
                return evidenceFail("AGRI_EVIDENCE_TEAM_CUTOFF_CLOSED");
        }
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(310151730)`;
        const [concurrency] = await tx.$queryRaw<Array<{
            count: bigint;
        }>> `SELECT count(*)::bigint AS count FROM agri_evidence_requests WHERE state='RUNNING' AND "leaseExpiresAt">${now}`;
        if (Number(concurrency.count) >= 2)
            return evidenceFail("AGRI_EVIDENCE_BUSY", 429);
        // Reconcile the exact abandoned namespace before granting a new lease. A final object is kept
        // and read back; only confirmed removed partials release progress. Unknown cleanup blocks claim.
        const recovered = await reconcileEvidenceStorage({ key: row.storageKey, backend: row.backend, namespaceVersion: row.namespaceVersion }, row.maxBytes, row.kind);
        if (recovered || row.storedBytes !== 0 || row.checkpoint) {
            if (!recovered && row.checkpoint) return evidenceFail("AGRI_EVIDENCE_INTEGRITY_FAILED", 503);
            row = await evidenceTransition(tx, row, "STORAGE_RECONCILED", null, workerId, { storedBytes: recovered?.byteLength ?? 0, checkpoint: recovered, captureFinishedAt: recovered ? row.captureFinishedAt ?? now : null });
        }
        const claimed = await evidenceTransition(tx, row, row.state === "RUNNING" ? "RECOVER_CLAIM" : "CLAIM", actorId ?? null, actorId ? null : workerId, { state: "RUNNING", storedBytes: row.checkpoint?.byteLength ?? 0, attempt: Math.min(row.attempt + 1, row.maxAttempts), leaseToken: randomUUID(), leaseExpiresAt: new Date(now.getTime() + leaseMs), captureStartedAt: row.captureStartedAt ?? now, errorCode: row.attempt >= row.maxAttempts ? "AGRI_EVIDENCE_RECOVERY_ONLY" : null });
        await evidenceBudget(tx, row.competitionId, row.entryStageId, row.actorId, row.submissionId);
        await assertAgriAuthorityCurrent(tx, ...auth.grants);
        return claimed;
    }, { timeout: 20000 });
}
async function heartbeat(row: EvidenceRow, provenance?: Record<string, unknown>, progress?: number) {
    return db.$transaction(async (tx) => {
        const ctx = await lockAgriWorkspace(tx, row.actorId), auth = await evidenceAuthority(tx, ctx, row.entryStageId, true, row.authority), current = await evidenceRequest(tx, ctx, row.id), now = await agriDatabaseClock(tx);
        if (!evidenceEnabled() || !ctx.workspace.enabled || current.state !== "RUNNING" || current.cancelRequested || current.leaseToken !== row.leaseToken || !current.leaseExpiresAt || current.leaseExpiresAt <= now)
            return evidenceFail("AGRI_EVIDENCE_LEASE_LOST");
        if (progress !== undefined) {
            if (!Number.isSafeInteger(progress) || progress < current.storedBytes || progress > current.maxBytes)
                return evidenceFail("AGRI_EVIDENCE_PROGRESS_INVALID");
            await tx.$executeRaw `UPDATE agri_evidence_requests SET "storedBytes"=${progress},"leaseExpiresAt"=${new Date(now.getTime() + leaseMs)} WHERE id=${row.id} AND "leaseToken"=${row.leaseToken}`;
        }
        // Detect quota/free-space competition during both download and upload, without admitting unreserved bytes.
        await evidenceBudget(tx, row.competitionId, row.entryStageId, row.actorId, row.submissionId);
        if (provenance && !current.provenance)
            await evidenceTransition(tx, current, "SOURCE_RESOLVED", null, workerId, { provenance: { ...provenance, resolvedAt: now.toISOString(), fixedBeforeSubmission: current.submissionId === null }, leaseExpiresAt: new Date(now.getTime() + leaseMs) });
        else if (progress === undefined)
            await tx.$executeRaw `UPDATE agri_evidence_requests SET "leaseExpiresAt"=${new Date(now.getTime() + leaseMs)} WHERE id=${row.id} AND "leaseToken"=${row.leaseToken}`;
        await assertAgriAuthorityCurrent(tx, ...auth.grants);
    }, { timeout: 20000 });
}
async function finish(row: EvidenceRow, meta: StoredEvidence) {
    return db.$transaction(async (tx) => {
        const ctx = await lockAgriWorkspace(tx, row.actorId), auth = await evidenceAuthority(tx, ctx, row.entryStageId, true, row.authority), current = await evidenceRequest(tx, ctx, row.id), now = await agriDatabaseClock(tx);
        if (current.state !== "RUNNING" || current.cancelRequested || current.leaseToken !== row.leaseToken || !current.leaseExpiresAt || current.leaseExpiresAt <= now)
            return evidenceFail("AGRI_EVIDENCE_LEASE_LOST");
        if (!evidenceEnabled() || !ctx.workspace.enabled)
            return evidenceFail("AGRI_EVIDENCE_DISABLED", 503);
        const saved = await evidenceTransition(tx, current, "BYTES_VERIFIED", null, workerId, { checkpoint: meta, storedBytes: meta.byteLength, captureFinishedAt: current.captureFinishedAt ?? now, state: current.submissionId ? "RUNNING" : "UPLOADED", leaseToken: current.submissionId ? current.leaseToken : null, leaseExpiresAt: current.submissionId ? current.leaseExpiresAt : null });
        const result = saved.submissionId ? await finalizeEvidenceObject(tx, ctx, saved) : saved;
        await assertAgriAuthorityCurrent(tx, ...auth.grants);
        return { requestId: result.id, state: result.state };
    }, { timeout: 20000 });
}
const retryable = new Set(["AGRI_EVIDENCE_SOURCE_BUSY", "AGRI_EVIDENCE_SOURCE_UNAVAILABLE", "AGRI_EVIDENCE_NETWORK_FAILED", "AGRI_EVIDENCE_STORAGE_CAPACITY_REQUIRED"]);
function errorCode(error: unknown) { if (error instanceof AgriWorkspaceError)
    return error.code; if (error instanceof Error && /^AGRI_EVIDENCE_[A-Z_]+$/.test(error.message))
    return error.message; return "AGRI_EVIDENCE_NETWORK_FAILED"; }
async function failed(row: EvidenceRow, error: unknown) {
    // Service-only quarantine works after the creating user's scope/account was withdrawn. It never grants read access or finalizes bytes.
    return db.$transaction(async (tx) => {
        await tx.$queryRaw `SELECT id FROM agri_workspaces WHERE "competitionId"=${row.competitionId} FOR UPDATE`;
        const [current] = await tx.$queryRaw<EvidenceRow[]> `SELECT * FROM agri_evidence_requests WHERE id=${row.id} FOR UPDATE`;
        if (!current || current.leaseToken !== row.leaseToken || current.state !== "RUNNING")
            return;
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(310151730)`;
        let meta: StoredEvidence | null = null, reconciled = false;
        try {
            meta = await reconcileEvidenceStorage({ key: current.storageKey, backend: current.backend, namespaceVersion: current.namespaceVersion }, current.maxBytes, current.kind);
            reconciled = !current.checkpoint || meta !== null;
        } catch { /* Preserve old progress and reserve the full budget; unknown storage is quarantined. */ }
        const code = reconciled ? errorCode(error) : "AGRI_EVIDENCE_STORAGE_RECONCILIATION_REQUIRED", now = await agriDatabaseClock(tx), retry = retryable.has(code) && current.attempt < current.maxAttempts;
        const quarantined = !reconciled || ["AGRI_SCOPE_REQUIRED", "ACCOUNT_UNAVAILABLE", "AGRI_TEAM_PERMISSION_REQUIRED", "AGRI_EVIDENCE_LEASE_LOST"].includes(code);
        await evidenceTransition(tx, current, quarantined ? "AUTHORITY_QUARANTINED" : "FAILED_ATTEMPT", null, workerId, { ...(reconciled ? { storedBytes: meta?.byteLength ?? 0, checkpoint: meta, captureFinishedAt: meta ? current.captureFinishedAt ?? now : null } : {}), state: quarantined ? "NEEDS_REVIEW" : retry ? "RETRY_WAIT" : "FAILED", errorCode: code, leaseToken: null, leaseExpiresAt: null, nextRunAt: retry ? new Date(now.getTime() + Math.max([30000, 120000, 600000][current.attempt - 1], error instanceof EvidenceRetryError ? error.retryAfterSeconds * 1000 : 0)) : null });
    }, { timeout: 15000 });
}
async function existing(row: EvidenceRow, signal: AbortSignal) { try {
    return await inspectEvidence({ key: row.storageKey, backend: row.backend, namespaceVersion: row.namespaceVersion }, row.maxBytes, row.kind, signal);
}
catch (e) {
    const code = (e as NodeJS.ErrnoException).code, status = (e as {
        $metadata?: {
            httpStatusCode?: number;
        };
    }).$metadata?.httpStatusCode;
    if (code === "ENOENT" || status === 404)
        return null;
    throw e;
} }
export async function uploadEvidence(actorId: string, id: string, request: Request) {
    const row = await claim(id, actorId);
    const controller = new AbortController(), signal = AbortSignal.any([controller.signal, request.signal, AbortSignal.timeout(15 * 60 * 1000)]);
    let timer: ReturnType<typeof setInterval> | undefined;
    let last = 0;
    const check = async (progress: number) => { signal.throwIfAborted(); if (Date.now() - last < 1000)
        return; last = Date.now(); await heartbeat(row, undefined, progress); };
    try {
        timer = setInterval(() => { void heartbeat(row).catch(() => controller.abort()); }, 20000);
        timer.unref();
        const prior = await existing(row, signal);
        if (prior)
            return await finish(row, prior);
        if (row.errorCode === "AGRI_EVIDENCE_RECOVERY_ONLY")
            return evidenceFail("AGRI_EVIDENCE_RETRY_UNAVAILABLE");
        if (row.backend !== evidenceConfig().mode)
            return evidenceFail("AGRI_EVIDENCE_STORAGE_CONFIG_CHANGED", 503);
        const contentLength = request.headers.get("content-length");
        if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > row.maxBytes))
            return evidenceFail("AGRI_EVIDENCE_TOO_LARGE", 413);
        if (request.headers.get("content-encoding") && request.headers.get("content-encoding") !== "identity")
            return evidenceFail("AGRI_EVIDENCE_ENCODING_UNSUPPORTED", 415);
        if (!request.body)
            return evidenceFail("AGRI_EVIDENCE_EMPTY", 400);
        const reader = request.body.getReader();
        const source = (async function* () { try {
            for (;;) {
                let idle: ReturnType<typeof setTimeout> | undefined;
                try {
                    const read = await Promise.race([reader.read(), new Promise<never>((_, reject) => { idle = setTimeout(() => reject(new Error("AGRI_EVIDENCE_IDLE_TIMEOUT")), 30000); })]);
                    if (read.done)
                        break;
                    yield read.value;
                }
                finally {
                    clearTimeout(idle);
                }
            }
        }
        finally {
            await reader.cancel().catch(() => { });
            reader.releaseLock();
        } })();
        const meta = await storeEvidence(row.storageKey, source, row.maxBytes, row.kind, signal, check);
        return await finish(row, meta);
    }
    catch (e) {
        await failed(row, e);
        throw e;
    }
    finally {
        clearInterval(timer);
        if (request.body && !request.body.locked)
            await request.body.cancel().catch(() => { });
    }
}
async function capture(row: EvidenceRow) {
    const controller = new AbortController(), signal = AbortSignal.any([controller.signal, AbortSignal.timeout(120000)]);
    let running = false;
    const timer = setInterval(() => { if (running)
        return; running = true; void heartbeat(row).catch(() => controller.abort()).finally(() => { running = false; }); }, 20000);
    timer.unref();
    let stream: Readable | undefined;
    try {
        if (!row.submissionId && row.mode === "GITHUB_ARCHIVE") {
            const resolved = row.provenance ?? await resolveGithubEvidence(row.sourceUrl!, row.originalRef ?? null, signal);
            await heartbeat(row, resolved);
            return await db.$transaction(async (tx) => {
                const ctx = await lockAgriWorkspace(tx, row.actorId), auth = await evidenceAuthority(tx, ctx, row.entryStageId, true, row.authority), current = await evidenceRequest(tx, ctx, row.id), now = await agriDatabaseClock(tx);
                requireEvidenceWriter(ctx);
                if (current.state !== "RUNNING" || current.cancelRequested || current.leaseToken !== row.leaseToken || !current.leaseExpiresAt || current.leaseExpiresAt <= now || !current.expiresAt || current.expiresAt <= now || !current.provenance)
                    return evidenceFail("AGRI_EVIDENCE_LEASE_LOST");
                await evidenceTransition(tx, current, "REF_FIXED", null, workerId, { state: "RESOLVED", leaseToken: null, leaseExpiresAt: null, captureStartedAt: null, errorCode: null });
                await assertAgriAuthorityCurrent(tx, ...auth.grants);
                return { requestId: row.id, state: "RESOLVED" };
            }, { timeout: 20000 });
        }
        const prior = await existing(row, signal);
        if (prior)
            return await finish(row, prior);
        if (row.errorCode === "AGRI_EVIDENCE_RECOVERY_ONLY")
            return evidenceFail("AGRI_EVIDENCE_RETRY_UNAVAILABLE");
        if (row.backend !== evidenceConfig().mode)
            return evidenceFail("AGRI_EVIDENCE_STORAGE_CONFIG_CHANGED", 503);
        let url = row.sourceUrl!;
        if (row.mode === "GITHUB_ARCHIVE") {
            const resolved = row.provenance && typeof row.provenance.archiveUrl === "string" ? row.provenance : await resolveGithubEvidence(url, row.originalRef ?? null, signal);
            url = resolved.archiveUrl as string;
            await heartbeat(row, resolved);
        }
        const result = row.mode === "GITHUB_ARCHIVE" ? await githubArchiveGET(url, signal) : await pinnedEvidenceGET(url, evidenceHttpHosts(), signal, 2);
        stream = result.response;
        const len = result.response.headers["content-length"];
        if (len && (!/^\d+$/.test(len) || Number(len) > row.maxBytes))
            return evidenceFail("AGRI_EVIDENCE_TOO_LARGE", 413);
        if (row.mode !== "GITHUB_ARCHIVE")
            await heartbeat(row, { finalUrl: result.finalUrl });
        let last = 0;
        const meta = await storeEvidence(row.storageKey, result.response, row.maxBytes, row.kind, signal, async (progress) => { signal.throwIfAborted(); if (Date.now() - last >= 1000) {
            last = Date.now();
            await heartbeat(row, undefined, progress);
        } });
        return await finish(row, meta);
    }
    catch (e) {
        await failed(row, e);
        return null;
    }
    finally {
        stream?.destroy();
        clearInterval(timer);
    }
}
/** Select a bounded batch so a withdrawn actor or exhausted request cannot block the queue. */
export async function runEvidenceWorkerOnce() {
    if (!evidenceEnabled())
        return false;
    const competitionId = configuredAgriEditionId();
    const rows = await db.$queryRaw<EvidenceRow[]> `SELECT * FROM agri_evidence_requests WHERE "competitionId"=${competitionId} AND mode<>'UPLOAD' AND NOT "cancelRequested" AND ((state IN ('QUEUED','RETRY_WAIT') AND ("nextRunAt" IS NULL OR "nextRunAt"<=clock_timestamp())) OR (state='RUNNING' AND "leaseExpiresAt"<=clock_timestamp())) ORDER BY "createdAt",id LIMIT 20`;
    for (const row of rows) {
        let claimed: EvidenceRow;
        try {
            claimed = await claim(row.id);
        }
        catch (error) {
            const code = errorCode(error);
            if (["AGRI_SCOPE_REQUIRED", "ACCOUNT_UNAVAILABLE", "AGRI_TEAM_PERMISSION_REQUIRED", "AGRI_EVIDENCE_RETRY_UNAVAILABLE", "AGRI_EVIDENCE_INTENT_EXPIRED"].includes(code)) {
                await db.$transaction(async (tx) => {
                    await tx.$queryRaw `SELECT id FROM agri_workspaces WHERE "competitionId"=${competitionId} FOR UPDATE`;
                    const [current] = await tx.$queryRaw<EvidenceRow[]> `SELECT * FROM agri_evidence_requests WHERE id=${row.id} FOR UPDATE`;
                    const now = await agriDatabaseClock(tx);
                    if (!current || !["QUEUED", "RETRY_WAIT", "RUNNING"].includes(current.state) || (current.state === "RUNNING" && current.leaseExpiresAt && current.leaseExpiresAt > now))
                        return;
                    await evidenceTransition(tx, current, "CLAIM_QUARANTINED", null, workerId, { state: code === "AGRI_EVIDENCE_RETRY_UNAVAILABLE" ? "FAILED" : "NEEDS_REVIEW", errorCode: code, leaseToken: null, leaseExpiresAt: null, nextRunAt: null });
                });
            }
            continue;
        }
        await capture(claimed);
        return true;
    }
    return false;
}
let started = false;
export function startEvidenceWorker() { if (started || !evidenceEnabled() || process.env.ANS_AGRI_EVIDENCE_WORKER_DISABLED === "true")
    return; started = true; let active = false; const timer = setInterval(() => { if (active)
    return; active = true; void runEvidenceWorkerOnce().catch(() => { }).finally(() => { active = false; }); }, 3000); timer.unref(); }
