import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { bootstrapScript } from "./frontend.mjs";
function storage() {
  const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key),key:index=>[...map.keys()][index]??null,get length(){return map.size;}};
}
function browser(owner,local,session) {
  const channels=[];const requests=[];const window={localStorage:local,sessionStorage:session,
    BroadcastChannel:class {constructor(name){channels.push(name);}},fetch:(input,options)=>{requests.push({input,options});return Promise.resolve();}};
  const location={href:"https://easel.example.test/",origin:"https://easel.example.test"};
  const script=bootstrapScript(owner).slice("<script>".length,-"</script>".length);
  runInNewContext(script,{window,location,URL,Headers,Request});return {window,channels,requests};
}
test("drafts, conversations and storage clear are confined to the loaded account",()=>{
  const local=storage(),session=storage();local.setItem("easel_sessions","legacy-private-data");
  const a=browser("user-a",local,session),b=browser("user-b",local,session);
  assert.equal(a.window.localStorage.getItem("easel_sessions"),null);
  a.window.localStorage.setItem("easel_sessions","draft-a");a.window.sessionStorage.setItem("turn","turn-a");
  assert.equal(b.window.localStorage.getItem("easel_sessions"),null);assert.equal(b.window.sessionStorage.getItem("turn"),null);
  b.window.localStorage.setItem("easel_sessions","draft-b");a.window.localStorage.clear();
  assert.equal(b.window.localStorage.getItem("easel_sessions"),"draft-b");assert.equal(b.window.localStorage.length,1);assert.equal(b.window.localStorage.key(0),"easel_sessions");
  assert.equal(local.getItem("easel_sessions"),"legacy-private-data");
});
test("cross-tab channels and API requests retain the original owner",async()=>{
  const local=storage(),session=storage();const a=browser("user-a",local,session),b=browser("user-b",local,session);
  new a.window.BroadcastChannel("easel-session");new b.window.BroadcastChannel("easel-session");assert.notEqual(a.channels[0],b.channels[0]);
  await a.window.fetch("/api/env",{headers:{"X-ANS-Easel-Workspace":"user-b"}});assert.equal(a.requests[0].options.headers.get("X-ANS-Easel-Workspace"),"user-a");
  await a.window.fetch("https://provider.example.test/models");assert.equal(a.requests[1].options,undefined);
});
test("a subject cannot break out of the injected script",()=>{
  const payload="</script><script>alert(1)</script>";const value=bootstrapScript(payload);
  assert.equal(value.split("</script>").length,2);const a=browser(payload,storage(),storage());assert(a.window.localStorage);
});
