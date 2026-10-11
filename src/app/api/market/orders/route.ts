import { listMarketOrders, createMarketOrder, marketCheckoutAvailability } from "@/server/marketplace/orders";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
export const dynamic = "force-dynamic";
export async function GET() { return marketResponse(async () => ({ orders: await listMarketOrders(await marketUser()), availability: marketCheckoutAvailability() })); }
export async function POST(request: Request) { return marketResponse(async () => { const user = await marketUser(request); return { order: await createMarketOrder(user, await marketJson(request)) }; }, 201); }
