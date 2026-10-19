import type { ShootProject } from './shoot-contract';

// Adapted from ANS production DinoTaskSnapshot / DinoGuide, release
// ans-product-3277abe1231e2b58. Presentation only; no personal inputs leave the studio.
export type DinoAction = 'discover' | 'library' | 'edit' | 'plan' | 'review' | 'results' | 'costs' | 'refresh' | 'error';
export type DinoPhase = 'idle' | 'input' | 'editing' | 'confirm' | 'saving' | 'queued' | 'working' | 'review' | 'recovering' | 'attention' | 'failed' | 'cancelled' | 'blocked';
export interface DinoSnapshot {
  phase: DinoPhase;
  step: 1 | 2 | 3;
  title: string;
  message: string;
  action: DinoAction;
  actionLabel: string;
  targetId?: string;
  saved: number;
  versions: number;
  hint: string;
}
export interface DinoInput {
  screen: 'intro' | 'edit' | 'plan' | 'results' | 'library';
  project: ShootProject | null;
  booting: boolean;
  busy: boolean;
  dirty: boolean;
  hasError: boolean;
  enabled: boolean;
  missing: string[];
  companion: boolean;
}
export function studioDino(input: DinoInput): DinoSnapshot {
  const {screen, project, booting, busy, dirty, hasError, enabled, missing} = input;
  // A library/home can retain an editor in React state. Never announce its task there.
  const p = ['edit', 'plan', 'results'].includes(screen) ? project : null;
  const results = p?.results.filter(r => r.planRevision === p.planRevision) ?? [];
  const saved = new Set(results.map(r => r.shotId)).size;
  const jobs = p?.jobs.filter(j => j.planRevision === p.planRevision) ?? [];
  const base = {saved, versions: results.length, hint: '导航与任务提醒 · 拍摄由你在页面确认'};
  const state = (phase: DinoPhase, step: 1 | 2 | 3, title: string, message: string, action: DinoAction, actionLabel: string, targetId?: string): DinoSnapshot => ({...base, phase, step, title, message, action, actionLabel, targetId});
  if (booting) return state('recovering', 1, '先找回你的拍摄', '正在读取已保存的计划和作品，连接恢复后再决定下一步。', 'refresh', '重新读取');
  if (hasError) return state('attention', p ? screen === 'results' ? 3 : 2 : 1, '先看看页面提示', '这次操作没有确认成功。已有作品保留，先查看具体提示，再决定是否重新操作。', 'error', '查看提示', 'studio-error');
  if (busy) return state('saving', screen === 'results' ? 3 : 1, '正在确认这次操作', '等页面确认完成就好。不要重复提交，我会跟着真实状态更新。', 'refresh', '等待页面更新');
  if (!p) {
    if (screen === 'library') return state('idle', 1, '下一次，想怎么出场？', '这里保留你的拍摄与每个版本。打开一本继续打磨，也可以去挑一个新玩法。', 'discover', '去挑个好玩的', 'studio-discover');
    return state('idle', 1, '想拍点什么好玩的？', enabled?'看中作品就拍同款，或挑个玩法，再放入你的照片。':'通过 ANS 登录领取开拍次数，挑个玩法，再放入你的照片。', 'discover', '帮我挑个玩法', 'studio-discover');
  }
  const active = p.jobs.find(j => j.status === 'queued' || j.status === 'running');
  if (active) return state(active.status === 'queued' ? 'queued' : 'working', 2, active.status === 'queued' ? '已经排上了' : '镜头正在拍摄', `当前任务已保存 ${active.completed.length}/${active.targets.length} 个镜头。刷新后仍可恢复；停止后续镜头不代表上游已停止计费。`, 'results', '查看拍摄进度', 'studio-progress');
  if(p.pendingSubmission)return state('attention',2,'先找回这次拍摄','这份请求已保存，但还没有开始拍摄。到页面确认原请求，或放弃它；我不会自动重发。','plan','查看待确认请求','studio-submission');
  if (saved===6&&!dirty&&jobs[0]?.status!=='failed'&&jobs[0]?.status!=='recoverable'&&jobs[0]?.status!=='cancelled')return state('review',3,'这一组，值得留下吗？','六个镜头已保存。逐张核对人物与角色，再看整组是否协调；下载原图，把作品真正留下来。历史请求记录仍保留，新增拍摄前再核实扣费。','results','查看与下载作品','studio-progress');
  if (jobs.some(j => j.status === 'recoverable')) return state('recovering', 3, '先核实这次请求', '上游请求结果或扣费还不确定。已有照片都在；先查看生成记录与渠道账单，再决定是否继续。', 'costs', '查看生成记录', 'studio-costs');
  if (dirty) return state('editing', 1, '这个脑洞还没保存', '你的调整仍在当前页面。查看六镜计划时会先保存；换角色或地点后，要重新核对对应参考。', 'plan', '保存并看六镜计划', 'studio-plan');
  const lastJob = jobs[0];
  if (lastJob?.status === 'failed') return state('failed', 3, '这一镜没有完成', '先看任务提示和生成记录。原版与成功的镜头保留，重新拍摄仍可能产生费用。', 'costs', '查看失败记录', 'studio-costs');
  if (lastJob?.status === 'cancelled') return state('cancelled', 3, '后续镜头已停下', '已保存的照片可以查看和下载。正在处理的上游请求仍可能计费；继续前先核实生成记录。', 'costs', '查看已保存与记录', 'studio-costs');
  if (results.length) {
    const master = p?.continuity?.planRevision === p?.planRevision ? results.find(r => r.id === p?.continuity?.resultId) : undefined;
    const approved = !!master;
    if (saved < 6) return state('review', 3, approved ? '第'+master!.version+'版已锁定，逐镜续拍' : '封面像你，也像它吗？', `当前计划保存了 ${saved}/6 个镜头、${results.length} 个版本。${approved?'后续镜头会携带认可母版，每次只拍一镜，再检查一致性。':'先比人物、角色外形与现场光影，再明确认可具体版本为续拍母版。'}封面版本不等于六镜组照。`, approved?'results':'review', approved?'去审片与逐镜续拍':'去对比与评价封面', approved?'studio-continuation':'studio-review');
    return state('review', 3, '这一组，值得留下吗？', '六个镜头已保存。逐张核对人物与角色，再看整组是否协调；下载原图，把作品真正留下来。', 'results', '查看与下载作品', 'studio-progress');
  }
  if (missing.length) return state('input', 1, '还差几份参考', `待补：${missing.join('、')}。本人照片负责长相，角色图负责造型，地点图负责真实空间。`, 'edit', '去准备参考', 'studio-references');
  const blocker=p.shootReadiness?.issues[0];
  if(blocker)return state('blocked',2,'先处理这项，再开拍',blocker.message,blocker.action==='format'?'edit':blocker.action,blocker.action==='library'?'查看我的拍摄':blocker.action==='refresh'?'同步拍摄状态':blocker.action==='results'?'查看拍摄进度':'准备当前计划',blocker.action==='format'?'studio-format':'studio-plan');
  if (!enabled) return state('blocked', 2, '先核对开拍状态', '计划和作品已保留。请检查页面的账号额度与服务提示，再决定下一步。', 'plan', '查看六镜计划', 'studio-plan');
  return state('confirm', 2, '先拍封面，把方向定下来', '核对参考、画幅和六个镜头后，在页面确认拍摄。生成可能计费；我会提醒下一步，开拍由你决定。', 'plan', '核对拍摄计划', 'studio-plan');
}
