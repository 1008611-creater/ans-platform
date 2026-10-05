export type AgriTrackId = "people" | "discovery" | "action";

export interface AgriTrack {
  id: AgriTrackId;
  code: string;
  /**
   * 赛道说明锚点。三大赛道没有外部系统，按钮只在页内跳转到对应卡片，
   * 因此这里保存的是 hash 而不是外链。
   */
  href: string;
}

export const AGRI_TRACKS: readonly AgriTrack[] = [
  { id: "people", code: "TRACK 01", href: "#track-people" },
  { id: "discovery", code: "TRACK 02", href: "#track-discovery" },
  { id: "action", code: "TRACK 03", href: "#track-action" },
];

/** 四阶段参赛路径：报名组队 → 集中开发 → 评审投票 → 现场展示。 */
export const AGRI_PHASES = ["discover", "plan", "produce", "submit"] as const;

/** 提交检查清单，与赛事方案的报名材料要求一一对应。 */
export const AGRI_DELIVERABLES = [
  "brief",
  "plan",
  "storyboard",
  "source",
  "iterations",
  "final",
  "evidence",
  "package",
] as const;

export const AGRI_AWARDS = [
  "first",
  "second",
  "third",
  "tech",
  "innovation",
  "popular",
] as const;

export type AgriPhaseId = (typeof AGRI_PHASES)[number];
export type AgriDeliverableId = (typeof AGRI_DELIVERABLES)[number];
export type AgriAwardId = (typeof AGRI_AWARDS)[number];