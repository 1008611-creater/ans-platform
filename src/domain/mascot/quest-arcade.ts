import { loadSanctuaryState, saveSanctuaryState } from "./sanctuary";

export const QUEST_ARCADE_STORAGE_KEY = "ans_quest_arcade_v1";
export const QUEST_ARCADE_EVENT = "ans:quest-arcade-updated";

/**
 * Approved billing & benefit ratio:
 * 1 Point = ¥0.10 CNY = $0.10 USD APIC nominal quota
 * 10 Points = ¥1.00 CNY = $1.00 USD APIC nominal quota
 */
export const POINTS_PER_USD = 10;
export const CNY_PER_POINT = 0.1;
export const USD_PER_POINT = 0.1;

export type QuestCategory = "daily" | "weekly" | "agri" | "secret";
export type PrizeRarity = "UR" | "SSR" | "SR" | "R";

export interface QuestDefinition {
  id: string;
  category: QuestCategory;
  icon: string;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  hintZh?: string;
  hintEn?: string;
  href?: string;
  targetCount: number;
  unlockPool: "deepseek" | "flagship";
  unlockUsd: number; // 1 USD = 10 Points
  rewardTokens: number; // Claw machine / roulette tokens
  rewardStarBeans: number;
  rewardXp: number;
}

export interface ArcadePrize {
  id: string;
  rarity: PrizeRarity;
  icon: string;
  color: string;
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
  unlockPool: "deepseek" | "flagship";
  unlockUsd: number;
  starBeans: number;
  bonusBadgeZh: string;
  bonusBadgeEn: string;
  probability: number;
}

export interface ArcadeRewardRecord {
  id: string;
  prizeId: string;
  rarity: PrizeRarity;
  nameZh: string;
  nameEn: string;
  unlockUsd: number;
  unlockPool: "deepseek" | "flagship";
  mode: "claw" | "roulette";
  createdAt: string;
}

export interface QuestArcadeState {
  version: 1;
  arcadeTokens: number;
  pityCounter: number; // Guarantees SSR/UR at 10 draws
  streakDays: number;
  lastCheckInDate: string | null;
  // Progressive Vault balances (in USD; 1 USD = 10 Points)
  deepseekTotalUsd: number; // $1000 (= 10,000 Points)
  deepseekUnlockedUsd: number; // Starts at $50 (= 500 Points) after onboarding
  flagshipTotalUsd: number; // $600 (= 6,000 Points: $300 Terra + $200 GPT-6 + $100 Opus 5.5)
  flagshipUnlockedUsd: number; // Unlocked across M1-M4 & quests
  tripoFreeVouchers: number;
  marketDiscountVouchers: number;
  vibehubReadSeconds: number;
  questProgress: Record<string, number>;
  questClaimed: Record<string, string>; // questId -> dateString or "claimed"
  secretUnlockedAt: Record<string, string>;
  drawHistory: ArcadeRewardRecord[];
}

