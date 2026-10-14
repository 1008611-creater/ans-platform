import { z } from "zod";
import { RateLimiter } from "@/lib/rate-limit";
import { agriTaskHistoryQuerySchema } from "@/contracts/agri-tasks";
import { agriTaskResponse } from "@/server/competitions/agrihackathon/tasks-http";
import { getAgriTaskHistory } from "@/server/competitions/agrihackathon/tasks";
import { AgriTaskError } from "@/server/competitions/agrihackathon/error";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 });
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return agriTaskResponse(request, async actorId => {
    if (!reads.check(actorId).allowed) throw new AgriTaskError("RATE_LIMITED", 429);
    const search = new URL(request.url).searchParams;
    if (search.getAll("beforeRevision").length > 1) throw new AgriTaskError("INVALID_INPUT", 400);
    const { beforeRevision } = agriTaskHistoryQuerySchema.parse(Object.fromEntries(search));
    const id = z.string().min(1).max(80).parse((await params).id);
    return getAgriTaskHistory(actorId, id, beforeRevision);
  });
}
