import { RateLimiter } from "@/lib/rate-limit";
import { MarketRuleError } from "@/domain/marketplace/order";
import { auth } from "@/lib/auth";
import { getMarketListingStar, setMarketListingStar } from "@/server/marketplace/stars";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
const writes = new RateLimiter({ max: 60, windowSeconds: 60 });
export async function GET(_request: Request, context: Context) {
  return marketResponse(async () => {
    const session = await auth();
    return getMarketListingStar((await context.params).id, session?.user?.id);
  });
}
export async function PUT(request: Request, context: Context) {
  return marketResponse(async () => {
    const userId = await marketUser(request);
    if (!writes.check(userId).allowed) throw new MarketRuleError("RATE_LIMITED", 429);
    return setMarketListingStar((await context.params).id, userId, await marketJson(request));
  });
}