export const QUEST_DEFINITIONS: readonly QuestDefinition[] = [
  // 1. Daily Quests
  {
    id: "daily_checkin",
    category: "daily",
    icon: "📅",
    titleZh: "每日算力签到",
    titleEn: "Daily Compute Check-In",
    descZh: "每日登录算力中心打卡，连续 5 天额外激活农客松 M4 冲刺进度。",
    descEn: "Check in daily at the Compute Center; a 5-day streak advances AgriHackathon M4.",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 10,
    rewardTokens: 1,
    rewardStarBeans: 25,
    rewardXp: 20,
  },
  {
    id: "daily_vibehub_read",
    category: "daily",
    icon: "📚",
    titleZh: "VibeHub 沉浸充电 60 秒",
    titleEn: "VibeHub 60s Deep Reading",
    descZh: "在 VibeHub 实训课程页专注阅读满 60 秒，边学 AI 边提现算力金库。",
    descEn: "Read any VibeHub interactive lesson for 60 seconds to unlock Vault quota.",
    href: "/vibe-hub",
    targetCount: 60,
    unlockPool: "deepseek",
    unlockUsd: 15,
    rewardTokens: 1,
    rewardStarBeans: 30,
    rewardXp: 25,
  },
  {
    id: "daily_explore_star",
    category: "daily",
    icon: "⭐",
    titleZh: "星火助威 · 浏览作品墙并点亮 Star",
    titleEn: "Spark Support · Browse & Star a Project",
    descZh: "前往项目广场或农客松作品墙浏览项目并点亮 1 颗有效 Star。",
    descEn: "Visit the Project Plaza or AgriHackathon Wall and star 1 project.",
    href: "/explore?category=competition&subcategory=agri-wall",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 15,
    rewardTokens: 1,
    rewardStarBeans: 25,
    rewardXp: 25,
  },
  {
    id: "daily_agent_feed",
    category: "daily",
    icon: "🦖",
    titleZh: "灵龙特训 · 投喂或对话小恐龙 Agent",
    titleEn: "Dino Training · Feed or Chat with Agent",
    descZh: "在右下角灵龙圣所投喂 1 次盲盒夜宵或与小恐龙 Agent 互动。",
    descEn: "Feed a blind-box snack or interact with the Dino Agent in the Sanctuary bar.",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 10,
    rewardTokens: 1,
    rewardStarBeans: 35,
    rewardXp: 20,
  },

  // 2. Weekly & Monetization Ecosystem Quests
  {
    id: "weekly_market_workflow",
    category: "weekly",
    icon: "🛠️",
    titleZh: "工作流市场造物主 · 上传 AI 工作流",
    titleEn: "Marketplace Creator · Publish an AI Workflow",
    descZh: "在工作流工坊创建并上架 1 个可复用工作流，他人调用即可获得市场分成。",
    descEn: "Create and list a reusable workflow in Workflow Studio to earn marketplace revenue.",
    href: "/workflows",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 40,
    rewardTokens: 5,
    rewardStarBeans: 100,
    rewardXp: 150,
  },
  {
    id: "weekly_publish_project",
    category: "weekly",
    icon: "🚀",
    titleZh: "作品破壳上架 · 发布公开项目",
    titleEn: "Launch Project · Publish to Plaza",
    descZh: "在项目广场发布 1 个公开项目或参赛原型，沉淀个人技术资产。",
    descEn: "Publish a public project or competition prototype to the Plaza.",
    href: "/explore/submit",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 80,
    rewardTokens: 3,
    rewardStarBeans: 80,
    rewardXp: 100,
  },
  {
    id: "weekly_homepage_heat",
    category: "weekly",
    icon: "🔥",
    titleZh: "高光创作者 · 主页收获点赞/评论/收藏/粉丝",
    titleEn: "Creator Spotlight · Gain Likes, Comments & Followers",
    descZh: "分享个人主页或作品，累计收获 5 次社区互动热度（点赞、评论、收藏或关注）。",
    descEn: "Share your profile or project to earn 5 community interactions (likes, comments, stars, or followers).",
    href: "/showcase",
    targetCount: 5,
    unlockPool: "flagship",
    unlockUsd: 50,
    rewardTokens: 3,
    rewardStarBeans: 90,
    rewardXp: 120,
  },

  // 3. AgriHackathon Periodic Event Milestones ($600 / 6,000 Points Flagship Pack)
  {
    id: "agri_m1_apply",
    category: "agri",
    icon: "🌾",
    titleZh: "M1 集结号 · 提交农客松报名问卷（立解 20% 旗舰包）",
    titleEn: "M1 Rally · Submit AgriHackathon Application (Unlock 20% Flagship Pack)",
    descZh: "完成农客松参赛算力申请问卷，首期解锁 $120（1,200 积分：GPT-5.6 / GPT-6.1 / Opus 5.5）。",
    descEn: "Submit the AgriHackathon benefit application to unlock the first $120 (1,200 pts) flagship quota.",
    href: "/workspace/benefits#benefits-agri",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 120,
    rewardTokens: 3,
    rewardStarBeans: 60,
    rewardXp: 100,
  },
  {
    id: "agri_m2_code_host",
    category: "agri",
    icon: "📦",
    titleZh: "M2 代码存证 · 阶段提交页托管源码包或 Git 快照（解锁 30%）",
    titleEn: "M2 Code Hosting · Upload Source Archive or Git Snapshot (Unlock 30%)",
    descZh: "在「03 阶段材料提交」绑定战队并上传源码压缩包或锁定 Git 快照，解锁 $180（1,800 积分）旗舰额度。",
    descEn: "Bind your team and upload a source archive or Git snapshot in Stage Submissions to unlock $180 (1,800 pts).",
    href: "/competitions/agrihackathon/submissions",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 180,
    rewardTokens: 3,
    rewardStarBeans: 80,
    rewardXp: 150,
  },
  {
    id: "agri_m3_wall_public",
    category: "agri",
    icon: "🏆",
    titleZh: "M3 破圈拉票 · 参赛作品公开登上农客松作品墙（解锁 25%）",
    titleEn: "M3 Public Showcase · Publish Entry to AgriHackathon Wall (Unlock 25%)",
    descZh: "将比赛项目公开绑定至农客松作品墙参与校友拉 Star（占初赛 20% 权重），解锁 $150（1,500 积分）旗舰额度。",
    descEn: "Publish and bind your project on the AgriHackathon Wall for Star voting to unlock $150 (1,500 pts).",
    href: "/explore/agrihackathon/submit",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 150,
    rewardTokens: 3,
    rewardStarBeans: 80,
    rewardXp: 150,
  },
  {
    id: "agri_m4_streak_final",
    category: "agri",
    icon: "👑",
    titleZh: "M4 终极冲刺 · 连续备赛签到满 5 天或入围十强（解锁最后 25%）",
    titleEn: "M4 Final Sprint · 5-Day Check-In Streak or Top 10 Finalist (Unlock 25%)",
    descZh: "备赛期累计签到满 5 天或晋级 Demo Day 十强，全额解锁最后 $150（1,500 积分）满血旗舰包。",
    descEn: "Complete a 5-day check-in streak or reach Top 10 Finalists to unlock the final $150 (1,500 pts).",
    href: "/competitions/agrihackathon/showcase",
    targetCount: 5,
    unlockPool: "flagship",
    unlockUsd: 150,
    rewardTokens: 5,
    rewardStarBeans: 120,
    rewardXp: 200,
  },

  // 4. Dino Agent Counter-Intuitive Secret Easter Eggs (6 Hidden Quests)
  {
    id: "secret_ssr_gpu_cookie",
    category: "secret",
    icon: "🔋",
    titleZh: "【隐藏彩蛋】硅基胃穿孔 · SSR 显卡硬核投喂",
    titleEn: "[Secret Easter Egg] Silicon Indigestion · SSR GPU Feeding",
    descZh: "给小恐龙投喂出 SSR 级『4090 满血显卡饼干』或『农大实验室发光见手青』，让它打嗝吐出算力金砖！",
    descEn: "Feed the Dino an SSR 'RTX 4090 Cookie' or 'Glowing Lab Mushroom' so it burps out a gold compute brick!",
    hintZh: "线索：在右下角小恐龙圣所多点几次「盲盒夜宵」，听说有人喂出了发光的显卡和云南菌子…",
    hintEn: "Hint: Try feeding blind-box snacks in the bottom-right Dino Sanctuary until an SSR dish appears...",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 25,
    rewardTokens: 2,
    rewardStarBeans: 60,
    rewardXp: 80,
  },
  {
    id: "secret_whip_strike",
    category: "secret",
    icon: "⚖️",
    titleZh: "【隐藏彩蛋】生产队的驴也得休假 · 狂抽鞭子反向罢工",
    titleEn: "[Secret Easter Egg] Cyber Labor Law · 7-Whip Strike & Apology",
    descZh: "10 秒内连续狂抽小恐龙 7 鞭子触发《赛博劳动法》躺平罢工，再喂一口夜宵把它哄好！",
    descEn: "Whip the Dino 7 times within 10s to trigger a Cyber Labor Law strike, then feed it a snack to make peace!",
    hintZh: "线索：大家都以为抽鞭子越抽干活越快，要是 10 秒内连抽 7 鞭子再哄哄它，会发生什么反常识的事？",
    hintEn: "Hint: Everyone thinks whipping speeds up work—what happens if you whip 7 times in 10s and then feed it?",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 30,
    rewardTokens: 2,
    rewardStarBeans: 50,
    rewardXp: 70,
  },
  {
    id: "secret_reverse_pua",
    category: "secret",
    icon: "🏖️",
    titleZh: "【隐藏彩蛋】赛博活菩萨 · 给 AI 放假的人类",
    titleEn: "[Secret Easter Egg] Reverse PUA Master · Give Your AI a Vacation",
    descZh: "全校都在逼 AI 卷代码，只有你点击「给小恐龙放假 5 分钟」，收获小恐龙泪目塞给你的私房算力！",
    descEn: "While everyone overworks their AI, give your Dino a 5-minute vacation to receive its secret stash of compute!",
    hintZh: "线索：在右下角小恐龙「养成」面板里，找找有没有一个反常识的「放假摸鱼」按钮？",
    hintEn: "Hint: Check the 'Pet' tab in the bottom-right Dino Sanctuary for a counter-intuitive 'Vacation' action.",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 20,
    rewardTokens: 2,
    rewardStarBeans: 50,
    rewardXp: 70,
  },
  {
    id: "secret_midnight_farmer",
    category: "secret",
    icon: "🌙",
    titleZh: "【隐藏彩蛋】凌晨三点的农大麦田 · 保温杯奇遇",
    titleEn: "[Secret Easter Egg] 3 AM CAU Wheatfield · Night Owl Subsidy",
    descZh: "连续点亮小恐龙右下角「！」碎碎念气泡 3 次（或深夜造访），触发黑眼圈保温杯熬夜算力补贴！",
    descEn: "Click the Dino's '!' thought pin 3 times (or visit late at night) to trigger the Night Owl thermos subsidy!",
    hintZh: "线索：右下角小恐龙脑袋旁边的「！」气泡，连续戳它 3 次试试？",
    hintEn: "Hint: Try poking the '!' thought bubble next to the Dino 3 times in a row.",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 30,
    rewardTokens: 1,
    rewardStarBeans: 45,
    rewardXp: 60,
  },
  {
    id: "secret_fashion_mudslide",
    category: "secret",
    icon: "🕶️",
    titleZh: "【隐藏彩蛋】时尚泥石流 · 混搭审美暴击",
    titleEn: "[Secret Easter Egg] Fashion Mudslide · Avant-Garde Styling",
    descZh: "在「暖暖衣橱」里给小恐龙切换尝试 3 件以上不同槽位的穿搭，触发高街毒舌锐评！",
    descEn: "Equip 3 or more wardrobe items across slots in the Dino Wardrobe to trigger a high-fashion roast!",
    hintZh: "线索：打开右下角「衣橱」，给小恐龙混搭穿满头饰、背饰和手持物试试。",
    hintEn: "Hint: Open the 'Wardrobe' tab and mix-and-match headwear, backwear, and handwear on your Dino.",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 20,
    rewardTokens: 2,
    rewardStarBeans: 40,
    rewardXp: 50,
  },
  {
    id: "secret_bug_eater",
    category: "secret",
    icon: "🐛",
    titleZh: "【隐藏彩蛋】薛定谔的报错 · Bug 吞噬者",
    titleEn: "[Secret Easter Egg] Bug Devourer · Crunch the Error",
    descZh: "在小恐龙圣所投喂一颗「赛博八阿哥（Bug）脆片」，让小恐龙把报错当薯片嚼碎！",
    descEn: "Feed your Dino a 'Cyber Bug Crisp' so it crunches runtime errors into bonus compute!",
    hintZh: "线索：小恐龙不仅吃显卡饼干，在养成面板里点「吞噬 Bug」还能化崩为宝。",
    hintEn: "Hint: Your Dino loves eating bugs—trigger the Bug Devourer action in the Sanctuary.",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 15,
    rewardTokens: 1,
    rewardStarBeans: 35,
    rewardXp: 50,
  },
] as const;

