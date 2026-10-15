/** Loopback Next with actual Credentials/CSRF login and disposable PostgreSQL. No suppliers. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import type { MarketListingInput } from '../src/contracts/marketplace';
for(const value of [process.env.DATABASE_URL,process.env.DIRECT_URL]){
 const url=new URL(value??'http://invalid');
 if(process.env.ANS_AGRI_WALL_VERIFY!=='true'||url.hostname!=='127.0.0.1'||url.port!=='55449'||url.pathname!=='/ans_agri_wall_verify_20261015')throw new Error('Non-isolated HTTP writes refused');
}
const origin='http://127.0.0.1:3139',dir='.workbuddy/evidence/agri-wall';
interface Fixture {competitionId:string;ownerId:string;email:string;voterId:string;voterEmail:string;moderatorId:string;moderatorEmail:string}
interface Envelope<T>{ok:boolean;data:T;error?:{code:string}}
class Client {
 private cookies=new Map<string,string>();
 constructor(readonly actorId:string|null){}
 async request(path:string,init:RequestInit={}){
  const url=new URL(path,origin);assert.equal(url.origin,origin,'External HTTP requests refused');
  const headers=new Headers(init.headers);headers.set('cookie',[...this.cookies].map(([key,value])=>`${key}=${value}`).join('; '));
  const response=await fetch(url,{...init,headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
  for(const cookie of response.headers.getSetCookie()){const item=cookie.split(';',1)[0],at=item.indexOf('=');if(at>0)this.cookies.set(item.slice(0,at),item.slice(at+1));}
  return response;
 }
 async login(email:string){
  assert.ok(email.endsWith('@example.invalid'));
  const csrf=await this.request('/api/auth/csrf');assert.equal(csrf.status,200);
  const {csrfToken}=await csrf.json() as {csrfToken:string};assert.ok(csrfToken);
  const response=await this.request('/api/auth/callback/credentials',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'},body:new URLSearchParams({csrfToken,email,password:'AgriWall-Local-Verify-2026!',callbackUrl:origin+'/explore/agrihackathon'})});
  assert.equal(response.status,200);const login=await response.json() as {url?:string};assert.ok(login.url&&!new URL(login.url).searchParams.has('error'),'Fixture credentials refused');
  const session=await (await this.request('/api/auth/session')).json() as {user?:{id:string}};assert.equal(session.user?.id,this.actorId);
 }
 json(path:string,body?:unknown,extra:Record<string,string>={},method='POST'){
  return this.request(path,{headers:{...(this.actorId?{'x-ans-actor':this.actorId}:{}),...(body?{origin,'content-type':'application/json'}:{}),...extra},...(body?{method,body:JSON.stringify(body)}:{})});
 }
 async data<T>(path:string,body?:unknown,status=200,method='POST'){
  const response=await this.json(path,body,{},method);const envelope=await response.json() as Envelope<T>;
  assert.equal(response.status,status,`Unexpected status at ${path}: ${envelope.error?.code}`);assert.equal(envelope.ok,true);return envelope.data;
 }
}
async function main(){
 const {db}=await import('../src/lib/db');
 const fixture=JSON.parse(await readFile(dir+'/browser-fixture.json','utf8')) as Fixture;
 assert.equal(fixture.competitionId,process.env.ANS_AGRIHACKATHON_COMPETITION_ID);
 const owner=new Client(fixture.ownerId),voter=new Client(fixture.voterId),moderator=new Client(fixture.moderatorId),anonymous=new Client(null);
 const checks:Array<{label:string;passed:boolean}>=[];let current='prepare';
 const report={checks,passed:false,loopbackOrigin:origin,isolatedPostgres:true,actualCredentials:true,productionWrites:false,externalRequests:0,modelCalls:0};
 const check=async(label:string,run:()=>Promise<void>)=>{current=label;await run();checks.push({label,passed:true});console.log('[wall-http] PASS '+label);};
 try{
  await check('actual CSRF credentials login authenticates owner, visitor and moderator accounts',async()=>{for(const [client,email] of [[owner,fixture.email],[voter,fixture.voterEmail],[moderator,fixture.moderatorEmail]] as const)await client.login(email);});
  const slug='wall-http-'+randomUUID();
  const team=await db.team.create({data:{name:'LOCAL HTTP FIXTURE team',slug,ownerId:fixture.ownerId},select:{id:true}});
  await db.teamMember.create({data:{teamId:team.id,userId:fixture.ownerId,role:'OWNER'}});
  const entry=await db.teamCompetition.create({data:{teamId:team.id,competitionId:fixture.competitionId},select:{id:true}});
  const payload:MarketListingInput={slug,title:'LOCAL HTTP FIXTURE external orchard project',summary:'Synthetic HTTP verification of an entirely external project.',description:'Synthetic local project content for the complete publishing and moderator approval HTTP journey.',category:'competition',subcategory:'agri-wall',fulfillment:'resource',priceMinor:0,currency:'CNY',deliveryDays:1,revisionLimit:0,computeIncluded:false,deliverables:['Public project demo'],licenseTerms:'Synthetic local test license; no production project.',usageUrl:'https://example.invalid/http-demo'};
  let listingId='';
  await check('HTTP project creation stores a free agri-wall draft without starting a model or charging points',async()=>{
   const before=await db.user.findUniqueOrThrow({where:{id:fixture.ownerId},select:{quotaPoints:true}});
   const data=await owner.data<{listing:{id:string;status:string}}>('/api/market/listings',payload,201);listingId=data.listing.id;assert.equal(data.listing.status,'DRAFT');
   assert.equal((await db.user.findUniqueOrThrow({where:{id:fixture.ownerId},select:{quotaPoints:true}})).quotaPoints,before.quotaPoints);
   const saved=await db.marketListingVersion.findUniqueOrThrow({where:{listingId_version:{listingId,version:1}},select:{payload:true}});assert.equal((saved.payload as unknown as MarketListingInput).subcategory,'agri-wall');
  });
  await check('HTTP submit and moderator review publish the exact version and expose a normal public detail',async()=>{
   await owner.data('/api/market/listings/'+listingId,{action:'submit',expectedVersion:1});
   const beforeReview=await voter.json('/api/admin/market/'+listingId,{version:1,approve:true,note:'FORBIDDEN synthetic approval'});assert.equal(beforeReview.status,403);
   await moderator.data('/api/admin/market/'+listingId,{version:1,approve:true,note:'LOCAL HTTP FIXTURE approved for verification'});
   const publicPage=await anonymous.request('/market/'+slug);assert.equal(publicPage.status,200);assert.ok((await publicPage.text()).includes(payload.title));
   const owned=await owner.data<{listing:{status:string;version:number;listing:MarketListingInput}}>('/api/market/listings/'+listingId);assert.equal(owned.listing.status,'PUBLISHED');assert.equal(owned.listing.version,1);assert.equal(owned.listing.listing.title,payload.title);
  });
  const bind={action:'bind',teamCompetitionId:entry.id,listingId,expectedVersion:1};
  await check('wall HTTP refuses stale actors, anonymous private reads, cross-origin and forged commands',async()=>{
   assert.equal((await owner.json('/api/competitions/agrihackathon/wall',undefined,{'x-ans-actor':fixture.voterId})).status,409);
   assert.equal((await anonymous.json('/api/competitions/agrihackathon/wall/mine')).status,401);
   assert.equal((await owner.json('/api/competitions/agrihackathon/wall',bind,{origin:'https://outsider.example.invalid'})).status,403);
   assert.equal((await owner.json('/api/competitions/agrihackathon/wall',{...bind,actorId:fixture.ownerId})).status,400);
   assert.equal((await owner.json('/api/competitions/agrihackathon/wall',{...bind,decidedAt:'2026-10-15T00:00:00Z'})).status,400);
   assert.equal(await db.agriWallEntry.count({where:{teamCompetitionId:entry.id}}),0);
  });
  await check('authenticated non-manager cannot bind someone else’s entry',async()=>{
   const response=await voter.json('/api/competitions/agrihackathon/wall',bind);assert.equal(response.status,403);assert.equal((await response.json() as Envelope<unknown>).error?.code,'AGRI_TEAM_MANAGER_REQUIRED');
   assert.equal(await db.agriWallEntry.count({where:{teamCompetitionId:entry.id}}),0);
  });
  await check('real PUT Star retries keep one ordinary Star and create no competition vote for an unbound listing',async()=>{
   const path='/api/market/listings/'+listingId+'/star';
   for(let i=0;i<3;i++){const data=await voter.data<{starCount:number;starred:boolean}>(path,{starred:true},200,'PUT');assert.equal(data.starCount,1);assert.equal(data.starred,true);}
   assert.equal(await db.marketListingStar.count({where:{listingId,userId:fixture.voterId}}),1);
   assert.equal(await db.agriPopularityVote.count({where:{wallEntry:{listingId}}}),0);
   const anonymousState=await anonymous.data<{starCount:number;starred:boolean}>(path);assert.equal(anonymousState.starCount,1);assert.equal(anonymousState.starred,false);
   for(let i=0;i<2;i++){const data=await voter.data<{starCount:number;starred:boolean}>(path,{starred:false},200,'PUT');assert.equal(data.starCount,0);assert.equal(data.starred,false);}
   assert.equal(await db.marketListingStar.count({where:{listingId}}),0);
  });
  await check('Star HTTP rejects switched accounts and cross-origin PUT before persistence',async()=>{
   const path='/api/market/listings/'+listingId+'/star';
   assert.equal((await voter.json(path,{starred:true},{'x-ans-actor':fixture.ownerId},'PUT')).status,409);
   assert.equal((await voter.json(path,{starred:true},{origin:'https://outsider.example.invalid'},'PUT')).status,403);
   assert.equal(await db.marketListingStar.count({where:{listingId}}),0);
  });
  report.passed=true;await mkdir(dir,{recursive:true});await writeFile(dir+'/http-verification.json',JSON.stringify(report,null,2)+'\n');
 }catch(error){await writeFile(dir+'/http-verification.json',JSON.stringify({...report,current,error:error instanceof Error?error.message:'HTTP verification failed'},null,2)+'\n');throw error;}
 finally{await db.$disconnect();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'HTTP verification failed');process.exitCode=1;});
