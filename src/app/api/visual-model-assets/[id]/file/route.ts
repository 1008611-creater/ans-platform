import { signedModelBytes } from "@/server/visual-portfolio/assets";
import { uuid } from "@/server/visual-portfolio/http";
export const dynamic="force-dynamic";
const headers={"content-type":"model/gltf-binary","cache-control":"private, no-store","access-control-allow-origin":"*","cross-origin-resource-policy":"cross-origin","x-content-type-options":"nosniff","content-disposition":"inline; filename=model.glb"};
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{return new Response(await signedModelBytes(uuid((await params).id),new URL(request.url).searchParams.get("token")??""),{headers});}
 catch{return new Response(null,{status:404,headers:{"cache-control":"no-store","access-control-allow-origin":"*"}});}
}
