/** ANS OIDC relying party. Opaque host-only cookies; no password DB or browser tokens. */
import {randomBytes,createHash,createPublicKey,verify,timingSafeEqual} from 'node:crypto';
const paths=new Set(['/api/auth/session','/api/auth/login','/api/auth/callback','/api/auth/logout','/api/auth/complete.js']);
const loopback=new Set(['127.0.0.1','::1','::ffff:127.0.0.1']);
const hash=s=>createHash('sha256').update(s).digest('base64url');
const random=()=>randomBytes(32).toString('base64url');
const safeEqual=(a,b)=>typeof a==='string'&&typeof b==='string'&&timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)));
function origin(value,local){const u=new URL(value);if(u.origin!==value||u.username||u.password||u.pathname!=='/'||u.search||u.hash||!(u.protocol==='https:'||local&&u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))throw Error('Invalid OIDC origin');return u;}
export function ansAuthConfig(env=process.env,{local=false}={}){
 const names=['ANS_OIDC_ISSUER','ANS_OIDC_CLIENT_ID','ANS_OIDC_CLIENT_SECRET','ANS_PUBLIC_ORIGIN'];
 if(names.every(n=>!env[n]))return {enabled:false};
 if(names.some(n=>!env[n]))throw Error('ANS login configuration incomplete');
 const issuer=origin(env.ANS_OIDC_ISSUER,local),publicUrl=origin(env.ANS_PUBLIC_ORIGIN,local);
 if(!(issuer.origin==='https://ans.cauai.fun'||local&&issuer.protocol==='http:'))throw Error('ANS issuer must be the designated ANS site');
 const clientId=env.ANS_OIDC_CLIENT_ID,clientSecret=env.ANS_OIDC_CLIENT_SECRET;
 if(!/^[A-Za-z0-9._-]{1,100}$/.test(clientId)||typeof clientSecret!=='string'||Buffer.byteLength(clientSecret)<32||clientSecret.length>4096||/[\x00-\x1f\x7f]/.test(clientSecret))throw Error('Invalid ANS client registration');
 return {enabled:true,issuer:issuer.origin,publicOrigin:publicUrl.origin,clientId,clientSecret,local};
}
function cookie(req,name){const entries=(req.headers.cookie??'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'='));if(entries.length!==1)return null;const value=entries[0].slice(name.length+1);return /^[A-Za-z0-9_-]{43}$/.test(value)?value:null;}
async function jsonLimited(response,max=65536){if(Number(response.headers.get('content-length')??0)>max)throw Error('OIDC response too large');let size=0,parts=[];for await(const part of response.body??[]){size+=part.length;if(size>max)throw Error('OIDC response too large');parts.push(Buffer.from(part));}return JSON.parse(Buffer.concat(parts).toString('utf8'));}
export function createAnsAuth(config,{fetchImpl=fetch,now=Date.now}={}){
 const transactions=new Map(),sessions=new Map();
 const secure=config.enabled&&new URL(config.publicOrigin).protocol==='https:';
 const sessionName=secure?'__Host-zhuanji_session':'zhuanji_session',txName=secure?'__Host-zhuanji_oidc_tx':'zhuanji_oidc_tx',silentTxName=secure?'__Host-zhuanji_oidc_silent_tx':'zhuanji_oidc_silent_tx';
 function setCookie(name,value,age){return name+'='+value+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+age+(secure?'; Secure':'');}
 function clean(){for(const map of [transactions,sessions])for(const [key,value] of map)if(value.expires<=now())map.delete(key);}
 function identity(req){clean();const raw=cookie(req,sessionName);return raw?sessions.get(hash(raw))??null:null;}
 function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(data));}
 function redirect(res,url,cookies=[]){res.writeHead(303,{Location:url,'Set-Cookie':cookies,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end();}
 function complete(res,ok,cookies=[]){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Set-Cookie':cookies,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; frame-ancestors 'self'; base-uri 'none'"});res.end('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>ANS 账号衔接</title></head><body data-ok="'+(ok?'1':'0')+'"><script src="/api/auth/complete.js"></script></body></html>');}
 async function upstream(path,options={}){const res=await fetchImpl(config.issuer+path,{...options,signal:AbortSignal.timeout(10000),redirect:'error'});if(!res.ok)throw Error('ANS authentication unavailable');return jsonLimited(res);}
 async function verifyId(token,nonce){
  if(typeof token!=='string'||token.length>16384)throw Error('Invalid identity token');
  const parts=token.split('.');if(parts.length!==3||parts.some(p=>!/^[A-Za-z0-9_-]+$/.test(p)))throw Error('Invalid identity token');
  const header=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.crit||header.jku||header.x5u)throw Error('Invalid identity signature');
  const jwks=await upstream('/api/oidc/jwks');if(!Array.isArray(jwks.keys)||jwks.keys.length>8)throw Error('Invalid signing keys');
  const candidates=jwks.keys.filter(k=>k.kid===header.kid&&k.kty==='RSA'&&k.alg==='RS256'&&k.use==='sig');if(candidates.length!==1)throw Error('Invalid signing key');
  const key=createPublicKey({key:candidates[0],format:'jwk'});if((key.asymmetricKeyDetails?.modulusLength??0)<2048||!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),key,Buffer.from(parts[2],'base64url')))throw Error('Invalid identity signature');
  const claims=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8')),at=Math.floor(now()/1000);
  const audience=claims.aud===config.clientId||Array.isArray(claims.aud)&&claims.aud.length===1&&claims.aud[0]===config.clientId;
  if(claims.iss!==config.issuer||!audience||claims.azp!==undefined&&claims.azp!==config.clientId||!safeEqual(claims.nonce,nonce)||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>256||/[\x00-\x1f]/.test(claims.sub)||!Number.isSafeInteger(claims.exp)||claims.exp<=at||!Number.isSafeInteger(claims.iat)||claims.iat>at+30||claims.iat<at-300||claims.exp-claims.iat>600||claims.nbf!==undefined&&(!Number.isSafeInteger(claims.nbf)||claims.nbf>at))throw Error('Invalid identity claims');
  return claims;
 }
 async function handler(req,res){
  let url;try{url=new URL(req.url,'http://local');}catch{return false;}
  if(!paths.has(url.pathname))return false;
  if(!config.enabled){if(url.pathname==='/api/auth/session'&&req.method==='GET')json(res,200,{enabled:false,user:null});else json(res,503,{error:'ANS统一登录尚未配置。'});return true;}
  if(req.headers.host!==new URL(config.publicOrigin).host||!loopback.has(req.socket.remoteAddress)){json(res,403,{error:'登录入口来源不正确。'});return true;}
  if((req.url??'').length>4096||url.origin!=='http://local'){json(res,400,{error:'登录地址无效。'});return true;}
  if(url.pathname==='/api/auth/complete.js'){
   if(req.method!=='GET'){json(res,405,{error:'只接受GET。'});return true;}
   res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end("parent.postMessage({type:'ans:auth-complete',ok:document.body.dataset.ok==='1'},location.origin);");return true;
  }
  clean();
  let silentCallback=false;
  try{
   if(url.pathname==='/api/auth/session'){
    if(req.method!=='GET'){json(res,405,{error:'只接受GET。'});return true;}
    const session=identity(req);json(res,200,{enabled:true,user:session?{id:session.subject,name:session.name}:null});return true;
   }
   if(url.pathname==='/api/auth/logout'){
    if(req.method!=='POST'){json(res,405,{error:'只接受POST。'});return true;}
    if(req.headers.origin!==config.publicOrigin||req.headers['x-ans-session']!=='logout-v1'){json(res,403,{error:'退出来源不正确。'});return true;}
    const raw=cookie(req,sessionName);if(raw)sessions.delete(hash(raw));res.setHeader('Set-Cookie',setCookie(sessionName,'',0));json(res,200,{ok:true});return true;
   }
   if(req.method!=='GET'){json(res,405,{error:'只接受GET。'});return true;}
   if(url.pathname==='/api/auth/login'){
    const entry=url.searchParams.get('entry'),home=entry?config.loginHomes?.[entry]:config.home||'/',silent=url.searchParams.get('silent')==='1';
    if(url.searchParams.getAll('entry').length>1||url.searchParams.getAll('silent').length>1||[...url.searchParams.keys()].some(k=>!['entry','silent'].includes(k))||entry&&!home||url.searchParams.has('silent')&&!silent||silent&&entry==='paper'){json(res,400,{error:'登录参数无效。'});return true;}
    if(!silent&&identity(req)){redirect(res,home);return true;}
    const transactionName=silent?silentTxName:txName;
    if(transactions.size>=128){json(res,429,{error:'登录请求较多，请稍后再试。'});return true;}
    const old=cookie(req,transactionName);if(old)transactions.delete(hash(old));
    const tx=random(),state=random(),nonce=random(),verifier=random();transactions.set(hash(tx),{state,nonce,verifier,home,silent,expires:now()+180000});
    const authorize=new URL(config.issuer+'/api/oidc/authorize');authorize.search=new URLSearchParams({client_id:config.clientId,redirect_uri:config.publicOrigin+'/api/auth/callback',response_type:'code',scope:'openid profile',state,nonce,code_challenge:hash(verifier),code_challenge_method:'S256'}).toString();
    if(silent)authorize.searchParams.set('prompt','none');
    redirect(res,authorize.toString(),[setCookie(transactionName,tx,180)]);return true;
   }
   const state=url.searchParams.get('state');
   const candidates=[txName,silentTxName].map(name=>{const raw=cookie(req,name);return {name,raw,tx:raw?transactions.get(hash(raw)):null};}).filter(x=>x.tx&&safeEqual(state,x.tx.state));
   const found=candidates.length===1?candidates[0]:null,raw=found?.raw,tx=found?.tx;
   if(raw)transactions.delete(hash(raw));
   silentCallback=Boolean(tx?.silent);
   const transactionName=found?.name||txName;
   res.setHeader('Set-Cookie',setCookie(transactionName,'',0));
   if(!tx||tx.expires<=now()||!safeEqual(url.searchParams.get('state'),tx.state)||['code','state','error'].some(k=>url.searchParams.getAll(k).length>1)||[...url.searchParams.keys()].some(k=>!['code','state','error','error_description'].includes(k)))throw Error('Invalid authorization state');
   if(url.searchParams.has('error')){if(silentCallback){const existing=cookie(req,sessionName);if(existing)sessions.delete(hash(existing));complete(res,false,[setCookie(transactionName,'',0),setCookie(sessionName,'',0)]);return true;}throw Error('ANS denied authorization');}
   const code=url.searchParams.get('code');if(!code||!/^[A-Za-z0-9_-]{43}$/.test(code))throw Error('Invalid authorization code');
   const tokens=await upstream('/api/oidc/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Authorization:'Basic '+Buffer.from(encodeURIComponent(config.clientId)+':'+encodeURIComponent(config.clientSecret)).toString('base64')},body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:config.publicOrigin+'/api/auth/callback',code_verifier:tx.verifier}).toString()});
   if(tokens.token_type!=='Bearer'||typeof tokens.access_token!=='string'||tokens.access_token.length>16384||!Number.isSafeInteger(tokens.expires_in)||tokens.expires_in<=0||tokens.expires_in>600)throw Error('Invalid authorization response');
   const claims=await verifyId(tokens.id_token,tx.nonce);
   const user=await upstream('/api/oidc/userinfo',{headers:{Authorization:'Bearer '+tokens.access_token}});if(user.sub!==claims.sub)throw Error('Identity subject mismatch');
   if(sessions.size>=1000)throw Error('Session capacity reached');
   const old=cookie(req,sessionName);if(old)sessions.delete(hash(old));
   const id=random(),age=Math.min(tokens.expires_in,claims.exp-Math.floor(now()/1000),300);if(age<=0)throw Error('Expired authorization');
   const name=typeof user.name==='string'?user.name.slice(0,80):'ANS用户';sessions.set(hash(id),{subject:claims.sub,name,expires:now()+age*1000});
   const cookies=[setCookie(transactionName,'',0),setCookie(sessionName,id,age)];
   if(silentCallback)complete(res,true,cookies);else redirect(res,tx.home||config.home||'/',cookies);return true;
  }catch{if(silentCallback){complete(res,false,[setCookie(silentTxName,'',0)]);return true;}json(res,400,{error:'ANS登录没有完成，请回到原页面重新点击登录。当前档案仍留在原页面。'});return true;}
 }
 return {handler,identity,enabled:Boolean(config.enabled)};
}
