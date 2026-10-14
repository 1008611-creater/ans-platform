import { websiteResponse } from "@/server/projects/website-http";
import { assertRequestActor,assertSameOrigin } from "@/server/http/json";
import { verifyWebsiteDomain,pauseWebsiteDomain } from "@/server/visual-portfolio/domains";
import { uuid } from "@/server/visual-portfolio/http";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function POST(request:Request,{params}:Context){return websiteResponse(async owner=>{assertRequestActor(request,owner);assertSameOrigin(request);return verifyWebsiteDomain(owner,uuid((await params).id));});}
export async function DELETE(request:Request,{params}:Context){return websiteResponse(async owner=>{assertRequestActor(request,owner);assertSameOrigin(request);return pauseWebsiteDomain(owner,uuid((await params).id));});}
