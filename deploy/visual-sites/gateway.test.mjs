import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { gatewayConfig,servePublication } from "./worker.mjs";
import { createPublicationServer } from "./server.mjs";
const env={ANS_API_ORIGIN:"https://ans.example.invalid",ANS_PUBLICATION_ORIGIN:"https://sites.example.invalid",ANS_PUBLICATION_KEY:"test-publication-key-".repeat(3)};
const html=()=>new Response("<html>saved model</html>",{headers:{"content-type":"text/html","set-cookie":"private=secret","x-internal-path":"private"}});
test("rejects invalid or shared origins and incomplete keys",()=>{
 for(const value of ["https://user:secret@ans.example.invalid","https://ans.example.invalid/path","http://untrusted.example.invalid"])
  assert.throws(()=>gatewayConfig({...env,ANS_API_ORIGIN:value}));
 assert.throws(()=>gatewayConfig({...env,ANS_PUBLICATION_ORIGIN:env.ANS_API_ORIGIN}));
 assert.throws(()=>gatewayConfig({...env,ANS_PUBLICATION_KEY:"short"}));
 assert.equal(gatewayConfig({...env,ANS_API_ORIGIN:"http://ans-platform-app:3000"}).api.hostname,"ans-platform-app");
});
test("routes the saved slug and never forwards visitor cookies or arbitrary headers",async()=>{
 let captured;const r=await servePublication(new Request("https://sites.example.invalid/sites/demo-model?token=ignored",{headers:{cookie:"user=private",authorization:"visitor-token","x-forwarded-host":"evil.invalid"}}),env,async(url,options)=>{captured={url,options};return html();});
 assert.equal(r.status,200);assert.equal(captured.url.href,"https://ans.example.invalid/api/visual-publication?slug=demo-model");
 assert.deepEqual(captured.options.headers,{authorization:`Bearer ${env.ANS_PUBLICATION_KEY}`});assert.equal(captured.options.redirect,"error");
 assert.equal(r.headers.get("set-cookie"),null);assert.equal(r.headers.get("x-internal-path"),null);assert.equal(r.headers.get("cache-control"),"no-store");
 assert.match(r.headers.get("content-security-policy"),/sandbox allow-scripts/);assert.ok(!r.headers.get("content-security-policy").includes("allow-same-origin"));
 assert.equal(await r.text(),"<html>saved model</html>");
});
test("requires custom-domain mode and queries only the requested hostname",async()=>{
 let calls=0;const fetcher=async(url)=>{calls++;assert.equal(url.searchParams.get("hostname"),"portfolio.customer.invalid");return html();};
 assert.equal((await servePublication(new Request("https://portfolio.customer.invalid/"),env,fetcher)).status,404);assert.equal(calls,0);
 assert.equal((await servePublication(new Request("https://portfolio.customer.invalid/"),{...env,ANS_CUSTOM_DOMAINS_ENABLED:"true"},fetcher)).status,200);assert.equal(calls,1);
 assert.equal((await servePublication(new Request("https://portfolio.customer.invalid/private"),{...env,ANS_CUSTOM_DOMAINS_ENABLED:"true"},fetcher)).status,404);
});
test("refuses mutations and unrelated paths before reading backend data",async()=>{
 const fetcher=()=>{throw new Error("should not reach backend");};
 assert.equal((await servePublication(new Request("https://sites.example.invalid/sites/demo-model",{method:"POST"}),env,fetcher)).status,405);
 for(const path of ["/","/api/auth/session","/sites/%2fsecret","/sites/a"]){
  assert.equal((await servePublication(new Request("https://sites.example.invalid"+path),env,fetcher)).status,404);
 }
});
test("withdrawal is visible immediately and upstream error bodies are hidden",async()=>{
 const request=new Request("https://sites.example.invalid/sites/demo-model");
 for(const status of [401,404,500]){
  const r=await servePublication(request,env,async()=>new Response("private error",{status}));assert.equal(r.status,status===404?404:503);assert.equal(await r.text(),"");
 }
 assert.equal((await servePublication(request,env,async()=>{throw new Error("network");})).status,503);
 assert.equal((await servePublication(request,env,async()=>new Response("private json",{headers:{"content-type":"application/json"}}))).status,503);
});
test("HEAD returns the same access decision without the model body",async()=>{
 const r=await servePublication(new Request("https://sites.example.invalid/sites/demo-model",{method:"HEAD"}),env,async()=>html());assert.equal(r.status,200);assert.equal(await r.text(),"");
});
test("Node gateway supports health checks and denies public authentication routes",async()=>{
 const server=createPublicationServer(env);server.listen(0,"127.0.0.1");await once(server,"listening");
 try{const base=`http://127.0.0.1:${server.address().port}`;assert.equal((await fetch(base+"/healthz")).status,200);assert.equal((await fetch(base+"/api/auth/session")).status,404);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
