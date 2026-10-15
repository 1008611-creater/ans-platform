import { isAbsolute, resolve } from "node:path";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import type { EvidenceKind } from "@/contracts/agri-evidence";
export const evidenceFail = (code: string, status = 409): never => { throw new AgriWorkspaceError(code, status); };
const positive = (name: string, fallback: number) => { const n = Number(process.env[name] ?? fallback); if (!Number.isSafeInteger(n) || n <= 0)
    evidenceFail("AGRI_EVIDENCE_CONFIG_INVALID", 503); return n; };
/** Use the adopted rule's boundary convention, including an exclusive closing instant. */
export function evidenceAfterCutoff(at: Date, deadline: Date, includesDeadline: boolean) { return at > deadline || !includesDeadline && at.getTime() === deadline.getTime(); }
export function evidenceEnabled() { return process.env.ANS_AGRI_EVIDENCE_ENABLED === "true"; }
export function evidenceLimit(kind: EvidenceKind) { const limit = positive("ANS_AGRI_EVIDENCE_" + kind + "_LIMIT_BYTES", ({ REPOSITORY: 64, DEMO_DOCUMENT: 10, DEMO_VIDEO: 256, SUPPORTING_FILE: 32 }[kind]) * 1024 * 1024); if (limit > 2147483647)
    return evidenceFail("AGRI_EVIDENCE_CONFIG_INVALID", 503); return limit; }
export function evidenceConfig() {
    const mode = process.env.ANS_AGRI_EVIDENCE_STORAGE_MODE;
    if (mode !== "local_private" && mode !== "s3_private")
        return evidenceFail("AGRI_EVIDENCE_STORAGE_NOT_CONFIGURED", 503);
    const maxUsedPercent = positive("ANS_AGRI_EVIDENCE_LOCAL_MAX_USED_PERCENT", 90);
    if (maxUsedPercent >= 100)
        return evidenceFail("AGRI_EVIDENCE_CONFIG_INVALID", 503);
    const directory = process.env.ANS_AGRI_EVIDENCE_LOCAL_DIR;
    if (mode === "local_private" && (!directory || !isAbsolute(directory) || process.env.ANS_AGRI_EVIDENCE_LOCAL_DURABLE !== "true"))
        return evidenceFail("AGRI_EVIDENCE_STORAGE_NOT_CONFIGURED", 503);
    if (mode === "local_private" && /(?:^|[\\/])(?:public|ans-visual|visual-assets)(?:[\\/]|$)/i.test(directory!))
        return evidenceFail("AGRI_EVIDENCE_CONFIG_INVALID", 503);
    if (mode === "s3_private" && (!process.env.ANS_AGRI_EVIDENCE_S3_BUCKET || !process.env.ANS_AGRI_EVIDENCE_S3_ACCESS_KEY_ID || !process.env.ANS_AGRI_EVIDENCE_S3_SECRET_ACCESS_KEY))
        return evidenceFail("AGRI_EVIDENCE_STORAGE_NOT_CONFIGURED", 503);
    return { mode: mode as "local_private" | "s3_private", directory: directory ? resolve(directory) : null, quota: positive("ANS_AGRI_EVIDENCE_TOTAL_QUOTA_BYTES", 10 * 1024 ** 3),
        editionQuota: positive("ANS_AGRI_EVIDENCE_EDITION_QUOTA_BYTES", 10 * 1024 ** 3), entryQuota: positive("ANS_AGRI_EVIDENCE_ENTRY_QUOTA_BYTES", 1024 ** 3),
        actorQuota: positive("ANS_AGRI_EVIDENCE_ACTOR_QUOTA_BYTES", 2 * 1024 ** 3), submissionQuota: positive("ANS_AGRI_EVIDENCE_SUBMISSION_QUOTA_BYTES", 512 * 1024 ** 2),
        minFree: positive("ANS_AGRI_EVIDENCE_LOCAL_MIN_FREE_BYTES", 5 * 1024 ** 3), maxUsedRatio: maxUsedPercent / 100 };
}
export class EvidenceRetryError extends AgriWorkspaceError {
    constructor(public readonly retryAfterSeconds: number) { super("AGRI_EVIDENCE_SOURCE_BUSY", 503); }
}
