import { getOwnedMarketListing, reviseMarketListing, submitMarketListing, withdrawMarketListing } from "@/server/marketplace/listings";
import { marketListingActionSchema } from "@/contracts/marketplace-actions";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return marketResponse(async () => ({ listing: await getOwnedMarketListing((await context.params).id, await marketUser()) }));
}
export async function PATCH(request: Request, context: Context) {
  return marketResponse(async () => { const user = await marketUser(request); return { version: await reviseMarketListing((await context.params).id, user, await marketJson(request)) }; });
}
export async function POST(request: Request, context: Context) {
  return marketResponse(async () => {
    const user = await marketUser(request); const input = marketListingActionSchema.parse(await marketJson(request)); const { id } = await context.params;
    return input.action === "submit" ? submitMarketListing(id, user, input.expectedVersion) : withdrawMarketListing(id, user);
  });
}
