import {describe,it,expect,vi} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,basename} from 'node:path';
import {StudioStore,StudioError} from '../../../runtime/store.mjs';
import {ensureAccountGift,ownerAccess} from '../../../runtime/access.mjs';
import sharp from 'sharp';
import {requestPhoto,executeJob,providerConfig} from '../../../runtime/provider.mjs';
import {compileShot,defaultSettings} from '../../../runtime/recipe.mjs';
const env={OPENAI_BASE_URL:'https://mcgrox.top/v1',OPENAI_API_KEY:'test-not-a-real-key',STUDIO_GENERATION_ENABLED:'true',STUDIO_REFERENCE_CONTRACT_VERIFIED:'true',STUDIO_DAILY_REQUEST_LIMIT:'9'};
const project={settings:defaultSettings(),compositionId:null} as never;
describe('channel adapter contract unit tests (no network)',()=>{
 it('serializes the exact model, portrait size, high quality and identity role',async()=>{
  const png=await sharp({create:{width:1024,height:1536,channels:3,background:'#123456'}}).png().toBuffer();
  let submitted=0;
  const result=await requestPhoto({project,shotId:'cover',images:[{buffer:png,contentType:'image/png'}],env,onSubmit:()=>{submitted++;},fetcher:async(url:string,init:RequestInit)=>{
   expect(url).toBe('https://mcgrox.top/v1/images/edits');
   const form=init.body as FormData;
   expect(form.get('model')).toBe('gpt-image-2.5-sunburst');expect(form.get('size')).toBe('1024x1536');expect(form.get('quality')).toBe('high');expect(form.get('n')).toBe('1');expect(form.getAll('image')).toHaveLength(1);expect(form.has('image[]')).toBe(false);
   return new Response(JSON.stringify({data:[{b64_json:png.toString('base64')}]}),{status:200});
  }});
  expect(submitted).toBe(1);expect(result.metadata.width).toBe(1024);expect(result.buffer).toEqual(png);
 });
 it('rejects an unapproved host without submitting',async()=>{
  let calls=0;await expect(requestPhoto({project,shotId:'cover',images:[],env:{...env,OPENAI_BASE_URL:'https://other.invalid/v1'},fetcher:async()=>{calls++;}})).rejects.toThrow('CHANNEL_CONFIG');expect(calls).toBe(0);
 });
 it('does not download a remote image URL or silently accept a wrong output size',async()=>{
  const fetcher=async()=>new Response(JSON.stringify({data:[{url:'https://untrusted.invalid/photo'}]}));
  await expect(requestPhoto({project,shotId:'cover',images:[],env,fetcher})).rejects.toThrow('BASE64_CONTRACT_REQUIRED');
  const png=await sharp({create:{width:128,height:128,channels:3,background:'#123456'}}).png().toBuffer();
  await expect(requestPhoto({project,shotId:'cover',images:[],env,fetcher:async()=>new Response(JSON.stringify({data:[{b64_json:png.toString('base64')}]}))})).rejects.toThrow('OUTPUT_DIMENSIONS');
 });
 it('applies the composition reference only to the cover and separates a revision source',()=>{
  const p={settings:defaultSettings(),compositionId:'composition'} as never;
  expect(compileShot(p,'cover')).toContain('最后一张输入图片仅用于');expect(compileShot(p,'place')).not.toContain('最后一张输入图片仅用于');expect(compileShot(p,'cover','只调整动作')).toContain('输入图片2为该镜头的上一版本');
 });
});

