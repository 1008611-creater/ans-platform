import { workerResponse,uuid } from "@/server/visual-portfolio/http";
import { fourViewInput } from "@/server/visual-portfolio/four-view-jobs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return workerResponse(request,async()=>{
 const input=await fourViewInput(uuid((await params).id),uuid(request.headers.get("x-ans-lease")??""));
 return new Response(new Uint8Array(input.bytes),{headers:{"content-type":input.mime,"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
 });}
