import models from "../../src/contracts/tripo-models.json" with {type:"json"};
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run=promisify(execFile);
export class ProviderError extends Error {constructor(code){super(code);this.code=code;}}
export async function readCredential(){
 if(process.platform!=="win32")throw new ProviderError("CREDENTIAL_UNAVAILABLE");
 const script=`$ErrorActionPreference='Stop'; $OutputEncoding=[System.Text.UTF8Encoding]::new($false); [Console]::OutputEncoding=$OutputEncoding; $p=Join-Path $env:LOCALAPPDATA 'ANS/credentials/tripo3d.credential.xml'; $c=Import-Clixml -LiteralPath $p; @{username=$c.UserName;password=$c.GetNetworkCredential().Password}|ConvertTo-Json -Compress`;
 try {const result=await run("powershell.exe",["-NoProfile","-NonInteractive","-Command",script],{windowsHide:true,encoding:"utf8",maxBuffer:20000});const value=JSON.parse(result.stdout);if(!value.username||!value.password)throw new Error();return value;}catch{throw new ProviderError("CREDENTIAL_UNAVAILABLE");}
}
export function providerManifest(options,input,mime){
 const model=models.find(item=>item.id===options.model),source=options.source??"image";
 const max=options.quad?model?.quadMax:model?.maxFaces;
 if(!model||!Number.isInteger(options.faceCount)||options.faceCount<model.minFaces||options.faceCount>max||!["2K","4K","8K"].includes(options.textureResolution)||!["image","text","multiview"].includes(source))throw new ProviderError("INPUT_REJECTED");
 if(options.generateParts&&(model.family!=="detail"||options.texture||options.pbr))throw new ProviderError("INPUT_REJECTED");
 if(options.autoFix&&source!=="image")throw new ProviderError("INPUT_REJECTED");
 const result={model:options.model,face_limit:options.faceCount,texture:options.texture,pbr:options.texture&&options.pbr,
  ...(options.quad?{quad:true}:{}),
  ...(options.texture?{texture_quality:({"2K":"standard","4K":"detailed","8K":"extreme"})[options.textureResolution]}:{}),
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
 constructor({fetcher=fetch,credential=readCredential,allowedHosts=[]}={}){this.fetch=fetcher;this.credential=credential;this.allowed=new Set(["tripo3d.uk","tripo-data.rg1.data.tripo3d.com",...allowedHosts]);this.token=null;}
 async request(path,{method="GET",body,auth=true,authRetry=true}={}){
  if(auth&&!this.token)await this.login();
  const headers={...(auth?{authorization:`Bearer ${this.token}`}:{})};
  if(body&&!(body instanceof FormData))headers["content-type"]="application/json";
  const response=await this.fetch(`https://tripo3d.uk${path}`,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined,redirect:"error",signal:AbortSignal.timeout(60000)});
  if(response.status===401&&auth){this.token=null;if(method==="GET"&&authRetry)return this.request(path,{method,body,auth,authRetry:false});}
  if(!response.ok)throw new ProviderError(response.status===401?"LOGIN_REQUIRED":"PROVIDER_FAILED");
  let envelope;try{envelope=JSON.parse((await limited(response,2000000)).toString("utf8"));}catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError("PROVIDER_FAILED");}
  if(envelope.code!==0)throw new ProviderError("PROVIDER_FAILED");return envelope.data??envelope;
 }
 async login(){let credentials=await this.credential();try{const value=await this.request("/api/auth/login",{method:"POST",body:credentials,auth:false});if(typeof value.access_token!=="string")throw new ProviderError("LOGIN_REQUIRED");this.token=value.access_token;}finally{credentials=null;}}
 async preflight(){await this.login();const models=await this.request("/api/gen-models");if(!models.p?.some(item=>item.value==="P2-20260801"))throw new ProviderError("MODEL_UNSUPPORTED");return {authenticated:true,model:"P2-20260801",submission:false};}
 async upload(bytes,mime){const form=new FormData();form.set("file",new Blob([bytes],{type:mime}),`input.${mime==="image/jpeg"?"jpg":mime.split("/")[1]}`);const value=await this.request("/api/upload",{method:"POST",body:form});if(typeof value.image_token!=="string")throw new ProviderError("INPUT_REJECTED");return value.image_token;}
 async submit(options,token,mime){const manifest=providerManifest(options,token,mime);try{const value=await this.request("/api/task",{method:"POST",body:manifest});if(typeof value.task_id!=="string"||!/^[a-zA-Z0-9_-]{1,120}$/.test(value.task_id))throw new Error();return value.task_id;}catch{throw new ProviderError("SUBMISSION_UNCERTAIN");}}
 async status(id){return this.request(`/api/task/${encodeURIComponent(id)}`);}
 async download(id,nativeFormat){
  // A conversion can charge extra credits; this adapter only requests native GLB.
  if(nativeFormat!=="glb")throw new ProviderError("MODEL_UNSUPPORTED");
  const result=await this.request(`/api/task/${encodeURIComponent(id)}/download?type=glb&native=glb`);
  let url;try{url=new URL(result.url);}catch{throw new ProviderError("DOWNLOAD_FAILED");}
  if(url.protocol!=="https:"||url.username||url.password||url.port||!this.allowed.has(url.hostname))throw new ProviderError("DOWNLOAD_FAILED");
  // The authenticated API supplies a signed URL; never forward bearer credentials.
  const response=await this.fetch(url,{redirect:"error",signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new ProviderError("DOWNLOAD_FAILED");return limited(response,30000000);
 }
}
