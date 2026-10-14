import { mkdir, writeFile, rename, readdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { TripoAdapter, uploadGenerationInput } from "./tripo-adapter.mjs";
const server=new URL(process.env.ANS_WORKER_SERVER||"http://localhost:3096");
if(server.username||server.password||server.search||server.hash||server.pathname!=="/"||!(server.protocol==="https:"||(server.protocol==="http:"&&["localhost","127.0.0.1"].includes(server.hostname))))throw new Error("INVALID_SERVER");
const key=process.env.ANS_VISUAL_WORKER_KEY;
const mode=process.argv[2]||"preflight";
const adapter=new TripoAdapter({allowedHosts:(process.env.ANS_TRIPO_DOWNLOAD_HOSTS||"").split(",").map(x=>x.trim()).filter(Boolean)});
const journal=resolve(process.env.ANS_WORKER_JOURNAL||join(process.env.LOCALAPPDATA||".workbuddy","ANS","tripo-journal"));
const workerId=process.env.ANS_WORKER_ID||"tripo-local-worker";
async function checkpoint(id,value){await mkdir(journal,{recursive:true});const target=join(journal,id+".json"),temp=target+"."+randomUUID()+".tmp";await writeFile(temp,JSON.stringify(value),{flag:"wx"});await rename(temp,target);}
async function api(path,{method="POST",body,lease,binary=false}={}){
 const response=await fetch(new URL(`/api/visual-worker${path}`,server),{method,headers:{authorization:`Bearer ${key}`,...(lease?{"x-ans-lease":lease}:{}),...(body&&!binary?{"content-type":"application/json"}:{})},body:binary?body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
 if(!response.ok){let envelope;try{envelope=await response.json();}catch{}const code=envelope?.error?.code;throw new Error(["MODEL_UNSUPPORTED","INVALID_MODEL","LEASE_LOST"].includes(code)?code:"ANS_REQUEST_FAILED");}
 if(binary&&method==="GET")return Buffer.from(await response.arrayBuffer());
 const envelope=await response.json();if(envelope.ok!==true)throw new Error("ANS_REQUEST_FAILED");return envelope.data;
}
async function recover(){await mkdir(journal,{recursive:true});for(const name of await readdir(journal)){if(!/^[a-f0-9-]{36}\.json$/.test(name))continue;const value=JSON.parse(await readFile(join(journal,name),"utf8"));if(value.taskId&&!value.done)await api(`/jobs/${name.slice(0,-5)}/recover`,{body:{providerTaskId:value.taskId,workerId}});}}
async function work(job){
 let submitted=!!job.providerTaskId,taskId=job.providerTaskId,stopped=false,heartbeatFailure=false;
 const stopHeartbeat=new AbortController();
 const event=(body)=>api(`/jobs/${job.id}/event`,{body:{leaseToken:job.leaseToken,...body}});
 const heartbeat=(async()=>{while(!stopped){await delay(20000,undefined,{signal:stopHeartbeat.signal}).catch(()=>{});if(stopped)break;try{await event({type:"heartbeat"});}catch{heartbeatFailure=true;break;}}})();
 try{
  if(!taskId){const bytes=await api(`/jobs/${job.id}/input`,{method:"GET",lease:job.leaseToken,binary:true});const catalog=await adapter.request("/api/gen-models");
   const current=[...(catalog.h??[]),...(catalog.p??[])].find(item=>item.value===job.options.model);
   if(!current||job.options.faceCount<current.face_min||job.options.faceCount>(job.options.quad?current.quad_max:current.face_max))throw new Error("MODEL_UNSUPPORTED");
   const token=await uploadGenerationInput(adapter,bytes,job.inputMime,job.options);
   if(heartbeatFailure)throw new Error("LEASE_LOST");
   const transition=await event({type:"stage",stage:"submit"});if(transition?.cancelled)return;
   submitted=true;await checkpoint(job.id,{intent:true,workerId});
   taskId=await adapter.submit(job.options,token,job.inputMime);
   await checkpoint(job.id,{taskId,workerId});
   // Only the local acknowledgement retries; provider submission is called once.
   let accepted=false;for(let attempt=0;attempt<3;attempt++){try{await event({type:"accepted",providerTaskId:taskId});accepted=true;break;}catch{await delay(1000);}}
   if(!accepted)throw new Error("ACK_UNCERTAIN");
  }
  const deadline=Date.now()+45*60*1000;let result;
  while(Date.now()<deadline){if(heartbeatFailure)throw new Error("LEASE_LOST");result=await adapter.status(taskId);if(result.status==="success")break;if(["failed","banned","expired","cancelled"].includes(result.status))throw new Error("PROVIDER_FAILED");await delay(5000);}
  if(result?.status!=="success")throw new Error("WORKER_INTERRUPTED");
  await event({type:"stage",stage:"download"});
  const bytes=await adapter.download(taskId,result.native_format);
  await event({type:"stage",stage:"persist"});
  let completed=false;for(let attempt=0;attempt<3;attempt++){try{await api(`/jobs/${job.id}/complete`,{body:bytes,binary:true,lease:job.leaseToken});completed=true;break;}catch(error){if(["MODEL_UNSUPPORTED","INVALID_MODEL","LEASE_LOST"].includes(error.message))throw error;await delay(1000);}}
  if(!completed)throw new Error("DOWNLOAD_FAILED");await checkpoint(job.id,{taskId,workerId,done:true});console.log("Model saved to ANS.");return true;
 }catch(error){const allowed=["LOGIN_REQUIRED","INPUT_REJECTED","PROVIDER_FAILED","SUBMISSION_UNCERTAIN","DOWNLOAD_FAILED","MODEL_UNSUPPORTED","WORKER_INTERRUPTED"];const code=allowed.includes(error.code||error.message)?error.code||error.message:submitted?"WORKER_INTERRUPTED":"INPUT_REJECTED";
  const uncertain=submitted&&(!taskId||code!=="PROVIDER_FAILED");
  await event({type:uncertain?"review":"failed",errorCode:code}).catch(()=>{});console.log(uncertain?"Task paused for review; no repeated submission.":"Task stopped. Check its status in ANS.");return false;
 }finally{stopped=true;stopHeartbeat.abort();await heartbeat;}
}
try{
 const readiness=await adapter.preflight();console.log(JSON.stringify(readiness));
 if(mode==="start"||mode==="once"){
  if(process.env.ANS_TRIPO_ALLOW_SUBMISSIONS!=="true"||!key||key.length<32)throw new Error("WORKER_NOT_ENABLED");
  if(mode==="once"){
   const jobId=process.env.ANS_WORKER_JOB_ID;
   if(!/^[a-f0-9-]{36}$/.test(jobId||""))throw new Error("INVALID_JOB");
   const models=await adapter.request("/api/gen-models");
   if(models.p?.find(item=>item.value==="P2-20260801")?.credits!==100)throw new Error("PRICE_CHANGED");
   const before=(await adapter.request("/api/auth/me")).balance;
   if(!Number.isFinite(before)||before<100)throw new Error("BALANCE_UNAVAILABLE");
   const job=await api("/claim",{body:{workerId,jobId}});
   if(!job||job.id!==jobId)throw new Error("JOB_UNAVAILABLE");
   const completed=await work(job);
   const after=(await adapter.request("/api/auth/me")).balance;
   if(process.env.ANS_WORKER_TEST_EVIDENCE)await writeFile(resolve(process.env.ANS_WORKER_TEST_EVIDENCE),JSON.stringify({jobId,balanceBefore:before,balanceAfter:after,creditsSpent:before-after,completedAt:new Date().toISOString()},null,2));
   console.log(JSON.stringify({jobId,balanceBefore:before,balanceAfter:after,creditsSpent:before-after}));
   process.exitCode=completed?0:1;
  }else{
  console.log("Local task service ready.");
  for(;;){await recover();const job=await api("/claim",{body:{workerId}});if(job)await work(job);else await delay(5000);}
  }
 }else if(mode!=="preflight")throw new Error("INVALID_MODE");
}catch{console.error("Service could not start or lost its connection. Check local credentials and service configuration.");process.exitCode=1;}
