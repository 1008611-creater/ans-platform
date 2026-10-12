import { externalReceipt, integrationActor } from "@/server/marketplace/integration";
import { marketResponse } from "@/server/marketplace/http";
import { MarketRuleError } from "@/domain/marketplace/order";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) { return marketResponse(async () => { if (request.headers.get("origin")) throw new MarketRuleError("SERVER_ONLY", 403); const actor = await integrationActor(request); return externalReceipt((await context.params).id, actor.id, actor.keyHash); }); }
