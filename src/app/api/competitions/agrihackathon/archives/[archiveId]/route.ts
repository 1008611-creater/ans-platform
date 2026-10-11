import { RateLimiter } from "@/lib/rate-limit";
import { agriRecordArchiveReadQuerySchema } from "@/contracts/agri-record-archive";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { readAgriRecordArchive } from "@/server/competitions/agrihackathon/record-archive";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { ok } from "@/server/http/respond";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 }), exports = new RateLimiter({ max: 6, windowSeconds: 60 });
export async function GET(request: Request, context: { params: Promise<{ archiveId: string }> }) {
  let mode: "view" | "exportJSON" = "view";
  return agriSubmissionResponse(request, async actorId => {
    const query = new URL(request.url).searchParams;
    if ([...query.keys()].some(key => query.getAll(key).length !== 1)) throw new AgriWorkspaceError("INVALID_INPUT", 400);
    const parsed = agriRecordArchiveReadQuerySchema.parse(Object.fromEntries(query)); mode = parsed.mode;
    if (!(mode === "exportJSON" ? exports : reads).check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    return readAgriRecordArchive(actorId, (await context.params).archiveId, parsed);
  }, data => mode === "exportJSON" ? new Response(JSON.stringify(data, null, 2) + "\n", { headers: {
    "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="ans-agri-archive-v' + data.archive.sequence + '.json"',
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
  } }) : ok(data));
}
