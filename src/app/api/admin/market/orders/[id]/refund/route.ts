import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
import { administerMarketRefund } from "@/server/marketplace/payments";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return marketResponse(async () => { const user = await marketUser(request); const { id } = await context.params; return administerMarketRefund(id, user, await marketJson(request)); });
}