export const ARCADE_PRIZES: readonly ArcadePrize[] = [
  {
    id: "prize_ur_dragon_egg",
    rarity: "UR",
    icon: "🐉",
    color: "from-amber-400 via-fuchsia-500 to-indigo-600",
    nameZh: "紫金麦穗龙蛋 · 满血 Opus 5.5 + GPT-6.1 极客大礼",
    nameEn: "Violet-Gold Dragon Egg · Opus 5.5 + GPT-6.1 Geek Pack",
    descZh: "立即从旗舰金库提取 $100（1,000 积分）满血额度 + 100 灵感星豆 + UR 赛博金龙荣耀印记！",
    descEn: "Instantly unlock $100 (1,000 pts) Flagship Vault quota + 100 Star Beans + UR Cyber Gold crest!",
    unlockPool: "flagship",
    unlockUsd: 100,
    starBeans: 100,
    bonusBadgeZh: "UR 传说 · 1000 旗舰积分",
    bonusBadgeEn: "UR Legend · 1,000 Flagship Pts",
    probability: 0.03,
  },
  {
    id: "prize_ssr_gpu_cookie",
    rarity: "SSR",
    icon: "🔋",
    color: "from-emerald-400 via-teal-500 to-cyan-600",
    nameZh: "4090 满血显卡饼干 · 3D 建模体验券 + $50 旗舰解锁",
    nameEn: "RTX 4090 Cookie · Tripo 3D Voucher + $50 Flagship Unlock",
    descZh: "解锁 $50（500 积分）GPT-5.6-terra 额度 + 赠送 1 张 Tripo 四视图 3D 建模免单体验券！",
    descEn: "Unlock $50 (500 pts) GPT-5.6-terra quota + 1 Tripo Multiview 3D Modeling Free Voucher!",
    unlockPool: "flagship",
    unlockUsd: 50,
    starBeans: 60,
    bonusBadgeZh: "SSR 史诗 · 含 3D 建模券",
    bonusBadgeEn: "SSR Epic · +3D Voucher",
    probability: 0.12,
  },
  {
    id: "prize_sr_golden_wheat",
    rarity: "SR",
    icon: "🌾",
    color: "from-amber-300 via-orange-400 to-amber-600",
    nameZh: "农大黄金麦穗胶囊 · 工作流市场算力券 + $40 Flash 解锁",
    nameEn: "CAU Golden Wheat Capsule · Market Voucher + $40 Flash Unlock",
    descZh: "从金库提取 $40（400 积分）DeepSeek V4.1 Flash 额度 + 1 张工作流市场体验抵扣券！",
    descEn: "Unlock $40 (400 pts) DeepSeek V4.1 Flash quota + 1 Workflow Marketplace Discount Voucher!",
    unlockPool: "deepseek",
    unlockUsd: 40,
    starBeans: 45,
    bonusBadgeZh: "SR 稀有 · 含市场抵扣券",
    bonusBadgeEn: "SR Rare · +Market Voucher",
    probability: 0.30,
  },
  {
    id: "prize_r_mint_dino",
    rarity: "R",
    icon: "🦖",
    color: "from-sky-400 via-blue-500 to-indigo-500",
    nameZh: "Q版薄荷星龙盲盒 · $25 Flash 算力提取 + 灵感星豆",
    nameEn: "Mint Star Dino Capsule · $25 Flash Unlock + Star Beans",
    descZh: "100% 不空军！立即提取 $25（250 积分）DeepSeek V4.1 Flash 额度 + 30 灵感星豆！",
    descEn: "100% win rate! Unlock $25 (250 pts) DeepSeek V4.1 Flash quota + 30 Star Beans!",
    unlockPool: "deepseek",
    unlockUsd: 25,
    starBeans: 30,
    bonusBadgeZh: "R 必得 · 250 Flash 积分",
    bonusBadgeEn: "R Guaranteed · 250 Flash Pts",
    probability: 0.55,
  },
] as const;

