import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { zipSync } from 'fflate';
import { store, StudioError } from '@/runtime/store.mjs';
import { capabilities, providerConfig, inspectImage, MAX_IMAGE_BYTES } from '@/runtime/provider.mjs';
import { characterFor } from '@/runtime/characters.mjs';
import { PLACES } from '@/runtime/destinations.mjs';
import {shootSettingsSchema as settings} from '@/app/lib/shoot-settings-schema';
import { builtinReference } from '@/runtime/builtin-references.mjs';
import { resolveOwner, issueRecovery, recoverSession, ownerAccess, ensureAccountGift, dailyDispatchStatus } from '@/runtime/access.mjs';
import { SHOTS } from '@/runtime/recipe.mjs';
import { projectReadiness } from '@/runtime/readiness.mjs';
import {prepareSubmission,readSubmission,discardSubmission} from '@/runtime/submissions.mjs';
import {authorizeProject} from '@/runtime/access.mjs';
import {signedAccount,accountPublic,ACCOUNT_COOKIE} from '@/runtime/accounts.mjs';
import {privateWorks,publicWorks,uploadWork,getWork,publicWork,readWork,submitWork,withdrawWork,deleteWork} from '@/runtime/gallery.mjs';
import type {ShootProject} from '@/app/lib/shoot-contract';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const COOKIE='qjb_session_v2';
const text=(max:number)=>z.string().trim().max(max);
const ids=z.string().uuid();
const commandSchema=z.object({key:ids,revision:z.number().int().positive(),kind:z.enum(['set','cover','revision','continuation']),shotId:z.enum(['cover','place','portrait','motion','pause','detail']).optional(),note:text(400).optional(),acknowledge:z.boolean().optional(),parentResultId:ids.optional(),coverResultId:ids.optional()}).strict();
const errors:Record<string,string>={WORK_SUBMISSION_CHANGED:'这次上传内容已变化，请重新选择照片后提交。',ACCOUNT_REQUIRED:'请先通过 ANS 登录，再上传或管理自己的作品。',ACCOUNT_RECOVERY:'已登录账号请使用 ANS 登录找回作品，无需恢复码。',WORK_LIMIT:'最多保存20张上传作品，请先下载并整理。',WORK_UNAVAILABLE:'作品原文件暂时不可用，请稍后同步。',DRAFT_CHANGED:'另一窗口修改了这张照片的文字，请同步后选择保留哪份。',SUBMISSION_PENDING:'此计划已有一份待确认请求，请先继续或放弃该请求。',SUBMISSION_CHANGED:'其他窗口已更新拍摄任务，请同步后重新核对。',SUBMISSION_DISCARDED:'这份请求已放弃，不会继续拍摄。',SUBMISSION_ADMITTED:'该请求已进入拍摄任务，请同步查看；放弃待确认请求不能取消上游计费。',SHOOT_ACCESS_REQUIRED:'请通过 ANS 登录领取开拍额度，计划可先保存。',SHOOT_ACCESS_EXPIRED:'开拍授权已到期或撤回，作品仍可下载。',SHOOT_QUOTA_EXHAUSTED:'本次开拍额度已用完或被排队任务占用，作品保留。',SHOOT_REFERENCE_SCOPE:'此开拍授权仅适用于已确认的人物、角色和地点原图，当前素材不在授权范围。',FORMAT_UNVERIFIED:'当前渠道只验证了2:3竖幅，请先改为竖幅。',RECOVERY_INVALID:'恢复码不正确或已到期，请检查完整恢复码。',SESSION_NOT_EMPTY:'当前浏览器已有拍摄，请在新的浏览器会话中恢复，避免混淆作品。',BUILTIN_UNAVAILABLE:'这个素材暂未提供内置参考，请上传你有权使用的原图。',BUILTIN_CHANGED:'内置素材发生变化，已停止复制，请刷新后再试。',
  CONTINUATION_REVIEW_REQUIRED:'先审查上一张续拍：确认人物、角色、镜头与母版一致并认可，再拍下一镜。更换母版后，已有镜头需重新验证。',REFERENCE_SIZE_UNVERIFIED:'本次参考超过当前8 MB单图限制，未发送请求。请先核对素材。',COVER_REVIEW_REQUIRED:'请确认这版人物像本人、角色造型正确、现场可信，并愿意保存或分享，再认定为续拍母版。',COVER_PROVENANCE_REQUIRED:'这张封面的生成信息不完整，暂不能设为续拍母版；原图仍可保存。',CONTINUITY_PROVENANCE_CHANGED:'母版的渠道或参数记录不一致，已停止派发；原作品保留。',CONTINUITY_PROVIDER_MISMATCH:'当前拍摄渠道与这张母版不匹配，已停止派发；请保持原渠道和参数后再续拍。',CONTINUITY_REFERENCE_MISSING:'续拍母版或原始参考缺失，已停止派发。请先恢复原文件。',CONTINUITY_REFERENCE_CHANGED:'续拍参考字节与认可时不一致，已停止派发。请重新核对素材。',REFERENCE_COUNT_UNVERIFIED:'本次需要超过四张参考，渠道尚未验证此组合，未发送请求。',SINGLE_SHOT_REQUIRED:'续拍请逐镜确认，先选一个未完成镜头。',SHOT_EXISTS:'这个镜头已有作品，请使用单张修改保留原版。',REVIEW_REQUIRED:'认可成片前，请先确认人物、角色、镜头和整组一致性。',COVER_APPROVAL_REQUIRED:'请先明确认可某一版封面为续拍母版，再选择一个新镜头。',COVER_EXISTS:'封面已保存，请先查看；需要调整时使用单张修改。',INVALID_STORY:'剧情与当前地点或拍法不匹配，请重新选择剧情。',STORY_LIGHT_CONFLICT:'该巴黎机位仅支持日间拍摄，请改用朋友抓拍或认真大片。',INVALID_CHARACTER:'这个搭子尚未收录，请从角色库选择。',COMPANION_REQUIRED:'合影需要独立角色参考，请上传你有权使用的所选角色图片。',LOCATION_REQUIRED:'请上传该餐厅的实景参考，避免把虚构内装当作真实地点。',PLACE_REQUIRED:'请选择具体地点。',INVALID_PLACE:'此地点尚未收录。',INVALID_PLAY:'请选择支持的玩法。',STORAGE_LIMIT:'本站存储额度已满，请下载并删除不需要的项目，或稍后重试。',PEOPLE_CONFLICT:'当前支持一位真人，可在搭子玩法中加入一个非真人角色；请移除多人要求。',FORMAT_CONFLICT:'文字中的画幅与所选规格冲突，请修改文字或画幅选择。',NOT_FOUND:'作品不存在，或不属于当前账号或浏览器。账号作品请重新登录后打开。',RATE_LIMIT:'操作过于频繁，请稍后再试。',PROJECT_LIMIT:'已达到20个项目，请先下载并删除不需要的项目。',REFERENCE_LIMIT:'历史拍摄已使用的参考达到6份上限，请新建拍摄。未拍摄的参考可直接替换。',PLAN_LOCKED:'拍摄进行中，先等待当前任务完成。',STALE_PLAN:'项目已在其他窗口更新，请重新加载。',CONSENT_REQUIRED:'请先确认照片使用与保存范围。',REFERENCE_REQUIRED:'先上传一张清晰的本人照片。',ALREADY_RUNNING:'当前项目已有任务，无需重复提交。',ALREADY_COMPLETE:'这一版拍摄计划已完成。可以修改单张或创建新项目。',RESULT_REQUIRED:'该镜头还没有可修改的原片。',RESULT_PLAN_MISMATCH:'这张照片属于旧计划，请切换到当前计划的成片后修改。',ATTEMPT_LIMIT:'该项目已达到受控任务上限。作品已保留，请先核对生成记录。',UNCERTAIN_CHARGE:'上一次请求可能已经计费，请先核实账单，再确认是否继续。',GENERATION_DISABLED:'开拍暂未开放，已保存的计划和作品可以继续使用。',WORKER_OFFLINE:'拍摄服务暂未就绪，已保存计划，请稍后重试。',MULTI_REFERENCE_UNVERIFIED:'多参考图修改与构图控制尚未通过渠道验收。',IMAGE_FORMAT:'照片无法读取。请使用完整的 JPG、PNG 或 WebP 静态图片，至少128像素。',IMAGE_SIZE:'照片需小于8 MB。',ORIGIN:'请求来源不匹配，请从当前网站重新打开。',INVALID_INPUT:'输入内容不符合要求，请检查后重试。',BODY_SIZE:'提交内容过大。',NO_RESULTS:'暂无成片可供下载。'
};
type Context={params:Promise<{path?:string[]}>};
async function json(request:NextRequest) { if(!request.headers.get('content-length')||Number(request.headers.get('content-length'))>32000)throw new StudioError('BODY_SIZE',413); const body=await request.text();if(Buffer.byteLength(body)>32000)throw new StudioError('BODY_SIZE',413);try{return JSON.parse(body);}catch{throw new StudioError('INVALID_INPUT');} }
async function handle(request:NextRequest,context:Context) {
  let token=request.cookies.get(COOKIE)?.value;
  const fresh=!token||!/^[-_a-zA-Z0-9]{43}$/.test(token);
  if(fresh)token=randomBytes(32).toString('base64url');
  const sessionHash=createHash('sha256').update(token!).digest('hex'), db=store();
  const account=signedAccount(db,request.cookies.get(ACCOUNT_COOKIE)?.value);
  const owner=account?.owner||resolveOwner(db,sessionHash);
  const sessionCapability=()=>{const base=capabilities();const access=ownerAccess(db,owner,{channel:base.channel||'McGrox',model:base.model});const daily=dailyDispatchStatus(db);return {...base,enabled:base.enabled&&access.enabled&&daily.remaining>0,dailyRemaining:daily.remaining,remaining:access.remaining,gift:access.gift,accessLabel:access.label,reasons:[...(!access.enabled?[account?'ANS 算力积分不足（2 积分/张）或已用于排队，作品仍可下载':'请通过 ANS 账号登录使用算力积分开拍（2 积分/张）']:[]),...base.reasons,...(base.enabled&&daily.remaining===0?['今天的开拍名额已用完，北京时间次日08:00恢复，剩余次数保留。']:[])]};};
  const present=(project:ShootProject)=>({...project,shootReadiness:projectReadiness(db,owner,project)});
  const reply=(body:unknown,status=200)=>{
    const data=body as {project?:ShootProject;projects?:ShootProject[]};
    const payload=data.project?{...data,project:present(data.project)}:data.projects?{...data,projects:data.projects.map(present)}:body;
    return NextResponse.json(payload,{status,headers:{'Cache-Control':'no-store'}});
  };
  const finish=(response:NextResponse)=>{
    response.headers.set('Cache-Control','private, no-store');response.headers.set('X-Content-Type-Options','nosniff');
    if(fresh)response.cookies.set(COOKIE,token!,{httpOnly:true,secure:(process.env.STUDIO_PUBLIC_ORIGIN||request.nextUrl.origin).startsWith('https:'),sameSite:'strict',maxAge:30*86400,path:process.env.NEXT_PUBLIC_BASE_PATH||'/'});
    return response;
  };
  try {
    const p=(await context.params).path||[], method=request.method;
    if(account){const c=capabilities();ensureAccountGift(db,account.owner,{channel:c.channel||'McGrox',model:c.model});}
    if(!['GET','HEAD'].includes(method)) {
      if(request.headers.get('origin')!==(process.env.STUDIO_PUBLIC_ORIGIN||request.nextUrl.origin))throw new StudioError('ORIGIN',403);
      // Durable global and per-session caps bound disk and queue exposure without trusting forwarded IPs.
      db.budget('mutation:global',2000);db.budget('mutation:'+owner,180);
    }
    if(p.length===1&&p[0]==='health'&&method==='GET')return finish(reply({version:process.env.STUDIO_RELEASE||'local',...db.health(),model:capabilities().model,channel:capabilities().channel,generation:capabilities().enabled,access:'scoped',assistant:'ans-dino-rive-guide-v3'}));
    if(p.length===1&&p[0]==='bootstrap'&&method==='GET') {
      const capability={...sessionCapability(),...db.health(),version:process.env.STUDIO_RELEASE||'local'};
      return finish(reply({capability,projects:db.list(owner),account:accountPublic(account),works:account?privateWorks(db,owner):[],community:publicWorks(db)}));
    }
    if(p.length===2&&p[0]==='session'&&p[1]==='recovery'&&method==='POST') {
      if(account)throw new StudioError('ACCOUNT_RECOVERY',409);
      z.object({confirm:z.literal(true)}).strict().parse(await json(request));
      db.budget('recovery-create:'+owner,5,86400000);
      return finish(reply({code:issueRecovery(db,owner),expiresAt:Date.now()+30*86400000}));
    }
    if(p.length===2&&p[0]==='session'&&p[1]==='restore'&&method==='POST') {
      if(account)throw new StudioError('ACCOUNT_RECOVERY',409);
      db.budget('recovery-restore:global',200,3600000);db.budget('recovery-restore:'+owner,8,3600000);
      const body=z.object({code:z.string().regex(/^[-_a-zA-Z0-9]{43}$/)}).strict().parse(await json(request));
      recoverSession(db,owner,sessionHash,body.code);
      return finish(reply({restored:true}));
    }
    if(p[0]==='gallery'){
      if(p.length===2&&p[1]==='public'&&method==='GET')return finish(reply({works:publicWorks(db)}));
      const publicImage=p.length===4&&p[1]==='public'&&p[3]==='image'&&method==='GET';
      if(publicImage){const work=publicWork(db,ids.parse(p[2])),bytes=readWork(db,work);return finish(new NextResponse(new Uint8Array(bytes),{headers:{'Content-Type':work.contentType,'Content-Length':String(bytes.length),'Content-Disposition':'inline; filename="vibephoto-work.'+(work.contentType==='image/jpeg'?'jpg':work.contentType.split('/')[1])+'"'}}));}
      if(!account)throw new StudioError('ACCOUNT_REQUIRED',401);
      if(p.length===1&&method==='GET')return finish(reply({works:privateWorks(db,owner)}));
      if(p.length===1&&method==='POST'){
        if(!request.headers.get('content-length')||Number(request.headers.get('content-length'))>MAX_IMAGE_BYTES+32768)throw new StudioError('BODY_SIZE',413);
        db.budget('work-upload:global',300,86400000);db.budget('work-upload:'+owner,24,86400000);
        const form=await request.formData(),file=form.get('file'),title=text(60).min(1).parse(form.get('title')),requestKey=ids.parse(form.get('key'));
        if(form.get('consent')!=='true')throw new StudioError('CONSENT_REQUIRED');
        if(!(file instanceof File))throw new StudioError('INVALID_INPUT');if(file.size>MAX_IMAGE_BYTES)throw new StudioError('IMAGE_SIZE',413);
        const bytes=Buffer.from(await file.arrayBuffer());let metadata;try{metadata=await inspectImage(bytes);}catch{throw new StudioError('IMAGE_FORMAT');}
        return finish(reply({work:uploadWork(db,owner,account.name,title,bytes,metadata,requestKey)},201));
      }
      if(p.length===2&&method==='DELETE'){z.object({confirm:z.literal(true)}).strict().parse(await json(request));deleteWork(db,owner,ids.parse(p[1]));return finish(reply({deleted:true}));}
      if(p.length===3&&p[2]==='publish'&&method==='POST'){const body=z.object({consent:z.literal(true)}).strict().parse(await json(request));db.budget('work-publish:'+owner,30,86400000);return finish(reply({work:submitWork(db,owner,ids.parse(p[1]),body.consent)}));}
      if(p.length===3&&p[2]==='withdraw'&&method==='POST'){z.object({confirm:z.literal(true)}).strict().parse(await json(request));return finish(reply({work:withdrawWork(db,owner,ids.parse(p[1]))}));}
      if(p.length===3&&p[2]==='image'&&method==='GET'){const work=getWork(db,owner,ids.parse(p[1])),bytes=readWork(db,work);return finish(new NextResponse(new Uint8Array(bytes),{headers:{'Content-Type':work.contentType,'Content-Length':String(bytes.length),'Content-Disposition':(request.nextUrl.searchParams.has('download')?'attachment':'inline')+'; filename="vibephoto-work.'+(work.contentType==='image/jpeg'?'jpg':work.contentType.split('/')[1])+'"'}}));}
      throw new StudioError('NOT_FOUND',404);
    }
    if(p.length===1&&p[0]==='projects'&&method==='POST') {
      db.budget('project:global',300,86400000);db.budget('project:'+owner,20,86400000);
      const body=z.object({settings:settings.optional()}).strict().parse(await json(request));return finish(reply({project:db.create(owner,body.settings)},201));
    }
    if(p[0]!=='projects'||p.length<2)throw new StudioError('NOT_FOUND',404);
    const id=ids.parse(p[1]);
    if(p.length===2) {
      if(method==='GET')return finish(reply({project:db.view(db.get(owner,id))}));
      if(method==='PATCH'){const body=z.object({settings,revision:z.number().int().positive()}).strict().parse(await json(request));return finish(reply({project:db.update(owner,id,body.settings,body.revision)}));}
      if(method==='DELETE'){db.delete(owner,id);return finish(reply({deleted:true}));}
    }
    if(p.length===3&&p[2]==='sequel'&&method==='POST'){const body=z.object({placeId:z.string().max(40).refine(id=>PLACES.some(p=>p.id===id)),revision:z.number().int().positive(),reuseReferences:z.literal(true)}).strict().parse(await json(request));db.get(owner,id);db.budget('project:global',300,86400000);db.budget('project:'+owner,20,86400000);return finish(reply({project:db.sequel(owner,id,body.placeId,body.revision)},201));}
    if(p.length===3&&p[2]==='remix'&&method==='POST') {
      const body=z.object({revision:z.number().int().positive(),planRevision:z.number().int().positive().optional()}).strict().parse(await json(request));
      db.get(owner,id);db.budget('project:global',300,86400000);db.budget('project:'+owner,20,86400000);
      return finish(reply({project:db.remix(owner,id,body.revision,body.planRevision)},201));
    }
    if(p.length===3&&p[2]==='builtin-reference'&&method==='POST') {
      const body=z.object({role:z.enum(['companion','location']),consent:z.literal(true),revision:z.number().int().positive()}).strict().parse(await json(request));
      const project=db.get(owner,id);if(project.revision!==body.revision)throw new StudioError('STALE_PLAN',409);
      db.budget('upload:global',600,86400000);db.budget('upload:'+owner,36,86400000);
      const input=builtinReference(project.settings,body.role);if(input.buffer.length>MAX_IMAGE_BYTES)throw new StudioError('IMAGE_SIZE',413);
      const metadata=await inspectImage(input.buffer);
      return finish(reply({project:db.addBuiltinReference(owner,id,body.role,input.buffer,{...metadata,...input.metadata},true,body.revision)},201));
    }
    if(p.length===3&&p[2]==='prepare-references'&&method==='POST') {
      const body=z.object({consent:z.literal(true),revision:z.number().int().positive()}).strict().parse(await json(request));
      const project=db.get(owner,id);if(project.revision!==body.revision)throw new StudioError('STALE_PLAN',409);
      const roles:('companion'|'location')[]=[];
      if(['companion','frog'].includes(project.settings.play||'')&&!project.companionId&&characterFor(project.settings)?.artwork)roles.push('companion');
      if(!project.locationId&&PLACES.find(p=>p.id===project.settings.placeId)?.sha256)roles.push('location');
      if(roles.length){db.budget('upload:global',600,86400000);db.budget('upload:'+owner,36,86400000);}
      const inputs=await Promise.all(roles.map(async role=>{const input=builtinReference(project.settings,role);return {role,buffer:input.buffer,metadata:{...await inspectImage(input.buffer),...input.metadata}};}));
      return finish(reply({project:db.prepareBuiltinReferences(owner,id,inputs,true,body.revision)}));
    }
    if(p.length===3&&p[2]==='references'&&method==='POST') {
      if(!request.headers.get('content-length')||Number(request.headers.get('content-length'))>MAX_IMAGE_BYTES+32768)throw new StudioError('BODY_SIZE',413);
      db.get(owner,id);db.budget('upload:global',600,86400000);db.budget('upload:'+owner,36,86400000);
      const form=await request.formData(), role=z.enum(['identity','composition','companion','location']).parse(form.get('role')), file=form.get('file');
      const revision=z.coerce.number().int().positive().parse(form.get('revision'));
      if(db.get(owner,id).revision!==revision)throw new StudioError('STALE_PLAN',409);
      if(!(file instanceof File))throw new StudioError('INVALID_INPUT');
      if(file.size>MAX_IMAGE_BYTES)throw new StudioError('IMAGE_SIZE',413);
      const bytes=Buffer.from(await file.arrayBuffer());let metadata;
      try {metadata=await inspectImage(bytes);}catch{throw new StudioError('IMAGE_FORMAT');}
      const project=db.addReference(owner,id,role,bytes,metadata,form.get('consent')==='true',revision);return finish(reply({project},201));
    }
    if(p.length===4&&p[2]==='references'&&method==='DELETE') {
      const role=z.enum(['identity','composition','companion','location']).parse(p[3]);
      const body=z.object({revision:z.number().int().positive()}).strict().parse(await json(request));
      return finish(reply({project:db.removeReference(owner,id,role,body.revision)}));
    }
    if(p.length===3&&p[2]==='submissions'&&method==='POST') {
      const input=z.object({command:commandSchema,priorJobId:ids.nullable()}).strict().parse(await json(request));
      const project=db.get(owner,id);if(input.command.kind==='set')throw new StudioError('SINGLE_SHOT_REQUIRED',409);
      if(!sessionCapability().enabled)throw new StudioError(capabilities().enabled?'SHOOT_ACCESS_REQUIRED':'GENERATION_DISABLED',503);
      authorizeProject(db,owner,project,providerConfig());
      const entry=prepareSubmission(db,owner,id,input.command,input.priorJobId);
      return finish(reply({submission:{key:entry.key,status:entry.status},project:db.view(db.get(owner,id))},201));
    }
    if(p.length===5&&p[2]==='submissions'&&p[4]==='discard'&&method==='POST') {
      z.object({confirm:z.literal(true)}).strict().parse(await json(request));discardSubmission(db,owner,id,ids.parse(p[3]));
      return finish(reply({project:db.view(db.get(owner,id))}));
    }
    const confirming=p.length===5&&p[2]==='submissions'&&p[4]==='confirm'&&method==='POST';
    if((p.length===3&&p[2]==='jobs'&&method==='POST')||confirming) {
      const confirmation=confirming?z.object({acknowledge:z.boolean()}).strict().parse(await json(request)):null;
      const body=confirming?{...readSubmission(db,owner,id,ids.parse(p[3])).command,acknowledge:confirmation!.acknowledge}:commandSchema.parse(await json(request));
      const previous=db.findRequest(owner,id,body.key);
      if(previous)return finish(reply({job:{id:previous.id,status:previous.status},project:db.view(db.get(owner,id))},202));
      const project=db.get(owner,id);
      if(project.revision!==body.revision)throw new StudioError('STALE_PLAN',409);
      if(body.kind==='set')throw new StudioError('SINGLE_SHOT_REQUIRED',409);
      if(!sessionCapability().enabled)throw new StudioError(capabilities().enabled?'SHOOT_ACCESS_REQUIRED':'GENERATION_DISABLED',503);
      const provider=providerConfig();
      if(!provider.formats.includes(project.settings.format))throw new StudioError('FORMAT_UNVERIFIED',409);
      if(db.health().worker!=='online')throw new StudioError('WORKER_OFFLINE',503);
      if(body.kind==='continuation'&&(!body.shotId||!body.coverResultId))throw new StudioError('INVALID_INPUT');
      if(body.kind==='revision'&&(!body.shotId||!body.note))throw new StudioError('INVALID_INPUT');
      if((body.kind==='revision'||db.get(owner,id).compositionId||db.get(owner,id).locationId||(['frog','companion'].includes(db.get(owner,id).settings.play||'')&&db.get(owner,id).companionId))&&process.env.STUDIO_MULTI_REFERENCE_VERIFIED!=='true')throw new StudioError('MULTI_REFERENCE_UNVERIFIED',503);
      db.budget('submit:'+owner,12,86400000);
      const job=db.enqueue(owner,id,body.key,body.kind,body.shotId,body.note,body.acknowledge,body.parentResultId,body.coverResultId,body.revision,provider);return finish(reply({job:{id:job.id,status:job.status},project:db.view(db.get(owner,id))},202));
    }
    if(p.length===5&&p[2]==='jobs'&&p[4]==='stop'&&method==='POST'){const j=db.cancel(owner,id,ids.parse(p[3]));return finish(reply({job:{id:j.id,status:j.status,stopRequested:j.stopRequested}}));}
    if(p.length===3&&p[2]==='continuity'&&method==='POST'){const body=z.object({resultId:ids,revision:z.number().int().positive()}).strict().parse(await json(request));return finish(reply({project:db.approveCover(owner,id,body.resultId,body.revision)}));}
    if(p.length===3&&p[2]==='featured-result'&&method==='POST'){const body=z.object({resultId:ids}).strict().parse(await json(request));return finish(reply({project:db.featureResult(owner,id,body.resultId)}));}
    if(p.length===3&&p[2]==='costs'&&method==='GET')return finish(reply({attempts:db.costs(owner,id),pricing:'渠道账单未核验时金额为空；失败及中断请求也可能产生费用。'}));
    if(p.length===5&&p[2]==='results'&&p[4]==='draft'&&method==='PATCH') {
      const body=z.object({note:z.string().max(400),version:z.number().int().nonnegative()}).strict().parse(await json(request));
      db.get(owner,id);db.budget('revision-draft:'+owner,1200,3600000);
      return finish(reply({draft:db.saveRevisionDraft(owner,id,ids.parse(p[3]),body.note,body.version)}));
    }
    if(p.length===5&&p[2]==='results'&&p[4]==='review'&&method==='POST') {
      const review=z.object({character:z.boolean().optional(),fun:z.boolean().optional(),wouldShare:z.boolean().optional(),identity:z.boolean(),composition:z.boolean(),setConsistency:z.boolean(),accepted:z.boolean()}).strict().parse(await json(request));return finish(reply({project:db.review(owner,id,ids.parse(p[3]),review)}));
    }
    if(p.length===4&&p[2]==='assets'&&method==='GET') {
      const asset=db.asset(owner,id,ids.parse(p[3]));const bytes=db.readAsset(asset);
      return finish(new NextResponse(new Uint8Array(bytes),{headers:{'Content-Type':asset.contentType,'Content-Disposition':(request.nextUrl.searchParams.has('download')?'attachment':'inline')+'; filename="vibephoto-'+asset.id+'.'+(asset.contentType==='image/jpeg'?'jpg':asset.contentType.split('/')[1])+'"','Content-Length':String(bytes.length)}}));
    }
    if(p.length===3&&p[2]==='download'&&method==='GET') {
      db.budget('download:'+owner,12);db.budget('download:global',120);const project=db.get(owner,id);if(!project.results.length)throw new StudioError('NO_RESULTS');
      const requested=request.nextUrl.searchParams.get('revision');
      const revision=requested?z.coerce.number().int().positive().parse(requested):project.planRevision;
      const selected=project.results.filter(r=>r.planRevision===revision);if(!selected.length)throw new StudioError('NO_RESULTS');
      const files:Record<string,Uint8Array>={};
      for(const s of SHOTS) {
        const r=(s.id==='cover'&&project.continuity?.planRevision===revision?selected.find(x=>x.id===project.continuity?.resultId):undefined)||selected.filter(x=>x.shotId===s.id).at(-1);if(!r)continue;
        const asset=db.asset(owner,id,r.assetId);files[s.id+'-v'+r.version+'.'+(asset.contentType==='image/jpeg'?'jpg':asset.contentType.split('/')[1])]=new Uint8Array(db.readAsset(asset));
      }
      files['拍摄计划.json']=new TextEncoder().encode(JSON.stringify({planRevision:revision,continuity:project.continuity?.planRevision===revision?project.continuity:null,settings:db.jobs(id).find(j=>j.planRevision===revision)?.snapshot.settings||project.settings,recipe:db.jobs(id).find(j=>j.planRevision===revision)?.snapshot.recipe||project.recipe,results:selected},null,2));
      const bytes=zipSync(files,{level:0});return finish(new NextResponse(new Uint8Array(bytes),{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="vibephoto-'+project.id+'.zip"'}}));
    }
    throw new StudioError('NOT_FOUND',404);
  } catch(e) {
    const code=e instanceof StudioError?e.code:e instanceof z.ZodError?'INVALID_INPUT':'INTERNAL';
    const status=e instanceof StudioError?e.status:e instanceof z.ZodError?400:500;
    if(code==='INTERNAL')console.error('studio_request_failed',{code:'INTERNAL',requestId:randomBytes(6).toString('hex')});
    return finish(reply({error:code,message:errors[code]||'服务暂时不可用，已保存内容不会丢失，请重新加载。'},status));
  }
}
export const GET=handle;export const POST=handle;export const PATCH=handle;export const DELETE=handle;
