import { websiteResponse } from "@/server/projects/website-http";
import { assertRequestActor,assertSameOrigin } from "@/server/http/json";
import { publishedWebsite,withdrawVisualWebsite } from "@/server/visual-portfolio/publication";
import { uuid } from "@/server/visual-portfolio/http";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){return websiteResponse(async owner=>{assertRequestActor(request,owner);return publishedWebsite(owner,uuid((await params).id));});}
export async function DELETE(request:Request,{params}:Context){return websiteResponse(async owner=>{assertRequestActor(request,owner);assertSameOrigin(request);return withdrawVisualWebsite(owner,uuid((await params).id));});}
