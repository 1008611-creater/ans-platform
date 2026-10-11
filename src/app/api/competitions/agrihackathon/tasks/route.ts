import { RateLimiter } from "@/lib/rate-limit";
import { readSameOriginJson } from "@/server/http/json";
import { agriTaskCommandSchema, agriTaskListQuerySchema } from "@/contracts/agri-tasks";
import { agriTaskResponse } from "@/server/competitions/agrihackathon/tasks-http";
import { listAgriTasks, executeAgriTaskCommand } from "@/server/competitions/agrihackathon/tasks";
import { AgriTaskError } from "@/server/competitions/agrihackathon/error";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 });
const writes = new RateLimiter({ max: 30, windowSeconds: 60 });
export async function GET(request: Request) {
  return agriTaskResponse(request, async actorId => {
    if (!reads.check(actorId).allowed) throw new AgriTaskError("RATE_LIMITED", 429);
    const { cursor, ...filters } = agriTaskListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return listAgriTasks(actorId, cursor, filters);
  });
}
export async function POST(request: Request) {
  return agriTaskResponse(request, async actorId => {
    const command = agriTaskCommandSchema.parse(await readSameOriginJson(request));
    if (!writes.check(actorId).allowed) throw new AgriTaskError("RATE_LIMITED", 429);
    return executeAgriTaskCommand(actorId, command);
  });
}
