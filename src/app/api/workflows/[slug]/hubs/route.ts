import { hubActor,hubJson,hubQuery,hubResponse } from "@/server/hubs/http";
import { readWorkflowHubManagement,executeWorkflowHubCommand } from "@/server/hubs/workflows";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){return hubResponse(async()=>{const actor=await hubActor(request),{slug}=await params;return readWorkflowHubManagement(slug,actor,hubQuery(request));});}
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){return hubResponse(async()=>{const actor=await hubActor(request),{slug}=await params;return executeWorkflowHubCommand(slug,actor,await hubJson(request));});}
