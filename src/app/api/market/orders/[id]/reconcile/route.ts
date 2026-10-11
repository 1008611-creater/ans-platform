import { z } from "zod";
import { reconcileMarketCashPayment } from "@/server/marketplace/payments";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return marketResponse(async () => { const user = await marketUser(); z.object({}).strict().parse(await marketJson(request)); const { id } = await context.params; return reconcileMarketCashPayment(id, user); });
}
