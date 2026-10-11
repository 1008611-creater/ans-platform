import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
import { payMarketOrderPoints } from "@/server/marketplace/points";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return marketResponse(async () => { const user = await marketUser(); const { id } = await context.params; return payMarketOrderPoints(id, user, await marketJson(request)); });
}
