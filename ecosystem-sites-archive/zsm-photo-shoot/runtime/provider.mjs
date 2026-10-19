import { refundAccess } from './access.mjs';
import sharp from 'sharp';
import { referencePlan } from './destinations.mjs';
import { MODEL, FORMATS, compileShot } from './recipe.mjs';
import { createHash } from 'node:crypto';
export const MAX_IMAGE_BYTES = 8*1024*1024;
export function providerConfig(env=process.env) {
  const selected=env.STUDIO_PROVIDER||'mcgrox';
  if(selected==='openlux')return {channel:'OpenLux',model:'gpt-image-2.5-sunburst-c',quality:'high',base:env.OPENLUX_BASE_URL,key:env.OPENLUX_API_KEY,hosts:['api.openlux.ai'],formats:['portrait','landscape','square']};
  if(selected==='mcgrox')return {channel:'McGrox',model:MODEL,quality:'high',base:env.OPENAI_BASE_URL,key:env.OPENAI_API_KEY,hosts:['mcgrox.top','www.mcgrox.top'],formats:['portrait','landscape','square']};
  throw new Error('CHANNEL_CONFIG');
}
export function capabilities(env=process.env) {
  const reasons=[];let provider;
  try{provider=providerConfig(env);}catch{reasons.push('拍摄渠道配置需要修复');}
  if(env.STUDIO_GENERATION_ENABLED!=='true')reasons.push('开拍尚未开放，计划和作品可以保存');
  if(!provider?.key||!provider?.base)reasons.push('拍摄服务尚未配置完成');
  if(env.STUDIO_REFERENCE_CONTRACT_VERIFIED!=='true')reasons.push('参考照片拍摄能力尚未验证');
  if(!(Number(env.STUDIO_DAILY_REQUEST_LIMIT)>0))reasons.push('开拍额度尚未授权');
  return {enabled:!reasons.length,reasons,channel:provider?.channel||'McGrox',model:provider?.model||MODEL,quality:'high',formats:provider?.formats||[],retentionDays:30,referenceContract:env.STUDIO_REFERENCE_CONTRACT_VERIFIED==='true'?'verified':'unverified',pricesVerified:!!env.STUDIO_UNIT_COST_CNY};
}
export async function inspectImage(buffer,max=MAX_IMAGE_BYTES) {
  if(!buffer.length||buffer.length>max)throw new Error('IMAGE_SIZE');
  const m=await sharp(buffer,{limitInputPixels:24000000,failOn:'error',animated:false}).metadata();
  if(!['jpeg','png','webp'].includes(m.format)||!m.width||!m.height||(m.pages??1)>1||m.width<128||m.height<128)throw new Error('IMAGE_FORMAT');
  // Decode to catch truncated files; original bytes remain unchanged.
  await sharp(buffer,{limitInputPixels:24000000,failOn:'error'}).stats();
  return {contentType:'image/'+(m.format==='jpeg'?'jpeg':m.format),width:m.width,height:m.height};
}
async function boundedBody(response,max) {
  if(Number(response.headers.get('content-length'))>max)throw new Error('RESPONSE_SIZE');
  const reader=response.body?.getReader(); if(!reader)throw new Error('NO_RESULT'); const chunks=[];let n=0;
  try { while(true) { const {done,value}=await reader.read(); if(done)break; n+=value.length; if(n>max)throw new Error('RESPONSE_SIZE'); chunks.push(Buffer.from(value)); } } catch(e) { await reader.cancel();throw e; }
  return Buffer.concat(chunks);
}
function assertProviderMatchesMaster(project,shotId,provider) {
  if(!project.continuity||shotId==='cover')return;
  const c=project.continuity;
  if(c.channel!==provider.channel||c.model!==provider.model||c.quality!==provider.quality||c.size!==FORMATS[project.settings.format].size)throw new Error('CONTINUITY_PROVIDER_MISMATCH');
}
export async function requestPhoto({project,shotId,note,images,fetcher=fetch,env=process.env,onSubmit=()=>{}}) {
  const capability=capabilities(env); if(!capability.enabled)throw new Error('GENERATION_DISABLED');
  const provider=providerConfig(env);assertProviderMatchesMaster(project,shotId,provider);
  if(!provider.formats.includes(project.settings.format))throw new Error('FORMAT_UNVERIFIED');
  let base;try{base=new URL(provider.base);}catch{throw new Error('CHANNEL_CONFIG');}
  if(base.protocol!=='https:'||!provider.hosts.includes(base.hostname)||base.pathname!=='/v1'||base.search||base.hash||base.username||base.password)throw new Error('CHANNEL_CONFIG');
  if(images.length>4)throw new Error('REFERENCE_COUNT_UNVERIFIED');
  if(images.length>1&&env.STUDIO_MULTI_REFERENCE_VERIFIED!=='true')throw new Error('MULTI_REFERENCE_UNVERIFIED');
  if(images.some(i=>i.buffer.length>MAX_IMAGE_BYTES))throw new Error('REFERENCE_SIZE_UNVERIFIED');
  // This edit contract is deliberately gated: public McGrox docs only document generations.
  const prompt=compileShot(project,shotId,note), form=new FormData();
  form.set('model',provider.model);form.set('prompt',prompt);form.set('n','1');form.set('size',FORMATS[project.settings.format].size);form.set('quality','high');form.set('response_format','b64_json');
  for(const image of images)form.append(images.length===1?'image':'image[]',new Blob([image.buffer],{type:image.contentType}),'reference.'+(image.contentType==='image/jpeg'?'jpg':image.contentType.split('/')[1]));
  onSubmit();
  let response; if(provider.channel==='OpenLux'){const reqModel=project?.settings?.model==='image2'||project?.settings?.model==='gpt-image-2-c'?'gpt-image-2-c':provider.model; const genBody={model:reqModel,prompt,n:1,size:FORMATS[project.settings.format].size,quality:'high',...(images[0]?{image:'data:'+images[0].contentType+';base64,'+images[0].buffer.toString('base64')}:{})}; response=await fetcher(provider.base+'/images/generations',{method:'POST',headers:{Authorization:'Bearer '+provider.key,'Content-Type':'application/json'},body:JSON.stringify(genBody),signal:AbortSignal.timeout(240000),redirect:'error'}); if(!response.ok&&reqModel!=='gpt-image-2-c'){response=await fetcher(provider.base+'/images/generations',{method:'POST',headers:{Authorization:'Bearer '+provider.key,'Content-Type':'application/json'},body:JSON.stringify({...genBody,model:'gpt-image-2-c'}),signal:AbortSignal.timeout(240000),redirect:'error'});}}else{response=await fetcher(provider.base+'/images/edits',{method:'POST',headers:{Authorization:'Bearer '+provider.key},body:form,signal:AbortSignal.timeout(240000),redirect:'error'});}
  if(!response.ok)throw new Error(response.status===429?'UPSTREAM_RATE_LIMIT':response.status>=500?'UPSTREAM_UNCERTAIN':'UPSTREAM_REJECTED');
  let data;try { data=JSON.parse((await boundedBody(response,32*1024*1024)).toString('utf8')); } catch {throw new Error('MALFORMED_RESPONSE');}
  const image=data.data?.[0];
  // Do not fetch arbitrary remote URLs. A compatible base64 response must be verified first.
  if(!image?.b64_json||typeof image.b64_json!=='string')throw new Error('BASE64_CONTRACT_REQUIRED');
  const bytes=Buffer.from(image.b64_json,'base64'), metadata=await inspectImage(bytes,20*1024*1024), f=FORMATS[project.settings.format];
  const usage=data.usage?Object.fromEntries(Object.entries(data.usage).filter(([k,v])=>['input_tokens','output_tokens','total_tokens'].includes(k)&&typeof v==='number')):null;
  const promptHash=createHash('sha256').update(prompt).digest('hex');
  if(metadata.width!==f.width||metadata.height!==f.height){
    const error=new Error('OUTPUT_DIMENSIONS');
    // Preserve the exact provider bytes for private download, never resize or accept as a finished shot.
    error.rejectedOutput={buffer:bytes,metadata,usage};throw error;
  }
  return {buffer:bytes,metadata:{...metadata,generation:{channel:provider.channel,model:provider.model,quality:'high',size:f.size,promptHash,referenceHashes:referencePlan(project,shotId,note?'previous':null).map((r,i)=>({role:r.role,sha256:createHash('sha256').update(images[i].buffer).digest('hex')}))}},usage,promptHash};
}
export async function executeJob(store,job,request=requestPhoto,env=process.env,{compile=compileShot}={}) {
  for(const shotId of job.targets) {
    job=store.getJob(job.id); if(job.completed.includes(shotId))continue;
    if(job.stopRequested) {job.status='cancelled';store.writeJob(job);return;}
    const prompt=compile(job.snapshot,shotId,job.note), a=store.attempt(job.id,shotId,createHash('sha256').update(prompt).digest('hex'));
    const provider=providerConfig(env);Object.assign(a,{channel:provider.channel,model:provider.model,quality:'high',size:FORMATS[job.snapshot.settings.format].size});store.writeAttempt(a);
    try {
      // A daily hard cap counts dispatched attempts including failures. No hidden retries.
      const project=job.snapshot, images=[];
      if(project.continuity&&shotId!=='cover')store.verifyContinuity(project);
      assertProviderMatchesMaster(project,shotId,provider);
      const parentAsset=job.parentResultId?project.results.find(r=>r.id===job.parentResultId)?.assetId:null;
      for(const reference of referencePlan(project,shotId,parentAsset)) {const stored=store.asset(project.owner,project.id,reference.id);images.push({...stored,buffer:store.readAsset(stored)});}
      a.references=referencePlan(project,shotId,parentAsset).map((r,i)=>({role:r.role,sha256:createHash('sha256').update(images[i].buffer).digest('hex')}));store.writeAttempt(a);
      for(let i=0;i<images.length;i++){const expected=project.referenceFacts?.find(r=>r.id===images[i].id)?.sha256||images[i].sha256;if(expected&&a.references[i].sha256!==expected)throw new Error('CONTINUITY_REFERENCE_CHANGED');}
      const output=await request({project,shotId,note:job.note,images,env,onSubmit:()=>{
        // Reserve room for the maximum accepted result before spending a request.
        store.assertStorageCapacity(20*1024*1024,job.id);
        if(env.STUDIO_ACCESS_REQUIRED==='true'||env.STUDIO_GENERATION_ENABLED==='true')store.consumeAccess(job,provider,Number(env.STUDIO_DAILY_REQUEST_LIMIT)||0,shotId);
        else store.budget('provider:'+new Date().toISOString().slice(0,10),Number(env.STUDIO_DAILY_REQUEST_LIMIT)||0,86400000);
        a.status='submitted';store.writeAttempt(a);
      }});
      a.status='received';a.usage=output.usage;store.writeAttempt(a);
      const generation={channel:a.channel,model:a.model,quality:a.quality,size:a.size,promptHash:a.promptHash,referenceHashes:a.references};
      store.finishShot(job,shotId,output.buffer,{...output.metadata,generation},a.id);
      a.status='saved';a.elapsedMs=Date.now()-a.startedAt;
      const unit=Number(env.STUDIO_UNIT_COST_CNY);if(Number.isFinite(unit)&&unit>0){a.cost=unit;a.costSource='configured-provider-unit-price';}
      store.writeAttempt(a);
    } catch(e) {
      const code=['STORAGE_LIMIT','SHOOT_ALREADY_DISPATCHED','SHOOT_ACCESS_REQUIRED','SHOOT_ACCESS_EXPIRED','SHOOT_QUOTA_EXHAUSTED','SHOOT_REFERENCE_SCOPE','FORMAT_UNVERIFIED','CONTINUITY_PROVIDER_MISMATCH','COVER_PROVENANCE_REQUIRED','CONTINUITY_PROVENANCE_CHANGED','REFERENCE_SIZE_UNVERIFIED','CONTINUITY_REFERENCE_MISSING','CONTINUITY_REFERENCE_CHANGED','REFERENCE_COUNT_UNVERIFIED','RATE_LIMIT','GENERATION_DISABLED','CHANNEL_CONFIG','MULTI_REFERENCE_UNVERIFIED','UPSTREAM_RATE_LIMIT','UPSTREAM_UNCERTAIN','UPSTREAM_REJECTED','MALFORMED_RESPONSE','BASE64_CONTRACT_REQUIRED','OUTPUT_DIMENSIONS','IMAGE_FORMAT','IMAGE_SIZE','RESPONSE_SIZE','NO_RESULT'].includes(e.message)?e.message:'REQUEST_UNCERTAIN';
      if(code==='OUTPUT_DIMENSIONS'&&e.rejectedOutput){
        const {buffer,metadata,usage}=e.rejectedOutput;
        a.returnedSize=metadata.width+'x'+metadata.height;a.usage=usage;
        try {store.saveRejectedOutput(job,a,buffer,metadata);}catch(storageError){a.rejectedSaveError=storageError.code==='STORAGE_LIMIT'?'STORAGE_LIMIT':'SAVE_FAILED';}
      }
      if(['UPSTREAM_RATE_LIMIT','UPSTREAM_REJECTED'].includes(code)&&a.status==='submitted'){try{refundAccess(store,job,shotId,env);}catch{}} a.error=code;a.elapsedMs=Date.now()-a.startedAt;a.status=a.status==='prepared'?'failed':'unknown';store.writeAttempt(a);
      job=store.getJob(job.id);job.error=code;job.status=a.status==='unknown'?'recoverable':'failed';store.writeJob(job);return;
    }
  }
  job=store.getJob(job.id);job.status='succeeded';store.writeJob(job);
}
