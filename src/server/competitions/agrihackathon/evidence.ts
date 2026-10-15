import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { db, type DbTransaction } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { evidenceCreateSchema, evidenceCommandSchema, type EvidenceCreate, type EvidenceDescriptor, type EvidenceList, type EvidenceManifest, type EvidenceMode, type EvidenceKind, type EvidenceState, type EvidenceRequestView } from "@/contracts/agri-evidence";
import { canonicalAgriArchiveJSON } from "@/contracts/agri-record-archive";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent, agriDatabaseClock, type AgriWorkspaceContext } from "./workspace";
import { evidenceEnabled, evidenceConfig, evidenceFail, evidenceLimit, evidenceAfterCutoff } from "./evidence-config";
import { evidenceCapacity, evidenceObjectKey, type StoredEvidence } from "./evidence-storage";
import { githubRepository, allowedEvidenceURL, evidenceHttpHosts } from "./evidence-network";
export type EvidenceTx = DbTransaction;
type Grant = Awaited<ReturnType<typeof requireAgriScope>>;
interface Source {
    id: string;
    entryStageId: string;
    competitionId: string;
    projectId: string;
    artifactVersionId: string;
    ruleVersionId: string;
    acceptedAt: Date;
    repository: {
        url: string;
        ref: {
            kind: string;
            value: string;
        } | null;
    } | null;
    demoUrl: string | null;
    materials: {
        items: Array<{
            kind: string;
            url?: string;
        }>;
    };
    stage: string;
    deadlineAt: Date | null;
    includesDeadline: boolean | null;
    windowState: string | null;
}
export interface EvidenceRow {
    id: string;
    competitionId: string;
    entryStageId: string;
    submissionId: string | null;
    projectId: string;
    artifactVersionId: string;
    actorId: string;
    authority: "TEAM" | "STAFF";
    mode: EvidenceMode;
    kind: EvidenceKind;
    bindingState: string;
    state: EvidenceState;
    sourceUrl: string | null;
    originalRef: EvidenceCreate["originalRef"];
    provenance: Record<string, unknown> | null;
    fileName: string;
    maxBytes: number;
    storedBytes: number;
    requestHash: string;
    revision: number;
    attempt: number;
    maxAttempts: number;
    createdAt: Date;
    expiresAt: Date | null;
    nextRunAt: Date | null;
    leaseToken: string | null;
    leaseExpiresAt: Date | null;
    objectId: string;
    storageKey: string;
    backend: StoredEvidence["backend"];
    namespaceVersion: 1;
    errorCode: string | null;
    captureStartedAt: Date | null;
    captureFinishedAt: Date | null;
    checkpoint: StoredEvidence | null;
    cancelRequested: boolean;
    cleanupCompletedAt: Date | null;
}
export const evidenceHash = (value: unknown) => createHash("sha256").update(canonicalAgriArchiveJSON(value)).digest("hex");
export async function evidenceSource(tx: EvidenceTx, ctx: AgriWorkspaceContext, submissionId: string) {
    const [s] = await tx.$queryRaw<Source[]> `SELECT s.*,es.stage,w."closesAt" AS "deadlineAt",w."includesDeadline",w.state AS "windowState" FROM agri_stage_submissions s JOIN agri_entry_stages es ON es.id=s."entryStageId" LEFT JOIN agri_stage_windows w ON w."ruleVersionId"=s."ruleVersionId" AND w."competitionId"=s."competitionId" AND w.stage=es.stage WHERE s.id=${submissionId} AND s."competitionId"=${ctx.workspace.competitionId} FOR SHARE OF s,es`;
    if (!s)
        return evidenceFail("AGRI_SUBMISSION_NOT_FOUND", 404);
    return s;
}
async function teamAuthority(tx: EvidenceTx, ctx: AgriWorkspaceContext, entryStageId: string, write: boolean) {
    const [row] = await tx.$queryRaw<Array<{
        role: string;
        teamId: string;
    }>> `SELECT tm.role,tc."teamId" FROM agri_entry_stages es JOIN team_competitions tc ON tc.id=es."teamCompetitionId" JOIN team_members tm ON tm."teamId"=tc."teamId" WHERE es.id=${entryStageId} AND es."competitionId"=${ctx.workspace.competitionId} AND tm."userId"=${ctx.actorId} AND tm.status='ACTIVE' FOR SHARE OF tc,es,tm`;
    return row && (!write || ["OWNER", "ADMIN"].includes(row.role)) ? row : null;
}
export async function evidenceAuthority(tx: EvidenceTx, ctx: AgriWorkspaceContext, entryStageId: string, write: boolean, authority?: "TEAM" | "STAFF") {
    if (authority !== "STAFF" && await teamAuthority(tx, ctx, entryStageId, write))
        return { kind: "TEAM" as const, grants: [] as Grant[] };
    if (authority === "TEAM")
        return evidenceFail("AGRI_TEAM_PERMISSION_REQUIRED", 403);
    const grants = [await requireAgriScope(tx, ctx, "WORKS_READ"), await requireAgriScope(tx, ctx, "PRIVATE_MATERIALS_READ")];
    if (write)
        grants.push(await requireAgriScope(tx, ctx, "ARCHIVE_WRITE"));
    return { kind: "STAFF" as const, grants };
}
async function writableTeamCutoff(tx: EvidenceTx, ctx: AgriWorkspaceContext, source: Source | null, authority: "TEAM" | "STAFF") {
    if (authority === "TEAM" && source) {
        const now = await agriDatabaseClock(tx);
        if (source.windowState !== "CONFIRMED" || !source.deadlineAt || source.includesDeadline === null)
            return evidenceFail("AGRI_EVIDENCE_CUTOFF_UNKNOWN");
        if (evidenceAfterCutoff(now, source.deadlineAt, source.includesDeadline))
            return evidenceFail("AGRI_EVIDENCE_TEAM_CUTOFF_CLOSED");
    }
}
export async function evidenceRequest(tx: EvidenceTx, ctx: AgriWorkspaceContext, id: string) { const [row] = await tx.$queryRaw<EvidenceRow[]> `SELECT * FROM agri_evidence_requests WHERE id=${id} AND "competitionId"=${ctx.workspace.competitionId} FOR UPDATE`; if (!row)
    return evidenceFail("AGRI_EVIDENCE_NOT_FOUND", 404); return row; }
