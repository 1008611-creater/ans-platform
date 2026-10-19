import {createHash,randomBytes,createPublicKey,verify,timingSafeEqual} from 'node:crypto';
import {StudioError} from './store.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
export const ACCOUNT_COOKIE='vp_ans_session';
export const FLOW_COOKIE='vp_ans_flow';
// Pending login/registration, not the authorization code or signed session lifetime.
export const ACCOUNT_FLOW_MAX_AGE=30*60;
export function initializeAccounts(db){db.exec(`
CREATE TABLE IF NOT EXISTS accounts(owner TEXT PRIMARY KEY,subject TEXT UNIQUE NOT NULL,name TEXT NOT NULL,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS account_sessions(hash TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES accounts(owner),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS account_flows(hash TEXT PRIMARY KEY,data TEXT NOT NULL,expires INTEGER NOT NULL);
`);}
export function accountConfig(env=process.env){
 if(env.STUDIO_ANS_AUTH_ENABLED!=='true')throw new StudioError('ACCOUNT_DISABLED',503);
 const issuer=env.STUDIO_ANS_ISSUER||'https://ans.cauai.fun',origin=env.STUDIO_PUBLIC_ORIGIN,clientId=env.STUDIO_ANS_CLIENT_ID,secret=env.STUDIO_ANS_CLIENT_SECRET,base=env.NEXT_PUBLIC_BASE_PATH||'';
 if(issuer!=='https://ans.cauai.fun'||!origin||!clientId||!secret||secret.length<32)throw new StudioError('ACCOUNT_DISABLED',503);
 const url=new URL(origin);if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||(url.protocol!=='https:'&&url.hostname!=='localhost'))throw new StudioError('ACCOUNT_DISABLED',503);
 return {issuer,origin:url.origin,clientId,secret,callback:url.origin+base+'/api/shoot/auth/callback',base};
}
export function signedAccount(store,token){
 if(!token||!/^[-_A-Za-z0-9]{43}$/.test(token))return null;
 const row=store.db.prepare('SELECT accounts.owner,accounts.name,account_sessions.expires FROM account_sessions JOIN accounts ON accounts.owner=account_sessions.owner WHERE hash=? AND expires>?').get(hash(token),Date.now());
 return row?{owner:row.owner,name:row.name,expiresAt:row.expires}:null;
}
export function accountPublic(account,env=process.env){let enabled=false;try{accountConfig(env);enabled=true;}catch{}return {enabled,giftOffered:false,signedIn:!!account,name:account?.name||null,expiresAt:account?.expiresAt||null};}
export function startAccountFlow(store,returnTo,env=process.env,intent=null){
 const c=accountConfig(env),target=new URL(returnTo||c.base+'/studio?view=library',c.origin);
 if(target.origin!==c.origin||target.pathname!==c.base+'/studio'||target.hash||['code','state','error'].some(k=>target.searchParams.has(k)))throw new StudioError('INVALID_INPUT');
 const flow=randomBytes(32).toString('base64url'),state=randomBytes(32).toString('base64url'),nonce=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
 store.db.prepare('INSERT INTO account_flows VALUES(?,?,?)').run(hash(flow),JSON.stringify({state,nonce,verifier,returnTo:target.pathname+target.search,...(intent?{intent}:{})}),Date.now()+ACCOUNT_FLOW_MAX_AGE*1000);
 const url=new URL(c.issuer+'/api/oidc/authorize');url.search=new URLSearchParams({response_type:'code',client_id:c.clientId,redirect_uri:c.callback,scope:'openid profile',state,nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
 return {flow,url:url.href};
}
export function takeAccountFlow(store,token,state){return store.transaction(()=>{
 if(!token||!/^[-_A-Za-z0-9]{43}$/.test(token))throw new StudioError('ACCOUNT_FLOW',400);
 const row=store.db.prepare('SELECT data,expires FROM account_flows WHERE hash=?').get(hash(token));
 if(!row||row.expires<=Date.now())throw new StudioError('ACCOUNT_FLOW',400);
 const flow=JSON.parse(row.data);if(!equal(flow.state,state))throw new StudioError('ACCOUNT_FLOW',400);
 store.db.prepare('DELETE FROM account_flows WHERE hash=?').run(hash(token));return flow;
});}
async function remoteJson(fetcher,url,init){
 const response=await fetcher(url,{...init,redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new StudioError('ACCOUNT_PROVIDER',502);
 const text=await response.text();if(Buffer.byteLength(text)>65536)throw new StudioError('ACCOUNT_PROVIDER',502);
 try{return JSON.parse(text);}catch{throw new StudioError('ACCOUNT_PROVIDER',502);}
}
export function verifyIdentityToken(token,jwks,config,nonce,now=Math.floor(Date.now()/1000)){
 try{
  if(typeof token!=='string'||token.length>12000)throw Error();
  const parts=token.split('.');if(parts.length!==3||parts.some(p=>!/^[A-Za-z0-9_-]+$/.test(p)))throw Error();
  const header=JSON.parse(Buffer.from(parts[0],'base64url')),claims=JSON.parse(Buffer.from(parts[1],'base64url'));
  if(header.alg!=='RS256'||typeof header.kid!=='string')throw Error();
  const matches=jwks.keys?.filter(k=>k.kid===header.kid&&k.kty==='RSA'&&k.alg==='RS256'&&k.use==='sig');if(matches?.length!==1||Buffer.from(matches[0].n,'base64url').length<256)throw Error();
  if(!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key:matches[0],format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error();
  if(claims.iss!==config.issuer||claims.aud!==config.clientId||!equal(claims.nonce,nonce)||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>200||typeof claims.exp!=='number'||claims.exp<=now||claims.exp>now+360||typeof claims.iat!=='number'||claims.iat>now+30||claims.iat<now-360||claims.exp<=claims.iat)throw Error();
  return claims;
 }catch{throw new StudioError('ACCOUNT_IDENTITY',400);}
}
export async function completeAccountFlow(store,flow,code,{env=process.env,fetcher=fetch}={}){
 const c=accountConfig(env);if(typeof code!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(code))throw new StudioError('ACCOUNT_FLOW');
 const form=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:c.callback,code_verifier:flow.verifier});
 const tokens=await remoteJson(fetcher,c.issuer+'/api/oidc/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Authorization:'Basic '+Buffer.from(encodeURIComponent(c.clientId)+':'+encodeURIComponent(c.secret)).toString('base64')},body:form});
 if(tokens.token_type!=='Bearer'||typeof tokens.access_token!=='string')throw new StudioError('ACCOUNT_IDENTITY');
 const jwks=await remoteJson(fetcher,c.issuer+'/api/oidc/jwks'),claims=verifyIdentityToken(tokens.id_token,jwks,c,flow.nonce);
 const user=await remoteJson(fetcher,c.issuer+'/api/oidc/userinfo',{headers:{Authorization:'Bearer '+tokens.access_token}});
 if(user.sub!==claims.sub)throw new StudioError('ACCOUNT_IDENTITY');
 const owner=hash(c.issuer+'\0'+claims.sub),name=typeof user.name==='string'&&user.name.trim()?user.name.trim().slice(0,60):'ANS 用户';
 const token=randomBytes(32).toString('base64url'),expiresAt=Date.now()+2*3600000;
 store.transaction(()=>{store.db.prepare('INSERT INTO accounts VALUES(?,?,?,?) ON CONFLICT(owner) DO UPDATE SET name=excluded.name,updated=excluded.updated').run(owner,claims.sub,name,Date.now());store.db.prepare('INSERT INTO account_sessions VALUES(?,?,?)').run(hash(token),owner,expiresAt);});
 return {token,owner,name,expiresAt,returnTo:flow.returnTo};
}
export function logoutAccount(store,token){if(token)store.db.prepare('DELETE FROM account_sessions WHERE hash=?').run(hash(token));}
export function purgeAccounts(store){const t=Date.now();store.db.prepare('DELETE FROM account_flows WHERE expires<=?').run(t);store.db.prepare('DELETE FROM account_sessions WHERE expires<=?').run(t);}
