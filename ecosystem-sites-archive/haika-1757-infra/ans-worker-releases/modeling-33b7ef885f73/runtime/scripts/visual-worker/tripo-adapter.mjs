import models from "../../src/contracts/tripo-models.json" with {type:"json"};
import { execFile } from "node:child_process";
import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { isAbsolute } from "node:path";
import { promisify } from "node:util";
const run=promisify(execFile);
export const DEFAULT_TRIPO_BASE_URL="https://studio.tripo3d.uk";
export const UPSTREAM_MODEL_MAP={
 "P2-20260801":"Nexus-v2.0-20260801",
 "P1-20260311":"Nexus-v1.0-20260214"
};
export class ProviderError extends Error {constructor(code){super(code);this.code=code;}}
/** Linux/macOS services mount a private JSON secret; Windows keeps its DPAPI default. */
export async function readCredentialFile(file){
 let handle;
 try {
  if(!isAbsolute(file))throw new Error();
  handle=await open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  const info=await handle.stat();
  if(!info.isFile()||info.size<2||info.size>16384||(process.platform!=="win32"&&(info.mode&0o077)!==0))throw new Error();
  const value=JSON.parse(await handle.readFile("utf8"));
  if(typeof value.username!=="string"||!value.username.trim()||value.username.length>1024||typeof value.password!=="string"||!value.password||value.password.length>4096)throw new Error();
  return {username:value.username,password:value.password,...(typeof value.baseUrl==="string"&&value.baseUrl.trim()?{baseUrl:value.baseUrl.trim().replace(/\/+$/,"")}:{})};
 }catch{throw new ProviderError("CREDENTIAL_UNAVAILABLE");}finally{await handle?.close();}
}
export async function readCredential(){
 if(process.env.ANS_TRIPO_CREDENTIAL_FILE)return readCredentialFile(process.env.ANS_TRIPO_CREDENTIAL_FILE);
 if(process.platform!=="win32"){
  const home=process.env.HOME||"";
  if(home)return readCredentialFile(`${home}/.codex/secrets/tripo-relay.json`);
  throw new ProviderError("CREDENTIAL_UNAVAILABLE");
 }
 const script=`$ErrorActionPreference='Stop'; $OutputEncoding=[System.Text.UTF8Encoding]::new($false); [Console]::OutputEncoding=$OutputEncoding; $p=Join-Path $env:LOCALAPPDATA 'ANS/credentials/tripo3d.credential.xml'; $c=Import-Clixml -LiteralPath $p; @{username=$c.UserName;password=$c.GetNetworkCredential().Password}|ConvertTo-Json -Compress`;
 try {const result=await run("powershell.exe",["-NoProfile","-NonInteractive","-Command",script],{windowsHide:true,encoding:"utf8",maxBuffer:20000});const value=JSON.parse(result.stdout);if(!value.username||!value.password)throw new Error();return value;}catch{throw new ProviderError("CREDENTIAL_UNAVAILABLE");}
}
export function toUpstreamModel(modelId){
 return UPSTREAM_MODEL_MAP[modelId]||modelId;
}
export function normalizeGenModels(data){
 if(!data||typeof data!=="object")return data;
 const pList=Array.isArray(data.p)?[...data.p]:[];
 const p2=pList.find(item=>item?.value==="Nexus-v2.0-20260801");
 if(p2&&!pList.some(item=>item?.value==="P2-20260801")){
  pList.push({...p2,value:"P2-20260801",upstream_value:"Nexus-v2.0-20260801"});
 }
 const p1=pList.find(item=>item?.value==="Nexus-v1.0-20260214");
 if(p1&&!pList.some(item=>item?.value==="P1-20260311")){
  pList.push({...p1,value:"P1-20260311",upstream_value:"Nexus-v1.0-20260214"});
 }
 return {...data,p:pList};
}
const workerModels=[
 {id:"Nexus-v2.0-20260801",family:"mesh",minFaces:500,maxFaces:50000,quadMax:25000,standardMaxFaces:50000},
 {id:"Nexus-v1.0-20260214",family:"mesh",minFaces:500,maxFaces:20000,quadMax:0,standardMaxFaces:20000},
 ...models
];
export function providerManifest(options,input,mime){
 const model=workerModels.find(item=>item.id===options.model),source=options.source??"image";
 const quality=options.geometryQuality??"standard";
 const max=options.quad?model?.quadMax:quality==="detailed"?model?.maxFaces:model?.standardMaxFaces;
 if(!model||!Number.isInteger(options.faceCount)||options.faceCount<model.minFaces||options.faceCount>max||!["2K","4K","8K"].includes(options.textureResolution)||!["image","text","multiview"].includes(source))throw new ProviderError("INPUT_REJECTED");
 if(!["standard","detailed"].includes(quality)||quality==="detailed"&&(model.family!=="detail"||options.model==="v2.5-20250123"))throw new ProviderError("INPUT_REJECTED");
 if(options.model==="v2.5-20250123"&&options.textureResolution!=="2K")throw new ProviderError("INPUT_REJECTED");
 if(options.generateParts&&(model.family!=="detail"||options.model==="v2.5-20250123"||options.texture||options.pbr||options.quad))throw new ProviderError("INPUT_REJECTED");
 if(options.autoFix&&source!=="image")throw new ProviderError("INPUT_REJECTED");
 const result={model:options.model,face_limit:options.faceCount,texture:options.texture,pbr:options.texture&&options.pbr,
  ...(options.quad?{quad:true}:{}),
  ...(options.texture&&options.model!=="v2.5-20250123"?{texture_quality:({"2K":"standard","4K":"detailed","8K":"extreme"})[options.textureResolution]}:{}),
  ...(model.family==="detail"&&options.model!=="v2.5-20250123"?{geometry_quality:options.geometryQuality??"standard"}:{}),
  ...(options.generateParts?{generate_parts:true}:{})};
 const file=(token,type)=>{const extension=({"image/png":"png","image/jpeg":"jpg","image/webp":"webp"})[type];if(typeof token!=="string"||!token||!extension)throw new ProviderError("INPUT_REJECTED");return {type:extension,file_token:token};};
 if(source==="text"){
  if(typeof input!=="string"||!input.trim()||input.length>1000)throw new ProviderError("INPUT_REJECTED");
  return {...result,type:"text_to_model",prompt:input.trim()};
 }
 if(source==="multiview"){
  if(!Array.isArray(input)||input.length!==4||!input[0]||input.filter(Boolean).length<2)throw new ProviderError("INPUT_REJECTED");
  return {...result,type:"multiview_to_model",files:input.map(item=>item?file(item.token,item.mime):null)};
 }
 return {...result,type:"image_to_model",file:file(input,mime),...(options.autoFix?{enable_image_autofix:true}:{})};
}
/** A new upload may be retried; paid task creation is never retried here. */
export async function uploadGenerationInput(adapter,bytes,mime,options){
 if((options.source??"image")==="image")return adapter.upload(bytes,mime);
 let input;try{input=JSON.parse(new TextDecoder("utf8",{fatal:true}).decode(bytes));}catch{throw new ProviderError("INPUT_REJECTED");}
 if(input.format!=="ans-tripo-input-v1")throw new ProviderError("INPUT_REJECTED");
 if(options.source==="text"){
  if(typeof input.prompt!=="string"||!input.prompt.trim()||input.prompt.length>1000)throw new ProviderError("INPUT_REJECTED");return input.prompt;
 }
 if(!Array.isArray(input.views)||input.views.length>4||!input.views[0]||input.views.filter(Boolean).length<2)throw new ProviderError("INPUT_REJECTED");
 const views=new Array(4).fill(null);
 for(let index=0;index<input.views.length;index++){
  const view=input.views[index];if(!view)continue;
  if(typeof view.data!=="string"||view.data.length>26_666_668||!["image/png","image/jpeg","image/webp"].includes(view.mime))throw new ProviderError("INPUT_REJECTED");
  const image=Buffer.from(view.data,"base64");if(!image.length||image.length>20_000_000)throw new ProviderError("INPUT_REJECTED");
  views[index]={token:await adapter.upload(image,view.mime),mime:view.mime};
 }
 return views;
}
async function limited(response,limit){if(Number(response.headers.get("content-length"))>limit)throw new ProviderError("DOWNLOAD_FAILED");let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>limit)throw new ProviderError("DOWNLOAD_FAILED");chunks.push(chunk);}return Buffer.concat(chunks);}
export class TripoAdapter {
 constructor({fetcher=fetch,credential=readCredential,allowedHosts=[],baseUrl}={}){
  this.fetch=fetcher;
  this.credential=credential;
  this.baseUrl=(baseUrl||process.env.ANS_TRIPO_BASE_URL||DEFAULT_TRIPO_BASE_URL).replace(/\/+$/,"");
  this.allowed=new Set(["studio.tripo3d.uk","tripo-data.rg1.data.tripo3d.com",...allowedHosts]);
  this.token=null;
 }
 async request(path,{method="GET",body,auth=true,authRetry=true}={}){
  if(auth&&!this.token)await this.login();
  const headers={...(auth?{authorization:`Bearer ${this.token}`}:{})};
  if(body&&!(body instanceof FormData))headers["content-type"]="application/json";
  const response=await this.fetch(`${this.baseUrl}${path}`,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined,redirect:"error",signal:AbortSignal.timeout(60000)});
  if(response.status===401&&auth){this.token=null;if(method==="GET"&&authRetry)return this.request(path,{method,body,auth,authRetry:false});}
  if(!response.ok)throw new ProviderError(response.status===401?"LOGIN_REQUIRED":"PROVIDER_UNAVAILABLE");
  let envelope;try{envelope=JSON.parse((await limited(response,2000000)).toString("utf8"));}catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError("PROVIDER_UNAVAILABLE");}
  if(envelope.code!==0)throw new ProviderError("PROVIDER_UNAVAILABLE");
  const data=envelope.data??envelope;
  return path==="/api/gen-models"?normalizeGenModels(data):data;
 }
 async login(){let credentials=await this.credential();try{if(credentials?.baseUrl&&!process.env.ANS_TRIPO_BASE_URL)this.baseUrl=credentials.baseUrl.replace(/\/+$/,"");const value=await this.request("/api/auth/login",{method:"POST",body:{username:credentials.username,password:credentials.password},auth:false});if(typeof value.access_token!=="string")throw new ProviderError("LOGIN_REQUIRED");this.token=value.access_token;}finally{credentials=null;}}
 async preflight(){await this.login();const catalog=await this.request("/api/gen-models");const supported=catalog.p?.find(item=>item.value==="Nexus-v2.0-20260801"||item.value==="P2-20260801");if(!supported)throw new ProviderError("MODEL_UNSUPPORTED");return {authenticated:true,model:supported.value,submission:false};}
 async modelCatalog(){return this.request("/api/model-catalog");}
 async balance(){return this.request("/api/user/balance");}
 async upload(bytes,mime){const form=new FormData();form.set("file",new Blob([bytes],{type:mime}),`input.${mime==="image/jpeg"?"jpg":mime.split("/")[1]}`);const value=await this.request("/api/upload",{method:"POST",body:form});if(typeof value.image_token!=="string")throw new ProviderError("INPUT_REJECTED");return value.image_token;}
 async uploadTextureImage(bytes,mime="image/png"){const form=new FormData();form.set("file",new Blob([bytes],{type:mime}),`texture.${mime==="image/jpeg"?"jpg":mime.split("/")[1]||"png"}`);const value=await this.request("/api/upload/image",{method:"POST",body:form});const token=value.file_token||value.image_token;if(typeof token!=="string")throw new ProviderError("INPUT_REJECTED");return token;}
 async uploadModel(bytes,filename="model.glb",{useOriginalUV=true,transformMatrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}={}){const form=new FormData();form.set("file",new Blob([bytes]),filename);form.set("use_original_uv",String(useOriginalUV));form.set("transform_matrix",JSON.stringify(transformMatrix));const value=await this.request("/api/upload/model",{method:"POST",body:form});if(typeof value.task_id!=="string")throw new ProviderError("INPUT_REJECTED");return value.task_id;}
 async submit(options,token,mime){const manifest=providerManifest(options,token,mime);const payload={...manifest,model:toUpstreamModel(manifest.model)};try{const value=await this.request("/api/task",{method:"POST",body:payload});if(typeof value.task_id!=="string"||!/^[a-zA-Z0-9_-]{1,120}$/.test(value.task_id))throw new Error();return value.task_id;}catch{throw new ProviderError("SUBMISSION_UNCERTAIN");}}
 async submitTask(body){if(!body||typeof body!=="object"||typeof body.type!=="string")throw new ProviderError("INPUT_REJECTED");const payload=body.model?{...body,model:toUpstreamModel(body.model)}:body;try{const value=await this.request("/api/task",{method:"POST",body:payload});if(typeof value.task_id!=="string"||!/^[a-zA-Z0-9_-]{1,120}$/.test(value.task_id))throw new Error();return value.task_id;}catch{throw new ProviderError("SUBMISSION_UNCERTAIN");}}
 async status(id){return this.request(`/api/task/${encodeURIComponent(id)}`);}
 async animations(id){return this.request(`/api/task/${encodeURIComponent(id)}/animations`);}
 async modelFlags(id){return this.request(`/api/task/${encodeURIComponent(id)}/model-flags`);}
 async history(id){return this.request(`/api/task/${encodeURIComponent(id)}/history`);}
 async download(id,nativeFormat){
  // A conversion can charge extra credits; this adapter only requests native GLB.
  if(nativeFormat!=="glb")throw new ProviderError("MODEL_UNSUPPORTED");
  const path=`/api/task/${encodeURIComponent(id)}/download?type=glb&native=glb`;
  if(!this.token)await this.login();
  let first=await this.fetch(`${this.baseUrl}${path}`,{method:"GET",headers:{authorization:`Bearer ${this.token}`},redirect:"error",signal:AbortSignal.timeout(60000)});
  if(first.status===401){this.token=null;await this.login();first=await this.fetch(`${this.baseUrl}${path}`,{method:"GET",headers:{authorization:`Bearer ${this.token}`},redirect:"error",signal:AbortSignal.timeout(60000)});}
  if(!first.ok)throw new ProviderError(first.status===401?"LOGIN_REQUIRED":"DOWNLOAD_FAILED");
  const contentType=(first.headers?.get?.("content-type")||"").toLowerCase();
  if(contentType.includes("application/octet-stream")||contentType.includes("model/gltf-binary"))return limited(first,30000000);
  let envelope;try{envelope=JSON.parse((await limited(first,2000000)).toString("utf8"));}catch{throw new ProviderError("DOWNLOAD_FAILED");}
  if(envelope.code!==undefined&&envelope.code!==0)throw new ProviderError("DOWNLOAD_FAILED");
  const result=envelope.data??envelope;
  let url;try{url=new URL(result.url,this.baseUrl);}catch{throw new ProviderError("DOWNLOAD_FAILED");}
  if(url.protocol!=="https:"||url.username||url.password||url.port||!this.allowed.has(url.hostname))throw new ProviderError("DOWNLOAD_FAILED");
  // The authenticated API supplies a signed URL; never forward bearer credentials to external storage hosts.
  const sameOrigin=url.origin===new URL(this.baseUrl).origin;
  const response=await this.fetch(url,{ ...(sameOrigin&&this.token?{headers:{authorization:`Bearer ${this.token}`}}:{}), redirect:"error",signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new ProviderError("DOWNLOAD_FAILED");return limited(response,30000000);
 }
}
