import { describe, expect, it } from 'vitest';
import { studioDino, type DinoInput } from './shoot-dino';
import type { PhotoResult, ShootJob, ShootProject } from './shoot-contract';

const project: ShootProject = {
  id:'PRIVATE-PROJECT-ID', settings:{title:'PRIVATE TITLE',direction:'coast',format:'portrait',outfit:'PRIVATE OUTFIT',idea:'PRIVATE IDEA',locked:['人物身份'],allowedChanges:['场景'],shotNotes:{}},
  revision:1,planRevision:2,people:1,recipe:{id:'story-six',version:'3.0.0',validation:'pending'},
  identityId:'PRIVATE-PHOTO-ID',compositionId:null,companionId:'PRIVATE-CHARACTER-ID',locationId:null,consent:true,
  createdAt:1,updatedAt:2,expiresAt:3,results:[],jobs:[],references:[],
};
const baseline: DinoInput={screen:'plan',project,booting:false,busy:false,dirty:false,hasError:false,enabled:false,missing:[],companion:true};
const job=(status:ShootJob['status'],planRevision=2):ShootJob=>({id:'JOB',projectId:project.id,kind:'cover',planRevision,parentResultId:null,status,targets:['cover'],completed:[],stopRequested:false,error:null,createdAt:2,updatedAt:2,note:'PRIVATE NOTE'});
const photo=(id:string,shotId:PhotoResult['shotId']='cover',planRevision=2):PhotoResult=>({id,assetId:'PRIVATE-RESULT-ID',shotId,version:1,parentResultId:null,planRevision,jobId:'JOB',attemptId:'ATTEMPT',createdAt:2,width:1024,height:1536,note:'PRIVATE NOTE',review:null});
const resolve=(override:Partial<DinoInput>={},p:Partial<ShootProject>={})=>studioDino({...baseline,project:{...project,...p},...override});

describe('ANS task guide integration (presentation only)',()=>{
  it('home and library discard a retained private editor',()=>{
    for(const screen of ['intro','library'] as const){const snapshot=resolve({screen},{jobs:[job('recoverable')],results:[photo('1')]});expect(snapshot.phase).toBe('idle');expect(snapshot.saved).toBe(0);expect(snapshot.versions).toBe(0);}
  });
  it('returns only public workflow facts, never images, titles, IDs or model text',()=>{
    const value=JSON.stringify(resolve({}, {results:[photo('1')]}));
    expect(value).not.toMatch(/PRIVATE|JOB|ATTEMPT|1024|1536/);expect(value).toContain('1/6');
  });
  it('prioritizes actual network error over a ready plan',()=>{expect(resolve({hasError:true,enabled:true}).action).toBe('error');});
  it('waits for a busy mutation without repeating it',()=>{expect(resolve({busy:true}).phase).toBe('saving');});
  it.each(['queued','running'] as const)('reads %s from the real active task',status=>{
    const snapshot=resolve({}, {jobs:[{...job(status),targets:['cover','place'],completed:['cover']}]});
    expect(snapshot.phase).toBe(status==='queued'?'queued':'working');expect(snapshot.message).toContain('1/2');expect(snapshot.action).toBe('results');
  });
  it('never turns an uncertain charge into an automatic retry',()=>{
    const snapshot=resolve({enabled:true},{jobs:[job('recoverable')],results:[photo('1')]});
    expect(snapshot.phase).toBe('recovering');expect(snapshot.action).toBe('costs');expect(snapshot.saved).toBe(1);
  });
  it.each(['failed','cancelled'] as const)('keeps %s visible even when previous photos exist',status=>{
    const snapshot=resolve({}, {jobs:[job(status)],results:[photo('1')]});expect(snapshot.phase).toBe(status);expect(snapshot.action).toBe('costs');
  });
  it('counts distinct shots, not cover versions, and excludes old plans',()=>{
    const snapshot=resolve({}, {results:[photo('1'),photo('2'),photo('3','place',1)]});expect(snapshot.saved).toBe(1);expect(snapshot.versions).toBe(2);expect(snapshot.message).toContain('不等于六镜组照');
  });
  it('does not manufacture personal or character approval',()=>{
    const snapshot=resolve({}, {results:[photo('1')]});expect(snapshot.title).toContain('像你');expect(snapshot.action).toBe('review');
  });
  it('uses the explicitly approved third version even after a sixth cover arrives',()=>{
    const third={...photo('third'),version:3};const sixth={...photo('sixth'),version:6};
    const continuity={version:1 as const,resultId:third.id,assetId:third.assetId,planRevision:2,approvedAt:2,references:[],recipe:project.recipe,model:'gpt-image-2.5-sunburst',quality:'high' as const,size:'1024x1536',locks:{identity:'inherit',outfit:'inherit',character:'inherit',lighting:'inherit'},validation:'human-approved-cover;continuation-unverified'};
    const snapshot=resolve({}, {results:[third,sixth],continuity});expect(snapshot.title).toContain('第3版');expect(snapshot.title).not.toContain('第6版');expect(snapshot.targetId).toBe('studio-continuation');
    expect(resolve({}, {results:[third,sixth],continuity:{...continuity,planRevision:1}}).action).toBe('review');
  });
  it('does not mark six returned shots as approved',()=>{
    const results=(['cover','place','portrait','motion','pause','detail'] as const).map((id,i)=>photo(String(i),id));const snapshot=resolve({}, {results});expect(snapshot.saved).toBe(6);expect(snapshot.message).toContain('逐张核对');expect(snapshot.action).toBe('results');
  });
  it('guides dirty inputs to the existing save and plan path',()=>{expect(resolve({dirty:true,missing:['本人照片']}).action).toBe('plan');});
  it('identifies missing input responsibilities before confirming a plan',()=>{const snapshot=resolve({missing:['本人照片','角色参考']});expect(snapshot.phase).toBe('input');expect(snapshot.action).toBe('edit');});
  it('reflects the actual public generation gate',()=>{expect(resolve().phase).toBe('blocked');const ready=resolve({enabled:true});expect(ready.action).toBe('plan');expect(ready.message).toContain('页面确认');});
  it('guides a delivered set to its photos while preserving historical charge uncertainty',()=>{const results=(['cover','place','portrait','motion','pause','detail'] as const).map((id,i)=>photo(String(i),id));const snapshot=resolve({}, {results,jobs:[job('succeeded'),{...job('recoverable'),id:'old'}]});expect(snapshot.action).toBe('results');expect(snapshot.saved).toBe(6);expect(snapshot.message).toContain('历史请求记录仍保留');});
  it('keeps a newly failed modification visible even after all six shots were delivered',()=>{const results=(['cover','place','portrait','motion','pause','detail'] as const).map((id,i)=>photo(String(i),id));expect(resolve({}, {results,jobs:[{...job('recoverable'),kind:'revision'}]}).action).toBe('costs');});

});