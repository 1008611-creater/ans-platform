import { readFile, mkdir, rename, readdir, open, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import prompt from "../../src/contracts/four-view-prompt.json" with {type:"json"};
import sizes from "../../src/contracts/four-view-sizes.json" with {type:"json"};
export class FourViewProviderError extends Error {
 constructor(code,notSent=false){super(code);this.code=code;this.notSent=notSent;}
}
export async function openLuxCredential(){
 // Read in memory only; never copy credentials to a task journal or provider response log.
 const file=process.env.ANS_OPENLUX_CREDENTIAL_FILE||join(process.env.USERPROFILE||"", ".codex", "secrets", "openlux-image.env");
 try{
  const text=await readFile(file,"utf8");
  const values=Object.fromEntries(text.split(/\r?\n/).filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{const i=line.indexOf("=");return [line.slice(0,i),line.slice(i+1).trim().replace(/^(["'])(.*)\1$/,"$2")];}));
  return {base:values.OPENLUX_BASE_URL,key:values.OPENLUX_API_KEY};
 }catch{throw new FourViewProviderError("CREDENTIAL_UNAVAILABLE",true);}
}
export class FourViewAdapter {
 constructor({fetcher=fetch,readCredential=openLuxCredential,confirmed=process.env.ANS_FOUR_VIEW_API_CONFIRMED==="true"}={}){this.fetch=fetcher;this.credential=readCredential;this.confirmed=confirmed;}
 async generate({bytes,mime,aspectRatio,model}){
  if(!this.confirmed)throw new FourViewProviderError("REFERENCE_API_UNVERIFIED",true);
  if(!sizes[aspectRatio]||!bytes?.length||bytes.length>20_000_000||!["image/png","image/jpeg","image/webp"].includes(mime)||model!=="gpt-image-2.5-sunburst-c")throw new FourViewProviderError("INPUT_REJECTED",true);
  let credentials=await this.credential(),base;
  try{base=new URL(credentials.base);}catch{throw new FourViewProviderError("CHANNEL_NOT_CONFIGURED",true);}
  if(base.protocol!=="https:"||base.hostname!=="api.openlux.ai"||base.port||!["/","/v1","/v1/"].includes(base.pathname)||base.username||base.password||base.search||base.hash||typeof credentials.key!=="string"||!credentials.key.trim())throw new FourViewProviderError("CHANNEL_NOT_CONFIGURED",true);
  const form=new FormData();
  form.set("model",model);form.set("prompt",Object.entries(prompt).map(([key,value])=>`${key}: ${value}${key==="constraints"?` Canvas: ${sizes[aspectRatio].join("x")} pixels, aspect ratio ${aspectRatio}.`:""}`).join("\n"));
  form.set("size",sizes[aspectRatio].join("x"));form.set("n","1");form.set("quality","high");form.set("format","png");form.set("response_format","b64_json");
  form.set("image",new Blob([bytes],{type:mime}),"reference."+({"image/png":"png","image/jpeg":"jpg","image/webp":"webp"})[mime]);
  try{
   // Exactly one paid POST. No redirects, fallback model, or repeated generation.
   const response=await this.fetch("https://api.openlux.ai/v1/images/edits",{method:"POST",headers:{authorization:`Bearer ${credentials.key}`},body:form,redirect:"error",signal:AbortSignal.timeout(10*60*1000)});
   if(!response.ok)throw new FourViewProviderError(`PROVIDER_HTTP_${response.status}`);
   if(Number(response.headers.get("content-length"))>60_000_000)throw new Error();
   let length=0;const chunks=[];for await(const chunk of response.body){length+=chunk.length;if(length>60_000_000)throw new Error();chunks.push(chunk);}
   const value=JSON.parse(Buffer.concat(chunks).toString("utf8")),encoded=value.data?.[0]?.b64_json;
   if(value.data?.length!==1||typeof encoded!=="string"||!encoded.length||encoded.length>53_333_336||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw new Error();
   const output=Buffer.from(encoded,"base64");if(!output.length||output.length>40_000_000)throw new Error();return output;
  }catch(error){if(error instanceof FourViewProviderError)throw error;throw new FourViewProviderError("SUBMISSION_UNCERTAIN");}finally{credentials=null;}
 }
}
const validId=id=>/^[a-f0-9-]{36}$/.test(id);
export class FourViewJournal {
 constructor(root=process.env.ANS_FOUR_VIEW_JOURNAL||join(process.env.LOCALAPPDATA||".workbuddy","ANS","four-view-journal")){this.root=resolve(root);}
 async save(id,value){if(!validId(id))throw new Error("INVALID_JOB");await mkdir(this.root,{recursive:true});const target=join(this.root,id+".json"),temp=target+"."+randomUUID()+".tmp";const handle=await open(temp,"wx",0o600);try{await handle.writeFile(JSON.stringify(value));await handle.sync();}finally{await handle.close();}await rename(temp,target);}
 async intent(job){await this.save(job.id,{id:job.id,leaseToken:job.leaseToken,intent:true,done:false});}
 async result(job,bytes){const target=join(this.root,job.id+".grid"),temp=target+"."+randomUUID()+".tmp";const handle=await open(temp,"wx",0o600);try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}await rename(temp,target);}
 async finish(job){await this.save(job.id,{id:job.id,leaseToken:job.leaseToken,done:true});await unlink(join(this.root,job.id+".grid")).catch(()=>{});}
 async pause(job,code){await this.save(job.id,{id:job.id,leaseToken:job.leaseToken,intent:true,done:false,blocked:true,code});}
 async recover(api){
  await mkdir(this.root,{recursive:true});
  for(const name of await readdir(this.root)){
   if(!/^[a-f0-9-]{36}\.json$/.test(name))continue;
   try{const job=JSON.parse(await readFile(join(this.root,name),"utf8"));if(job.id!==name.slice(0,-5)||!validId(job.id)||!validId(job.leaseToken)||job.done||job.blocked||(job.retryAt??0)>Date.now())continue;
    let bytes;try{bytes=await readFile(join(this.root,job.id+".grid"));}catch{continue;}
    if(bytes.length===0||bytes.length>40_000_000)continue;
    try{await api(`/four-views/${job.id}/complete`,{body:bytes,binary:true,lease:job.leaseToken});await this.finish(job);}catch(error){if(["GRID_DIMENSIONS_INVALID","INVALID_IMAGE","GRID_TOO_LARGE","LEASE_LOST"].includes(error.message))await this.pause(job,error.message);else await this.save(job.id,{...job,retryAt:Date.now()+300000});}
   }catch{/* Keep uncertain paid outputs for operator review. Never resubmit. */}
  }
 }
}
export async function processFourViewJob(job,{api,adapter=new FourViewAdapter(),journal=new FourViewJournal()}){
 let heartbeatFailure=false,intentSaved=false;
 const event=body=>api(`/four-views/${job.id}/event`,{body:{leaseToken:job.leaseToken,...body}});
 const timer=setInterval(()=>{void event({type:"heartbeat"}).catch(()=>{heartbeatFailure=true;});},20000);
 try{
  const bytes=await api(`/four-views/${job.id}/input`,{method:"GET",lease:job.leaseToken,binary:true});
  if(heartbeatFailure)throw new FourViewProviderError("LEASE_LOST",true);
  await journal.intent(job);intentSaved=true;
  const grid=await adapter.generate({bytes,mime:job.inputMime,aspectRatio:job.aspectRatio,model:job.model});
  // Persist paid bytes before any completion request, including after lease loss.
  await journal.result(job,grid);
  for(let attempt=0;attempt<3;attempt++){try{await api(`/four-views/${job.id}/complete`,{body:grid,binary:true,lease:job.leaseToken});await journal.finish(job);return true;}catch(error){if(["GRID_DIMENSIONS_INVALID","INVALID_IMAGE","GRID_TOO_LARGE","LEASE_LOST"].includes(error.message)){await journal.pause(job,error.message);throw new FourViewProviderError(error.message);}if(attempt===2)throw new FourViewProviderError("PERSIST_FAILED");}}
 }catch(error){await event({type:error.notSent||!intentSaved?"notSent":"review",...(error.code==="GRID_DIMENSIONS_INVALID"?{errorCode:error.code}:{})}).catch(()=>{});return false;}finally{clearInterval(timer);}
}
