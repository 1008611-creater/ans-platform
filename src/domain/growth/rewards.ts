import { LEVELS, getLevelProgress } from "@/domain/growth/levels";

export type RewardKind = "avatar-frame" | "chat-bubble" | "badge";
export type RewardDefinition = { key: string; kind: RewardKind; label: string; description: string; levelIndex: number };

export const AVATAR_FRAMES: RewardDefinition[] = [
  { key: "default", kind: "avatar-frame", label: "基础", description: "ANS 默认头像框", levelIndex: 0 },
  { key: "mint", kind: "avatar-frame", label: "薄荷叶脉", description: "清爽的成长起点", levelIndex: 1 },
  { key: "orbit", kind: "avatar-frame", label: "星轨", description: "持续贡献的轨迹", levelIndex: 2 },
  { key: "molten", kind: "avatar-frame", label: "熔金", description: "创作者的高光边缘", levelIndex: 3 },
  { key: "aurora", kind: "avatar-frame", label: "极光", description: "跨越边界的协作感", levelIndex: 4 },
  { key: "core", kind: "avatar-frame", label: "ANS 核心", description: "先锋成员专属", levelIndex: 7 },
];

export const CHAT_BUBBLES: RewardDefinition[] = [
  { key: "default", kind: "chat-bubble", label: "纸张", description: "干净、清晰、默认", levelIndex: 0 },
  { key: "mint", kind: "chat-bubble", label: "薄荷", description: "轻盈的行动感", levelIndex: 1 },
  { key: "neon", kind: "chat-bubble", label: "霓虹", description: "创作者的夜间频道", levelIndex: 3 },
  { key: "orbit", kind: "chat-bubble", label: "星轨", description: "把灵感串起来", levelIndex: 4 },
  { key: "mentor", kind: "chat-bubble", label: "导师", description: "给新成员的引导感", levelIndex: 6 },
  { key: "core", kind: "chat-bubble", label: "核心", description: "ANS 先锋专属", levelIndex: 7 },
];

export const ALL_REWARDS = [...AVATAR_FRAMES, ...CHAT_BUBBLES];
export const LEVEL_POINT_REWARDS = [0, 20, 40, 80, 120, 200, 350, 600];

export function getUnlockedRewards(levelIndex: number) {
  return ALL_REWARDS.filter((reward) => reward.levelIndex <= levelIndex);
}

export function getLevelPointReward(levelIndex: number) {
  return LEVEL_POINT_REWARDS[levelIndex] ?? 0;
}

export function getLevelRewardSummary(xp: number) {
  const progress = getLevelProgress(xp);
  return {
    ...progress,
    levelRewardPoints: getLevelPointReward(progress.level.index),
    unlocked: getUnlockedRewards(progress.level.index),
    nextReward: progress.nextLevel ? {
      level: progress.nextLevel,
      points: getLevelPointReward(progress.nextLevel.index),
      unlocks: ALL_REWARDS.filter((reward) => reward.levelIndex === progress.nextLevel!.index),
    } : null,
  };
}

export function rewardByKey(key: string) {
  return ALL_REWARDS.find((reward) => reward.key === key);
}

export function isRewardUnlocked(key: string, xp: number) {
  const reward = rewardByKey(key);
  return Boolean(reward && reward.levelIndex <= getLevelProgress(xp).level.index);
}

export function levelName(index: number) {
  return LEVELS[index]?.nameZh ?? LEVELS[0].nameZh;
}
