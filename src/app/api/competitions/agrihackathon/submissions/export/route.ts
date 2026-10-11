import { RateLimiter } from "@/lib/rate-limit";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriWorksExportQuerySchema } from "@/contracts/agri-submissions";
import { exportAgriWorks } from "@/server/competitions/agrihackathon/submissions";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
export const dynamic = "force-dynamic";
const limiter = new RateLimiter({ max: 6, windowSeconds: 60 });
export async function GET(request: Request) {
  return agriSubmissionResponse(request, async actorId => {
    const query = agriWorksExportQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    if (!limiter.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
    return exportAgriWorks(actorId, query);
  }, data => new Response(data.csv, { headers: {
    "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="' + data.filename + '"',
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
  } }));
}
