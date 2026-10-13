import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const auth=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');const cookie=req.headers.cookie;res.end(JSON.stringify(cookie==='fixture=admin-a'?{user:{id:'admin-a',role:'ADMIN',name:'Internal A'}}:cookie==='fixture=admin-b'?{user:{id:'admin-b',role:'ADMIN',name:'Internal B'}}:cookie==='fixture=member'?{user:{id:'outside-member',role:'USER'}}:null));});
await new Promise(r=>auth.listen(0,'127.0.0.1',r));
const data=await mkdtemp(join(tmpdir(),'ans-hypit-test-'));
process.env.NODE_ENV='test';process.env.DATA_ROOT=data;process.env.PORT='0';process.env.SERVICE_ROOT=process.cwd();process.env.ANS_AUTH_ORIGIN='http://127.0.0.1:'+auth.address().port;
const {start,validateSource}=await import('./server.mjs');const server=await start();await new Promise(r=>server.listening?r():server.once('listening',r));
const origin='https://ans.cauai.fun';const base='http://127.0.0.1:'+server.address().port+'/workflows/hypit';
const request=(path,method='GET',body,cookie='fixture=admin-a',withOrigin=true)=>fetch(base+path,{method,headers:{...(cookie?{cookie}:{}),...(withOrigin?{origin}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
let id;
try{
await test('anonymous private APIs return 401',async()=>{assert.equal((await request('/api/projects','GET',undefined,null)).status,401);});
await test('organization-external members return 403',async()=>{assert.equal((await request('/api/projects','GET',undefined,'fixture=member')).status,403);});
await test('cross-site mutations rejected before writes',async()=>{assert.equal((await request('/api/projects','POST',{title:'No',template:'chat'},'fixture=admin-a',false)).status,403);});
await test('creates reusable server project from official template',async()=>{const r=await request('/api/projects','POST',{title:'Internal test',template:'chat',brief:'Local fixture only'});assert.equal(r.status,201);const p=await r.json();id=p.id;assert.ok(p.source.includes('Internal test'));assert.equal(p.ownerId,undefined);});
await test('second admin cannot read another owner project',async()=>{assert.equal((await request('/api/projects/'+id,'GET',undefined,'fixture=admin-b')).status,404);});
await test('optimistic revision prevents silent overwrite',async()=>{const p=await (await request('/api/projects/'+id)).json();const input={title:p.title,source:p.source,brief:p.brief,revision:1,expectedSourceHash:p.sourceHash};assert.equal((await request('/api/projects/'+id,'PUT',input)).status,200);assert.equal((await request('/api/projects/'+id,'PUT',input)).status,409);});
await test('rejects path traversal and uninstalled code packages',()=>{assert.throws(()=>validateSource('<import source="../../secret.svs"/>'));assert.throws(()=>validateSource('<import from="file:///etc/passwd"/>'));assert.doesNotThrow(()=>validateSource('<import from="@hypit/film@1"/>'));});
await test('paid template execution stays disabled',async()=>{const p=await(await request('/api/projects','POST',{title:'No paid jobs',template:'podcast'})).json();assert.equal((await request('/api/projects/'+p.id+'/render','POST',{})).status,409);assert.equal((await request('/api/projects/'+p.id+'/studio','POST',{})).status,409);});
await test('actual Hypit compiler accepts authored chat project',async()=>{const r=await request('/api/projects/'+id+'/check','POST',{});const result=await r.json();assert.equal(result.ok,true,result.output);});

if(process.env.TEST_STUDIO==='1')await test('real Studio serves session and prefixed UI through authenticated gateway',async()=>{
 const r=await request('/api/projects/'+id+'/studio','POST',{});const payload=await r.json();assert.equal(r.status,200,JSON.stringify(payload));
 try{
  const html=await request(payload.url.replace('/workflows/hypit',''));assert.equal(html.status,200);assert.ok((await html.text()).includes('src/ui/main.ts'));
  const session=await request(payload.url.replace('/workflows/hypit','')+'__studio/session');assert.equal(session.status,200,(await session.clone().text()).slice(0,1000));assert.ok((await session.text()).length>100);
  const ui=await request(payload.url.replace('/workflows/hypit','')+'src/ui/main.ts');assert.equal(ui.status,200);assert.ok((await ui.text()).includes(payload.url+'__studio/session'));
 }finally{await request('/api/projects/'+id+'/studio','DELETE',{});}
});
if(process.env.TEST_RENDER==='1')await test('actual server rendering produces a completed code-animation build',async()=>{
 assert.equal((await request('/api/projects/'+id+'/render','POST',{})).status,202);
 for(let n=0;n<90;n++){const p=await(await request('/api/projects/'+id)).json();if(p.job?.status!=='running'){assert.equal(p.job.status,'complete',p.job.output);const video=await request('/api/projects/'+id+'/video');assert.equal(video.status,200);assert.equal(video.headers.get('content-type'),'video/mp4');assert.ok((await video.arrayBuffer()).byteLength>1000);return;}await new Promise(r=>setTimeout(r,1000));}assert.fail('render timeout');
});
}finally{await new Promise(r=>server.close(r));await new Promise(r=>auth.close(r));await rm(data,{recursive:true,force:true});}
