import { randomUUID,randomBytes } from "node:crypto";
import { resolveTxt,resolveCname } from "node:dns/promises";
import { db } from "@/lib/db";
import { bindDomainSchema } from "@/contracts/visual-generation";
import { requireVisualOwner } from "./jobs";
import { readLimitedBody } from "./media";
import { VisualPortfolioError } from "./errors";
interface DomainRecord {id:string;ownerId:string;projectId:string;hostname:string;token:string;status:string;providerId:string|null;validation:unknown;}
interface DnsRecord {type:"TXT"|"CNAME";name:string;value:string;}
interface Hostname {id:string;hostname:string;status?:string;ownership_verification?:{type?:string;name?:string;value?:string};ssl?:{status?:string;validation_records?:Array<{txt_name?:string;txt_value?:string;cname?:string;cname_target?:string}>};}
export interface DomainView {id:string;hostname:string;status:string;records:DnsRecord[];}
function dnsTarget(){return bindDomainSchema.shape.hostname.parse(process.env.ANS_VISUAL_CNAME_TARGET);}
export function domainsConfigured(){return process.env.ANS_VISUAL_DOMAINS_ENABLED==="true"&&/^[a-f0-9]{32}$/.test(process.env.CLOUDFLARE_SAAS_ZONE_ID||"")&&!!process.env.CLOUDFLARE_SAAS_TOKEN&&bindDomainSchema.shape.hostname.safeParse(process.env.ANS_VISUAL_CNAME_TARGET).success;}
function view(record:DomainRecord):DomainView {return {id:record.id,hostname:record.hostname,status:record.status,records:[{type:"TXT",name:`_ans-verify.${record.hostname}`,value:record.token},{type:"CNAME",name:record.hostname,value:dnsTarget()},...(Array.isArray(record.validation)?record.validation as DnsRecord[]:[])]};}
export async function listWebsiteDomains(ownerId:string,projectId:string){await requireVisualOwner(db,ownerId,projectId);if(!domainsConfigured())return {available:false,domains:[]};const rows=await db.$queryRaw<DomainRecord[]>`SELECT * FROM visual_website_domains WHERE "ownerId"=${ownerId} AND "projectId"=${projectId} ORDER BY "createdAt" DESC`;return {available:true,domains:rows.map(view)};}
export async function bindWebsiteDomain(ownerId:string,projectId:string,raw:unknown){
 const {hostname}=bindDomainSchema.parse(raw);if(!domainsConfigured())throw new VisualPortfolioError("DOMAINS_NOT_CONFIGURED",503);
 const app=process.env.AUTH_URL?new URL(process.env.AUTH_URL).hostname:"";
 if(hostname===app||hostname.endsWith("."+app)||hostname===dnsTarget())throw new VisualPortfolioError("INVALID_DOMAIN",400);
 return db.$transaction(async tx=>{await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13132028)`;await requireVisualOwner(tx,ownerId,projectId);
  const existing=(await tx.$queryRaw<DomainRecord[]>`SELECT * FROM visual_website_domains WHERE hostname=${hostname}`)[0];
  if(existing){if(existing.ownerId!==ownerId||existing.projectId!==projectId)throw new VisualPortfolioError("DOMAIN_TAKEN",409);return view(existing);}
  const count=await tx.$queryRaw<Array<{count:bigint}>>`SELECT count(*) FROM visual_website_domains WHERE "ownerId"=${ownerId} AND "projectId"=${projectId}`;if(Number(count[0].count)>=5)throw new VisualPortfolioError("DOMAIN_LIMIT",429);
  const id=randomUUID(),token=randomBytes(32).toString("hex");await tx.$executeRaw`INSERT INTO visual_website_domains (id,"ownerId","projectId",hostname,token,"updatedAt") VALUES (${id}::uuid,${ownerId},${projectId},${hostname},${token},NOW())`;
  return view({id,ownerId,projectId,hostname,token,status:"PENDING",providerId:null,validation:null});
 });
}
async function cloudflare(path:string,body?:unknown){
 const response=await fetch(`https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_SAAS_ZONE_ID}/custom_hostnames${path}`,{method:body?"POST":"GET",headers:{authorization:`Bearer ${process.env.CLOUDFLARE_SAAS_TOKEN}`,"content-type":"application/json"},body:body?JSON.stringify(body):undefined,redirect:"error",signal:AbortSignal.timeout(20000)});
 const envelope=JSON.parse(new TextDecoder().decode(await readLimitedBody(response,1_000_000))) as {success?:boolean;result?:Hostname|Hostname[]};
 if(!response.ok||!envelope.success||!envelope.result)throw new VisualPortfolioError("DOMAIN_PROVIDER_UNAVAILABLE",503);return envelope.result;
}
function validationRecords(host:Hostname):DnsRecord[]{const records:DnsRecord[]=[];const ownership=host.ownership_verification;
 if(ownership?.type==="txt"&&ownership.name&&ownership.value)records.push({type:"TXT",name:ownership.name,value:ownership.value});
 for(const value of host.ssl?.validation_records??[]){if(value.txt_name&&value.txt_value)records.push({type:"TXT",name:value.txt_name,value:value.txt_value});if(value.cname&&value.cname_target)records.push({type:"CNAME",name:value.cname,value:value.cname_target});}return records;
}
export async function verifyWebsiteDomain(ownerId:string,id:string,dependencies:{txt?:typeof resolveTxt;cname?:typeof resolveCname;provider?:typeof cloudflare}={}){
 const getTxt=dependencies.txt??resolveTxt,getCname=dependencies.cname??resolveCname,provider=dependencies.provider??cloudflare;
 if(!domainsConfigured())throw new VisualPortfolioError("DOMAINS_NOT_CONFIGURED",503);
 // Commit an uncertain state before any external creation; a crash can only reconcile.
 const prepared=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13132028)`;
  const record=(await tx.$queryRaw<DomainRecord[]>`SELECT * FROM visual_website_domains WHERE id=${id}::uuid AND "ownerId"=${ownerId} FOR UPDATE`)[0];if(!record)throw new VisualPortfolioError("NOT_FOUND",404);
  await requireVisualOwner(tx,ownerId,record.projectId);
  const txt=await getTxt(`_ans-verify.${record.hostname}`).catch(()=>[]);
  if(!txt.some(parts=>parts.join("")===record.token)){
   const status=record.providerId?"PENDING":record.status==="NEEDS_REVIEW"?"NEEDS_REVIEW":"PENDING";
   await tx.$executeRaw`UPDATE visual_website_domains SET status=${status},"updatedAt"=NOW() WHERE id=${id}::uuid`;return {record:{...record,status},owned:false,create:false};
  }
  const create=!record.providerId&&record.status!=="NEEDS_REVIEW";
  if(create)await tx.$executeRaw`UPDATE visual_website_domains SET status='NEEDS_REVIEW',"updatedAt"=NOW() WHERE id=${id}::uuid`;
  return {record,owned:true,create};
 },{timeout:15000});
 const {record}=prepared;if(!prepared.owned)return view(record);
 try{
  let host:Hostname|undefined;
  if(record.providerId){const result=await provider(`/${encodeURIComponent(record.providerId)}`);if(!Array.isArray(result))host=result;}
  else{
   const result=await provider(`?hostname=${encodeURIComponent(record.hostname)}`);if(Array.isArray(result))host=result.find(value=>value.hostname===record.hostname);
   if(!host){
    if(!prepared.create)return view({...record,status:"NEEDS_REVIEW"});
    try{const created=await provider("",{hostname:record.hostname,ssl:{method:"txt",type:"dv"}});if(!Array.isArray(created))host=created;}
    catch{return view({...record,status:"NEEDS_REVIEW"});}
   }
  }
  if(!host||host.hostname!==record.hostname||!/^[a-zA-Z0-9-]{1,120}$/.test(host.id))throw new VisualPortfolioError("DOMAIN_PROVIDER_UNAVAILABLE",503);
  const cnames=await getCname(record.hostname).catch(()=>[]);
  const ready=host.status==="active"&&host.ssl?.status==="active"&&cnames.some(value=>value.toLowerCase().replace(/\.$/,"")===dnsTarget());
  const validation=validationRecords(host),status=ready?"ACTIVE":"PROVISIONING";
  return db.$transaction(async tx=>{await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13132028)`;await requireVisualOwner(tx,ownerId,record.projectId);
   const current=(await tx.$queryRaw<DomainRecord[]>`SELECT * FROM visual_website_domains WHERE id=${id}::uuid AND "ownerId"=${ownerId} FOR UPDATE`)[0];
   if(current.status==="PAUSED"&&record.status!=="PAUSED")return view(current);
   await tx.$executeRaw`UPDATE visual_website_domains SET status=${status},"providerId"=${host.id},validation=${JSON.stringify(validation)}::jsonb,"verifiedAt"=NOW(),"updatedAt"=NOW() WHERE id=${id}::uuid`;
   return view({...record,status,providerId:host.id,validation});
  });
 }catch{throw new VisualPortfolioError("DOMAIN_PROVIDER_UNAVAILABLE",503);}
}
export async function pauseWebsiteDomain(ownerId:string,id:string){return db.$transaction(async tx=>{await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13132028)`;const record=(await tx.$queryRaw<DomainRecord[]>`SELECT * FROM visual_website_domains WHERE id=${id}::uuid AND "ownerId"=${ownerId}`)[0];if(!record)throw new VisualPortfolioError("NOT_FOUND",404);await requireVisualOwner(tx,ownerId,record.projectId);await tx.$executeRaw`UPDATE visual_website_domains SET status='PAUSED',"updatedAt"=NOW() WHERE id=${id}::uuid`;return {paused:true};});}