export async function evidenceTransition(tx: EvidenceTx, row: EvidenceRow, action: string, actorId: string | null, workerId: string | null, patch: Partial<EvidenceRow>, provenance: Record<string, unknown> = {}) {
    const next = { ...row, ...patch, revision: row.revision + 1 };
    const now = await agriDatabaseClock(tx);
    await tx.$executeRaw `UPDATE agri_evidence_requests SET "submissionId"=${next.submissionId},"bindingState"=${next.bindingState},state=${next.state},revision=${next.revision},attempt=${next.attempt},"storedBytes"=${next.storedBytes},"nextRunAt"=${next.nextRunAt},"leaseToken"=${next.leaseToken},"leaseExpiresAt"=${next.leaseExpiresAt},"errorCode"=${next.errorCode},"captureStartedAt"=${next.captureStartedAt},"captureFinishedAt"=${next.captureFinishedAt},checkpoint=${next.checkpoint ? JSON.stringify(next.checkpoint) : null}::jsonb,provenance=${next.provenance ? JSON.stringify(next.provenance) : null}::jsonb,"cancelRequested"=${next.cancelRequested},"cleanupCompletedAt"=${next.cleanupCompletedAt} WHERE id=${row.id} AND revision=${row.revision}`;
    const eventObjectId = ["DOWNLOAD", "VERIFY_CUTOFF"].includes(action) && typeof provenance.objectId === "string" ? provenance.objectId : action === "STORED" ? row.objectId : null;
    await tx.$executeRaw `INSERT INTO agri_evidence_events(id,"requestId","competitionId","actorId","workerId",action,revision,state,attempt,"errorCode",provenance,"serverAt","objectId") VALUES(${randomUUID()},${row.id},${row.competitionId},${actorId},${workerId},${action},${next.revision},${next.state},${next.attempt},${next.errorCode},${JSON.stringify(provenance)}::jsonb,${now},${eventObjectId})`;
    return next;
}
async function receipt(tx: EvidenceTx, ctx: AgriWorkspaceContext, operation: string, key: string, hash: string) { const [p] = await tx.$queryRaw<Array<{
    requestHash: string;
    requestId: string | null;
    manifestId: string | null;
}>> `SELECT "requestHash","requestId","manifestId" FROM agri_evidence_command_receipts WHERE "competitionId"=${ctx.workspace.competitionId} AND "actorId"=${ctx.actorId} AND operation=${operation} AND "idempotencyKey"=${key}`; if (p && p.requestHash !== hash)
    return evidenceFail("AGRI_IDEMPOTENCY_CONFLICT"); return p; }
