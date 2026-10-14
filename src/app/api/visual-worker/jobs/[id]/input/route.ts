import { z } from "zod";
import { workerJob } from "@/server/visual-portfolio/jobs";
import { workerResponse, uuid } from "@/server/visual-portfolio/http";
import { readVisualObject } from "@/server/visual-portfolio/storage";
import { IMAGE_LIMIT } from "@/contracts/visual-generation";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return workerResponse(request,async()=>{
 const job=await workerJob(uuid((await params).id),z.string().uuid().parse(request.headers.get("x-ans-lease")));
 return new Response(await readVisualObject(job.inputKey,IMAGE_LIMIT),{headers:{"content-type":job.inputMime,"cache-control":"no-store"}});
});}
