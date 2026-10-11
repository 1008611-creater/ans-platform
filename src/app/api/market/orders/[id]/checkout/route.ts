import { createMarketCashCheckout } from "@/server/marketplace/payments";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return marketResponse(async () => { const user = await marketUser(); const { id } = await context.params; return createMarketCashCheckout(id, user, await marketJson(request)); });
}
