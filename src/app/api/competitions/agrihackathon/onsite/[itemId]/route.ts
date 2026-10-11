import { RateLimiter } from "@/lib/rate-limit";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriOnsiteQuerySchema } from "@/contracts/agri-onsite";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { readAgriOnsiteItem } from "@/server/competitions/agrihackathon/onsite";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 });
export async function GET(request: Request, context: { params: Promise<{ itemId: string }> }) { return agriSubmissionResponse(request, async actorId => {
  if (!reads.check(actorId).allowed) throw new AgriWorkspaceError("RATE_LIMITED", 429);
  const { itemId } = await context.params;
  return readAgriOnsiteItem(actorId, itemId, agriOnsiteQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams)));
}); }
