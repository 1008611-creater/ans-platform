import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StudioStore } from '../../../runtime/store.mjs';
import { destinationSettings, compileShot, SHOTS } from '../../../runtime/recipe.mjs';
import { builtinReference } from '../../../runtime/builtin-references.mjs';
import { shotsFor } from '../../../runtime/destinations.mjs';
import { executeJob } from '../../../runtime/provider.mjs';
const stores:StudioStore[]=[];
const make=()=>{const db=new StudioStore(mkdtempSync(join(tmpdir(),'vibe-integrity-')));stores.push(db);return db;};
afterEach(()=>{vi.restoreAllMocks();for(const db of stores){db.close();rmSync(db.directory,{recursive:true,force:true});}stores.length=0;});
const metadata={contentType:'image/png',width:128,height:128};
const inputs=(settings:ReturnType<typeof destinationSettings>)=>(['companion','location'] as const).map(role=>{const input=builtinReference(settings,role);return {role,buffer:input.buffer,metadata:{...metadata,...input.metadata}};});
describe('reference facts and atomic preparation',()=>{
 it('prepares two missing references once; preserves user uploads and enforces owner, consent and revision',()=>{
  const db=make();const initial=db.create('alice',destinationSettings());const pair=inputs(initial.settings);
  expect(()=>db.prepareBuiltinReferences('bob',initial.id,pair,true,initial.revision)).toThrow('NOT_FOUND');
  expect(()=>db.prepareBuiltinReferences('alice',initial.id,pair,false,initial.revision)).toThrow('CONSENT_REQUIRED');
  const p=db.prepareBuiltinReferences('alice',initial.id,pair,true,initial.revision);
  expect(p.revision).toBe(initial.revision+1);expect(p.references).toHaveLength(2);expect(p.identityId).toBeNull();expect(p.jobs).toEqual([]);
  const same=db.prepareBuiltinReferences('alice',p.id,pair,true,p.revision);expect(same.revision).toBe(p.revision);expect(same.companionId).toBe(p.companionId);
  expect(()=>db.prepareBuiltinReferences('alice',p.id,pair,true,initial.revision)).toThrow('STALE_PLAN');
  const custom=db.addReference('alice',p.id,'companion',Buffer.from('custom-reference'),metadata,true,p.revision);
  const kept=db.prepareBuiltinReferences('alice',p.id,pair,true,custom.revision);expect(kept.companionId).toBe(custom.companionId);expect(db.readAsset(db.asset('alice',p.id,kept.companionId!)).toString()).toBe('custom-reference');
 });
 it('rolls back both assets and project when second copy fails',()=>{
  const db=make(),p=db.create('alice',destinationSettings()),pair=inputs(p.settings);const original=db.saveAsset.bind(db);let copies=0;
  vi.spyOn(db,'saveAsset').mockImplementation((...args:Parameters<typeof original>)=>{if(++copies===2)throw Error('disk-full');return original(...args);});
  expect(()=>db.prepareBuiltinReferences('alice',p.id,pair,true,p.revision)).toThrow('disk-full');
  const saved=db.view(db.get('alice',p.id));expect(saved.revision).toBe(p.revision);expect(saved.references).toHaveLength(0);expect(saved.companionId).toBeNull();expect(readdirSync(join(db.directory,'assets'))).toHaveLength(0);
 });
 it('does not invent builtin appearance for custom or mismatched references',()=>{
  const db=make();let p=db.create('alice',destinationSettings());p=db.addReference('alice',p.id,'companion',Buffer.from('different character'),metadata,true);
  expect(compileShot(p,'cover')).not.toContain('奶蛙造型锁定');
  const input=inputs(p.settings)[0];p=db.addBuiltinReference('alice',p.id,'companion',input.buffer,input.metadata,true,p.revision);expect(compileShot(p,'cover')).toContain('奶蛙造型锁定');
  expect(compileShot({...p,references:p.references.map(r=>({...r,sha256:'mismatched'}))},'cover')).not.toContain('奶蛙造型锁定');
 });
 it('locks green eyes for builtin Nailong and natural fur for cat, never forcing human hands',()=>{
  const db=make();for(const id of ['nailong','miaocuijiao']){
   let p=db.create('alice',destinationSettings('bund','companion',id));p=db.prepareBuiltinReferences('alice',p.id,inputs(p.settings),true,p.revision);
   const prompt=compileShot(p,'cover');expect(prompt).toContain(id==='nailong'?'绿色虹膜':'自然短毛');
   if(id==='miaocuijiao'){for(const shot of shotsFor(p.settings,SHOTS)){expect(shot.description).not.toMatch(/双手托腮|猫.*一起向镜头挥手/);expect(compileShot(p,shot.id)).not.toContain('与光滑材质');}}
  }
 });
 it('persists source facts in queued requests and sequel; sends exactly the compiled prompt',async()=>{
  const db=make();let p=db.create('alice',destinationSettings('bund','companion','nailong'));p=db.prepareBuiltinReferences('alice',p.id,inputs(p.settings),true,p.revision);p=db.addReference('alice',p.id,'identity',Buffer.from('test identity'),metadata,true,p.revision);
  db.enqueue('alice',p.id,'one','cover');const job=db.jobs(p.id)[0];expect(compileShot(job.snapshot,'cover')).toContain('绿色虹膜');
  let calls=0;await executeJob(db,db.claim()!,async({project,onSubmit}:{project:typeof job.snapshot;onSubmit:()=>void})=>{calls++;expect(compileShot(project,'cover')).toContain('绿色虹膜');onSubmit();return {buffer:Buffer.from('engineering output'),metadata:{contentType:'image/png',width:1024,height:1536},usage:null};},{STUDIO_DAILY_REQUEST_LIMIT:'10'});
  expect(calls).toBe(1);const next=db.sequel('alice',p.id,'victoria-harbour',p.revision);expect(compileShot(next,'cover')).toContain('绿色虹膜');expect(next.results).toEqual([]);expect(next.references.find(r=>r.role==='companion')).toMatchObject({builtin:true,rights:'pending'});
 });
 it('rejects stale upload without replacing current bytes or metadata',()=>{
  const db=make(),p=db.create('alice',destinationSettings());const changed=db.update('alice',p.id,p.settings,p.revision);
  expect(()=>db.addReference('alice',p.id,'identity',Buffer.from('stale'),metadata,true,p.revision)).toThrow('STALE_PLAN');expect(db.get('alice',p.id).revision).toBe(changed.revision);expect(db.view(db.get('alice',p.id)).references).toEqual([]);
 });
 it('rejects stale generation confirmation before creating a job; replayed key stays idempotent',()=>{
  const db=make();let p=db.create('alice',destinationSettings());p=db.prepareBuiltinReferences('alice',p.id,inputs(p.settings),true,p.revision);p=db.addReference('alice',p.id,'identity',Buffer.from('identity'),metadata,true,p.revision);
  const stale=p.revision;p=db.update('alice',p.id,{...p.settings,title:'changed elsewhere'},p.revision);
  expect(()=>db.enqueue('alice',p.id,'key','cover',null,'',false,null,null,stale)).toThrow('STALE_PLAN');expect(db.jobs(p.id)).toHaveLength(0);
  const job=db.enqueue('alice',p.id,'key','cover',null,'',false,null,null,p.revision);expect(db.enqueue('alice',p.id,'key','cover',null,'',false,null,null,stale).id).toBe(job.id);expect(db.jobs(p.id)).toHaveLength(1);
 });
 it('blocks changed reference bytes before dispatch and retains failure without retry',async()=>{
  const db=make();let p=db.create('alice',destinationSettings());p=db.prepareBuiltinReferences('alice',p.id,inputs(p.settings),true,p.revision);p=db.addReference('alice',p.id,'identity',Buffer.from('identity'),metadata,true,p.revision);db.enqueue('alice',p.id,'integrity','cover');
  const original=db.asset('alice',p.id,p.companionId!);writeFileSync(join(db.directory,'assets',original.file),Buffer.from('changed-on-disk'));
  let calls=0;await executeJob(db,db.claim()!,async()=>{calls++;throw Error('must not dispatch');},{STUDIO_DAILY_REQUEST_LIMIT:'10'});
  expect(calls).toBe(0);expect(db.jobs(p.id)[0]).toMatchObject({status:'failed',error:'CONTINUITY_REFERENCE_CHANGED'});expect(db.costs('alice',p.id)).toHaveLength(1);expect(db.costs('alice',p.id)[0]).toMatchObject({status:'failed',cost:null});expect(db.get('alice',p.id).results).toHaveLength(0);
 });
});
