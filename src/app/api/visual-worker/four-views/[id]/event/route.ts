import { workerResponse,uuid,readWorkerJson } from "@/server/visual-portfolio/http";
import { fourViewEvent } from "@/server/visual-portfolio/four-view-jobs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return workerResponse(request,async()=>fourViewEvent(uuid((await params).id),await readWorkerJson(request)));}
