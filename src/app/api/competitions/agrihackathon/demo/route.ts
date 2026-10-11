import { RateLimiter } from "@/lib/rate-limit";
import { readSameOriginJson } from "@/server/http/json";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriDemoCommandSchema } from "@/contracts/agri-demo";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { executeAgriDemoCommand } from "@/server/competitions/agrihackathon/demo";
export const dynamic = "force-dynamic";
const writes = new RateLimiter({ max: 30, windowSeconds: 60 });
export async function POST(request: Request) {
  return agriSubmissionResponse(request, async actorId => {
    const command = agriDemoCommandSchema.parse(await readSameOriginJson(request));
    if (!writes.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED",429);
    return executeAgriDemoCommand(actorId,command);
  });
}
