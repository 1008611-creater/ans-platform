import type { LevelDef, LevelKey, LevelProgress } from "@/contracts/level";

export type { LevelDef, LevelKey, LevelProgress };

/** ANS 社区成长等级：经验来自真实的创作、互动与持续参与。 */
export const LEVELS: LevelDef[] = [
  { key: "KINDERGARTEN", index: 0, nameZh: "ANS 新人", nameEn: "Newcomer", minXp: 0 },
  { key: "PRIMARY", index: 1, nameZh: "探索者", nameEn: "Explorer", minXp: 100, grades: ["萌新", "上手", "熟练", "进阶", "突破", "出圈"] },
  { key: "JUNIOR", index: 2, nameZh: "实践者", nameEn: "Practitioner", minXp: 300, grades: ["试做", "稳定", "成型"] },
  { key: "SENIOR", index: 3, nameZh: "创作者", nameEn: "Creator", minXp: 800, grades: ["灵感", "打磨", "发布"] },
  { key: "UNDERGRAD", index: 4, nameZh: "构建者", nameEn: "Builder", minXp: 1500, grades: ["搭建", "联调", "上线", "复用"] },
  { key: "MASTER", index: 5, nameZh: "领航员", nameEn: "Navigator", minXp: 3000, grades: ["协作", "带队", "影响力"] },
  { key: "PHD", index: 6, nameZh: "社区导师", nameEn: "Mentor", minXp: 6000, grades: ["答疑", "陪跑", "共创", "传承"] },
  { key: "PROFESSOR", index: 7, nameZh: "ANS 先锋", nameEn: "ANS Pioneer", minXp: 12000 },
];

export const MAX_LEVEL_INDEX = LEVELS.length - 1;

export function getLevelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, Number.isFinite(xp) ? xp : 0);
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (safeXp >= LEVELS[i].minXp) idx = i;
    else break;
  }
  const level = LEVELS[idx];
  const nextLevel = idx < MAX_LEVEL_INDEX ? LEVELS[idx + 1] : null;
  const xpIntoLevel = safeXp - level.minXp;
  const xpForLevel = nextLevel ? nextLevel.minXp - level.minXp : 0;
  const progress = nextLevel ? Math.min(1, xpIntoLevel / xpForLevel) : 1;
  let gradeLabel: string | null = null;
  if (level.grades?.length) {
    const gradeIndex = nextLevel ? Math.floor(progress * level.grades.length) : level.grades.length - 1;
    gradeLabel = level.grades[Math.min(gradeIndex, level.grades.length - 1)];
  }
  return { level, nextLevel, progress, xpIntoLevel, xpForLevel, gradeLabel, xpToNext: nextLevel ? Math.max(0, nextLevel.minXp - safeXp) : 0 };
}

export function formatLevel(xp: number): string {
  const { level, gradeLabel } = getLevelProgress(xp);
  return gradeLabel ? `${level.nameZh}·${gradeLabel}` : level.nameZh;
}

