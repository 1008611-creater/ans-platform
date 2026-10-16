import { RateLimiter } from "@/lib/rate-limit";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriCreditsQuerySchema, agriCreditsClaimSchema } from "@/contracts/agri-credits";
import { readSameOriginJson } from "@/server/http/json";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { getAgriTeamCredits, claimAgriTeamCredits } from "@/server/competitions/agrihackathon/credits";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 });
const writes = new RateLimiter({ max: 20, windowSeconds: 60 });
export async function GET(request: Request) {
  return agriSubmissionResponse(request, async actorId => {
    if (!reads.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    const query = agriCreditsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return getAgriTeamCredits(actorId, query.teamCompetitionId);
  });
}
export async function POST(request: Request) {
  return agriSubmissionResponse(request, async actorId => {
    if (!writes.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    const command = agriCreditsClaimSchema.parse(await readSameOriginJson(request));
    return claimAgriTeamCredits(actorId, command.teamCompetitionId);
  });
}
