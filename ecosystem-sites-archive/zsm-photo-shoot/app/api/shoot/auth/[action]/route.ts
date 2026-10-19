import {NextRequest,NextResponse} from 'next/server';
import {createHash,randomBytes} from 'node:crypto';
import {z} from 'zod';
import {store,StudioError} from '@/runtime/store.mjs';
import {resolveOwner} from '@/runtime/access.mjs';
import {storyLink} from '@/runtime/stories.mjs';
import {shootSettingsSchema} from '@/app/lib/shoot-settings-schema';
import {ACCOUNT_COOKIE,FLOW_COOKIE,ACCOUNT_FLOW_MAX_AGE,accountConfig,signedAccount,startAccountFlow,takeAccountFlow,completeAccountFlow,logoutAccount,type AccountIntent} from '@/runtime/accounts.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
const base=process.env.NEXT_PUBLIC_BASE_PATH||'';
const options={httpOnly:true,secure:process.env.STUDIO_PUBLIC_ORIGIN?.startsWith('https:')??true,sameSite:'lax' as const,path:base||'/'};
const intentSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('create'),settings:shootSettingsSchema}).strict(),
 z.object({kind:z.literal('continue'),projectId:z.string().uuid(),revision:z.number().int().positive(),copyReferences:z.literal(true)}).strict()
]);
function privateResponse(response:NextResponse){response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer');return response;}
async function handle(req:NextRequest,ctx:{params:Promise<{action:string}>}){
 const db=store(),action=(await ctx.params).action,origin=process.env.STUDIO_PUBLIC_ORIGIN||req.nextUrl.origin;
 let failureReturnTo=base+'/studio?view=library';
 const back=(message?:string)=>{const url=new URL(failureReturnTo,origin);if(message)url.searchParams.set('authError',message);return privateResponse(NextResponse.redirect(url,303));};
 try{
  if(action==='login'&&['GET','POST'].includes(req.method)){
   const c=accountConfig(),anonymous=req.cookies.get('qjb_session_v2')?.value||randomBytes(32).toString('base64url');
   db.budget('login:'+createHash('sha256').update(anonymous).digest('hex'),12,3600000);db.budget('login:global',500,3600000);
   let intent:AccountIntent|null=null,returnTo=req.nextUrl.searchParams.get('returnTo')||base+'/studio?view=library';
   if(req.method==='POST'){
    if(req.headers.get('origin')!==c.origin)throw new StudioError('ORIGIN',403);
    const length=Number(req.headers.get('content-length'));
    if(!length||length>32000||!req.headers.get('content-type')?.startsWith('application/json'))throw new StudioError('INVALID_INPUT');
    const text=await req.text();if(Buffer.byteLength(text)>32000)throw new StudioError('BODY_SIZE',413);
    const body=intentSchema.parse(JSON.parse(text)),existing=signedAccount(db,req.cookies.get(ACCOUNT_COOKIE)?.value);
    if(existing)throw new StudioError('ALREADY_SIGNED_IN',409);
    if(body.kind==='create'){
     intent={kind:'create',settings:body.settings};returnTo=base+'/studio?view=intro';
     try{const url=new URL(storyLink(body.settings,c.origin+base+'/studio'));returnTo=url.pathname+url.search;}catch{}
    }else{
     if(!/^[-_A-Za-z0-9]{43}$/.test(anonymous))throw new StudioError('ACCOUNT_FLOW');
     const owner=resolveOwner(db,createHash('sha256').update(anonymous).digest('hex')),project=db.get(owner,body.projectId);
     if(project.revision!==body.revision)throw new StudioError('STALE_PLAN',409);
     if(db.active(project.id))throw new StudioError('PLAN_LOCKED',409);
     if(db.view(project).pendingSubmission)throw new StudioError('SUBMISSION_PENDING',409);
     intent={kind:'continue',owner,projectId:project.id,revision:project.revision};returnTo=base+'/studio?view=edit&project='+project.id;
    }
   }
   const flow=startAccountFlow(db,returnTo,process.env,intent);
   let destination=flow.url;
   if(req.method==='GET'&&req.nextUrl.searchParams.get('register')==='1'){
    const authorize=new URL(flow.url),signup=new URL('/register',c.issuer);
    signup.searchParams.set('callbackUrl',authorize.pathname+authorize.search);destination=signup.href;
   }
   const response=req.method==='POST'?NextResponse.json({url:destination}):NextResponse.redirect(destination,303);
   response.cookies.set(FLOW_COOKIE,flow.flow,{...options,maxAge:ACCOUNT_FLOW_MAX_AGE});return privateResponse(response);
  }
  if(action==='callback'&&req.method==='GET'){
   if(req.nextUrl.searchParams.getAll('state').length!==1||req.nextUrl.searchParams.getAll('code').length!==1||req.nextUrl.searchParams.has('error'))throw new StudioError('ACCOUNT_FLOW');
   const flow=takeAccountFlow(db,req.cookies.get(FLOW_COOKIE)?.value,req.nextUrl.searchParams.get('state'));failureReturnTo=flow.returnTo;
   const account=await completeAccountFlow(db,flow,req.nextUrl.searchParams.get('code'));
   let destination=account.returnTo;
   if(flow.intent){
    try{
     db.budget('project:global',300,86400000);db.budget('project:'+account.owner,20,86400000);
     const project=flow.intent.kind==='create'?db.create(account.owner,flow.intent.settings):db.continueInAccount(flow.intent.owner,flow.intent.projectId,flow.intent.revision,account.owner);
     destination=base+'/studio?view=edit&project='+project.id;
    }catch{
     const url=new URL(base+'/studio?view=library',origin);url.searchParams.set('authError','账号已登录，但未能继续原计划。原计划与照片仍保留在原浏览器作品中；退出本站可找回。');destination=url.pathname+url.search;
    }
   }
   const response=NextResponse.redirect(new URL(destination,origin),303);
   logoutAccount(db,req.cookies.get(ACCOUNT_COOKIE)?.value);response.cookies.set(ACCOUNT_COOKIE,account.token,{...options,maxAge:7200});response.cookies.set(FLOW_COOKIE,'',{...options,maxAge:0});return privateResponse(response);
  }
  if(action==='logout'&&req.method==='POST'){
   if(req.headers.get('origin')!==origin)return privateResponse(NextResponse.json({error:'ORIGIN'},{status:403}));
   logoutAccount(db,req.cookies.get(ACCOUNT_COOKIE)?.value);const response=back();response.cookies.set(ACCOUNT_COOKIE,'',{...options,maxAge:0});return response;
  }
  return privateResponse(NextResponse.json({error:'NOT_FOUND'},{status:404}));
 }catch(error){
  if(req.method==='POST'&&action==='login'){
   const code=error instanceof StudioError?error.code:'INVALID_INPUT';
   const messages:Record<string,string>={STALE_PLAN:'计划已在另一窗口更新，请同步后再登录继续。',PLAN_LOCKED:'当前镜头仍在拍摄，请完成后再继续。',SUBMISSION_PENDING:'请先处理当前待确认请求，再登录继续。',ALREADY_SIGNED_IN:'账号已登录，请同步状态后继续。',RATE_LIMIT:'登录请求过于频繁，请稍后再试。',ACCOUNT_DISABLED:'账号服务暂时不可用，原计划已保留。',NOT_FOUND:'原计划已到期或不属于当前浏览器，请同步后再试。'};
   return privateResponse(NextResponse.json({error:code,message:messages[code]||'登录准备未完成，原计划已保留，请同步后再试。'},{status:error instanceof StudioError?error.status:400}));
  }
  const response=back('登录未完成，请重新通过 ANS 登录。');response.cookies.set(FLOW_COOKIE,'',{...options,maxAge:0});return response;
 }
}
export const GET=handle;export const POST=handle;
