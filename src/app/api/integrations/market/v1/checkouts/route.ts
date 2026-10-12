import { createExternalCheckout, integrationActor } from "@/server/marketplace/integration";
import { integrationJson } from "@/server/marketplace/integration-http";
import { marketResponse } from "@/server/marketplace/http";
export async function POST(request: Request) { return marketResponse(async () => { const actor = await integrationActor(request); return createExternalCheckout(actor.id, await integrationJson(request), actor.keyHash); }, 201); }
