import { updateModelJob } from "@/server/visual-portfolio/jobs";
import { workerResponse, readWorkerJson, uuid } from "@/server/visual-portfolio/http";
export const dynamic="force-dynamic";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return workerResponse(request,async()=>updateModelJob(uuid((await params).id),await readWorkerJson(request)));}
