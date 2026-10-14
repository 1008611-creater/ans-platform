import { createServer } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { gatewayConfig,servePublication } from "./worker.mjs";
export function createPublicationServer(env=process.env){
 gatewayConfig(env);
 return createServer({headersTimeout:10000,requestTimeout:30000},async(request,response)=>{
  try{
   if(!request.headers.host||request.headers.host.length>260)throw new Error("INVALID_HOST");
   const url=new URL(request.url||"/",`http://${request.headers.host}`);
   if(url.hostname!==new URL(`http://${request.headers.host}`).hostname)throw new Error("INVALID_HOST");
   if(url.pathname==="/healthz"&&["GET","HEAD"].includes(request.method)){
    response.writeHead(200,{"content-type":"text/plain","cache-control":"no-store"});response.end(request.method==="HEAD"?undefined:"ok");return;
   }
   const result=await servePublication(new Request(url,{method:request.method}),env);
   response.writeHead(result.status,Object.fromEntries(result.headers));
   if(result.body)await pipeline(Readable.fromWeb(result.body),response);else response.end();
  }catch{
   if(response.headersSent)response.destroy();else{response.writeHead(503,{"cache-control":"no-store"});response.end();}
  }
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const port=Number(process.env.PORT||3102);if(!Number.isInteger(port)||port<1||port>65535)throw new Error("INVALID_PORT");
  createPublicationServer().listen(port,process.env.ANS_GATEWAY_BIND||"127.0.0.1",()=>console.log("Publication gateway ready."));
 }catch{console.error("Publication gateway configuration is incomplete.");process.exitCode=1;}
}
