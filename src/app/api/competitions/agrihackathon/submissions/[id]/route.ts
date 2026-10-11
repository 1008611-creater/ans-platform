import { RateLimiter } from "@/lib/rate-limit";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { readAgriStage } from "@/server/competitions/agrihackathon/submissions";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 });
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return agriSubmissionResponse(request, async actorId => {
    if (!reads.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    const { id } = await context.params;
    return readAgriStage(actorId, id, Object.fromEntries(new URL(request.url).searchParams));
  });
}
