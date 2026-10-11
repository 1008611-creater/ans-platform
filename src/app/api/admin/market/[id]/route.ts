import { reviewMarketListing } from "@/server/marketplace/listings";
import { marketModerationSchema } from "@/contracts/marketplace-actions";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return marketResponse(async () => { const user = await marketUser(); const data = marketModerationSchema.parse(await marketJson(request)); return reviewMarketListing((await params).id, user, data.version, data.approve, data.note); });
}
