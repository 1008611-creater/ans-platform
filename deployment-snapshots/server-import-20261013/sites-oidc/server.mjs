/** Two fixed relying parties for the real public ANS OIDC issuer. */
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {ansAuthConfig,createAnsAuth} from './oidc.mjs';
export function validatePaperSubjects(value){
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>20||value.some(x=>typeof x!=='string'||!x.trim()||x!==x.trim()||x.length>200||/[\x00-\x20\x7f]/.test(x)||x==='*')||new Set(value).size!==value.length)throw Error('Invalid private paper subjects');
 return [...value];
}
export function paperAccessStatus(identity,subjects){
 return !identity?401:subjects.includes(identity.subject)?204:403;
}
export function createSiteAuth(clients,{fetchImpl=fetch}={}){
 const accounts=new Map();
 const paperSubjects=validatePaperSubjects(clients.kaogong?.paperSubjects);
 for(const [name,home] of [['kaogong','/analysis/'],['suanming','/']]){
  const c=clients[name];if(!c)throw Error('Client missing');
  const config=ansAuthConfig({ANS_OIDC_ISSUER:'https://ans.cauai.fun',ANS_OIDC_CLIENT_ID:c.id,ANS_OIDC_CLIENT_SECRET:c.secret,ANS_PUBLIC_ORIGIN:'https://'+name+'.cauai.fun'});
  accounts.set(name+'.cauai.fun',createAnsAuth({...config,home,loginHomes:name==='kaogong'?{paper:'/',trainer:'/trainer/'}:{}},{fetchImpl}));
 }
 return createServer(async(req,res)=>{
  const account=accounts.get(req.headers.host),local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  if(!account||!local){res.writeHead(403,{'Cache-Control':'no-store'});res.end();return;}
  if(req.url==='/api/auth/paper-check'&&req.method==='GET'){res.writeHead(req.headers.host==='kaogong.cauai.fun'?paperAccessStatus(account.identity(req),paperSubjects):404,{'Cache-Control':'no-store'});res.end();return;}
  if(req.url==='/api/auth/check'&&req.method==='GET'){res.writeHead(account.identity(req)?204:401,{'Cache-Control':'no-store'});res.end();return;}
  if(await account.handler(req,res))return;
  res.writeHead(404,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end('{"error":"登录入口不存在。"}');
 });
}
if(process.argv[1]?.endsWith('server.mjs')){
 try{const clients=JSON.parse(readFileSync(resolve(process.env.CREDENTIALS_DIRECTORY,'ans-sites-clients'),'utf8'));
 const server=createSiteAuth(clients);server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=30;server.listen(8151,'127.0.0.1');
 }catch{console.error('ANS账号服务配置无效。');process.exitCode=1;}
}
