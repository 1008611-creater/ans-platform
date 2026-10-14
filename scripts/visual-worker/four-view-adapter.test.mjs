import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { FourViewAdapter, FourViewJournal, processFourViewJob } from "./four-view-adapter.mjs";
const input={bytes:Buffer.from("reference"),mime:"image/png",aspectRatio:"16:9",model:"gpt-image-2.5-sunburst-c"};
const credentials=async()=>({base:"https://api.openlux.ai",key:"test-key"});
test("one pinned paid request uses the reference and never falls back",async()=>{
 const calls=[];const adapter=new FourViewAdapter({confirmed:true,readCredential:credentials,fetcher:async(url,init)=>{calls.push({url,init});return Response.json({data:[{b64_json:Buffer.from("grid").toString("base64")}]});}});
 assert.equal((await adapter.generate(input)).toString(),"grid");assert.equal(calls.length,1);const {url,init}=calls[0];assert.equal(url,"https://api.openlux.ai/v1/images/edits");assert.equal(init.redirect,"error");assert.equal(init.body.get("size"),"3840x2160");assert.equal(init.body.get("n"),"1");assert.equal(init.body.get("model"),input.model);assert.ok(init.body.get("image") instanceof Blob);assert.ok(init.body.get("prompt").length<=1000);assert.match(init.body.get("prompt"),/3840x2160 pixels, aspect ratio 16:9/);
});
test("unverified configuration or foreign host cannot transmit credentials",async()=>{
 let calls=0;const fetcher=async()=>{calls++;};
 for(const [confirmed,base]of [[false,"https://api.openlux.ai"],[true,"https://other.example.invalid"],[true,"https://api.openlux.ai/redirect"],[true,"https://api.openlux.ai?key=anything"]])await assert.rejects(new FourViewAdapter({confirmed,fetcher,readCredential:async()=>({base,key:"test-key"})}).generate(input),e=>e.notSent===true);
 assert.equal(calls,0);
});
test("a missing reply or invalid payload never generates twice",async()=>{
 for(const fetcher of [async()=>{throw new Error("timeout");},async()=>Response.json({data:[{url:"https://other.example.invalid/image"}]})]){
  let calls=0;const adapter=new FourViewAdapter({confirmed:true,readCredential:credentials,fetcher:async(...args)=>{calls++;return fetcher(...args);}});await assert.rejects(adapter.generate(input),e=>e.notSent===false);assert.equal(calls,1);
 }
});
test("saved paid bytes recover after restart without another provider call",async()=>{
 const root=await mkdtemp(join(tmpdir(),"ans-four-view-test-"));const journal=new FourViewJournal(root),job={id:randomUUID(),leaseToken:randomUUID(),inputMime:"image/png",aspectRatio:"16:9",model:input.model};let generates=0,completions=0;
 try{
  const api=async(path,options)=>{if(path.endsWith("/input"))return input.bytes;if(path.endsWith("/complete")){completions++;assert.equal((await readFile(join(root,job.id+".grid"))).toString(),"paid-output");throw new Error("connection lost");}return options.body;};
  assert.equal(await processFourViewJob(job,{api,journal,adapter:{generate:async()=>{generates++;return Buffer.from("paid-output");}}}),false);assert.equal(generates,1);assert.equal(completions,3);
  await new FourViewJournal(root).recover(async(path,options)=>{assert.ok(path.endsWith("/complete"));assert.equal(options.body.toString(),"paid-output");});assert.equal(generates,1);assert.equal(JSON.parse(await readFile(join(root,job.id+".json"))).done,true);assert.ok(!(await readdir(root)).includes(job.id+".grid"));
 }finally{assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep+"ans-four-view-test-"));await rm(root,{recursive:true});}
});
test("wrong dimensions retain output and pause completion retries",async()=>{
 const root=await mkdtemp(join(tmpdir(),"ans-four-view-test-"));const journal=new FourViewJournal(root),job={id:randomUUID(),leaseToken:randomUUID(),inputMime:"image/png",aspectRatio:"16:9",model:input.model};let attempts=0;const events=[];
 try{await processFourViewJob(job,{journal,adapter:{generate:async()=>Buffer.from("paid-output")},api:async(path,options)=>{if(path.endsWith("/input"))return input.bytes;if(path.endsWith("/complete")){attempts++;throw new Error("GRID_DIMENSIONS_INVALID");}events.push(options.body);}});assert.equal(attempts,1);assert.equal(events[0].errorCode,"GRID_DIMENSIONS_INVALID");assert.equal(JSON.parse(await readFile(join(root,job.id+".json"))).blocked,true);await journal.recover(async()=>{throw new Error("must not retry");});assert.equal((await readFile(join(root,job.id+".grid"))).toString(),"paid-output");}finally{assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep+"ans-four-view-test-"));await rm(root,{recursive:true});}
});
