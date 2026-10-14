/** Shared publication gateway for the existing server and optional Cloudflare Worker. */
const CSP="sandbox allow-scripts allow-popups; default-src 'none'; script-src 'unsafe-inline' data:; style-src 'unsafe-inline'; img-src data: blob:; connect-src data: blob:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const HOSTNAME=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
function origin(value,internal=false){
 const url=new URL(value);
 if(url.username||url.password||url.search||url.hash||url.pathname!=="/")throw new Error("INVALID_ORIGIN");
 const local=["localhost","127.0.0.1","[::1]"].includes(url.hostname);
 if(url.protocol!=="https:"&&!(url.protocol==="http:"&&(local||(internal&&url.hostname==="ans-platform-app"))))throw new Error("INVALID_ORIGIN");
 return url;
}
export function gatewayConfig(env){
 const api=origin(env.ANS_API_ORIGIN,true),publication=origin(env.ANS_PUBLICATION_ORIGIN);
 if(api.origin===publication.origin||typeof env.ANS_PUBLICATION_KEY!=="string"||env.ANS_PUBLICATION_KEY.length<32)throw new Error("INVALID_GATEWAY_CONFIG");
 return {api,publication};
}
function result(status,body=null,extra={}){return new Response(body,{status,headers:{"cache-control":"no-store","referrer-policy":"no-referrer","permissions-policy":"camera=(), microphone=(), geolocation=()","x-content-type-options":"nosniff","content-security-policy":CSP,...extra}});}
export async function servePublication(request,env,fetcher=fetch){
 let configured;try{configured=gatewayConfig(env);}catch{return result(503);}
 if(!["GET","HEAD"].includes(request.method))return result(405,null,{allow:"GET, HEAD"});
 const incoming=new URL(request.url),backend=new URL("/api/visual-publication",configured.api);
 if(incoming.hostname===configured.publication.hostname){
  const match=incoming.pathname.match(/^\/sites\/([a-z0-9][a-z0-9-]{1,46}[a-z0-9])\/?$/);
  if(!match)return result(404);backend.searchParams.set("slug",match[1]);
 }else{
  if(env.ANS_CUSTOM_DOMAINS_ENABLED!=="true"||incoming.pathname!=="/"||!HOSTNAME.test(incoming.hostname))return result(404);
  backend.searchParams.set("hostname",incoming.hostname);
 }
 let response;try{response=await fetcher(backend,{headers:{authorization:`Bearer ${env.ANS_PUBLICATION_KEY}`},redirect:"error",signal:AbortSignal.timeout(30000)});}catch{return result(503);}
 if(!response.ok){await response.body?.cancel();return result(response.status===404?404:503);}
 if(!response.headers.get("content-type")?.toLowerCase().startsWith("text/html")){await response.body?.cancel();return result(503);}
 if(request.method==="HEAD"){await response.body?.cancel();return result(200);}
 return result(200,response.body,{"content-type":"text/html; charset=utf-8"});
}
const worker={fetch(request,env){return servePublication(request,env);}};
export default worker;
