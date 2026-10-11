import { RateLimiter } from "@/lib/rate-limit";
import { readSameOriginJson } from "@/server/http/json";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriDecisionCommandSchema, agriDecisionQuerySchema } from "@/contracts/agri-decisions";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { readAgriDecisionManagement, executeAgriDecisionCommand } from "@/server/competitions/agrihackathon/decisions";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 60, windowSeconds: 60 });
const writes = new RateLimiter({ max: 20, windowSeconds: 60 });
export async function GET(request: Request) {
 return agriSubmissionResponse(request, async actorId => {
  if (!reads.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
  return readAgriDecisionManagement(actorId, agriDecisionQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams)));
 });
}
export async function POST(request: Request) {
 return agriSubmissionResponse(request, async actorId => {
  const command = agriDecisionCommandSchema.parse(await readSameOriginJson(request));
  if (!writes.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
  return executeAgriDecisionCommand(actorId, command);
 });
}
