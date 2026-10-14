import { auth } from "@/lib/auth";
import { RateLimiter } from "@/lib/rate-limit";
import { computeDeliveryResponse } from "@/server/compute/delivery-http";
import { ComputeDeliveryError, readComputeDelivery } from "@/server/compute/delivery-service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reads = new RateLimiter({ max: 120, windowSeconds: 60 });
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return computeDeliveryResponse(async () => {
    const session = await auth();
    if (!session?.user?.id) throw new ComputeDeliveryError("UNAUTHORIZED", 401);
    if (request.headers.get("x-ans-compute-actor") !== session.user.id) throw new ComputeDeliveryError("ACCOUNT_CHANGED", 409);
    if (!reads.check(session.user.id).allowed) throw new ComputeDeliveryError("RATE_LIMITED", 429);
    if (new URL(request.url).search) throw new ComputeDeliveryError("INVALID_INPUT", 400);
    return readComputeDelivery(session.user.id, (await params).id);
  });
}
