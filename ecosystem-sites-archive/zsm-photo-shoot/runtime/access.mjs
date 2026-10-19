import { execFileSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { StudioError } from './store.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function initializeAccess(db){db.exec(`
 CREATE TABLE IF NOT EXISTS shoot_access(id TEXT PRIMARY KEY,owner TEXT NOT NULL,data TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS shoot_access_owner ON shoot_access(owner);
 CREATE TABLE IF NOT EXISTS access_charges(job TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,shot TEXT NOT NULL,budgetKey TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(job,shot));
 CREATE TABLE IF NOT EXISTS account_gifts(owner TEXT PRIMARY KEY REFERENCES accounts(owner),grantId TEXT UNIQUE NOT NULL REFERENCES shoot_access(id),created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS recovery(owner TEXT PRIMARY KEY,hash TEXT UNIQUE NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,owner TEXT NOT NULL,expires INTEGER NOT NULL);
`);}
export function resolveOwner(store,sessionHash){const alias=store.db.prepare('SELECT owner FROM sessions WHERE hash=? AND expires>?').get(sessionHash,Date.now());return alias?.owner&&!store.db.prepare('SELECT owner FROM accounts WHERE owner=?').get(alias.owner)?alias.owner:sessionHash;}
export function issueRecovery(store,owner){
 const code=randomBytes(32).toString('base64url');
 store.db.prepare('INSERT INTO recovery VALUES(?,?,?) ON CONFLICT(owner) DO UPDATE SET hash=excluded.hash,expires=excluded.expires').run(owner,hash(code),Date.now()+30*86400000);
 return code;
}
export function recoverSession(store,currentOwner,sessionHash,code){return store.transaction(()=>{
 const found=store.db.prepare('SELECT owner,expires FROM recovery WHERE hash=? AND expires>?').get(hash(code),Date.now());
 if(!found||store.db.prepare('SELECT owner FROM accounts WHERE owner=?').get(found.owner))throw new StudioError('RECOVERY_INVALID',404);
 if(found.owner!==currentOwner&&store.list(currentOwner).length)throw new StudioError('SESSION_NOT_EMPTY',409);
 store.db.prepare('INSERT INTO sessions VALUES(?,?,?) ON CONFLICT(hash) DO UPDATE SET owner=excluded.owner,expires=excluded.expires').run(sessionHash,found.owner,found.expires);
 return found.owner;
});}
export function grantAccess(store,{owner,label,channel,model,limit,budgetKey,referenceHashes,expiresAt}){
 if(!owner||!label||!['McGrox','OpenLux'].includes(channel)||!Number.isInteger(limit)||limit<=0||limit>100||!budgetKey||!Number.isSafeInteger(expiresAt)||expiresAt<=Date.now()||!referenceHashes?.identity||Object.entries(referenceHashes).some(([k,v])=>!['identity','companion','location'].includes(k)||!/^[a-f0-9]{64}$/.test(v)))throw new StudioError('INVALID_INPUT');
 const g={id:randomUUID(),owner,label,channel,model,limit,budgetKey,referenceHashes,expiresAt,revoked:false};
 store.db.prepare('INSERT INTO shoot_access VALUES(?,?,?)').run(g.id,owner,JSON.stringify(g));return g;
}
// One permanent welcome allocation per verified ANS subject, independent of project retention.
// Only the web server issues gifts; the worker verifies the persisted grant without OIDC secrets.

function callAnsQuotaBridge(payload, env=process.env) {
 const url=env.ANS_QUOTA_BRIDGE_URL||'https://38.76.193.254:8443/quota';
 const key=env.ANS_QUOTA_BRIDGE_KEY||'';
 if(!url||!key)return null;
 try {
  const out=execFileSync('curl',['-sk','-m','4','-X','POST',url,'-H','Authorization: Bearer '+key,'-H','Content-Type: application/json','-d',JSON.stringify(payload)],{encoding:'utf8'});
  return JSON.parse(out);
 } catch { return null; }
}
function syncAnsQuotaPoints(store, owner, g, env=process.env) {
 const acc=store.db.prepare('SELECT subject FROM accounts WHERE owner=?').get(owner);
 if(!acc?.subject)return g;
 const res=callAnsQuotaBridge({operation:'balance',subject:acc.subject},env);
 if(!res||!res.ok||!Number.isFinite(Number(res.balance)))return g;
 const ansBalance=Math.max(0,Math.floor(Number(res.balance)));
 const usedCount=usage(store,g), reservedCount=reserved(store,g);
 const ansShots=Math.floor(ansBalance/2);
 const newLimit=usedCount+reservedCount+ansShots;
 const newLabel='ANS 算力积分 ('+ansBalance+' 点 · 2点/张)';
 if(g.limit!==newLimit||g.label!==newLabel||g.ansBalance!==ansBalance){
  g.limit=newLimit;g.label=newLabel;g.ansBalance=ansBalance;
  store.db.prepare('UPDATE shoot_access SET data=? WHERE id=? AND owner=?').run(JSON.stringify(g),g.id,owner);
 }
 return g;
}

export function ensureAccountGift(store,owner,provider,env=process.env){
 if(provider.channel!=='OpenLux'||provider.model!=='gpt-image-2.5-sunburst-c')return null;
 return store.transaction(()=>{
  if(!store.db.prepare('SELECT owner FROM accounts WHERE owner=?').get(owner))throw new StudioError('ACCOUNT_REQUIRED',401);
  const issued=store.db.prepare('SELECT grantId FROM account_gifts WHERE owner=?').get(owner);
  if(issued){const row=store.db.prepare('SELECT data FROM shoot_access WHERE id=? AND owner=?').get(issued.grantId,owner);return row?syncAnsQuotaPoints(store,owner,JSON.parse(row.data),env):null;}
  const g={id:randomUUID(),owner,label:'ANS 算力积分',scope:'account',channel:provider.channel,model:provider.model,limit:0,budgetKey:'gift:ans-welcome-v1:'+hash(owner),referenceHashes:{},expiresAt:253402300799000,revoked:false};
  store.db.prepare('INSERT INTO shoot_access VALUES(?,?,?)').run(g.id,owner,JSON.stringify(g));
  store.db.prepare('INSERT INTO account_gifts VALUES(?,?,?)').run(owner,g.id,Date.now());return syncAnsQuotaPoints(store,owner,g,env);
 });
}
const usage=(store,g)=>Number(store.db.prepare('SELECT value FROM counters WHERE key=?').get(g.budgetKey)?.value||0);
const reserved=(store,g,exclude)=>store.db.prepare("SELECT data FROM jobs WHERE status IN ('queued','running')").all().map(r=>JSON.parse(r.data)).filter(j=>j.id!==exclude&&j.accessBudgetKey===g.budgetKey).reduce((n,j)=>n+j.targets.filter(s=>!j.completed.includes(s)&&!store.db.prepare('SELECT shot FROM access_charges WHERE job=? AND shot=?').get(j.id,s)).length,0);
export function accessRemaining(store,g,exclude){return Math.max(0,g.limit-usage(store,g)-reserved(store,g,exclude));}
function candidates(store,owner){return store.db.prepare('SELECT data FROM shoot_access WHERE owner=?').all(owner).map(r=>JSON.parse(r.data)).filter(g=>!g.revoked&&g.expiresAt>Date.now());}
export function ownerAccess(store,owner,provider){
 const grants=candidates(store,owner).filter(g=>g.channel===provider.channel&&g.model===provider.model);
 const remaining=grants.reduce((max,g)=>Math.max(max,accessRemaining(store,g)),0);
 const gift=grants.find(g=>g.scope==='account');
 return {enabled:remaining>0,remaining:Math.max(0,remaining),label:grants[0]?.label||'ANS 算力积分 (2点/张)',gift:null,costPointsPerShot:2};
}
export function authorizeProject(store,owner,project,provider,needed=1,exclude,selectedId){
 const grants=candidates(store,owner).filter(g=>g.channel===provider.channel&&g.model===provider.model);
 if(!grants.length)throw new StudioError('SHOOT_ACCESS_REQUIRED',403);
 const matched=grants.filter(g=>{
  if(project.compositionId)return false;
  if(g.scope==='account')return !!store.db.prepare('SELECT owner FROM accounts WHERE owner=?').get(owner)&&!!store.db.prepare('SELECT id FROM projects WHERE id=? AND owner=?').get(project.id,owner);
  if(g.scope&&g.scope!=='references')return false;
  return Object.entries(g.referenceHashes).every(([role,sha])=>project[role+'Id']&&store.asset(owner,project.id,project[role+'Id']).sha256===sha)&&['identity','companion','location'].every(role=>!project[role+'Id']||g.referenceHashes[role]===store.asset(owner,project.id,project[role+'Id']).sha256);
 });
 if(!matched.length)throw new StudioError('SHOOT_REFERENCE_SCOPE',403);
 const allowed=matched.find(g=>(!selectedId||g.id===selectedId)&&accessRemaining(store,g,exclude)>=needed);
 if(!allowed)throw new StudioError('SHOOT_QUOTA_EXHAUSTED',429);
 return allowed;
}
export function dailyDispatchStatus(store,env=process.env){
 const limit=Math.max(0,Number(env.STUDIO_DAILY_REQUEST_LIMIT)||0),now=Date.now();
 const row=store.db.prepare('SELECT value,expires FROM counters WHERE key=?').get('provider:'+new Date(now).toISOString().slice(0,10));
 const used=row?.expires>now?Number(row.value):0;
 return {limit,used,remaining:Math.max(0,limit-used)};
}
export function consumeAccess(store,job,provider,dailyLimit,shotId){return store.transaction(()=>{
 const shot=shotId||job.targets.find(s=>!job.completed.includes(s));
 if(!shot||!job.targets.includes(shot)||store.db.prepare('SELECT shot FROM access_charges WHERE job=? AND shot=?').get(job.id,shot))throw new StudioError('SHOOT_ALREADY_DISPATCHED',409);
 const raw=job.accessId&&store.db.prepare('SELECT data FROM shoot_access WHERE id=? AND owner=?').get(job.accessId,job.snapshot.owner);
 if(!raw)throw new StudioError('SHOOT_ACCESS_REQUIRED',403);
 const g=JSON.parse(raw.data);
 if(g.revoked||g.expiresAt<=Date.now())throw new StudioError('SHOOT_ACCESS_EXPIRED',403);
 const authorized=authorizeProject(store,job.snapshot.owner,job.snapshot,provider,1,job.id,job.accessId);
 if(authorized.id!==g.id||g.budgetKey!==job.accessBudgetKey)throw new StudioError('SHOOT_ACCESS_REQUIRED',403);
 const key='provider:'+new Date().toISOString().slice(0,10),t=Date.now(),daily=store.db.prepare('SELECT * FROM counters WHERE key=?').get(key);
 if(!(dailyLimit>0)||(daily?.expires>t&&daily.value>=dailyLimit))throw new StudioError('RATE_LIMIT',429);
 // Lifetime authorization ledger is never reset by expiry, cancellation or failure.
 const n=usage(store,g);if(n>=g.limit)throw new StudioError('SHOOT_QUOTA_EXHAUSTED',429);
 if(g.scope==='account'){
  const acc=store.db.prepare('SELECT subject FROM accounts WHERE owner=?').get(job.snapshot.owner);
  if(!acc?.subject)throw new StudioError('SHOOT_ACCESS_REQUIRED',403);
  const res=callAnsQuotaBridge({operation:'reserve',subject:acc.subject,refId:'zsm:'+job.id+':'+shot,refType:'vibephoto-shot',costPoints:2,note:'VibePhoto 知微影像 AI 合影出片 (2点/张)'});
  if(!res||!res.ok)throw new StudioError('SHOOT_QUOTA_EXHAUSTED',429);
 }
 store.db.prepare('INSERT INTO access_charges VALUES(?,?,?,?)').run(job.id,shot,g.budgetKey,t);
 store.db.prepare('INSERT INTO counters VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires=MAX(counters.expires,excluded.expires)').run(g.budgetKey,n+1,g.expiresAt);
 store.db.prepare('INSERT INTO counters VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires=excluded.expires').run(key,daily?.expires>t?daily.value+1:1,daily?.expires>t?daily.expires:t+86400000);
});}
export function purgeAccess(store){const t=Date.now();store.db.prepare('DELETE FROM sessions WHERE expires<=?').run(t);store.db.prepare('DELETE FROM recovery WHERE expires<=?').run(t);}

export function refundAccess(store,job,shotId,env=process.env){
 try {
  const shot=shotId||job.targets[0];
  const acc=store.db.prepare('SELECT subject FROM accounts WHERE owner=?').get(job.snapshot.owner);
  if(acc?.subject){
   callAnsQuotaBridge({operation:'settle',subject:acc.subject,refId:'zsm:'+job.id+':'+shot,refType:'vibephoto-shot',costPoints:2,actualCostPoints:0,success:false,note:'VibePhoto AI 合影出片未成功退回积分 (2点)'},env);
  }
  const raw=job.accessId&&store.db.prepare('SELECT data FROM shoot_access WHERE id=? AND owner=?').get(job.accessId,job.snapshot.owner);
  if(raw){
   const g=JSON.parse(raw.data);
   const n=usage(store,g);
   if(n>0)store.db.prepare('UPDATE counters SET value=? WHERE key=?').run(n-1,g.budgetKey);
   store.db.prepare('DELETE FROM access_charges WHERE job=? AND shot=?').run(job.id,shot);
   syncAnsQuotaPoints(store,job.snapshot.owner,g,env);
  }
 } catch {}
}
