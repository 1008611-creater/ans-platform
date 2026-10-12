import { runMarketWorkflow, listMarketWorkflowRuns } from "@/server/marketplace/workflows";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return marketResponse(async () => {
    const actor = await marketUser(request); const { id } = await params;
    return runMarketWorkflow(id, actor, await marketJson(request));
  }, 202);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return marketResponse(async () => {
    const actor = await marketUser(request); const { id } = await params;
    return listMarketWorkflowRuns(id, actor);
  });
}
