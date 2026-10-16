import { RateLimiter } from "@/lib/rate-limit";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { inspectEvidenceObject } from "@/server/competitions/agrihackathon/evidence-inspect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const reads = new RateLimiter({ max: 60, windowSeconds: 60 });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ objectId: string }> },
) {
  return agriSubmissionResponse(request, async actorId => {
    if (!reads.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    const { objectId } = await params;
    const path = new URL(request.url).searchParams.get("path");
    return inspectEvidenceObject(actorId, objectId, path);
  });
}
