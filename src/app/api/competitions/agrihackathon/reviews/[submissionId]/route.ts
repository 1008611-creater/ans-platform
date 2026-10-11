import { RateLimiter } from "@/lib/rate-limit";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriReviewsQuerySchema } from "@/contracts/agri-reviews";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { readAgriReviews } from "@/server/competitions/agrihackathon/reviews";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 });
export async function GET(request: Request, context: { params: Promise<{ submissionId: string }> }) {
  return agriSubmissionResponse(request, async actorId => {
    if (!reads.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED",429);
    const { submissionId } = await context.params;
    return readAgriReviews(actorId,submissionId,agriReviewsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams)));
  });
}
