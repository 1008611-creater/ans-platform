import { z } from "zod";
import { RateLimiter } from "@/lib/rate-limit";
import { agriTaskResponse } from "@/server/competitions/agrihackathon/tasks-http";
import { getAgriTask } from "@/server/competitions/agrihackathon/tasks";
import { AgriTaskError } from "@/server/competitions/agrihackathon/error";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 });
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return agriTaskResponse(request, async actorId => {
    if (!reads.check(actorId).allowed) throw new AgriTaskError("RATE_LIMITED", 429);
    const id = z.string().min(1).max(80).parse((await params).id);
    return getAgriTask(actorId, id);
  });
}
