import { z } from "zod";
import { RateLimiter } from "@/lib/rate-limit";
import { readSameOriginJson } from "@/server/http/json";
import { AgriWorkspaceError, agriWorkspaceCommandSchema } from "@/contracts/agri-workspace";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { readAgriWorkspaceRules, executeAgriWorkspaceCommand } from "@/server/competitions/agrihackathon/workspace";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 60, windowSeconds: 60 });
const writes = new RateLimiter({ max: 20, windowSeconds: 60 });
export async function GET(request: Request) {
  return agriSubmissionResponse(request, async actorId => {
    z.object({}).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
    if (!reads.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    return readAgriWorkspaceRules(actorId);
  });
}
export async function POST(request: Request) {
  return agriSubmissionResponse(request, async actorId => {
    const command = agriWorkspaceCommandSchema.parse(await readSameOriginJson(request));
    if (!writes.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    return executeAgriWorkspaceCommand(actorId, command);
  });
}
