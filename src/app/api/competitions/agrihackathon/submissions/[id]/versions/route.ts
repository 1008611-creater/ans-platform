import { RateLimiter } from "@/lib/rate-limit";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriSubmissionVersionsQuerySchema } from "@/contracts/agri-submissions";
import { readSameOriginJson } from "@/server/http/json";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { listAgriSubmissionVersions } from "@/server/competitions/agrihackathon/submissions";
import { createAgriSubmissionVersion } from "@/server/competitions/agrihackathon/submission-versions";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 });
const writes = new RateLimiter({ max: 30, windowSeconds: 60 });
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return agriSubmissionResponse(request, async actorId => {
    if (!reads.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    const { id } = await context.params;
    return listAgriSubmissionVersions(actorId, id, agriSubmissionVersionsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams)));
  });
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return agriSubmissionResponse(request, async actorId => {
    const body = await readSameOriginJson(request, 8192);
    if (!writes.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    const { id } = await context.params;
    return createAgriSubmissionVersion(actorId, id, body);
  });
}