async function saveReceipt(tx: EvidenceTx, ctx: AgriWorkspaceContext, operation: string, key: string, hash: string, entryStageId: string, submissionId: string | null, requestId: string | null, manifestId: string | null, revision: number) { await tx.$executeRaw `INSERT INTO agri_evidence_command_receipts(id,"competitionId","actorId",operation,"idempotencyKey","requestHash","entryStageId","submissionId","requestId","manifestId",revision,"createdAt") VALUES(${randomUUID()},${ctx.workspace.competitionId},${ctx.actorId},${operation},${key},${hash},${entryStageId},${submissionId},${requestId},${manifestId},${revision},${await agriDatabaseClock(tx)})`; }
/** Reservations include failed/incomplete objects until a checked inventory reconciliation releases them. */
export async function evidenceBudget(tx: EvidenceTx, competitionId: string, entryStageId: string, actorId: string, submissionId: string | null, extra = 0) {
    const c = evidenceConfig();
    const [b] = await tx.$queryRaw<Array<{
        total: bigint;
        edition: bigint;
        entry: bigint;
        actor: bigint;
        submission: bigint;
        reserved: bigint;
    }>> `SELECT COALESCE(sum(CASE WHEN state='STORED' THEN "storedBytes" ELSE "maxBytes" END),0)::bigint AS total,COALESCE(sum(CASE WHEN "competitionId"=${competitionId} THEN CASE WHEN state='STORED' THEN "storedBytes" ELSE "maxBytes" END ELSE 0 END),0)::bigint AS edition,COALESCE(sum(CASE WHEN "entryStageId"=${entryStageId} THEN CASE WHEN state='STORED' THEN "storedBytes" ELSE "maxBytes" END ELSE 0 END),0)::bigint AS entry,COALESCE(sum(CASE WHEN "actorId"=${actorId} THEN CASE WHEN state='STORED' THEN "storedBytes" ELSE "maxBytes" END ELSE 0 END),0)::bigint AS actor,COALESCE(sum(CASE WHEN "submissionId" IS NOT DISTINCT FROM ${submissionId} AND "entryStageId"=${entryStageId} THEN CASE WHEN state='STORED' THEN "storedBytes" ELSE "maxBytes" END ELSE 0 END),0)::bigint AS submission,COALESCE(sum(CASE WHEN state<>'STORED' THEN CASE WHEN "errorCode"='AGRI_EVIDENCE_STORAGE_RECONCILIATION_REQUIRED' THEN "maxBytes" WHEN state='UPLOADED' OR (state='RUNNING' AND "leaseExpiresAt">clock_timestamp()) THEN "maxBytes"-"storedBytes" ELSE "maxBytes" END ELSE 0 END),0)::bigint AS reserved FROM agri_evidence_requests WHERE "cleanupCompletedAt" IS NULL`;
    if (Number(b.total) + extra > c.quota || Number(b.edition) + extra > c.editionQuota || Number(b.entry) + extra > c.entryQuota || Number(b.actor) + extra > c.actorQuota || Number(b.submission) + extra > c.submissionQuota)
        return evidenceFail("AGRI_EVIDENCE_QUOTA_REQUIRED", 503);
    await evidenceCapacity(Number(b.reserved) + extra);
}
function safeFileName(value: string) { return value.toWellFormed().replace(/[\x00-\x1f\x7f/\\:"<>|?*]/g, "_").slice(0, 180) || "evidence.bin"; }
export async function createEvidence(actorId: string, raw: unknown) {
    const command = evidenceCreateSchema.parse(raw), hash = evidenceHash(command);
    return db.$transaction(async (tx) => {
        const ctx = await lockAgriWorkspace(tx, actorId);
        const source = command.submissionId ? await evidenceSource(tx, ctx, command.submissionId) : null;
        if (source && (source.entryStageId !== command.entryStageId || source.projectId !== command.projectId || source.artifactVersionId !== command.artifactVersionId))
            return evidenceFail("AGRI_EVIDENCE_SUBMISSION_MISMATCH");
        const authority = await evidenceAuthority(tx, ctx, command.entryStageId, true);
        const prior = await receipt(tx, ctx, "create", command.idempotencyKey, hash);
        if (prior) {
            const row = await evidenceRequest(tx, ctx, prior.requestId!);
            await assertAgriAuthorityCurrent(tx, ...authority.grants);
            return { requestId: row.id, duplicate: true };
        }
        if (!evidenceEnabled())
            return evidenceFail("AGRI_EVIDENCE_DISABLED", 503);
        if (!ctx.workspace.enabled)
            return evidenceFail("AGRI_WORKSPACE_DISABLED");
        await writableTeamCutoff(tx, ctx, source, authority.kind);
        if (!source) {
            const member = await teamAuthority(tx, ctx, command.entryStageId, true);
            const [version] = await tx.$queryRaw<Array<{
                id: string;
            }>> `SELECT v.id FROM artifact_versions v JOIN artifacts a ON a.id=v."artifactId" JOIN projects p ON p.id=a."projectId" WHERE v.id=${command.artifactVersionId} AND p.id=${command.projectId} AND p."ownerId"=${actorId} AND p."teamId"=${member?.teamId ?? null} AND p.status='ACTIVE' FOR SHARE OF p,a,v`;
            if (!member || !version)
                return evidenceFail("AGRI_PROJECT_UNAVAILABLE", 403);
        }
        if (command.mode !== "UPLOAD") {
            if (command.mode === "GITHUB_ARCHIVE") {
                githubRepository(command.sourceUrl!);
                if (source && (source.repository?.url !== command.sourceUrl || JSON.stringify(source.repository.ref) !== JSON.stringify(command.originalRef)))
                    return evidenceFail("AGRI_EVIDENCE_SOURCE_MISMATCH", 400);
            }
            else {
                allowedEvidenceURL(command.sourceUrl!, evidenceHttpHosts());
                if (command.sourceUrl !== source?.demoUrl && !source?.materials.items.some(m => m.kind === "LINK" && m.url === command.sourceUrl))
                    return evidenceFail("AGRI_EVIDENCE_SOURCE_MISMATCH", 400);
            }
        }
        const expired = await tx.$queryRaw<EvidenceRow[]> `SELECT * FROM agri_evidence_requests WHERE "entryStageId"=${command.entryStageId} AND "submissionId" IS NULL AND state IN ('PREPARED','UPLOADED','RESOLVED','QUEUED','RETRY_WAIT') AND "expiresAt"<=clock_timestamp() ORDER BY id FOR UPDATE`;
        for (const row of expired)
            await evidenceTransition(tx, row, "INTENT_EXPIRED", null, "agri-evidence-control", { state: "CANCELLED", cancelRequested: true, errorCode: "AGRI_EVIDENCE_INTENT_EXPIRED" });
        const [active] = await tx.$queryRaw<Array<{
            id: string;
        }>> `SELECT id FROM agri_evidence_requests WHERE "entryStageId"=${command.entryStageId} AND "submissionId" IS NOT DISTINCT FROM ${command.submissionId} AND mode=${command.mode} AND kind=${command.kind} AND "sourceUrl" IS NOT DISTINCT FROM ${command.sourceUrl} AND "artifactVersionId"=${command.artifactVersionId} AND ("expiresAt" IS NULL OR "expiresAt">clock_timestamp()) AND state IN ('PREPARED','QUEUED','RUNNING','RETRY_WAIT','UPLOADED','RESOLVED')`;
        if (active)
            return evidenceFail("AGRI_EVIDENCE_ACTIVE_REQUEST_EXISTS");
        const c = evidenceConfig(), maxBytes = evidenceLimit(command.kind);
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(310151730)`;
        await evidenceBudget(tx, ctx.workspace.competitionId, command.entryStageId, actorId, command.submissionId, maxBytes);
        const id = randomUUID(), objectId = randomUUID(), now = await agriDatabaseClock(tx), state = command.mode === "UPLOAD" ? "PREPARED" : "QUEUED";
        await tx.$executeRaw `INSERT INTO agri_evidence_requests(id,"competitionId","entryStageId","submissionId","projectId","artifactVersionId","actorId",authority,mode,kind,"bindingState",state,"sourceUrl","originalRef","fileName","maxBytes","requestHash","createdAt","expiresAt","objectId","storageKey",backend) VALUES(${id},${ctx.workspace.competitionId},${command.entryStageId},${command.submissionId},${command.projectId},${command.artifactVersionId},${actorId},${authority.kind},${command.mode},${command.kind},${command.submissionId ? "BOUND" : "PREPARED"},${state},${command.sourceUrl},${command.originalRef ? JSON.stringify(command.originalRef) : null}::jsonb,${safeFileName(command.fileName)},${maxBytes},${hash},${now},${command.submissionId ? null : new Date(now.getTime() + 24 * 3600000)},${objectId},${evidenceObjectKey(ctx.workspace.competitionId, id, objectId)},${c.mode})`;
        await tx.$executeRaw `INSERT INTO agri_evidence_events(id,"requestId","competitionId","actorId",action,revision,state,attempt,provenance,"serverAt") VALUES(${randomUUID()},${id},${ctx.workspace.competitionId},${actorId},'CREATE',1,${state},0,'{}'::jsonb,${now})`;
        await saveReceipt(tx, ctx, "create", command.idempotencyKey, hash, command.entryStageId, command.submissionId, id, null, 1);
        await assertAgriAuthorityCurrent(tx, ...authority.grants);
        return { requestId: id, duplicate: false };
    }, { timeout: 20000 });
}
export function requireEvidenceWriter(ctx: AgriWorkspaceContext) {
    if (!evidenceEnabled() || !ctx.workspace.enabled) return evidenceFail("AGRI_EVIDENCE_DISABLED", 503);
}
export async function finalizeEvidenceObject(tx: EvidenceTx, ctx: AgriWorkspaceContext, row: EvidenceRow) {
    requireEvidenceWriter(ctx);
    if (row.cleanupCompletedAt || !row.submissionId || !row.checkpoint || !row.captureStartedAt || !row.captureFinishedAt)
        return evidenceFail("AGRI_EVIDENCE_NOT_READY");
    const source = await evidenceSource(tx, ctx, row.submissionId), meta = row.checkpoint;
    const descriptor: EvidenceDescriptor = { id: row.objectId, requestId: row.id, kind: row.kind, fileName: row.fileName, sha256: meta.sha256, byteLength: meta.byteLength, mime: meta.mime, backend: meta.backend, namespaceVersion: meta.namespaceVersion, capturedAt: row.captureFinishedAt.toISOString(), startedAt: row.captureStartedAt.toISOString(), resolvedSha: typeof row.provenance?.sha === "string" ? row.provenance.sha : null, deadlineAt: source.windowState === "CONFIRMED" ? source.deadlineAt?.toISOString() ?? null : null, temporalStatus: source.windowState !== "CONFIRMED" || !source.deadlineAt || source.includesDeadline === null ? "CUTOFF_UNKNOWN" : evidenceAfterCutoff(row.captureFinishedAt, source.deadlineAt, source.includesDeadline) ? "CAPTURED_AFTER_DEADLINE" : "CAPTURED_BEFORE_DEADLINE", sourceTiming: row.mode === "GITHUB_ARCHIVE" && row.provenance?.fixedBeforeSubmission === true && typeof row.provenance.resolvedAt === "string" && new Date(row.provenance.resolvedAt) <= source.acceptedAt && source.windowState === "CONFIRMED" && source.deadlineAt && source.includesDeadline !== null && !evidenceAfterCutoff(source.acceptedAt, source.deadlineAt, source.includesDeadline) ? "PRE_SUBMISSION_FIXED_REF_BEFORE_CUTOFF" : row.mode === "GITHUB_ARCHIVE" && row.originalRef?.kind === "COMMIT_SHA" && source.windowState === "CONFIRMED" && source.deadlineAt && source.includesDeadline !== null && !evidenceAfterCutoff(source.acceptedAt, source.deadlineAt, source.includesDeadline) && row.provenance?.sha === row.originalRef.value.toLowerCase() ? "DECLARED_FIXED_COMMIT_BEFORE_CUTOFF" : row.mode !== "UPLOAD" ? "MUTABLE_SOURCE_AT_CAPTURE" : "UNVERIFIED_SOURCE", coverage: row.mode === "GITHUB_ARCHIVE" ? "CODE_TREE_NO_GIT_HISTORY_LFS_OR_SUBMODULES" : row.kind === "DEMO_DOCUMENT" ? "MAIN_RESPONSE_ONLY_NOT_RUNNING_SITE" : row.kind === "DEMO_VIDEO" ? "ORIGINAL_VIDEO_BYTES" : "ORIGINAL_FILE_BYTES" };
    const [existing] = await tx.$queryRaw<Array<{
        id: string;
    }>> `SELECT id FROM agri_evidence_objects WHERE "requestId"=${row.id}`;
    if (!existing)
        await tx.$executeRaw `INSERT INTO agri_evidence_objects(id,"requestId","submissionId","entryStageId","competitionId",backend,"namespaceVersion","storageKey",sha256,"byteLength",mime,descriptor,"capturedAt") VALUES(${row.objectId},${row.id},${row.submissionId},${row.entryStageId},${row.competitionId},${meta.backend},${meta.namespaceVersion},${meta.key},${meta.sha256},${meta.byteLength},${meta.mime},${JSON.stringify(descriptor)}::jsonb,${row.captureFinishedAt})`;
    return evidenceTransition(tx, row, "STORED", null, "agri-evidence-worker", { state: "STORED", storedBytes: meta.byteLength, leaseToken: null, leaseExpiresAt: null, errorCode: null });
}
/** Called inside the formal submission transaction. No URL, cutoff or prior immutable record is rewritten. */
export async function bindEvidenceIntents(tx: EvidenceTx, ctx: AgriWorkspaceContext, ids: string[], submissionId: string) {
    requireEvidenceWriter(ctx);
    const source = await evidenceSource(tx, ctx, submissionId);
    for (const id of [...new Set(ids)].sort()) {
        let row = await evidenceRequest(tx, ctx, id);
        const auth = await evidenceAuthority(tx, ctx, row.entryStageId, true, "TEAM");
        const now = await agriDatabaseClock(tx);
        if (row.actorId !== ctx.actorId || row.submissionId || row.bindingState !== "PREPARED" || row.entryStageId !== source.entryStageId || row.projectId !== source.projectId || row.artifactVersionId !== source.artifactVersionId || !(row.mode === "UPLOAD" && row.state === "UPLOADED" && row.checkpoint || row.mode === "GITHUB_ARCHIVE" && row.state === "RESOLVED" && row.provenance?.fixedBeforeSubmission === true && source.repository?.url === row.sourceUrl && JSON.stringify(source.repository.ref) === JSON.stringify(row.originalRef)) || !row.expiresAt || row.expiresAt <= now)
            return evidenceFail("AGRI_EVIDENCE_INTENT_INVALID");
        row = await evidenceTransition(tx, row, "BIND", ctx.actorId, null, { submissionId, bindingState: "BOUND", ...(row.mode === "GITHUB_ARCHIVE" ? { state: "QUEUED" as const, nextRunAt: null, attempt: 0 } : {}) });
        if (row.mode === "UPLOAD") await finalizeEvidenceObject(tx, ctx, row);
        await assertAgriAuthorityCurrent(tx, ...auth.grants);
    }
}
export async function executeEvidenceCommand(actorId: string, raw: unknown) {
    const command = evidenceCommandSchema.parse(raw), hash = evidenceHash(command);
    return db.$transaction(async (tx) => {
        const ctx = await lockAgriWorkspace(tx, actorId);
        let row: EvidenceRow | null = null;
        let source: Source;
        let grants: Grant[] = [];
        if (command.action === "manifest") {
            source = await evidenceSource(tx, ctx, command.submissionId);
            grants = (await evidenceAuthority(tx, ctx, source.entryStageId, true, "STAFF")).grants;
        }
        else {
            row = await evidenceRequest(tx, ctx, command.requestId);
            const auth = await evidenceAuthority(tx, ctx, row.entryStageId, true, command.action === "verifyCutoff" ? "STAFF" : undefined);
            grants = auth.grants;
            source = row.submissionId ? await evidenceSource(tx, ctx, row.submissionId) : ({ entryStageId: row.entryStageId, id: null } as unknown as Source);
            if (auth.kind === "TEAM" && row.actorId !== actorId)
                return evidenceFail("AGRI_EVIDENCE_INTENT_INVALID", 403);
        }
        if (command.action === "verifyCutoff")
            grants.push(await requireAgriScope(tx, ctx, "INTERNAL_NOTES_READ"));
        const prior = await receipt(tx, ctx, command.action, command.idempotencyKey, hash);
        if (prior) {
            await assertAgriAuthorityCurrent(tx, ...grants);
            return { requestId: prior.requestId, manifestId: prior.manifestId, duplicate: true };
        }
        if (!evidenceEnabled() || !ctx.workspace.enabled)
            return evidenceFail("AGRI_EVIDENCE_DISABLED", 503);
        let manifestId: string | null = null;
        if (command.action === "manifest")
            manifestId = (await createEvidenceManifest(tx, ctx, source.id, command.objectIds)).value.id;
        else if (command.action === "verifyCutoff") {
            const [object] = await tx.$queryRaw<Array<{
                id: string;
            }>> `SELECT id FROM agri_evidence_objects WHERE id=${command.objectId} AND "requestId"=${row!.id}`;
            if (!object || !source.deadlineAt || source.windowState !== "CONFIRMED")
                return evidenceFail("AGRI_EVIDENCE_CUTOFF_UNKNOWN");
            row = await evidenceTransition(tx, row!, "VERIFY_CUTOFF", actorId, null, {}, { objectId: object.id, reason: command.reason, deadlineAt: source.deadlineAt.toISOString() });
        }
        else if (command.action === "cancel") {
            if (row!.state === "STORED" || row!.state === "UPLOADED")
                return evidenceFail("AGRI_EVIDENCE_ALREADY_STORED");
            row = await evidenceTransition(tx, row!, "CANCEL", actorId, null, { state: "CANCELLED", cancelRequested: true, leaseToken: null, leaseExpiresAt: null });
        }
        else {
            if (row!.cleanupCompletedAt || !["FAILED", "NEEDS_REVIEW", "RETRY_WAIT"].includes(row!.state) || row!.attempt >= row!.maxAttempts || row!.cancelRequested)
                return evidenceFail("AGRI_EVIDENCE_RETRY_UNAVAILABLE");
            await writableTeamCutoff(tx, ctx, row!.submissionId ? source : null, row!.authority);
            await evidenceBudget(tx, row!.competitionId, row!.entryStageId, row!.actorId, row!.submissionId);
            row = await evidenceTransition(tx, row!, "RETRY", actorId, null, { state: row!.mode === "UPLOAD" ? "PREPARED" : "QUEUED", nextRunAt: null, errorCode: null });
        }
        await saveReceipt(tx, ctx, command.action, command.idempotencyKey, hash, source.entryStageId, source.id, row?.id ?? null, manifestId, row?.revision ?? 1);
        await assertAgriAuthorityCurrent(tx, ...grants);
        return { requestId: row?.id ?? null, manifestId, duplicate: false };
    }, { timeout: 20000 });
}
export async function createEvidenceManifest(tx: EvidenceTx, ctx: AgriWorkspaceContext, submissionId: string, objectIds: string[]) {
    const source = await evidenceSource(tx, ctx, submissionId);
    const rows = await tx.$queryRaw<Array<{
        id: string;
        descriptor: EvidenceDescriptor;
    }>> `SELECT id,descriptor FROM agri_evidence_objects WHERE "submissionId"=${submissionId} AND "competitionId"=${ctx.workspace.competitionId} AND id=ANY(${[...new Set(objectIds)]}::text[]) ORDER BY id FOR SHARE`;
    if (rows.length !== objectIds.length)
        return evidenceFail("AGRI_EVIDENCE_MANIFEST_SELECTION_INVALID", 400);
    const [prev] = await tx.$queryRaw<Array<{
        id: string;
        sequence: number;
    }>> `SELECT id,sequence FROM agri_evidence_manifests WHERE "submissionId"=${submissionId} ORDER BY sequence DESC LIMIT 1`;
    const now = await agriDatabaseClock(tx), value: EvidenceManifest = { schemaVersion: 1, source: "ANS_AGRI_EXTERNAL_EVIDENCE", id: randomUUID(), submissionId, entryStageId: source.entryStageId, competitionId: source.competitionId, sequence: (prev?.sequence ?? 0) + 1, previousManifestId: prev?.id ?? null, createdAt: now.toISOString(), includePrivate: true, objects: rows.map(r => r.descriptor) };
    const canonical = canonicalAgriArchiveJSON(value), sha256 = evidenceHash(value), byteLength = Buffer.byteLength(canonical);
    await tx.$executeRaw `INSERT INTO agri_evidence_manifests(id,"competitionId","entryStageId","submissionId",sequence,"previousManifestId","createdById","createdAt","canonicalJSON",sha256,"byteLength") VALUES(${value.id},${value.competitionId},${value.entryStageId},${submissionId},${value.sequence},${value.previousManifestId},${ctx.actorId},${now},${canonical},${sha256},${byteLength})`;
    for (const object of rows)
        await tx.$executeRaw `INSERT INTO agri_evidence_manifest_objects("manifestId","objectId","submissionId","entryStageId","competitionId") VALUES(${value.id},${object.id},${submissionId},${value.entryStageId},${value.competitionId})`;
    return { value, sha256, byteLength };
}
export async function readEvidenceManifest(tx: EvidenceTx, ctx: AgriWorkspaceContext, id: string) { const [m] = await tx.$queryRaw<Array<{
    canonicalJSON: string;
    sha256: string;
    byteLength: number;
    submissionId: string;
}>> `SELECT "canonicalJSON",sha256,"byteLength","submissionId" FROM agri_evidence_manifests WHERE id=${id} AND "competitionId"=${ctx.workspace.competitionId}`; if (!m)
    return evidenceFail("AGRI_EVIDENCE_MANIFEST_NOT_FOUND", 404); const value = JSON.parse(m.canonicalJSON) as EvidenceManifest; if (evidenceHash(value) !== m.sha256 || Buffer.byteLength(m.canonicalJSON) !== m.byteLength || canonicalAgriArchiveJSON(value) !== m.canonicalJSON || value.schemaVersion !== 1 || value.submissionId !== m.submissionId)
    return evidenceFail("AGRI_EVIDENCE_INTEGRITY_FAILED", 500); return { value, sha256: m.sha256, byteLength: m.byteLength }; }
export async function listEvidence(actorId: string, raw: unknown): Promise<EvidenceList> {
    const query = z.object({ submissionId: z.string().min(1).max(80).optional(), entryStageId: z.string().min(1).max(80).optional(), artifactVersionId: z.string().min(1).max(80).optional(), cursor: z.coerce.number().int().min(0).max(100000).default(0) }).strict().parse(raw);
    return db.$transaction(async (tx) => {
        const ctx = await lockAgriWorkspace(tx, actorId), source = query.submissionId ? await evidenceSource(tx, ctx, query.submissionId) : null;
        const stage = source?.entryStageId ?? query.entryStageId;
        if (!stage)
            return evidenceFail("INVALID_INPUT", 400);
        const auth = await evidenceAuthority(tx, ctx, stage, false);
        let canWrite = false;
        try {
            const write = await evidenceAuthority(tx, ctx, stage, true);
            await writableTeamCutoff(tx, ctx, source, write.kind);
            canWrite = true;
        }
        catch (e) {
            if (!(e instanceof AgriWorkspaceError))
                throw e;
        }
        let notesGrant: Grant | null = null;
        let archiveGrant: Grant | null = null;
        if (auth.kind === "STAFF") {
            try {
                notesGrant = await requireAgriScope(tx, ctx, "INTERNAL_NOTES_READ");
            }
            catch (error) {
                if (!(error instanceof AgriWorkspaceError))
                    throw error;
            }
            if (canWrite)
                try {
                    archiveGrant = await requireAgriScope(tx, ctx, "ONSITE_READ");
                }
                catch (error) {
                    if (!(error instanceof AgriWorkspaceError))
                        throw error;
                }
        }
        const now = await agriDatabaseClock(tx);
        const rows = await tx.$queryRaw<Array<EvidenceRow & {
            descriptor: EvidenceDescriptor | null;
            verification: {
                at: string;
                reason: string;
                actorId: string;
            } | null;
        }>> `SELECT r.*,o.descriptor,(SELECT jsonb_build_object('at',e."serverAt",'reason',e.provenance->>'reason','actorId',e."actorId") FROM agri_evidence_events e WHERE e."requestId"=r.id AND e.action='VERIFY_CUTOFF' ORDER BY e.revision DESC LIMIT 1) AS verification FROM agri_evidence_requests r LEFT JOIN agri_evidence_objects o ON o."requestId"=r.id WHERE r."entryStageId"=${stage} AND r."competitionId"=${ctx.workspace.competitionId} AND ((${query.submissionId ?? null}::text IS NOT NULL AND r."submissionId"=${query.submissionId ?? null}) OR (${query.submissionId ?? null}::text IS NULL AND r."submissionId" IS NULL AND r."actorId"=${actorId})) AND (${query.artifactVersionId ?? null}::text IS NULL OR r."artifactVersionId"=${query.artifactVersionId ?? null}) ORDER BY r."createdAt" DESC,r.id DESC OFFSET ${query.cursor} LIMIT 51`;
        const [latest] = source ? await tx.$queryRaw<Array<{
            id: string;
        }>> `SELECT id FROM agri_evidence_manifests WHERE "submissionId"=${source.id} ORDER BY sequence DESC LIMIT 1` : [];
        await assertAgriAuthorityCurrent(tx, ...auth.grants, ...(notesGrant ? [notesGrant] : []), ...(archiveGrant ? [archiveGrant] : []));
        return { competitionId: ctx.workspace.competitionId, submissionId: source?.id ?? null, entryStageId: stage, enabled: evidenceEnabled() && ctx.workspace.enabled, canWrite, canArchive: canWrite && !!archiveGrant, canVerify: canWrite && !!notesGrant, target: source ? { projectId: source.projectId, artifactVersionId: source.artifactVersionId, repository: source.repository as NonNullable<EvidenceList["target"]>["repository"], demoUrl: source.demoUrl } : null, requests: rows.slice(0, 50).map((r): EvidenceRequestView => ({ id: r.id, submissionId: r.submissionId, kind: r.kind, mode: r.mode, state: r.state, createdAt: r.createdAt.toISOString(), errorCode: r.errorCode, attempt: r.attempt, maxAttempts: r.maxAttempts, nextRunAt: r.nextRunAt?.toISOString() ?? null, canUpload: canWrite && r.actorId === actorId && !r.cleanupCompletedAt && (!r.expiresAt || r.expiresAt > now), canManage: canWrite && (auth.kind === "STAFF" || r.actorId === actorId), expiresAt: r.expiresAt?.toISOString() ?? null, fileName: r.fileName, resolution: r.mode === "GITHUB_ARCHIVE" && r.originalRef && typeof r.provenance?.sha === "string" && typeof r.provenance.resolvedAt === "string" ? { repositoryUrl: r.sourceUrl!, originalRef: r.originalRef, sha: r.provenance.sha, resolvedAt: r.provenance.resolvedAt } : null, object: r.descriptor, cutoffVerification: notesGrant ? r.verification : null })), manifest: latest ? await readEvidenceManifest(tx, ctx, latest.id) : null, nextCursor: rows.length > 50 ? String(query.cursor + 50) : null };
    }, { timeout: 15000 });
}
export async function authorizedEvidenceDownload(actorId: string, objectId: string, record = true) { return db.$transaction(async (tx) => { const ctx = await lockAgriWorkspace(tx, actorId); const [object] = await tx.$queryRaw<Array<{
    id: string;
    requestId: string;
    entryStageId: string;
    storageKey: string;
    backend: StoredEvidence["backend"];
    namespaceVersion: 1;
    descriptor: EvidenceDescriptor;
}>> `SELECT * FROM agri_evidence_objects WHERE id=${objectId} AND "competitionId"=${ctx.workspace.competitionId} FOR SHARE`; if (!object)
    return evidenceFail("AGRI_EVIDENCE_NOT_FOUND", 404); const auth = await evidenceAuthority(tx, ctx, object.entryStageId, false); const row = await evidenceRequest(tx, ctx, object.requestId); if (record)
    await evidenceTransition(tx, row, "DOWNLOAD", actorId, null, {}, { objectId }); await assertAgriAuthorityCurrent(tx, ...auth.grants); return { key: object.storageKey, backend: object.backend, namespaceVersion: object.namespaceVersion, descriptor: object.descriptor }; }, { timeout: 15000 }); }
