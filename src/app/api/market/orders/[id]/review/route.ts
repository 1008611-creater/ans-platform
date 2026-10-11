import { reviewMarketOrder } from "@/server/marketplace/orders";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return marketResponse(async () => { const user = await marketUser(request); return reviewMarketOrder((await params).id, user, await marketJson(request)); });
}
