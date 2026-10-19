import {describe,it,expect} from 'vitest';
import {submissionBlocker,jobFailureMessage,jobProgressMessage} from './shoot-ui-state';
import {defaultSettings} from '../../runtime/recipe.mjs';
import type {ShootProject,ShootJob} from './shoot-contract';
const p:ShootProject={id:'private',settings:defaultSettings(),revision:2,planRevision:2,people:1,recipe:{id:'test',version:'1',validation:'synthetic'},identityId:null,compositionId:null,consent:false,createdAt:1,updatedAt:2,expiresAt:10,results:[],jobs:[],references:[],shootReadiness:{enabled:true,revision:2,remaining:75,issues:[]},pendingSubmission:{key:'request',status:'prepared',createdAt:1,revision:2,kind:'cover',shotId:'cover',note:'',parentResultId:null}};
const ready={enabled:true,acknowledge:true};
describe('explicit reasons for disabled pending confirmation',()=>{
 it('explains a stale receipt instead of offering to shoot a changed plan',()=>{expect(submissionBlocker({...p,revision:3},ready)).toContain('放弃这份旧请求');});
 it('requires actual project readiness, even with session quota',()=>{expect(submissionBlocker({...p,shootReadiness:{enabled:false,revision:2,remaining:75,issues:[{code:'SHOOT_REFERENCE_SCOPE',message:'参考未授权',action:'library'}]}},ready)).toBe('参考未授权');});
 it('preserves uncertainty until the user explicitly acknowledges historical requests',()=>{const job={status:'recoverable'} as ShootJob;expect(submissionBlocker({...p,jobs:[job]},{...ready,acknowledge:false})).toContain('核实历史请求');expect(submissionBlocker({...p,jobs:[job]},ready)).toBeNull();});
 it('explains unsaved input and exhausted authorization without dispatching anything',()=>{expect(submissionBlocker(p,{...ready,dirty:true})).toContain('未保存');expect(submissionBlocker(p,{...ready,enabled:false})).toContain('没有可用开拍授权');expect(submissionBlocker(p,ready)).toBeNull();expect(submissionBlocker({...p,shootReadiness:undefined},ready)).toContain('先同步状态');});
});

describe('shoot recovery and queue explanations',()=>{
 it('shows dispatched dimensions and usage without asking gift users for provider invoices',()=>{
  const job={status:'recoverable',error:'OUTPUT_DIMENSIONS',requestedSize:'1024x1536',returnedSize:'128x128',quotaUsed:1} as ShootJob;
  const text=jobFailureMessage(job,undefined,true);expect(text).toContain('请求 1024x1536');expect(text).toContain('返回 128x128');expect(text).toContain('已使用1次');expect(text).not.toContain('账单');expect(text).toContain('不会自动重试');
  expect(jobFailureMessage({...job,quotaUsed:0},undefined,true)).toContain('未扣');expect(jobFailureMessage({...job,rejectedSaveError:'STORAGE_LIMIT'},undefined,true)).toContain('原图未能保存');
 });
 it('asks gift users to acknowledge another use while retaining the consent gate',()=>{
  const project={...p,jobs:[{status:'recoverable'} as ShootJob]};expect(submissionBlocker(project,{enabled:true,acknowledge:false,gifted:true})).toContain('使用1次');expect(submissionBlocker(project,{enabled:true,acknowledge:true,gifted:true})).toBeNull();
 });
 it('distinguishes waiting and dispatched states without promising cancellation',()=>{
  expect(jobProgressMessage({status:'queued',queueAhead:2} as ShootJob)).toContain('还有2个拍摄任务');expect(jobProgressMessage({status:'queued',queueAhead:0} as ShootJob)).toContain('即将');expect(jobProgressMessage({status:'running'} as ShootJob)).toContain('不会撤回已发送');expect(jobProgressMessage({status:'succeeded'} as ShootJob)).toBe('');
 });
});
