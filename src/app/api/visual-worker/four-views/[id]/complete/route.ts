import { workerResponse,uuid } from "@/server/visual-portfolio/http";
import { readLimitedBody } from "@/server/visual-portfolio/media";
import { completeFourViewJob } from "@/server/visual-portfolio/four-view-jobs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return workerResponse(request,async()=>completeFourViewJob(uuid((await params).id),uuid(request.headers.get("x-ans-lease")??""),await readLimitedBody(request,40_000_000)));}
