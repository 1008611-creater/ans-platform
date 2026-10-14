import { assertRequestActor } from "@/server/http/json";
import { websiteResponse } from "@/server/projects/website-http";
import { modelAccess } from "@/server/visual-portfolio/assets";
import { uuid } from "@/server/visual-portfolio/http";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return websiteResponse(async owner=>{assertRequestActor(request,owner);return modelAccess(owner,uuid((await params).id));});}
