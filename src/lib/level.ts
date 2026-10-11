export { LEVELS, MAX_LEVEL_INDEX, getLevelProgress, formatLevel } from "@/domain/growth/levels";
export type { LevelDef, LevelKey, LevelProgress } from "@/domain/growth/levels";

/** 社区行为对应的 XP 规则。dailyCap 用于防止刷量，不影响真实内容质量。 */
export const XP_RULES = {
  CHECK_IN: { base: 5, dailyCap: 1, note: "每日签到" },
  PUBLISH_PROMPT: { base: 15, dailyCap: 3, note: "发布公开提示词" },
  PUBLISH_TEMPLATE: { base: 30, dailyCap: 3, note: "发布公开项目或工作流" },
  COMMENT: { base: 3, dailyCap: 5, note: "发表有效评论" },
  RECEIVE_VOTE: { base: 5, dailyCap: 30, note: "作品获得点赞" },
  RECEIVE_FAVORITE: { base: 8, dailyCap: 30, note: "作品获得收藏" },
  FEATURED: { base: 100, dailyCap: 5, note: "作品被官方推荐" },
  TEMPLATE_APPROVED: { base: 40, dailyCap: 10, note: "项目或工作流通过审核" },
  RUN_COMPLETE: { base: 2, dailyCap: 20, note: "完成一次工作流运行" },
  LIKE: { base: 1, dailyCap: 10, note: "点赞公开内容" },
  SHARE: { base: 2, dailyCap: 10, note: "分享公开内容" },
} as const;

export type XpRuleKey = keyof typeof XP_RULES;

export function checkInBonus(streak: number): number {
  if (streak >= 30) return 10;
  if (streak >= 14) return 7;
  if (streak >= 7) return 5;
  if (streak >= 3) return 2;
  return 0;
}

export function isDailyCapped(rule: XpRuleKey, todayCount: number): boolean {
  return todayCount >= XP_RULES[rule].dailyCap;
}

export const LEVEL_PERKS: Record<number, string[]> = {
  0: ["个人成长主页"],
  1: ["薄荷头像框与聊天气泡", "20 社区积分"],
  2: ["星轨头像框", "40 社区积分"],
  3: ["熔金头像框与霓虹气泡", "80 社区积分"],
  4: ["极光头像框与星轨气泡", "120 社区积分"],
  5: ["领航员称号", "200 社区积分"],
  6: ["导师聊天气泡", "350 社区积分"],
  7: ["ANS 核心头像框与气泡", "600 社区积分"],
};

export function getLevelPerks(levelIndex: number): string[] {
  const perks: string[] = [];
  for (let i = 0; i <= Math.min(levelIndex, 7); i += 1) perks.push(...(LEVEL_PERKS[i] ?? []));
  return perks;
}
