import { test } from "node:test";
import assert from "node:assert/strict";
import { TripoAdapter,providerManifest,uploadGenerationInput,normalizeGenModels,toUpstreamModel } from "./tripo-adapter.mjs";
const options={model:"P2-20260801",faceCount:5000,texture:true,pbr:true,textureResolution:"4K"};
const success=data=>new Response(JSON.stringify({code:0,data}),{headers:{"content-type":"application/json"}});
test("maps visible texture choices to provider values",()=>{
 assert.equal(providerManifest(options,"image-token","image/png").texture_quality,"detailed");
 assert.equal(providerManifest({...options,textureResolution:"2K"},"image-token","image/jpeg").texture_quality,"standard");
 assert.equal(providerManifest({...options,texture:false},"image-token","image/png").pbr,false);
 assert.throws(()=>providerManifest({...options,model:"P2.0-Preview"},"image-token","image/png"));
});
test("preflight only logs in and reads configuration",async()=>{
 const paths=[];const adapter=new TripoAdapter({credential:async()=>({username:"test",password:"private-test"}),fetcher:async url=>{paths.push(new URL(url).pathname);return success(url.endsWith("/login")?{access_token:"private-test-token"}:{p:[{value:"Nexus-v2.0-20260801",credits:100}]});}});
 assert.equal((await adapter.preflight()).submission,false);assert.deepEqual(paths,["/api/auth/login","/api/gen-models"]);
});
test("normalizes Nexus P-series models while preserving legacy P2/P1 aliases",()=>{
 const catalog=normalizeGenModels({p:[{value:"Nexus-v2.0-20260801",credits:100,face_min:500,face_max:50000},{value:"Nexus-v1.0-20260214",face_min:500,face_max:20000}]});
 assert.ok(catalog.p.some(item=>item.value==="Nexus-v2.0-20260801"));
 assert.ok(catalog.p.some(item=>item.value==="P2-20260801"&&item.credits===100));
 assert.ok(catalog.p.some(item=>item.value==="P1-20260311"));
 assert.equal(toUpstreamModel("P2-20260801"),"Nexus-v2.0-20260801");
 assert.equal(toUpstreamModel("P1-20260311"),"Nexus-v1.0-20260214");
 assert.equal(toUpstreamModel("v3.1-20260211"),"v3.1-20260211");
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
test("supports direct octet-stream GLB responses from studio.tripo3d.uk",async()=>{
 const adapter=new TripoAdapter({fetcher:async()=>new Response(new Uint8Array([0x67,0x6c,0x54,0x46]),{headers:{"content-type":"application/octet-stream"}})});adapter.token="private-test-token";
 assert.equal((await adapter.download("task","glb")).length,4);
});
test("blocks untrusted signed download hosts",async()=>{
 const adapter=new TripoAdapter({fetcher:async()=>success({url:"https://unknown.example.invalid/model.glb"})});adapter.token="private-test-token";
 await assert.rejects(adapter.download("task","glb"),e=>e.code==="DOWNLOAD_FAILED");
});
test("allows the storage host observed in the signed-in provider response",async()=>{
 let requests=0;const adapter=new TripoAdapter({fetcher:async()=>++requests===1?success({url:"https://tripo-data.rg1.data.tripo3d.com/model.glb"}):new Response(new Uint8Array([1]))});adapter.token="private-test-token";
 assert.equal((await adapter.download("task","glb")).length,1);
});

test("maps all observed models and advanced options without confusing mesh families",()=>{
 const manifest=providerManifest({...options,model:"v3.1-20260211",faceCount:150000,quad:false,texture:false,pbr:false,generateParts:true,geometryQuality:"detailed"},"token","image/webp");
 assert.equal(manifest.geometry_quality,"detailed");assert.equal(manifest.generate_parts,true);assert.equal(manifest.quad,undefined);
 assert.equal(providerManifest({...options,model:"v3.1-20260211",quad:true,faceCount:150000},"token","image/png").quad,true);
 assert.equal(manifest.file.type,"webp");assert.equal(manifest.texture_quality,undefined);
 assert.throws(()=>providerManifest({...options,quad:true,faceCount:25001},"token","image/png"));
 assert.throws(()=>providerManifest({...options,model:"P1-20260311",quad:true},"token","image/png"));
 assert.equal(providerManifest({...options,model:"Nexus-v2.0-20260801",faceCount:50000,quad:false},"token","image/png").face_limit,50000);
 assert.equal(providerManifest({...options,textureResolution:"8K",autoFix:true},"token","image/png").texture_quality,"extreme");
 assert.equal(providerManifest({...options,autoFix:true},"token","image/png").enable_image_autofix,true);
 assert.equal(providerManifest({...options,model:"v2.5-20250123",textureResolution:"2K"},"token","image/png").geometry_quality,undefined);
});
test("text input contains no image token and multiview preserves empty slots",()=>{
 const text=providerManifest({...options,source:"text"},"a red toy robot");assert.equal(text.type,"text_to_model");assert.equal(text.prompt,"a red toy robot");assert.equal(text.file,undefined);
 const inputs=[{token:"front",mime:"image/png"},null,{token:"back",mime:"image/webp"},null];
 const multi=providerManifest({...options,source:"multiview"},inputs);assert.equal(multi.type,"multiview_to_model");assert.deepEqual(multi.files,[{type:"png",file_token:"front"},null,{type:"webp",file_token:"back"},null]);
 assert.throws(()=>providerManifest({...options,source:"multiview"},[null,...inputs.slice(1)]));
});
test("durable multiview envelope uploads original bytes in fixed view order",async()=>{
 const uploaded=[];const adapter={upload:async(bytes,mime)=>{uploaded.push({bytes:[...bytes],mime});return "token-"+uploaded.length;}};
 const input={format:"ans-tripo-input-v1",views:[{mime:"image/png",data:Buffer.from([1,2]).toString("base64")},null,{mime:"image/webp",data:Buffer.from([3,4]).toString("base64")},null]};
 const result=await uploadGenerationInput(adapter,Buffer.from(JSON.stringify(input)),"application/json",{source:"multiview"});
 assert.deepEqual(uploaded,[{bytes:[1,2],mime:"image/png"},{bytes:[3,4],mime:"image/webp"}]);assert.equal(result[1],null);assert.equal(result[2].token,"token-2");
});
test("invalid input is rejected before paid provider submission",async()=>{
 let calls=0;const adapter=new TripoAdapter({fetcher:async()=>{calls++;return success({task_id:"task"});}});adapter.token="test-only";
 await assert.rejects(adapter.submit({...options,source:"text"},""),error=>error.code==="INPUT_REJECTED");assert.equal(calls,0);
});

test("rejects invalid H-model capabilities before paid submission",async()=>{
 const invalid=[
  {model:"v2.5-20250123",textureResolution:"2K",faceCount:500001},
  {model:"v2.5-20250123",textureResolution:"2K",quad:true},
  {model:"v2.5-20250123",textureResolution:"2K",generateParts:true,texture:false,pbr:false},
  {model:"v2.5-20250123",textureResolution:"2K",geometryQuality:"detailed"},
  {model:"v3.0-20250812",faceCount:1000001},
  {model:"v3.1-20260211",faceCount:1500001},
  {model:"v3.1-20260211",quad:true,generateParts:true,texture:false,pbr:false}
 ];
 let calls=0;const adapter=new TripoAdapter({fetcher:async()=>{calls++;return success({task_id:"task"});}});adapter.token="test-only";
 for(const added of invalid)await assert.rejects(adapter.submit({...options,...added},"token","image/png"),error=>error.code==="INPUT_REJECTED");
 assert.equal(calls,0);
 for(const model of ["v3.0-20250812","v3.1-20260211"])
  assert.equal(providerManifest({...options,model,faceCount:2000000,geometryQuality:"detailed"},"token","image/png").face_limit,2000000);
 const v25=providerManifest({...options,model:"v2.5-20250123",textureResolution:"2K",faceCount:500000},"token","image/png");
 assert.equal(v25.geometry_quality,undefined);assert.equal(v25.texture_quality,undefined);
});
