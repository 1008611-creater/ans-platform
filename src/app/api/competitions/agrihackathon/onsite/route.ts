import { RateLimiter } from "@/lib/rate-limit";
import { readSameOriginJson } from "@/server/http/json";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriOnsiteCommandSchema, agriOnsiteQuerySchema } from "@/contracts/agri-onsite";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { executeAgriOnsiteCommand, listAgriOnsiteItems } from "@/server/competitions/agrihackathon/onsite";
export const dynamic = "force-dynamic";
const writes = new RateLimiter({ max: 30, windowSeconds: 60 }), reads = new RateLimiter({ max: 120, windowSeconds: 60 });
export async function GET(request: Request) { return agriSubmissionResponse(request, async actorId => {
  if (!reads.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
  return listAgriOnsiteItems(actorId, agriOnsiteQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams)));
}); }
export async function POST(request: Request) { return agriSubmissionResponse(request, async actorId => {
  const command = agriOnsiteCommandSchema.parse(await readSameOriginJson(request));
  if (!writes.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
  return executeAgriOnsiteCommand(actorId, command);
}); }
