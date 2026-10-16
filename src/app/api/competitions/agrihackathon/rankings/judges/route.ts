import { RateLimiter } from "@/lib/rate-limit";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { readSameOriginJson } from "@/server/http/json";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { listAgriJudgeCandidates, authorizeAndConfigureAgriJudgePanel } from "@/server/competitions/agrihackathon/ranking-judges";

export const dynamic = "force-dynamic";

const reads = new RateLimiter({ max: 60, windowSeconds: 60 });
const writes = new RateLimiter({ max: 20, windowSeconds: 60 });

export async function GET(request: Request) {
  return agriSubmissionResponse(request, async actorId => {
    if (!reads.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    const stage = new URL(request.url).searchParams.get("stage") ?? "PRELIMINARY";
    return listAgriJudgeCandidates(actorId, stage);
  });
}

export async function POST(request: Request) {
  return agriSubmissionResponse(request, async actorId => {
    const body = await readSameOriginJson(request, 16384);
    if (!writes.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    return authorizeAndConfigureAgriJudgePanel(actorId, body);
  });
}
