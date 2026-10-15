import { Readable } from "node:stream";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { authorizedEvidenceDownload } from "@/server/competitions/agrihackathon/evidence";
import { readEvidence, inspectEvidence } from "@/server/competitions/agrihackathon/evidence-storage";
import { evidenceFail } from "@/server/competitions/agrihackathon/evidence-config";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: {
    params: Promise<{
        objectId: string;
    }>;
}) {
    return agriSubmissionResponse(request, async (actor) => { const meta = await authorizedEvidenceDownload(actor, (await params).objectId), signal = AbortSignal.any([request.signal, AbortSignal.timeout(15 * 60 * 1000)]); const verified = await inspectEvidence(meta, meta.descriptor.byteLength, meta.descriptor.kind, signal); if (verified.sha256 !== meta.descriptor.sha256 || verified.byteLength !== meta.descriptor.byteLength)
        return evidenceFail("AGRI_EVIDENCE_INTEGRITY_FAILED", 500); await authorizedEvidenceDownload(actor, meta.descriptor.id, false); return { meta, stream: await readEvidence(meta, signal) }; }, ({ meta, stream }) => new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { headers: { "content-type": "application/octet-stream", "content-length": String(meta.descriptor.byteLength), "content-disposition": "attachment; filename=\"evidence.bin\"; filename*=UTF-8''" + encodeURIComponent(meta.descriptor.fileName), "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox", "x-ans-evidence-sha256": meta.descriptor.sha256 } }));
}
