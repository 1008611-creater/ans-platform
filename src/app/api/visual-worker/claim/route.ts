import { claimModelJob } from "@/server/visual-portfolio/jobs";
import { workerResponse, readWorkerJson } from "@/server/visual-portfolio/http";
export const dynamic="force-dynamic";
export async function POST(request:Request){return workerResponse(request,async()=>claimModelJob(await readWorkerJson(request)));}
