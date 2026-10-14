import { assertRequestActor, assertSameOrigin } from "@/server/http/json";
import { websiteResponse } from "@/server/projects/website-http";
import { getModelJob, cancelModelJob } from "@/server/visual-portfolio/jobs";
import { uuid } from "@/server/visual-portfolio/http";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){return websiteResponse(async owner=>{assertRequestActor(request,owner);return getModelJob(owner,uuid((await params).id));});}
export async function DELETE(request:Request,{params}:Context){return websiteResponse(async owner=>{assertRequestActor(request,owner);assertSameOrigin(request);return cancelModelJob(owner,uuid((await params).id));});}
