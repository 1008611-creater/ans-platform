import { hubActor,hubQuery,hubResponse } from "@/server/hubs/http";
import { readWorkflowHubQueue } from "@/server/hubs/workflows";
export const dynamic="force-dynamic";
export async function GET(request:Request){return hubResponse(async()=>readWorkflowHubQueue(await hubActor(request),hubQuery(request)));}
