import { test } from "node:test";
import assert from "node:assert/strict";
import { TripoAdapter,providerManifest } from "./tripo-adapter.mjs";
const options={model:"P2-20260801",faceCount:5000,texture:true,pbr:true,textureResolution:"4K"};
const success=data=>new Response(JSON.stringify({code:0,data}),{headers:{"content-type":"application/json"}});
test("maps visible texture choices to provider values",()=>{
 assert.equal(providerManifest(options,"image-token","image/png").texture_quality,"detailed");
 assert.equal(providerManifest({...options,textureResolution:"2K"},"image-token","image/jpeg").texture_quality,"standard");
 assert.equal(providerManifest({...options,texture:false},"image-token","image/png").pbr,false);
 assert.throws(()=>providerManifest({...options,model:"P2.0-Preview"},"image-token","image/png"));
});
test("preflight only logs in and reads configuration",async()=>{
 const paths=[];const adapter=new TripoAdapter({credential:async()=>({username:"test",password:"private-test"}),fetcher:async url=>{paths.push(new URL(url).pathname);return success(url.endsWith("/login")?{access_token:"private-test-token"}:{p:[{value:"P2-20260801"}]});}});
 assert.equal((await adapter.preflight()).submission,false);assert.deepEqual(paths,["/api/auth/login","/api/gen-models"]);
});
test("a lost submission is uncertain and never auto-retried",async()=>{
 let count=0;const adapter=new TripoAdapter({fetcher:async()=>{count++;throw new Error("network timeout");}});adapter.token="private-test-token";
 await assert.rejects(adapter.submit(options,"image-token","image/png"),e=>e.code==="SUBMISSION_UNCERTAIN");assert.equal(count,1);
});
test("rejects conversion before requesting a potentially charged export",async()=>{
 let count=0;const adapter=new TripoAdapter({fetcher:async()=>{count++;}});
 await assert.rejects(adapter.download("task","fbx"),e=>e.code==="MODEL_UNSUPPORTED");assert.equal(count,0);
});
test("downloads only allowlisted HTTPS URLs without forwarding credentials",async()=>{
 const calls=[];const adapter=new TripoAdapter({allowedHosts:["cdn.example.invalid"],fetcher:async(url,init)=>{calls.push({url:String(url),init});return calls.length===1?success({url:"https://cdn.example.invalid/model.glb"}):new Response(new Uint8Array([1,2,3]));}});adapter.token="private-test-token";
 assert.equal((await adapter.download("task","glb")).length,3);assert.ok(calls[0].init.headers.authorization);assert.equal(calls[1].init.headers,undefined);assert.equal(calls[1].init.redirect,"error");
});
test("blocks untrusted signed download hosts",async()=>{
 const adapter=new TripoAdapter({fetcher:async()=>success({url:"https://unknown.example.invalid/model.glb"})});adapter.token="private-test-token";
 await assert.rejects(adapter.download("task","glb"),e=>e.code==="DOWNLOAD_FAILED");
});
test("allows the storage host observed in the signed-in provider response",async()=>{
 let requests=0;const adapter=new TripoAdapter({fetcher:async()=>++requests===1?success({url:"https://tripo-data.rg1.data.tripo3d.com/model.glb"}):new Response(new Uint8Array([1]))});adapter.token="private-test-token";
 assert.equal((await adapter.download("task","glb")).length,1);
});
