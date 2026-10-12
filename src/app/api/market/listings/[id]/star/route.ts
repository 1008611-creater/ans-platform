import { auth } from "@/lib/auth";
import { getMarketListingStar, setMarketListingStar } from "@/server/marketplace/stars";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: Context) {
  return marketResponse(async () => {
    const session = await auth();
    return getMarketListingStar((await context.params).id, session?.user?.id);
  });
}
export async function PUT(request: Request, context: Context) {
  return marketResponse(async () => {
    const userId = await marketUser(request);
    return setMarketListingStar((await context.params).id, userId, await marketJson(request));
  });
}
