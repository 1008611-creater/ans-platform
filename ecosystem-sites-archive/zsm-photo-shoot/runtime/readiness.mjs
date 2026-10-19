import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { capabilities } from './provider.mjs';
import { authorizeProject, accessRemaining, dailyDispatchStatus } from './access.mjs';
import { missingReferences, referencePlan } from './destinations.mjs';

// A read-only check for the saved project, never a reservation or a model call.
// Queue admission and worker dispatch still enforce the live authorization.
export function projectReadiness(store,owner,project,env=process.env) {
 const capability=capabilities(env),provider={channel:capability.channel,model:capability.model};
 const issues=[];
 const add=(code,message,action)=>issues.push({code,message,action});
 let remaining=0;
 try {
  const grant=authorizeProject(store,owner,project,provider);
  remaining=accessRemaining(store,grant);
 } catch(error) {
  if(error.code==='SHOOT_REFERENCE_SCOPE')add(error.code,'当前参考未匹配本次授权原图，换人物、角色或地点需要另行授权。','library');
  else if(error.code==='SHOOT_QUOTA_EXHAUSTED')add(error.code,'本次额度已用完或被排队任务占用，已有作品仍可下载。','refresh');
  else if(error.code==='SHOOT_ACCESS_REQUIRED')add(error.code,'请通过 ANS 登录领取开拍额度，计划可先保存。','library');
  else add('REFERENCE_UNAVAILABLE','参考文件暂时无法读取，请重新加载后检查。','edit');
 }
 const accessIssues=issues.splice(0);
 const missing=missingReferences(project);
 if(missing.length)add('REFERENCE_REQUIRED','还需准备：'+missing.join('、')+'。','edit');
 if(!project.consent&&project.identityId)add('CONSENT_REQUIRED','请先确认参考照片的使用范围。','edit');
 if(!capability.formats.includes(project.settings.format))add('FORMAT_UNVERIFIED','当前渠道尚未开放此画幅，请选择可用画幅。','format');
 if(!missing.length) {
  try {
   for(const reference of referencePlan(project,'cover')) {
    const asset=store.asset(owner,project.id,reference.id);
    if(!existsSync(join(store.directory,'assets',asset.file)))throw Error('MISSING');
   }
  } catch {add('REFERENCE_UNAVAILABLE','参考原图缺失，已有作品保留，请检查参考。','edit');}
 }
 issues.push(...accessIssues);
 if(!capability.enabled)add('GENERATION_DISABLED',capability.reasons[0]||'拍摄服务暂未就绪，计划可以保存。','refresh');
 if((project.locationId||project.companionId||project.compositionId||project.results.length)&&env.STUDIO_MULTI_REFERENCE_VERIFIED!=='true')add('MULTI_REFERENCE_UNVERIFIED','当前参考组合暂未开放拍摄，计划可以保存。','refresh');
 if(store.health().worker!=='online')add('WORKER_OFFLINE','拍摄服务正在恢复，请稍后同步状态。','refresh');
 if(capability.enabled&&dailyDispatchStatus(store,env).remaining===0)add('DAILY_SHOOT_LIMIT','今天的开拍名额已用完，剩余次数保留；北京时间次日08:00恢复，计划与作品仍可保存。','refresh');
 if(store.active(project.id))add('ALREADY_RUNNING','当前镜头正在拍摄，请在作品页查看进度。','results');
 return {enabled:issues.length===0,revision:project.revision,remaining,issues};
}
