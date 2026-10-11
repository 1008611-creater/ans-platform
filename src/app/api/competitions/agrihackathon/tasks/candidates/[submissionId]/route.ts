import { agriReferenceDetailQuerySchema } from "@/contracts/agri-task-references";
import { RateLimiter } from "@/lib/rate-limit";
import { AgriTaskError } from "@/server/competitions/agrihackathon/error";
import { agriTaskResponse } from "@/server/competitions/agrihackathon/tasks-http";
import { readAgriReferenceRecord } from "@/server/competitions/agrihackathon/task-references";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 });
export async function GET(request: Request, context: { params: Promise<{ submissionId: string }> }) {
  return agriTaskResponse(request, async actorId => {
    if (!reads.check(actorId).allowed) throw new AgriTaskError("RATE_LIMITED", 429);
    const { submissionId } = await context.params;
    return readAgriReferenceRecord(actorId, submissionId, agriReferenceDetailQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams)));
  });
}
