import http from 'node:http';
import { readFile, writeFile, mkdir, readdir, cp, rename, access } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const ROOT = resolve(process.env.SERVICE_ROOT || '.');
const DATA = resolve(process.env.DATA_ROOT || './data');
const PREFIX = '/workflows/hypit';
const ORIGIN = process.env.PUBLIC_ORIGIN || 'https://ans.cauai.fun';
const AUTH = process.env.ANS_AUTH_ORIGIN || 'http://ans-platform-app:3000';
const CLI = join(ROOT, 'node_modules/@hypit/hypit/bin/hypit.mjs');
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
export const templates = [
  { id: 'chat', title: '动态对话', description: '用文字编排对话动画，在线预览和导出，不调用生成模型。', ready: true, model: '代码渲染 · 无生成模型', source: 'chat.svml', run: 'chat.svrun' },
  { id: 'ranking-football', title: '排行榜口播', description: '复用排行榜、口播、字幕和 B-roll 编排，自由更换主题与人物。', ready: false, model: '模板示例：Seedance 2 Mini；需连接渠道', source: 'reference.svml', run: 'reference.svrun' },
  { id: 'podcast', title: '播客与访谈', description: '双人对话、分屏、说话人字幕和产品演示。', ready: false, model: '模板示例：Seedance 2 Mini；需连接渠道', source: 'reference.svml', run: 'reference.svrun' },
  { id: 'interview', title: '街头采访', description: '人物表演、跟随字幕、揭晓动画与音效组合。', ready: false, model: '模板示例：Seedance 2 Mini；需连接渠道', source: 'reference.svml', run: 'reference.svrun' },
];
const studios = new Map();
const jobs = new Map();
const locks = new Map();
let activeJobs = 0;
const error = (status, message) => Object.assign(new Error(message), { status });
const projectDir = id => { if (!uuid.test(id)) throw error(404, '项目不存在'); return join(DATA, 'projects', id); };
const send = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
const xml = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const limitedText = (text, max, label) => { if (typeof text !== 'string' || !text.trim() || text.length > max) throw error(400, label + '格式不正确'); return text.trim(); };
async function body(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw error(415, '需要 JSON 内容');
  const chunks=[]; let bytes=0;
  for await (const chunk of req) { bytes += chunk.length; if (bytes > 1024 * 1024) throw error(413, '内容过大'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw error(400, 'JSON 内容无效'); }
}
async function resolveAccount(req) {
  if (!req.headers.cookie) throw error(401, '请先登录 ANS');
  let response;
  try { response = await fetch(AUTH + '/api/auth/session', { headers: { Cookie: req.headers.cookie, Host: new URL(ORIGIN).host, 'X-Forwarded-Host': new URL(ORIGIN).host, 'X-Forwarded-Proto': 'https' }, signal: AbortSignal.timeout(8000) }); }
  catch { throw error(503, 'ANS 登录服务暂不可用'); }
  if (!response.ok) throw error(503, 'ANS 登录服务暂不可用');
  const session=await response.json();
  if (!session?.user?.id) throw error(401, '请先登录 ANS');
  // One organization only until written hosted-service authorization is recorded.
  if (session.user.role !== 'ADMIN') throw error(403, '当前仅向 ANS 组织管理员开放内部工作区');
  return { id: session.user.id, name: session.user.name || session.user.username || 'ANS' };
}
// Studio loads many same-session ES modules concurrently. Coalesce those reads
// so one editor cannot exhaust the main application's authentication DB pool.
const studioAuthReads = new Map();
async function account(req) {
  const cacheable = req.method === 'GET' && req.url.startsWith(PREFIX + '/studio/');
  if (!cacheable || !req.headers.cookie) return resolveAccount(req);
  const key = createHash('sha256').update(req.headers.cookie).digest('hex');
  const known = studioAuthReads.get(key);
  if (known && known.until > Date.now()) return known.promise;
  if (studioAuthReads.size > 128) studioAuthReads.clear();
  const promise = resolveAccount(req);
  const entry = { promise, until: Date.now() + 5000 };
  studioAuthReads.set(key, entry);
  try { return await promise; }
  catch (e) { if (studioAuthReads.get(key) === entry) studioAuthReads.delete(key); throw e; }
}
function mutationOrigin(req) {
  if (req.headers.origin !== ORIGIN) throw error(403, '请从 ANS 网站操作');
  if (req.headers['sec-fetch-site'] && !['same-origin','none'].includes(req.headers['sec-fetch-site'])) throw error(403, '跨站请求已拒绝');
}
async function loadProject(id, user) {
  let value;
  try { value=JSON.parse(await readFile(join(projectDir(id),'project.json'),'utf8')); } catch(e) { if(e.status) throw e; throw error(404,'项目不存在'); }
  if(value.ownerId!==user.id) throw error(404,'项目不存在');
  return value;
}
async function atomic(path, value) { const tmp=path+'.'+randomUUID()+'.tmp'; await writeFile(tmp,value,{mode:0o600}); await rename(tmp,path); }
async function withLock(id, fn) {
  const previous=locks.get(id)||Promise.resolve();
  const next=previous.catch(()=>{}).then(fn); locks.set(id,next);
  try { return await next; } finally { if(locks.get(id)===next) locks.delete(id); }
}
async function publicProject(project) {
  const t=templates.find(t=>t.id===project.template);
  const source=await readFile(join(projectDir(project.id),t.source),'utf8');
  return {...project, ownerId:undefined, source, sourceHash:createHash('sha256').update(source).digest('hex'), model:t.model, canRender:t.ready, artifactAvailable:existsSync(join(projectDir(project.id),'final.mp4')), job:jobs.get(project.id)||null};
}
async function createProject(input, user) {
  const template=templates.find(t=>t.id===input.template); if(!template) throw error(400,'请选择模板');
  const title=limitedText(input.title,100,'项目名称');
  const brief=typeof input.brief==='string'?input.brief.slice(0,12000):'';
  const id=randomUUID(); const dir=projectDir(id);
  await mkdir(dir,{recursive:true,mode:0o700});
  await cp(join(ROOT,'templates',template.id),dir,{recursive:true});
  await writeFile(join(dir,'package.json'),JSON.stringify({name:'ans-hypit-project',private:true,type:'module',hypit:{project:true},dependencies:{'@hypit/hypit':'0.3.1',...(template.id==='chat'?{'@example/chat-scene':'file:./packages/chat-scene'}:{}),'@hypit/ranking':'0.1.0','@fontsource-variable/inter':'5.3.0','@fontsource-variable/montserrat':'5.3.0'}}));
  // The engine is server-managed; projects cannot install executable packages.
  const { symlink }=await import('node:fs/promises'); await symlink(join(ROOT,'node_modules'),join(dir,'node_modules'),'dir');
  if(template.id==='chat') {
    const file=join(dir,'chat.svml'); let source=await readFile(file,'utf8');
    source=source.replace('title="Launch crew"','title="'+xml(title)+'"').replace('sender="Maya"','sender="创作者"').replace('sender="Leo"','sender="ANS"').replace('sender="Maya"','sender="创作者"').replace('sender="Leo"','sender="ANS"');
    source=source.replace('Are we ready to launch?','准备好开始创作了吗？').replace('The video is ready.','先把你的想法写下来。').replace('Great. One tiny change...','素材、字幕和动画都能继续修改。').replace('I left the whole scene editable.','让灵感成为你的作品。');
    await writeFile(file,source);
  }
  const project={id,title,brief,template:template.id,ownerId:user.id,revision:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await atomic(join(dir,'project.json'),JSON.stringify(project));
  await writeFile(join(dir,'Brief.md'),'# '+title+'\n\n'+brief+'\n\n品牌：ANS\n来源：Hypit.AI\n');
  return publicProject(project);
}
export function validateSource(source) {
  limitedText(source,150000,'SVML');
  // Authoring is limited to the installed Distribution and fixed project files.
  for(const m of source.matchAll(/\b(?:source|src)\s*=\s*["']([^"']+)["']/g)) {
    if(m[1].includes('..')||m[1].startsWith('/')||/^[a-z]+:/i.test(m[1])) throw error(400,'只允许当前项目内的素材和 Source 路径');
  }
  for(const m of source.matchAll(/\bfrom\s*=\s*["']([^"']+)["']/g)) {
    if(!/^@hypit\/[a-z0-9-]+(?:\/[a-z0-9-]+)*@\d+$/.test(m[1])&&m[1]!=='@example/chat-scene@1') throw error(400,'仅允许已安装的 Hypit 组件');
  }
}
function command(args,cwd,env={},timeout=90000) {
  return new Promise((resolvePromise,reject)=>{
    const child=spawn(process.execPath,[CLI,...args],{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']}); let output='';
    const timer=setTimeout(()=>child.kill('SIGTERM'),timeout);
    const collect=chunk=>{output=(output+chunk.toString()).slice(-30000);};child.stdout.on('data',collect);child.stderr.on('data',collect);
    child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);resolvePromise({ok:code===0,code,output});});
  });
}
async function startStudio(project) {
  const existing=studios.get(project.id); if(existing&&!existing.child.killed){existing.lastUsed=Date.now();return existing;}
  if(studios.size>=2) throw error(429,'已有两个编辑器运行，请先关闭其中一个');
  const used=new Set([...studios.values()].map(s=>s.port)); let port=5180;while(used.has(port))port++;
  const template=templates.find(t=>t.id===project.template);if(!template.ready)throw error(409,'该模板需要先补齐素材和生成渠道，当前可编辑和校验 Source');
  const base=PREFIX+'/studio/'+project.id+'/';const dir=projectDir(project.id);
  const child=spawn(process.execPath,[CLI,'studio','--run',template.run,'--runtime','hypit.runtime.json','--port',String(port)],{cwd:dir,env:{...process.env,ANS_STUDIO_BASE:base,ANS_STUDIO_CACHE:'/tmp/studio-'+project.id},stdio:['ignore','pipe','pipe']});
  const state={child,port,base,lastUsed:Date.now(),output:''};studios.set(project.id,state);
  const collect=chunk=>{state.output=(state.output+chunk.toString()).slice(-12000);};child.stdout.on('data',collect);child.stderr.on('data',collect);child.on('error',()=>studios.delete(project.id));child.on('close',()=>studios.delete(project.id));
  for(let n=0;n<70;n++){ if(child.exitCode!==null)throw error(409,'编辑器启动失败：'+state.output.slice(-1500));try{const r=await fetch('http://127.0.0.1:'+port+base,{signal:AbortSignal.timeout(400)});if(r.ok)return state;}catch{}await new Promise(r=>setTimeout(r,200)); }
  child.kill();throw error(504,'编辑器启动超时：'+state.output.slice(-1800));
}
function proxyStudio(req,res,studio,path) {
  studio.lastUsed=Date.now();
  const headers={...req.headers,host:'localhost:'+studio.port};delete headers.cookie;delete headers.authorization;
  if(headers.origin)headers.origin='http://localhost:'+studio.port;
  const up=http.request({hostname:'127.0.0.1',port:studio.port,path,method:req.method,headers},response=>{
    const type=String(response.headers['content-type']||'');
    if(type.includes('application/json')) {
      const chunks=[];let size=0;response.on('data',c=>{size+=c.length;if(size>10*1024*1024)up.destroy();else chunks.push(c);});response.on('end',()=>{const text=Buffer.concat(chunks).toString().replaceAll('/__studio/',studio.base+'__studio/');const h={...response.headers,'cache-control':'no-store'};delete h['content-length'];res.writeHead(response.statusCode,h);res.end(text);});
    } else {res.writeHead(response.statusCode,{...response.headers,'cache-control':'no-store'});response.pipe(res);}
  });up.on('error',()=>{if(!res.headersSent)send(res,502,{error:'编辑器连接失败'});else res.end();});req.pipe(up);
}
// The public page belongs to the authoritative ANS app. This service owns only
// engine APIs and Studio; it never supplies a parallel ANS navigation or logo.
function proxyAuthorityPage(req,res) {
  const upstream=new URL(AUTH);
  const headers={...req.headers,host:new URL(ORIGIN).host,'x-forwarded-host':new URL(ORIGIN).host,'x-forwarded-proto':'https'};
  const request=http.request({hostname:upstream.hostname,port:upstream.port||80,path:req.url,method:'GET',headers,timeout:20000},response=>{
    if(response.statusCode===404) {
      response.resume();res.writeHead(307,{'Location':'/workflows?hypit=preparing','Cache-Control':'no-store'});res.end();return;
    }
    res.writeHead(response.statusCode,{...response.headers,'cache-control':'private, no-store','x-ans-hypit-shell':'authority-main'});response.pipe(res);
  });
  request.on('timeout',()=>request.destroy());
  request.on('error',()=>{if(!res.headersSent){res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('ANS workspace is temporarily unavailable.');}else res.end();});
  res.on('close',()=>request.destroy());request.end();
}
async function handler(req,res) {
  const url=new URL(req.url,ORIGIN);const path=url.pathname.replace(/\/$/,'');
  try {
    if(req.method==='GET'&&path===PREFIX+'/health')return send(res,200,{service:'ans-hypit',engine:'0.3.1',mode:'organization-internal',generationConnected:false});
    if(req.method==='GET'&&path===PREFIX)return proxyAuthorityPage(req,res);
    if(req.method==='GET'&&path===PREFIX+'/HYPIT-LICENSE'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'});return res.end(await readFile(join(ROOT,'HYPIT-LICENSE')));}
    const user=await account(req);
    if(req.headers['x-ans-owner'] && req.headers['x-ans-owner']!==user.id)throw error(409,'????????????????');
    if(!['GET','HEAD'].includes(req.method))mutationOrigin(req);
    const studioMatch=url.pathname.match(/^\/workflows\/hypit\/studio\/([a-f0-9-]+)\/(.*)$/);
    if(studioMatch){await loadProject(studioMatch[1],user);const studio=studios.get(studioMatch[1]);if(!studio)throw error(409,'请返回项目重新打开编辑器');const rest=req.url.substring(studio.base.length);return proxyStudio(req,res,studio,rest.startsWith('__studio/')?'/'+rest:req.url);}
    if(path===PREFIX+'/api/session'&&req.method==='GET')return send(res,200,{user,templates,mode:'organization-internal'});
    if(path===PREFIX+'/api/projects'&&req.method==='GET') {
      const projects=[];for(const entry of await readdir(join(DATA,'projects'))){if(!uuid.test(entry))continue;try{const p=await loadProject(entry,user);projects.push({...p,ownerId:undefined});}catch{}}
      return send(res,200,{projects:projects.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))});
    }
    if(path===PREFIX+'/api/projects'&&req.method==='POST')return send(res,201,await createProject(await body(req),user));
    const match=path.match(/^\/workflows\/hypit\/api\/projects\/([a-f0-9-]+)(?:\/(check|plan|studio|render|export|video))?$/);
    if(!match)throw error(404,'页面不存在');
    const id=match[1], action=match[2];const project=await loadProject(id,user);const template=templates.find(t=>t.id===project.template);const dir=projectDir(id);
    if(!action&&req.method==='GET')return send(res,200,await publicProject(project));
    if(!action&&req.method==='PUT')return send(res,200,await withLock(id,async()=>{
      const input=await body(req);const latest=await loadProject(id,user);if(input.revision!==latest.revision)throw error(409,'项目已在另一窗口更新，请重新打开后再保存');const currentSource=await readFile(join(dir,template.source),'utf8');if(input.expectedSourceHash!==createHash('sha256').update(currentSource).digest('hex'))throw error(409,'Source 已被 Studio 或另一窗口修改，请重新载入后再保存');validateSource(input.source);
      const next={...latest,title:limitedText(input.title,100,'项目名称'),brief:typeof input.brief==='string'?input.brief.slice(0,12000):'',revision:latest.revision+1,updatedAt:new Date().toISOString()};
      await atomic(join(dir,template.source),input.source);await atomic(join(dir,'project.json'),JSON.stringify(next));await atomic(join(dir,'Brief.md'),'# '+next.title+'\n\n'+next.brief+'\n');return publicProject(next);
    }));
    if(action==='check'&&req.method==='POST') {
      if(activeJobs>=2)throw error(429,'服务器正在处理其他任务，请稍后再试');activeJobs++;try{return send(res,200,await command(['check',template.source],dir));}finally{activeJobs--;}
    }
    if(action==='plan'&&req.method==='POST') {
      if(!template.ready)throw error(409,'该模板的模型渠道、声音和素材尚未配置；不会发起付费任务');
      if(activeJobs>=2)throw error(429,'服务器繁忙');activeJobs++;try{return send(res,200,await command(['plan',template.run,'--runtime','hypit.runtime.json'],dir));}finally{activeJobs--;}
    }
    if(action==='studio'&&req.method==='POST') {const studio=await startStudio(project);return send(res,200,{url:studio.base});}
    if(action==='studio'&&req.method==='DELETE'){studios.get(id)?.child.kill();studios.delete(id);return send(res,200,{closed:true});}
    if(action==='render'&&req.method==='POST') {
      if(!template.ready)throw error(409,'尚未连接付费视频渠道；当前仅可导出代码动画');
      if(activeJobs>=1||jobs.get(id)?.status==='running')throw error(429,'已有渲染任务正在运行');
      activeJobs++;jobs.set(id,{status:'running',startedAt:new Date().toISOString()});
      command(['build',template.run,'--runtime','hypit.runtime.json','--follow'],dir,{},180000).then(async result=>{
        if(result.ok){
          const inventory=await command(['builds','--json','--limit','1'],dir);
          let build;try{build=JSON.parse(inventory.output).builds[0]?.id;}catch{}
          if(build){const exported=await command(['get',build,'--output','final.video','--to','final.mp4'],dir);if(!exported.ok)result={...result,ok:false,output:result.output+'\n'+exported.output};}
          else result={...result,ok:false,output:result.output+'\n无法定位此次渲染结果'};
        }
        jobs.set(id,{status:result.ok?'complete':'failed',...result});
      }).catch(()=>jobs.set(id,{status:'failed',output:'渲染失败，请检查服务器环境'})).finally(()=>activeJobs--);
      return send(res,202,{status:'running'});
    }
    if(action==='video'&&req.method==='GET') {
      const file=join(dir,'final.mp4');if(!existsSync(file))throw error(404,'尚无渲染成片');
      res.writeHead(200,{'Content-Type':'video/mp4','Content-Disposition':(url.searchParams.has('download')?'attachment':'inline')+'; filename="ans-hypit-video.mp4"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
      createReadStream(file).pipe(res);return;
    }
    if(action==='export'&&req.method==='GET') {
      res.writeHead(200,{'Content-Type':'application/gzip','Content-Disposition':'attachment; filename="ans-hypit-project.tar.gz"','Cache-Control':'private, no-store'});
      const child=spawn('tar',['--exclude=node_modules','--exclude=project.json','--exclude=.hypit','-czf','-','-C',dir,'.'],{stdio:['ignore','pipe','pipe']});child.stdout.pipe(res);child.on('error',()=>res.destroy());req.on('aborted',()=>child.kill());return;
    }
    throw error(405,'不支持此操作');
  }catch(e){if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'操作未完成，请稍后重试'});else res.end();}
}
export async function start() {
  await mkdir(join(DATA,'projects'),{recursive:true,mode:0o700});
  const server=http.createServer(handler);
  server.on('upgrade',async(req,socket,head)=>{
    try{const user=await account(req);if(req.headers.origin!==ORIGIN)throw error(403,'origin');const m=req.url.match(/^\/workflows\/hypit\/studio\/([a-f0-9-]+)\//);if(!m)throw error(404,'studio');await loadProject(m[1],user);const studio=studios.get(m[1]);if(!studio)throw error(404,'studio');
      const headers={...req.headers,host:'localhost:'+studio.port,origin:'http://localhost:'+studio.port};delete headers.cookie;
      const up=http.request({hostname:'127.0.0.1',port:studio.port,path:req.url,headers});up.on('upgrade',(response,upstream,upHead)=>{socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(response.headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');if(upHead.length)socket.write(upHead);if(head.length)upstream.write(head);socket.pipe(upstream).pipe(socket);upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());});up.on('error',()=>socket.destroy());up.end();
    }catch{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');}
  });
  setInterval(()=>{for(const[id,s]of studios)if(Date.now()-s.lastUsed>15*60*1000){s.child.kill();studios.delete(id);}},60000).unref();
  server.listen(Number(process.env.PORT||3022),'0.0.0.0',()=>console.log('ANS Hypit organization service ready'));
  return server;
}
if(process.env.NODE_ENV!=='test')await start();
