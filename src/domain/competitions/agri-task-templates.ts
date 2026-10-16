import type { AgriTaskEditable } from "@/contracts/agri-tasks";

const zh = [
  ["submission-guide", "PREPARATION", "技术规范与提交模板", "确认必交材料、版本与补交说明，形成可填写模板", "总负责人 / 于闻博", "确认本届规则、必交材料和更正政策"],
  ["submission-rehearsal", "PRELIMINARY", "初赛提交演练", "样例队伍完成提交；保存准确版本、材料和异常记录", "赛事运营", "确认初赛窗口并提供获授权样例队伍"],
  ["preliminary-checks", "PRELIMINARY", "初赛材料检查与问题跟进", "仓库 / Demo / 缺项检查与问题均关联具体版本；保留截止记录", "提交队伍 / 于闻博", "实际提交记录、截止规则和轮班安排"],
  ["final-demo", "FINAL", "决赛 Demo 与备用演示检查", "逐队记录版本、设备、网络、声音、备用方案与复查结果", "于闻博 / 曹月", "确认晋级名单、设备、转接和现场流程"],
  ["event-support", "EVENT_DAY", "决赛当天技术支持", "记录现场问题、处理人和处理结果；按确认的轮班提供支持", "曹月 / 现场协作人员", "确认现场安排、人员和演示顺序"],
  ["technical-archive", "ARCHIVE", "赛后技术档案整理", "汇集阶段版本、仓库、Demo、材料与问题记录，核对共享范围", "提交队伍 / 赛事运营", "最终资料、现场记录与材料使用授权"],
] as const;
const en = [
  ["submission-guide", "PREPARATION", "Technical guidelines and submission template", "Confirm required materials, versions and correction policy; prepare the template", "Event lead / operations", "Confirmed edition rules, required materials and correction policy"],
  ["submission-rehearsal", "PRELIMINARY", "Rehearse preliminary submission", "An authorized sample team submits a precise version with materials and exception records", "Event operations", "Confirmed preliminary window and authorized sample team"],
  ["preliminary-checks", "PRELIMINARY", "Preliminary checks and issue follow-up", "Repository, demo and missing-material checks reference exact versions; preserve deadline records", "Submitting teams / operations", "Actual submissions, deadline policy and shift arrangements"],
  ["final-demo", "FINAL", "Final demo and fallback checks", "Record each team's version, equipment, network, audio, fallback and recheck", "Operations / venue coordinator", "Confirmed finalist list, equipment, adapters and event process"],
  ["event-support", "EVENT_DAY", "Final-day technical support", "Record issues, handlers and outcomes; support according to confirmed shifts", "Venue coordinator / collaborators", "Confirmed arrangements, personnel and demo order"],
  ["technical-archive", "ARCHIVE", "Post-event technical archive", "Collect stage versions, repository, demo, materials and issues; verify sharing scope", "Submitting teams / operations", "Final materials, event records and material-use authorization"],
] as const;
export function agriTaskTemplates(locale: "zh" | "en"): Array<{ templateKey: string; task: AgriTaskEditable }> {
  return (locale === "zh" ? zh : en).map(([templateKey, stage, title, acceptanceCriteria, from, needed]) => ({
    templateKey, task: { title, stage, acceptanceCriteria, collaborationNotes: from,
      status: "NOT_STARTED", priority: "NORMAL", due: { state: "UNKNOWN", at: null },
      inputRequirements: { schemaVersion: 1, items: [{ from, needed, latestAt: { state: "UNKNOWN", at: null } }] },
      blockingInput: null, completionResult: null },
  }));
}
