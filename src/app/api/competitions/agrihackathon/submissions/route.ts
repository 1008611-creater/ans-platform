import { z } from "zod";
import { RateLimiter } from "@/lib/rate-limit";
import { readSameOriginJson } from "@/server/http/json";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriPrepareStageSchema, agriStageSubmissionCommandSchema, agriSubmissionListQuerySchema } from "@/contracts/agri-submissions";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { listAgriStages, prepareAgriStage, executeAgriSubmissionCommand } from "@/server/competitions/agrihackathon/submissions";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 });
const writes = new RateLimiter({ max: 30, windowSeconds: 60 });
const commandSchema = z.union([agriPrepareStageSchema, agriStageSubmissionCommandSchema]);
export async function GET(request: Request) {
  return agriSubmissionResponse(request, async actorId => {
    if (!reads.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    return listAgriStages(actorId, agriSubmissionListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams)));
  });
}
export async function POST(request: Request) {
  return agriSubmissionResponse(request, async actorId => {
    const command = commandSchema.parse(await readSameOriginJson(request));
    if (!writes.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    return command.action === "prepareStage" ? prepareAgriStage(actorId, command) : executeAgriSubmissionCommand(actorId, command);
  });
}
