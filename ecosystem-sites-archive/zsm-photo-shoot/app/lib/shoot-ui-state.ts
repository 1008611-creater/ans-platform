import type {ShootProject,ShootJob} from './shoot-contract';
export function submissionBlocker(project:ShootProject,options:{busy?:boolean;dirty?:boolean;conflict?:boolean;enabled:boolean;acknowledge:boolean;gifted?:boolean}):string|null{
 const pending=project.pendingSubmission;if(!pending)return null;
 if(options.busy)return '正在处理，请等本次操作完成。';
 if(pending.revision!==undefined&&pending.revision!==project.revision)return '计划已经变更，请放弃这份旧请求，再按新计划开拍。';
 if(options.conflict)return '先处理另一窗口的计划更新，原请求仍保留。';
 if(options.dirty)return '计划有未保存修改，请先保存并重新核对原请求。';
 if(project.jobs.some(j=>j.status==='queued'||j.status==='running'))return '已有镜头正在拍摄，请同步查看原任务。';
 if(!options.enabled)return '当前没有可用开拍授权；可以放弃此请求，已保存作品不受影响。';
 const issue=project.shootReadiness?.issues[0];if(issue)return issue.message;
 if(project.shootReadiness?.enabled!==true)return '正在核对当前计划，请先同步状态。';
 if(project.jobs.some(j=>j.status==='recoverable')&&!options.acknowledge)return options.gifted?'请确认再次开拍将使用1次，再勾选下面的确认。':'先核实历史请求与扣费，再勾选下面的再次请求确认。';
 return null;
}

export function jobFailureMessage(job:ShootJob,detail:string|undefined,gifted:boolean):string{
 const reason=job.error==='OUTPUT_DIMENSIONS'?'返回尺寸不符，未作为成片交付。':job.error==='INTERRUPTED'?'拍摄中断，已保存的作品保留。':detail||'本次拍摄未完成，已保存的作品保留。';
 const quota=gifted?(job.quotaUsed===undefined?'开拍次数以当前剩余额度为准。':job.quotaUsed>0?'本任务已使用'+job.quotaUsed+'次，若生成失败将自动退回 2 积分。':'本任务未扣开拍次数。'):'';
 const dimensions=job.returnedSize?(job.requestedSize?'请求 '+job.requestedSize+'，返回 '+job.returnedSize+'。':'返回 '+job.returnedSize+'。'):'';
 const storage=job.rejectedSaveError?'渠道返回原图未能保存，请联系站点负责人。':'';
 return reason+quota+'系统不会自动重试。'+dimensions+storage;
}
export function jobProgressMessage(job:ShootJob):string{
 if(job.status==='queued')return (job.queueAhead===undefined?'正在排队。':job.queueAhead>0?'排队中，前面还有'+job.queueAhead+'个拍摄任务。':'即将开始拍摄。')+'可以离开页面，稍后从作品库查看；不用重复提交。';
 if(job.status==='running')return '正在处理这一镜，结果会自动保存。可以离开页面，稍后从作品库查看；停止后续镜头不会撤回已发送的请求。';
 return '';
}
