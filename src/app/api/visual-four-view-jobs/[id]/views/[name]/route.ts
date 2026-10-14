import { websiteResponse } from "@/server/projects/website-http";
import { assertRequestActor } from "@/server/http/json";
import { fourViewFile } from "@/server/visual-portfolio/four-view-jobs";
import { uuid } from "@/server/visual-portfolio/http";
export async function GET(request:Request,{params}:{params:Promise<{id:string;name:string}>}){return websiteResponse(async owner=>{
 assertRequestActor(request,owner);const {id,name}=await params;const bytes=await fourViewFile(owner,uuid(id),name);
 return new Response(new Uint8Array(bytes),{headers:{"content-type":"image/png","cache-control":"private, no-store","x-content-type-options":"nosniff","cross-origin-resource-policy":"same-origin"}});
 });}
