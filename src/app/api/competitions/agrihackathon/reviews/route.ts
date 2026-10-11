import { RateLimiter } from "@/lib/rate-limit";
import { readSameOriginJson } from "@/server/http/json";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriReviewCommandSchema } from "@/contracts/agri-reviews";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { executeAgriReviewCommand } from "@/server/competitions/agrihackathon/reviews";
export const dynamic = "force-dynamic";
const writes = new RateLimiter({ max: 30, windowSeconds: 60 });
export async function POST(request: Request) {
  return agriSubmissionResponse(request, async actorId => {
    const command = agriReviewCommandSchema.parse(await readSameOriginJson(request));
    if (!writes.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED",429);
    return executeAgriReviewCommand(actorId,command);
  });
}
