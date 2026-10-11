import { getMarketOrder, actOnMarketOrder } from "@/server/marketplace/orders";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) { return marketResponse(async () => ({ order: await getMarketOrder((await context.params).id, await marketUser()) })); }
export async function POST(request: Request, context: Context) { return marketResponse(async () => { const user = await marketUser(request); return { order: await actOnMarketOrder((await context.params).id, user, await marketJson(request)) }; }); }
