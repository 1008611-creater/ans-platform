import { RateLimiter } from "@/lib/rate-limit";
import { agriRecordSummaryQuerySchema } from "@/contracts/agri-record-summary";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { readAgriRecordSummary } from "@/server/competitions/agrihackathon/record-summary";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { ok } from "@/server/http/respond";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 });
const exports = new RateLimiter({ max: 6, windowSeconds: 60 });
export async function GET(request: Request, context: { params: Promise<{ submissionId: string }> }) {
  const query = new URL(request.url).searchParams;
  let responseMode: "view" | "exportJSON" = "view";
  return agriSubmissionResponse(request, async actorId => {
    // Reject ambiguous keys; authorization, rate limits and presentation use one parsed mode.
    if ([...query.keys()].some(key => query.getAll(key).length !== 1)) throw new AgriWorkspaceError("INVALID_INPUT", 400);
    const parsed = agriRecordSummaryQuerySchema.parse(Object.fromEntries(query));
    responseMode = parsed.mode;
    if (!(parsed.mode === "exportJSON" ? exports : reads).check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    const { submissionId } = await context.params;
    return readAgriRecordSummary(actorId, submissionId, parsed);
  }, data => responseMode === "exportJSON" ? new Response(JSON.stringify(data, null, 2) + "\n", { headers: {
    "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="ans-agri-record-summary-' + data.generatedAt.slice(0, 10) + '.json"',
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
  } }) : ok(data));
}
