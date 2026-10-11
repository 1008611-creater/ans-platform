import { marketResponse, marketUser } from "@/server/marketplace/http";
import { listMarketRefundOperations } from "@/server/marketplace/refund-operations";
export async function GET(request: Request) {
  return marketResponse(async () => { const actorId = await marketUser(request); const query = new URL(request.url).searchParams; return listMarketRefundOperations(actorId, { cursor: query.get("cursor") ?? undefined, view: query.get("view") ?? undefined }); });
}