// Regression for a real production OUTPUT_DIMENSIONS failure. Isolated bytes and database; zero network calls.
describe('wrong-size provider output remains private and downloadable',()=>{
 const giftEnv={STUDIO_PROVIDER:'openlux',OPENLUX_BASE_URL:'https://api.openlux.ai/v1',OPENLUX_API_KEY:'offline-only',STUDIO_GENERATION_ENABLED:'true',STUDIO_REFERENCE_CONTRACT_VERIFIED:'true',STUDIO_ACCOUNT_GIFT_ENABLED:'true',STUDIO_DAILY_REQUEST_LIMIT:'75'};
 for(const saveFails of [false,true])it(saveFails?'records storage failure without crashing, retrying or inventing a result':'retains exact rejected bytes, one charge and no accepted result across reopening and reference replacement',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'vibephoto-rejected-'));let db=new StudioStore(directory);
  try{
   db.db.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner','offline-subject','Offline',Date.now());const provider=providerConfig(giftEnv);ensureAccountGift(db,'owner',provider,giftEnv);
   const bytes=await sharp({create:{width:128,height:128,channels:3,background:'#123456'}}).png().toBuffer(),meta={contentType:'image/png',width:128,height:128};
   const created=db.create('owner'),p=db.addReference('owner',created.id,'identity',bytes,meta,true,created.revision);
   const queued=db.enqueue('owner',p.id,'one','cover',null,'',false,null,null,p.revision,provider);let calls=0;
   if(saveFails)vi.spyOn(db,'saveRejectedOutput').mockImplementation(()=>{throw new StudioError('STORAGE_LIMIT',507);});
   await executeJob(db,db.claim()!,async (input:Record<string,unknown>)=>requestPhoto({...input,fetcher:async()=>{calls++;return Response.json({data:[{b64_json:bytes.toString('base64')}],usage:{output_tokens:10}});}}),giftEnv);
   expect(calls).toBe(1);expect(db.getJob(queued.id)).toMatchObject({status:'recoverable',error:'OUTPUT_DIMENSIONS'});expect(db.get('owner',p.id).results).toHaveLength(0);expect(ownerAccess(db,'owner',provider).gift).toMatchObject({used:1,remaining:9});
   const attempt=db.costs('owner',p.id)[0];expect(attempt).toMatchObject({error:'OUTPUT_DIMENSIONS',size:'1024x1536',returnedSize:'128x128',status:'unknown'});
   if(saveFails){expect(attempt.rejectedAssetId).toBeUndefined();expect(attempt.rejectedSaveError).toBe('STORAGE_LIMIT');expect(db.view(db.get('owner',p.id)).jobs[0]).toMatchObject({requestedSize:'1024x1536',returnedSize:'128x128',quotaUsed:1,rejectedSaveError:'STORAGE_LIMIT'});}
   else{
    expect(attempt.rejectedAssetId).toBeTruthy();const id=attempt.rejectedAssetId!;expect(db.readAsset(db.asset('owner',p.id,id))).toEqual(bytes);expect(()=>db.asset('other',p.id,id)).toThrow('NOT_FOUND');expect(db.view(db.get('owner',p.id)).references).toHaveLength(1);
    expect(()=>db.approveCover('owner',p.id,id,p.revision)).toThrow();db.addReference('owner',p.id,'identity',bytes,meta,true,p.revision);expect(db.readAsset(db.asset('owner',p.id,id))).toEqual(bytes);
    db.close();db=new StudioStore(directory);expect(db.readAsset(db.asset('owner',p.id,id))).toEqual(bytes);expect(db.getJob(queued.id)?.rejectedAssetId).toBe(id);
     const current=db.get('owner',p.id);db.update('owner',p.id,{...current.settings,format:'square'},current.revision);const history=db.view(db.get('owner',p.id)).jobs[0];expect(history).toMatchObject({requestedSize:'1024x1536',returnedSize:'128x128',quotaUsed:1});expect(history).not.toHaveProperty('snapshot');expect(history).not.toHaveProperty('accessId');
   }
  }finally{db.close();if(dirname(directory)!==resolve(tmpdir())||!basename(directory).startsWith('vibephoto-rejected-'))throw Error('Unsafe cleanup target');rmSync(directory,{recursive:true,force:true});}
 });
});

describe('private queue progress (isolated database, no provider calls)',()=>{
 it('counts preceding work, resolves timestamp ties in claim order and exposes no other account details',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'vibephoto-rejected-')),db=new StudioStore(directory);
  try{
   const bytes=await sharp({create:{width:128,height:128,channels:3,background:'#123456'}}).png().toBuffer();
   const clock=vi.spyOn(Date,'now').mockReturnValue(2000000000000);
   const items=['other-account','my-account','third-account'].map(owner=>{const p=db.create(owner);return {owner,project:db.addReference(owner,p.id,'identity',bytes,{contentType:'image/png',width:128,height:128},true,p.revision)};});
   const jobs=items.map(({owner,project},i)=>db.enqueue(owner,project.id,'private-request-'+i,'cover'));
   clock.mockRestore();
   expect(db.view(db.get(items[1].owner,items[1].project.id)).jobs[0].queueAhead).toBe(1);expect(db.view(db.get(items[2].owner,items[2].project.id)).jobs[0].queueAhead).toBe(2);
   expect(db.claim()!.id).toBe(jobs[0].id);const visible=db.view(db.get(items[1].owner,items[1].project.id)).jobs[0];expect(visible.queueAhead).toBe(1);expect(visible).not.toHaveProperty('snapshot');expect(visible).not.toHaveProperty('requestKey');expect(JSON.stringify(visible)).not.toContain(items[0].project.id);
   db.cancel(items[1].owner,items[1].project.id,jobs[1].id);expect(db.view(db.get(items[2].owner,items[2].project.id)).jobs[0].queueAhead).toBe(1);
   const done=db.getJob(jobs[0].id)!;done.status='cancelled';db.writeJob(done);expect(db.view(db.get(items[2].owner,items[2].project.id)).jobs[0].queueAhead).toBe(0);expect(db.claim()!.id).toBe(jobs[2].id);
   expect(()=>db.get(items[1].owner,items[0].project.id)).toThrow('NOT_FOUND');
  }finally{vi.restoreAllMocks();db.close();if(dirname(directory)!==resolve(tmpdir())||!basename(directory).startsWith('vibephoto-rejected-'))throw Error('Unsafe cleanup target');rmSync(directory,{recursive:true,force:true});}
 });
});
