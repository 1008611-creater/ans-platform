import { z } from "zod";
import { completeModelJob } from "@/server/visual-portfolio/assets";
import { workerResponse, uuid } from "@/server/visual-portfolio/http";
import { readLimitedBody } from "@/server/visual-portfolio/media";
import { MODEL_LIMIT } from "@/contracts/visual-generation";
export const dynamic="force-dynamic";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return workerResponse(request,async()=>completeModelJob(uuid((await params).id),z.string().uuid().parse(request.headers.get("x-ans-lease")),await readLimitedBody(request,MODEL_LIMIT)));}
