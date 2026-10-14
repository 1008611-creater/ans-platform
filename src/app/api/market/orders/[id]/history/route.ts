import { marketOrderHistoryQuerySchema } from "@/contracts/marketplace-history";
import { MarketRuleError } from "@/domain/marketplace/order";
import { getMarketOrderHistory } from "@/server/marketplace/history";
import { marketResponse, marketUser } from "@/server/marketplace/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return marketResponse(async () => {
    const userId = await marketUser(request);
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some(key => params.getAll(key).length !== 1)) throw new MarketRuleError("INVALID_INPUT", 400);
    const query = marketOrderHistoryQuerySchema.parse(Object.fromEntries(params));
    return getMarketOrderHistory((await context.params).id, userId, query);
  });
}
