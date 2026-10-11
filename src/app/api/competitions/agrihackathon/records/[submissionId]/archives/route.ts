import { RateLimiter } from "@/lib/rate-limit";
import { readSameOriginJson } from "@/server/http/json";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriRecordArchiveCommandSchema, agriRecordArchiveListQuerySchema } from "@/contracts/agri-record-archive";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { createAgriRecordArchive, listAgriRecordArchives } from "@/server/competitions/agrihackathon/record-archive";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 }), writes = new RateLimiter({ max: 20, windowSeconds: 60 });
type Context = { params: Promise<{ submissionId: string }> };
export async function GET(request: Request, context: Context) { return agriSubmissionResponse(request, async actorId => {
  const query = new URL(request.url).searchParams;
  if ([...query.keys()].some(key => query.getAll(key).length !== 1)) throw new AgriWorkspaceError("INVALID_INPUT", 400);
  const parsed = agriRecordArchiveListQuerySchema.parse(Object.fromEntries(query));
  if (!reads.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
  return listAgriRecordArchives(actorId, (await context.params).submissionId, parsed);
}); }
export async function POST(request: Request, context: Context) { return agriSubmissionResponse(request, async actorId => {
  const command = agriRecordArchiveCommandSchema.parse(await readSameOriginJson(request));
  if (command.submissionId !== (await context.params).submissionId) throw new AgriWorkspaceError("INVALID_INPUT", 400);
  if (!writes.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
  return createAgriRecordArchive(actorId, command);
}); }