export function getTodayBeijingDate(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function createInitialQuestArcadeState(): QuestArcadeState {
  return {
    version: 1,
    arcadeTokens: 3, // New users get 3 starter tokens to try the 3D Claw Machine & Roulette immediately
    pityCounter: 0,
    streakDays: 1,
    lastCheckInDate: null,
    deepseekTotalUsd: 1000, // $1000 = 10,000 Points
    deepseekUnlockedUsd: 50, // $50 = 500 Points initial down-payment unlocked
    flagshipTotalUsd: 600, // $600 = 6,000 Points ($300 Terra + $200 GPT-6 + $100 Opus 5.5)
    flagshipUnlockedUsd: 0,
    tripoFreeVouchers: 0,
    marketDiscountVouchers: 0,
    vibehubReadSeconds: 0,
    questProgress: {
      daily_checkin: 1,
    },
    questClaimed: {},
    secretUnlockedAt: {},
    drawHistory: [],
  };
}

export function loadQuestArcadeState(actorId?: string | null): QuestArcadeState {
  if (typeof window === "undefined") return createInitialQuestArcadeState();
  const key = actorId ? `${QUEST_ARCADE_STORAGE_KEY}:${actorId}` : QUEST_ARCADE_STORAGE_KEY;
  try {
    const raw = window.localStorage.getItem(key) ?? window.localStorage.getItem(QUEST_ARCADE_STORAGE_KEY);
    if (!raw) return createInitialQuestArcadeState();
    const parsed = JSON.parse(raw) as Partial<QuestArcadeState>;
    const base = createInitialQuestArcadeState();
    return {
      ...base,
      ...parsed,
      questProgress: { ...base.questProgress, ...(parsed.questProgress ?? {}) },
      questClaimed: { ...(parsed.questClaimed ?? {}) },
      secretUnlockedAt: { ...(parsed.secretUnlockedAt ?? {}) },
      drawHistory: Array.isArray(parsed.drawHistory) ? parsed.drawHistory.slice(0, 20) : [],
    };
  } catch {
    return createInitialQuestArcadeState();
  }
}

export function saveQuestArcadeState(state: QuestArcadeState, actorId?: string | null): void {
  if (typeof window === "undefined") return;
  const key = actorId ? `${QUEST_ARCADE_STORAGE_KEY}:${actorId}` : QUEST_ARCADE_STORAGE_KEY;
  try {
    const serialized = JSON.stringify(state);
    window.localStorage.setItem(key, serialized);
    window.localStorage.setItem(QUEST_ARCADE_STORAGE_KEY, serialized);
    window.dispatchEvent(new CustomEvent(QUEST_ARCADE_EVENT, { detail: state }));
  } catch {
    // Ignore storage quota errors
  }
}

export function isQuestClaimedToday(state: QuestArcadeState, quest: QuestDefinition): boolean {
  const stamp = state.questClaimed[quest.id];
  if (!stamp) return false;
  if (quest.category === "daily") {
    return stamp === getTodayBeijingDate();
  }
  return Boolean(stamp);
}

export function advanceAndClaimQuest(
  questId: string,
  actorId?: string | null,
): { state: QuestArcadeState; quest: QuestDefinition; newlyClaimed: boolean } | null {
  const quest = QUEST_DEFINITIONS.find(item => item.id === questId);
  if (!quest) return null;
  const current = loadQuestArcadeState(actorId);
  if (isQuestClaimedToday(current, quest)) {
    return { state: current, quest, newlyClaimed: false };
  }

  const today = getTodayBeijingDate();
  const nextStreak =
    questId === "daily_checkin" && current.lastCheckInDate !== today
      ? current.streakDays + 1
      : current.streakDays;

  const nextDeepseekUnlocked =
    quest.unlockPool === "deepseek"
      ? Math.min(current.deepseekTotalUsd, current.deepseekUnlockedUsd + quest.unlockUsd)
      : current.deepseekUnlockedUsd;

  const nextFlagshipUnlocked =
    quest.unlockPool === "flagship"
      ? Math.min(current.flagshipTotalUsd, current.flagshipUnlockedUsd + quest.unlockUsd)
      : current.flagshipUnlockedUsd;

  const next: QuestArcadeState = {
    ...current,
    arcadeTokens: current.arcadeTokens + quest.rewardTokens,
    streakDays: nextStreak,
    lastCheckInDate: questId === "daily_checkin" ? today : current.lastCheckInDate,
    deepseekUnlockedUsd: nextDeepseekUnlocked,
    flagshipUnlockedUsd: nextFlagshipUnlocked,
    questProgress: {
      ...current.questProgress,
      [quest.id]: quest.targetCount,
      ...(questId === "daily_checkin" ? { agri_m4_streak_final: Math.min(5, nextStreak) } : {}),
    },
    questClaimed: {
      ...current.questClaimed,
      [quest.id]: quest.category === "daily" ? today : "claimed",
    },
    secretUnlockedAt:
      quest.category === "secret"
        ? { ...current.secretUnlockedAt, [quest.id]: new Date().toISOString() }
        : current.secretUnlockedAt,
  };

  saveQuestArcadeState(next, actorId);

  // Sync Star Beans & XP to the Dino Sanctuary state so the Mascot reflects rewards immediately
  try {
    const sanctuary = loadSanctuaryState();
    saveSanctuaryState({
      ...sanctuary,
      starBeans: sanctuary.starBeans + quest.rewardStarBeans,
      userXp: sanctuary.userXp + quest.rewardXp,
      affectionXp: sanctuary.affectionXp + 10,
    });
  } catch {
    // Ignore if sanctuary storage unavailable
  }

  return { state: next, quest, newlyClaimed: true };
}

export function drawArcadePrize(
  mode: "claw" | "roulette",
  actorId?: string | null,
  preferredRarity?: PrizeRarity,
): { state: QuestArcadeState; prize: ArcadePrize; record: ArcadeRewardRecord } | null {
  const current = loadQuestArcadeState(actorId);
  if (current.arcadeTokens < 1) return null;

  const nextPity = current.pityCounter + 1;
  let selected: ArcadePrize = ARCADE_PRIZES[ARCADE_PRIZES.length - 1];

  if (preferredRarity) {
    selected = ARCADE_PRIZES.find(p => p.rarity === preferredRarity) ?? selected;
  } else if (nextPity >= 10) {
    // Hard pity at 10 draws: guaranteed SSR or UR
    selected = Math.random() < 0.25 ? ARCADE_PRIZES[0] : ARCADE_PRIZES[1];
  } else {
    const roll = Math.random();
    let acc = 0;
    for (const item of ARCADE_PRIZES) {
      acc += item.probability;
      if (roll <= acc) {
        selected = item;
        break;
      }
    }
  }

  const resetPity = selected.rarity === "UR" || selected.rarity === "SSR" ? 0 : nextPity;
  const record: ArcadeRewardRecord = {
    id: `draw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    prizeId: selected.id,
    rarity: selected.rarity,
    nameZh: selected.nameZh,
    nameEn: selected.nameEn,
    unlockUsd: selected.unlockUsd,
    unlockPool: selected.unlockPool,
    mode,
    createdAt: new Date().toISOString(),
  };

  const next: QuestArcadeState = {
    ...current,
    arcadeTokens: current.arcadeTokens - 1,
    pityCounter: resetPity,
    deepseekUnlockedUsd:
      selected.unlockPool === "deepseek"
        ? Math.min(current.deepseekTotalUsd, current.deepseekUnlockedUsd + selected.unlockUsd)
        : current.deepseekUnlockedUsd,
    flagshipUnlockedUsd:
      selected.unlockPool === "flagship"
        ? Math.min(current.flagshipTotalUsd, current.flagshipUnlockedUsd + selected.unlockUsd)
        : current.flagshipUnlockedUsd,
    tripoFreeVouchers:
      selected.id === "prize_ssr_gpu_cookie" ? current.tripoFreeVouchers + 1 : current.tripoFreeVouchers,
    marketDiscountVouchers:
      selected.id === "prize_sr_golden_wheat" ? current.marketDiscountVouchers + 1 : current.marketDiscountVouchers,
    drawHistory: [record, ...current.drawHistory].slice(0, 20),
  };

  saveQuestArcadeState(next, actorId);

  try {
    const sanctuary = loadSanctuaryState();
    saveSanctuaryState({
      ...sanctuary,
      starBeans: sanctuary.starBeans + selected.starBeans,
      userXp: sanctuary.userXp + 25,
    });
  } catch {
    // Ignore
  }

  return { state: next, prize: selected, record };
}
