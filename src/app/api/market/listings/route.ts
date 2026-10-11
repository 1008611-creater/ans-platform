import { listMarketListings, createMarketListing } from "@/server/marketplace/listings";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return marketResponse(async () => ({ listings: await listMarketListings(new URL(request.url).searchParams.get("mine") === "1" ? await marketUser() : undefined) }));
}
export async function POST(request: Request) {
  return marketResponse(async () => { const user = await marketUser(request); return { listing: await createMarketListing(user, await marketJson(request)) }; }, 201);
}
