import { agriReferenceQuerySchema } from "@/contracts/agri-task-references";
import { RateLimiter } from "@/lib/rate-limit";
import { AgriTaskError } from "@/server/competitions/agrihackathon/error";
import { agriTaskResponse } from "@/server/competitions/agrihackathon/tasks-http";
import { listAgriReferenceChoices } from "@/server/competitions/agrihackathon/task-references";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 });
export async function GET(request: Request) {
  return agriTaskResponse(request, async actorId => {
    if (!reads.check(actorId).allowed) throw new AgriTaskError("RATE_LIMITED", 429);
    return listAgriReferenceChoices(actorId, agriReferenceQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams)));
  });
}
