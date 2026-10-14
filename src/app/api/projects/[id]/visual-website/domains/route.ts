import { websiteResponse } from "@/server/projects/website-http";
import { assertRequestActor,readSameOriginJson } from "@/server/http/json";
import { listWebsiteDomains,bindWebsiteDomain } from "@/server/visual-portfolio/domains";
import { uuid } from "@/server/visual-portfolio/http";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){return websiteResponse(async owner=>{assertRequestActor(request,owner);return listWebsiteDomains(owner,uuid((await params).id));});}
export async function POST(request:Request,{params}:Context){return websiteResponse(async owner=>{assertRequestActor(request,owner);return bindWebsiteDomain(owner,uuid((await params).id),await readSameOriginJson(request));});}
