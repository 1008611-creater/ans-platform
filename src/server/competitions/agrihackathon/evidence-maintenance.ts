import { db } from "@/lib/db";
import { evidenceObjectKey, disposeUnboundEvidence } from "./evidence-storage";
import { evidenceTransition, type EvidenceRow } from "./evidence";
import { evidenceFail } from "./evidence-config";
import { agriDatabaseClock } from "./workspace";
/** Explicit server maintenance, never an HTTP API or a team command. Default is inventory only. */
export async function reconcileEvidenceReservations(apply = false) {
    const rows = await db.$queryRaw<EvidenceRow[]> `SELECT r.* FROM agri_evidence_requests r WHERE r."cleanupCompletedAt" IS NULL AND r.state IN ('FAILED','CANCELLED','NEEDS_REVIEW','PREPARED','UPLOADED') AND r."createdAt"<clock_timestamp()-interval '48 hours' AND (r."submissionId" IS NOT NULL OR r."expiresAt"<clock_timestamp()) AND NOT EXISTS(SELECT 1 FROM agri_evidence_objects o WHERE o."requestId"=r.id) ORDER BY r."createdAt",r.id LIMIT 100`;
    const result: {
        requestId: string;
        reservedBytes: number;
        cleaned: boolean;
    }[] = [];
    for (const candidate of rows) {
        if (!apply) {
            result.push({ requestId: candidate.id, reservedBytes: candidate.maxBytes, cleaned: false });
            continue;
        }
        await db.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM agri_workspaces WHERE "competitionId"=${candidate.competitionId} FOR UPDATE`;
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(310151730)`;
            const [row] = await tx.$queryRaw<EvidenceRow[]> `SELECT * FROM agri_evidence_requests WHERE id=${candidate.id} FOR UPDATE`;
            const now = await agriDatabaseClock(tx);
            if (!row || row.cleanupCompletedAt || row.createdAt.getTime() > now.getTime() - 48 * 3600000 || !["FAILED", "CANCELLED", "NEEDS_REVIEW", "PREPARED", "UPLOADED"].includes(row.state) || row.leaseToken || row.leaseExpiresAt && row.leaseExpiresAt > now || !row.submissionId && (!row.expiresAt || row.expiresAt >= now))
                return;
            const [linked] = await tx.$queryRaw<Array<{
                id: string;
            }>> `SELECT id FROM agri_evidence_objects WHERE "requestId"=${row.id}`;
            if (linked)
                return;
            if (row.storageKey !== evidenceObjectKey(row.competitionId, row.id, row.objectId))
                return evidenceFail("AGRI_EVIDENCE_KEY_INVALID", 500);
            // External deletion happens with the request/workspace locked and no live lease. Failure keeps the full reservation.
            // If a crash follows deletion, retry removes the same exact namespace idempotently; historical evidence is never selected.
            await disposeUnboundEvidence({ key: row.storageKey, backend: row.backend, namespaceVersion: row.namespaceVersion });
            await evidenceTransition(tx, row, "UNBOUND_BYTES_CLEANED", null, "agri-evidence-maintenance", { state: "CANCELLED", cancelRequested: true, cleanupCompletedAt: now, storedBytes: 0, checkpoint: null, errorCode: "AGRI_EVIDENCE_RETENTION_ENDED", leaseToken: null, leaseExpiresAt: null });
            result.push({ requestId: row.id, reservedBytes: row.maxBytes, cleaned: true });
        }, { timeout: 30000 });
    }
    const stored = await db.$queryRaw<EvidenceRow[]> `SELECT * FROM agri_evidence_requests WHERE state='STORED' AND "captureFinishedAt"<clock_timestamp()-interval '48 hours' ORDER BY id LIMIT 100`;
    // Successful immutable objects are excluded from final-file deletion. Only abandoned multipart/part bytes are eligible.
    if (apply)
        for (const candidate of stored)
            await db.$transaction(async (tx) => {
                await tx.$queryRaw `SELECT id FROM agri_workspaces WHERE "competitionId"=${candidate.competitionId} FOR UPDATE`;
                const [row] = await tx.$queryRaw<EvidenceRow[]> `SELECT * FROM agri_evidence_requests WHERE id=${candidate.id} FOR UPDATE`;
                if (!row || row.state !== "STORED" || row.leaseToken)
                    return;
                await disposeUnboundEvidence({ key: row.storageKey, backend: row.backend, namespaceVersion: row.namespaceVersion }, false);
            });
    return { mode: apply ? "apply" : "inventory", requests: result, storedTemporaryNamespaces: stored.map(row => row.id) };
}
