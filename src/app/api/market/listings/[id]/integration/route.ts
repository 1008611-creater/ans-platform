import { configureMarketIntegration, getMarketIntegration } from "@/server/marketplace/integration";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) { return marketResponse(async () => ({ integration: await getMarketIntegration((await context.params).id, await marketUser()) })); }
export async function POST(request: Request, context: Context) { return marketResponse(async () => { const user = await marketUser(request); return configureMarketIntegration((await context.params).id, user, await marketJson(request)); }); }
