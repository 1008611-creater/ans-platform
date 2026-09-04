/**
 * ANS 社区：学历梗等级体系
 *
 * 设计原则：
 * 1. 等级必须解锁真实权限，否则只是一串没人追的数字（权限映射在 admin-permissions 扩展）
 * 2. 经验以「被认可」为主（精选 100 分），不以「发布量」为主（发布仅 15 分），否则最优策略是灌水
 * 3. 高等级内部再分「年级」（大二 / 研二 / 博三），让升级颗粒度更细、更有上学的感觉
 */

export type LevelKey =
  | "KINDERGARTEN"
  | "PRIMARY"
  | "JUNIOR"
  | "SENIOR"
  | "UNDERGRAD"
  | "MASTER"
  | "PHD"
  | "PROFESSOR";

export interface LevelDef {
  key: LevelKey;
  index: number;
  nameZh: string;
  nameEn: string;
  minXp: number;
  /** 该等级内部的年级名（大学生=大一~大四）；为空则不分年级 */
  grades?: string[];
}

/** 阈值按「认真参与一学期能到大学生(1500)」标定 */
export const LEVELS: LevelDef[] = [
  { key: "KINDERGARTEN", index: 0, nameZh: "幼儿园", nameEn: "Kindergarten", minXp: 0 },
  { key: "PRIMARY", index: 1, nameZh: "小学生", nameEn: "Primary School", minXp: 100, grades: ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"] },
  { key: "JUNIOR", index: 2, nameZh: "初中生", nameEn: "Junior High", minXp: 300, grades: ["初一", "初二", "初三"] },
  { key: "SENIOR", index: 3, nameZh: "高中生", nameEn: "Senior High", minXp: 800, grades: ["高一", "高二", "高三"] },
  { key: "UNDERGRAD", index: 4, nameZh: "大学生", nameEn: "Undergraduate", minXp: 1500, grades: ["大一", "大二", "大三", "大四"] },
  { key: "MASTER", index: 5, nameZh: "研究生", nameEn: "Master", minXp: 3000, grades: ["研一", "研二", "研三"] },
  { key: "PHD", index: 6, nameZh: "博士生", nameEn: "PhD Candidate", minXp: 6000, grades: ["博一", "博二", "博三", "博四"] },
  { key: "PROFESSOR", index: 7, nameZh: "教授", nameEn: "Professor", minXp: 12000 },
];

export const MAX_LEVEL_INDEX = LEVELS.length - 1;

export interface LevelProgress {
  level: LevelDef;
  nextLevel: LevelDef | null;
  /** 当前等级内进度 0~1（满级恒为 1） */
  progress: number;
  xpIntoLevel: number;
  xpForLevel: number;
  /** 等级内的年级显示，如「大二」「研一」；无年级则为 null */
  gradeLabel: string | null;
  xpToNext: number;
}

export function getLevelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, xp);

  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (safeXp >= LEVELS[i].minXp) idx = i;
    else break;
  }

  const level = LEVELS[idx];
  const nextLevel = idx < MAX_LEVEL_INDEX ? LEVELS[idx + 1] : null;

  const xpIntoLevel = safeXp - level.minXp;
  const xpForLevel = nextLevel ? nextLevel.minXp - level.minXp : 0;
  const progress = nextLevel ? Math.min(1, xpIntoLevel / xpForLevel) : 1;

  let gradeLabel: string | null = null;
  if (level.grades && level.grades.length > 0) {
    if (nextLevel) {
      const g = Math.floor(progress * level.grades.length);
      gradeLabel = level.grades[Math.min(g, level.grades.length - 1)];
    } else {
      gradeLabel = level.grades[level.grades.length - 1];
    }
  }

  return {
    level,
    nextLevel,
    progress,
    xpIntoLevel,
    xpForLevel,
    gradeLabel,
    xpToNext: nextLevel ? Math.max(0, nextLevel.minXp - safeXp) : 0,
  };
}

/** 对外展示名：优先「大学生·大二」这种带年级的形式 */
export function formatLevel(xp: number): string {
  const { level, gradeLabel } = getLevelProgress(xp);
  return gradeLabel ? `${level.nameZh}·${gradeLabel}` : level.nameZh;
}

// ============================================================================
// 经验规则
// ============================================================================

export const XP_RULES = {
  CHECK_IN: { base: 5, dailyCap: 1, note: "每日签到" },
  PUBLISH_PROMPT: { base: 15, dailyCap: 3, note: "发布提示词" },
  PUBLISH_TEMPLATE: { base: 30, dailyCap: 3, note: "发布模板" },
  COMMENT: { base: 3, dailyCap: 5, note: "发表评论" },
  RECEIVE_VOTE: { base: 5, dailyCap: 30, note: "内容被点赞" },
  RECEIVE_FAVORITE: { base: 8, dailyCap: 30, note: "内容被收藏" },
  FEATURED: { base: 100, dailyCap: 5, note: "内容被精选" },
  TEMPLATE_APPROVED: { base: 40, dailyCap: 10, note: "模板审核通过" },
  RUN_COMPLETE: { base: 2, dailyCap: 20, note: "完成一次运行" },
} as const;

export type XpRuleKey = keyof typeof XP_RULES;

/** 签到连续奖励：连续 7 天起每天额外加成，封顶 +10 */
export function checkInBonus(streak: number): number {
  if (streak >= 30) return 10;
  if (streak >= 14) return 7;
  if (streak >= 7) return 5;
  if (streak >= 3) return 2;
  return 0;
}

/**
 * 判定某类经验当天是否已达上限。
 * dailyCap 语义：该类经验每天最多计分次数（不是总分）。
 */
export function isDailyCapped(rule: XpRuleKey, todayCount: number): boolean {
  return todayCount >= XP_RULES[rule].dailyCap;
}

/** 等级解锁的权限（与后台管理员权限体系正交，这里只看社区自治权限） */
export const LEVEL_PERKS: Record<number, string[]> = {
  0: ["浏览与使用模板", "每日签到"],
  1: ["发布提示词", "评论与点赞"],
  2: ["发布模板（需 AI 审核）", "申请邀请码"],
  3: ["创建团队", "认领团队任务"],
  4: ["置顶自己的内容", "参与内容评审"],
  5: ["管理分类标签", "发起比赛组队"],
  6: ["设置精选内容", "审核他人模板"],
  7: ["社区治理投票", "导师指导权限"],
};

export function getLevelPerks(levelIndex: number): string[] {
  const perks: string[] = [];
  for (let i = 0; i <= levelIndex; i++) {
    perks.push(...(LEVEL_PERKS[i] ?? []));
  }
  return perks;
}
