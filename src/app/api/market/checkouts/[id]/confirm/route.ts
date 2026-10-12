import { confirmExternalCheckout } from "@/server/marketplace/integration";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
import { z } from "zod";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { return marketResponse(async () => { const user = await marketUser(request); z.object({}).strict().parse(await marketJson(request)); return confirmExternalCheckout((await context.params).id, user); }); }
