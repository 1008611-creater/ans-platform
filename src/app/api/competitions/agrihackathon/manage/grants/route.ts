import { z } from "zod";
import { RateLimiter } from "@/lib/rate-limit";
import { readSameOriginJson } from "@/server/http/json";
import { AgriWorkspaceError, agriGrantCommandSchema } from "@/contracts/agri-workspace";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { readAgriGrantManagement, executeAgriGrantCommand } from "@/server/competitions/agrihackathon/workspace";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 60, windowSeconds: 60 });
const writes = new RateLimiter({ max: 20, windowSeconds: 60 });
const querySchema = z.object({ recipientId: z.string().trim().min(1).max(80).optional() }).strict();
export async function GET(request: Request) {
  return agriSubmissionResponse(request, async actorId => {
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    if (!reads.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    return readAgriGrantManagement(actorId, query.recipientId);
  });
}
export async function POST(request: Request) {
  return agriSubmissionResponse(request, async actorId => {
    const command = agriGrantCommandSchema.parse(await readSameOriginJson(request));
    if (!writes.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    return executeAgriGrantCommand(actorId, command);
  });
}
