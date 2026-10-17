import {
  ARCADE_TO_SECRET_QUEST_ID,
  loadSanctuaryState,
  saveSanctuaryState,
} from "./sanctuary";

export const QUEST_ARCADE_STORAGE_KEY = "ans_quest_arcade_v3";
export const QUEST_ARCADE_EVENT = "ans:quest-arcade-updated";
export const QUEST_ARCADE_SERVER_CREDITED_EVENT = "ans:quest-arcade-server-credited";

export interface ArcadeServerCreditedDetail {
  grantedPoints: number;
  balanceAfter: number;
  duplicate: boolean;
  operationKey: string;
  awardedPrizeId?: string;
  errorCode?: string;
}

/**
 * Approved billing & benefit ratio:
 * 1 Point = ¥0.10 CNY = $0.10 USD APIC nominal quota
 * 10 Points = ¥1.00 CNY = $1.00 USD APIC nominal quota
 * 100 Points = ¥10.00 CNY = $10.00 USD APIC nominal quota
 */
export const POINTS_PER_USD = 10;
export const CNY_PER_POINT = 0.1;
export const USD_PER_POINT = 0.1;

export type QuestCategory = "daily" | "weekly" | "agri" | "secret";
export type PrizeRarity = "SP" | "UR" | "SSR" | "SR" | "R";

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
  deepseekTotalUsd: number; // $15 (= 150 Points All-ANS 90% normal-distribution total upper bound)
  deepseekUnlockedUsd: number; // Starts at $5 (= 50 Points) base onboarding credit
  flagshipTotalUsd: number; // $6 (= 60 Points flagship right-tail & AgriHackathon milestone pool; total ceiling = 210 pts)
  flagshipUnlockedUsd: number; // Unlocked across M1-M4 & high-rarity pulls
  tripoFreeVouchers: number;
  marketDiscountVouchers: number;
  vibehubReadSeconds: number;
  questProgress: Record<string, number>;
  questClaimed: Record<string, string>; // questId -> dateString or "claimed"
  secretUnlockedAt: Record<string, string>;
  drawHistory: ArcadeRewardRecord[];
}

export const QUEST_DEFINITIONS: readonly QuestDefinition[] = [
  // 1. Daily Quests (Total = 18 Points + 2 Tokens/day)
  {
    id: "daily_checkin",
    category: "daily",
    icon: "📅",
    titleZh: "每日算力签到",
    titleEn: "Daily Compute Check-In",
    descZh: "每日登录算力中心打卡（+5 积分 + 1 抓娃娃币），连续 5 天额外激活农客松 M4 冲刺进度。",
    descEn: "Check in daily at the Compute Center (+5 pts + 1 token); a 5-day streak advances AgriHackathon M4.",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 0.5,
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
    descZh: "在 VibeHub 实训课程页专注阅读满 60 秒，边学 AI 边提取 5 积分 + 1 枚抓娃娃币。",
    descEn: "Read any VibeHub interactive lesson for 60 seconds to unlock 5 pts + 1 token.",
    href: "/vibe-hub",
    targetCount: 60,
    unlockPool: "deepseek",
    unlockUsd: 0.5,
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
    descZh: "前往项目广场或农客松作品墙浏览项目并点亮 1 颗有效 Star（+5 积分）。",
    descEn: "Visit the Project Plaza or AgriHackathon Wall and star 1 project (+5 pts).",
    href: "/explore?category=competition&subcategory=agri-wall",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 0.5,
    rewardTokens: 0,
    rewardStarBeans: 25,
    rewardXp: 25,
  },
  {
    id: "daily_agent_feed",
    category: "daily",
    icon: "🦖",
    titleZh: "灵龙特训 · 投喂或对话小恐龙 Agent",
    titleEn: "Dino Training · Feed or Chat with Agent",
    descZh: "在右下角灵龙圣所投喂 1 次盲盒夜宵或与小恐龙 Agent 互动（+3 积分）。",
    descEn: "Feed a blind-box snack or interact with the Dino Agent in the Sanctuary bar (+3 pts).",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 0.3,
    rewardTokens: 0,
    rewardStarBeans: 35,
    rewardXp: 20,
  },

  // 2. Weekly & Monetization Ecosystem Quests (Total = 35 Points)
  {
    id: "weekly_market_workflow",
    category: "weekly",
    icon: "🛠️",
    titleZh: "工作流市场造物主 · 上传 AI 工作流",
    titleEn: "Marketplace Creator · Publish an AI Workflow",
    descZh: "在工作流工坊创建并上架 1 个可复用工作流（+12 积分 + 1 抓娃娃币），他人调用即可获得市场分成。",
    descEn: "Create and list a reusable workflow in Workflow Studio (+12 pts + 1 token) to earn marketplace revenue.",
    href: "/workflows",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 1.2,
    rewardTokens: 1,
    rewardStarBeans: 100,
    rewardXp: 150,
  },
  {
    id: "weekly_publish_project",
    category: "weekly",
    icon: "🚀",
    titleZh: "作品破壳上架 · 发布公开项目",
    titleEn: "Launch Project · Publish to Plaza",
    descZh: "在项目广场发布 1 个公开项目或参赛原型（+13 积分 + 1 抓娃娃币），沉淀个人技术资产。",
    descEn: "Publish a public project or competition prototype to the Plaza (+13 pts + 1 token).",
    href: "/explore/submit",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 1.3,
    rewardTokens: 1,
    rewardStarBeans: 80,
    rewardXp: 100,
  },
  {
    id: "weekly_homepage_heat",
    category: "weekly",
    icon: "🔥",
    titleZh: "高光创作者 · 主页收获点赞/评论/收藏/粉丝",
    titleEn: "Creator Spotlight · Gain Likes, Comments & Followers",
    descZh: "分享个人主页或作品，累计收获社区互动热度（+10 积分 + 1 抓娃娃币）。",
    descEn: "Share your profile or project to earn community interactions (+10 pts + 1 token).",
    href: "/showcase",
    targetCount: 5,
    unlockPool: "flagship",
    unlockUsd: 1,
    rewardTokens: 1,
    rewardStarBeans: 90,
    rewardXp: 120,
  },

  // 3. AgriHackathon Periodic Event Milestones ($6 = 60 Points Total Milestone Bonus, matching service.ts)
  {
    id: "agri_m1_apply",
    category: "agri",
    icon: "🌾",
    titleZh: "M1 集结号 · 提交农客松报名问卷（立解 20% 里程碑）",
    titleEn: "M1 Rally · Submit AgriHackathon Application (Unlock 20% Milestone)",
    descZh: "完成农客松参赛算力申请问卷，首期解锁 $1.2（12 积分）里程碑加成 + 1 枚抓娃娃币。",
    descEn: "Submit the AgriHackathon benefit application to unlock $1.2 (12 pts) milestone quota + 1 token.",
    href: "/workspace/benefits#benefits-agri",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 1.2,
    rewardTokens: 1,
    rewardStarBeans: 60,
    rewardXp: 100,
  },
  {
    id: "agri_m2_code_host",
    category: "agri",
    icon: "📦",
    titleZh: "M2 代码存证 · 阶段提交页托管源码包或 Git 快照（解锁 30%）",
    titleEn: "M2 Code Hosting · Upload Source Archive or Git Snapshot (Unlock 30%)",
    descZh: "在「03 阶段材料提交」绑定战队并上传源码包或锁定 Git 快照，解锁 $1.8（18 积分）+ 1 枚抓娃娃币。",
    descEn: "Bind your team and upload a source archive or Git snapshot in Stage Submissions to unlock $1.8 (18 pts).",
    href: "/competitions/agrihackathon/submissions",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 1.8,
    rewardTokens: 1,
    rewardStarBeans: 80,
    rewardXp: 150,
  },
  {
    id: "agri_m3_wall_public",
    category: "agri",
    icon: "🏆",
    titleZh: "M3 破圈拉票 · 参赛作品公开登上农客松作品墙（解锁 25%）",
    titleEn: "M3 Public Showcase · Publish Entry to AgriHackathon Wall (Unlock 25%)",
    descZh: "将比赛项目公开绑定至农客松作品墙参与校友拉 Star，解锁 $1.5（15 积分）+ 1 枚抓娃娃币。",
    descEn: "Publish and bind your project on the AgriHackathon Wall for Star voting to unlock $1.5 (15 pts).",
    href: "/explore/agrihackathon/submit",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 1.5,
    rewardTokens: 1,
    rewardStarBeans: 80,
    rewardXp: 150,
  },
  {
    id: "agri_m4_streak_final",
    category: "agri",
    icon: "👑",
    titleZh: "M4 终极冲刺 · 连续备赛签到满 5 天或入围十强（解锁最后 25%）",
    titleEn: "M4 Final Sprint · 5-Day Check-In Streak or Top 10 Finalist (Unlock 25%)",
    descZh: "备赛期累计签到满 5 天或晋级 Demo Day 十强，解锁最后 $1.5（15 积分）+ 1 枚抓娃娃币。",
    descEn: "Complete a 5-day check-in streak or reach Top 10 Finalists to unlock the final $1.5 (15 pts).",
    href: "/competitions/agrihackathon/showcase",
    targetCount: 5,
    unlockPool: "flagship",
    unlockUsd: 1.5,
    rewardTokens: 1,
    rewardStarBeans: 120,
    rewardXp: 200,
  },

  // 4. Dino Agent Counter-Intuitive Secret Easter Eggs (6 Hidden Quests: 5–8 pts each, 38 pts total)
  {
    id: "secret_ssr_gpu_cookie",
    category: "secret",
    icon: "🔋",
    titleZh: "【隐藏彩蛋】硅基胃穿孔 · SSR 显卡硬核投喂",
    titleEn: "[Secret Easter Egg] Silicon Indigestion · SSR GPU Feeding",
    descZh: "给小恐龙投喂出 SSR 级『4090 满血显卡饼干』或『农大实验室发光见手青』，吐出 8 积分 + 1 抓娃娃币！",
    descEn: "Feed the Dino an SSR 'RTX 4090 Cookie' or 'Glowing Lab Mushroom' to unlock 8 pts + 1 token!",
    hintZh: "线索：在右下角小恐龙圣所多点几次「盲盒夜宵」，听说有人喂出了发光的显卡和云南菌子…",
    hintEn: "Hint: Try feeding blind-box snacks in the bottom-right Dino Sanctuary until an SSR dish appears...",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 0.8,
    rewardTokens: 1,
    rewardStarBeans: 60,
    rewardXp: 80,
  },
  {
    id: "secret_whip_strike",
    category: "secret",
    icon: "⚖️",
    titleZh: "【隐藏彩蛋】生产队的驴也得休假 · 狂抽鞭子反向罢工",
    titleEn: "[Secret Easter Egg] Cyber Labor Law · 7-Whip Strike & Apology",
    descZh: "10 秒内连续狂抽小恐龙 7 鞭子触发《赛博劳动法》躺平罢工，再喂一口夜宵哄好它（+8 积分 + 1 币）！",
    descEn: "Whip the Dino 7 times within 10s to trigger a Cyber Labor Law strike, then feed it a snack (+8 pts + 1 token)!",
    hintZh: "线索：大家都以为抽鞭子越抽干活越快，要是 10 秒内连抽 7 鞭子再哄哄它，会发生什么反常识的事？",
    hintEn: "Hint: Everyone thinks whipping speeds up work—what happens if you whip 7 times in 10s and then feed it?",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 0.8,
    rewardTokens: 1,
    rewardStarBeans: 50,
    rewardXp: 70,
  },
  {
    id: "secret_reverse_pua",
    category: "secret",
    icon: "🏖️",
    titleZh: "【隐藏彩蛋】赛博活菩萨 · 给 AI 放假的人类",
    titleEn: "[Secret Easter Egg] Reverse PUA Master · Give Your AI a Vacation",
    descZh: "全校都在逼 AI 卷代码，只有你点击「给小恐龙放假 5 分钟」，收获小恐龙塞给你的 6 积分 + 1 币！",
    descEn: "While everyone overworks their AI, give your Dino a 5-minute vacation to receive 6 pts + 1 token!",
    hintZh: "线索：在右下角小恐龙「养成」面板里，找找有没有一个反常识的「放假摸鱼」按钮？",
    hintEn: "Hint: Check the 'Pet' tab in the bottom-right Dino Sanctuary for a counter-intuitive 'Vacation' action.",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 0.6,
    rewardTokens: 1,
    rewardStarBeans: 50,
    rewardXp: 70,
  },
  {
    id: "secret_midnight_farmer",
    category: "secret",
    icon: "🌙",
    titleZh: "【隐藏彩蛋】凌晨三点的农大麦田 · 保温杯奇遇",
    titleEn: "[Secret Easter Egg] 3 AM CAU Wheatfield · Night Owl Subsidy",
    descZh: "连续点亮小恐龙右下角「！」碎碎念气泡 3 次（或深夜造访），触发保温杯熬夜算力补贴（+6 积分）！",
    descEn: "Click the Dino's '!' thought pin 3 times (or visit late at night) to trigger the Night Owl subsidy (+6 pts)!",
    hintZh: "线索：右下角小恐龙脑袋旁边的「！」气泡，连续戳它 3 次试试？",
    hintEn: "Hint: Try poking the '!' thought bubble next to the Dino 3 times in a row.",
    targetCount: 1,
    unlockPool: "flagship",
    unlockUsd: 0.6,
    rewardTokens: 0,
    rewardStarBeans: 45,
    rewardXp: 60,
  },
  {
    id: "secret_fashion_mudslide",
    category: "secret",
    icon: "🕶️",
    titleZh: "【隐藏彩蛋】时尚泥石流 · 混搭审美暴击",
    titleEn: "[Secret Easter Egg] Fashion Mudslide · Avant-Garde Styling",
    descZh: "在「暖暖衣橱」里给小恐龙切换尝试 3 件以上不同槽位的穿搭，触发高街毒舌锐评（+5 积分）！",
    descEn: "Equip 3 or more wardrobe items across slots in the Dino Wardrobe to trigger a high-fashion roast (+5 pts)!",
    hintZh: "线索：打开右下角「衣橱」，给小恐龙混搭穿满头饰、背饰和手持物试试。",
    hintEn: "Hint: Open the 'Wardrobe' tab and mix-and-match headwear, backwear, and handwear on your Dino.",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 0.5,
    rewardTokens: 0,
    rewardStarBeans: 40,
    rewardXp: 50,
  },
  {
    id: "secret_bug_eater",
    category: "secret",
    icon: "🐛",
    titleZh: "【隐藏彩蛋】薛定谔的报错 · Bug 吞噬者",
    titleEn: "[Secret Easter Egg] Bug Devourer · Crunch the Error",
    descZh: "在小恐龙圣所投喂一颗「赛博八阿哥（Bug）脆片」，让小恐龙把报错当薯片嚼碎（+5 积分）！",
    descEn: "Feed your Dino a 'Cyber Bug Crisp' so it crunches runtime errors into bonus compute (+5 pts)!",
    hintZh: "线索：小恐龙不仅吃显卡饼干，在养成面板里点「吞噬 Bug」还能化崩为宝。",
    hintEn: "Hint: Your Dino loves eating bugs—trigger the Bug Devourer action in the Sanctuary.",
    targetCount: 1,
    unlockPool: "deepseek",
    unlockUsd: 0.5,
    rewardTokens: 0,
    rewardStarBeans: 35,
    rewardXp: 50,
  },
] as const;

export const ARCADE_PRIZES: readonly ArcadePrize[] = [
  {
    id: "prize_sp_mythic_jackpot",
    rarity: "SP",
    icon: "👑",
    color: "from-yellow-300 via-rose-500 to-purple-700",
    nameZh: "天选农大锦鲤 · 1000 积分神话算力免单大奖 (0.1%)",
    nameEn: "Mythic CAU Koi · 1,000 Pts Grand Jackpot (0.1%)",
    descZh: "千分之一神话天选暴击！立即解锁 $100.0（1000 积分 ≈ ¥100 元）满血旗舰算力 + 888 星豆 + 3 张 3D 建模免单券！",
    descEn: "0.1% Mythic Jackpot! Instantly unlock $100.0 (1,000 pts ≈ ¥100 CNY) Flagship quota + 888 Star Beans + 3 Tripo 3D Vouchers!",
    unlockPool: "flagship",
    unlockUsd: 100,
    starBeans: 888,
    bonusBadgeZh: "SP 神话 · 1000 积分免单大奖 (0.1%)",
    bonusBadgeEn: "SP Mythic · 1,000 Pts Jackpot (0.1%)",
    probability: 0.001,
  },
  {
    id: "prize_ur_dragon_egg",
    rarity: "UR",
    icon: "🐉",
    color: "from-amber-400 via-fuchsia-500 to-indigo-600",
    nameZh: "紫金麦穗龙蛋 · 300 积分欧皇传说大奖 (0.9%)",
    nameEn: "Violet-Gold Dragon Egg · 300 Pts Legend Jackpot (0.9%)",
    descZh: "百里挑一传说暴击！立即从旗舰金库提取 $30.0（300 积分 ≈ ¥30 元）满血额度 + 200 灵感星豆 + UR 荣耀印记！",
    descEn: "0.9% Legend Jackpot! Instantly unlock $30.0 (300 pts ≈ ¥30 CNY) Flagship Vault quota + 200 Star Beans + UR crest!",
    unlockPool: "flagship",
    unlockUsd: 30,
    starBeans: 200,
    bonusBadgeZh: "UR 传说 · 300 旗舰积分 (0.9%)",
    bonusBadgeEn: "UR Legend · 300 Flagship Pts (0.9%)",
    probability: 0.009,
  },
  {
    id: "prize_ssr_gpu_cookie",
    rarity: "SSR",
    icon: "🔋",
    color: "from-emerald-400 via-teal-500 to-cyan-600",
    nameZh: "4090 满血显卡饼干 · 80 积分 + 3D 建模体验券 (4%)",
    nameEn: "RTX 4090 Cookie · 80 Pts + Tripo 3D Voucher (4%)",
    descZh: "史诗暴击！解锁 $8.0（80 积分 ≈ ¥8 元）旗舰额度 + 赠送 1 张 Tripo 四视图 3D 建模免单体验券！",
    descEn: "Epic hit! Unlock $8.0 (80 pts ≈ ¥8 CNY) Flagship quota + 1 Tripo Multiview 3D Modeling Free Voucher!",
    unlockPool: "flagship",
    unlockUsd: 8,
    starBeans: 80,
    bonusBadgeZh: "SSR 史诗 · 80 积分 + 3D券 (4%)",
    bonusBadgeEn: "SSR Epic · 80 Pts + 3D Voucher (4%)",
    probability: 0.04,
  },
  {
    id: "prize_sr_golden_wheat",
    rarity: "SR",
    icon: "🌾",
    color: "from-amber-300 via-orange-400 to-amber-600",
    nameZh: "农大黄金麦穗胶囊 · 工作流市场券 + 15 积分 (30%)",
    nameEn: "CAU Golden Wheat Capsule · Market Voucher + 15 Pts (30%)",
    descZh: "从金库提取 $1.5（15 积分）DeepSeek V4.1 Flash 额度 + 1 张工作流市场体验抵扣券！",
    descEn: "Unlock $1.5 (15 pts) DeepSeek V4.1 Flash quota + 1 Workflow Marketplace Discount Voucher!",
    unlockPool: "deepseek",
    unlockUsd: 1.5,
    starBeans: 45,
    bonusBadgeZh: "SR 稀有 · 15 积分 + 市场券",
    bonusBadgeEn: "SR Rare · 15 Pts + Market Voucher",
    probability: 0.3,
  },
  {
    id: "prize_r_mint_dino",
    rarity: "R",
    icon: "🦖",
    color: "from-sky-400 via-blue-500 to-indigo-500",
    nameZh: "Q版薄荷星龙盲盒 · 10 Flash 算力积分 + 灵感星豆 (65%)",
    nameEn: "Mint Star Dino Capsule · 10 Flash Pts + Star Beans (65%)",
    descZh: "100% 不空军！立即提取 $1.0（10 积分）DeepSeek V4.1 Flash 额度 + 30 灵感星豆！",
    descEn: "100% win rate! Unlock $1.0 (10 pts) DeepSeek V4.1 Flash quota + 30 Star Beans!",
    unlockPool: "deepseek",
    unlockUsd: 1,
    starBeans: 30,
    bonusBadgeZh: "R 必得 · 10 Flash 积分",
    bonusBadgeEn: "R Guaranteed · 10 Flash Pts",
    probability: 0.65,
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
    arcadeTokens: 3, // New users get 3 starter tokens (~30–45 pts normal draw value, with 0.1% 1000-pt & 0.9% 300-pt jackpot chance)
    pityCounter: 0,
    streakDays: 1,
    lastCheckInDate: null,
    deepseekTotalUsd: 15, // $15 = 150 Points (90% user All-ANS normal-distribution upper bound)
    deepseekUnlockedUsd: 5, // $5 = 50 Points starter base unlocked (matches Onboarding Questionnaire)
    flagshipTotalUsd: 100, // $100 = 1,000 Points (supports up to the 0.1% 1,000-pt Mythic Jackpot & 0.9% 300-pt UR Jackpot)
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

export async function syncArcadeRewardToServer(
  payload:
    | { kind: "quest"; questId: string }
    | { kind: "draw"; prizeId: string; drawId: string; mode: "claw" | "roulette" },
  actorId?: string | null,
): Promise<ArcadeServerCreditedDetail | null> {
  if (
    typeof window === "undefined" ||
    typeof fetch !== "function" ||
    process.env.NODE_ENV === "test"
  ) {
    return null;
  }
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (actorId) {
      headers["x-ans-actor"] = actorId;
    }
    const res = await fetch("/api/compute-benefits/arcade", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
      if (errBody?.error) {
        window.dispatchEvent(
          new CustomEvent(QUEST_ARCADE_SERVER_CREDITED_EVENT, {
            detail: {
              grantedPoints: 0,
              balanceAfter: -1,
              duplicate: false,
              operationKey: "",
              errorCode: errBody.error,
            } satisfies ArcadeServerCreditedDetail,
          }),
        );
      }
      return null;
    }
    const data = (await res.json()) as ArcadeServerCreditedDetail;
    window.dispatchEvent(new CustomEvent(QUEST_ARCADE_SERVER_CREDITED_EVENT, { detail: data }));
    return data;
  } catch {
    return null;
  }
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
      ? Math.min(current.deepseekTotalUsd, Number((current.deepseekUnlockedUsd + quest.unlockUsd).toFixed(2)))
      : current.deepseekUnlockedUsd;

  const nextFlagshipUnlocked =
    quest.unlockPool === "flagship"
      ? Math.min(current.flagshipTotalUsd, Number((current.flagshipUnlockedUsd + quest.unlockUsd).toFixed(2)))
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
  void syncArcadeRewardToServer({ kind: "quest", questId: quest.id }, actorId);

  // Sync Star Beans, XP, Arcade Tokens & Secret Quest status to the Dino Sanctuary state
  try {
    const sanctuary = loadSanctuaryState();
    const mappedSecretId = ARCADE_TO_SECRET_QUEST_ID[quest.id];
    const nextUnlockedSecrets =
      mappedSecretId && !sanctuary.unlockedSecretQuests.includes(mappedSecretId)
        ? [...sanctuary.unlockedSecretQuests, mappedSecretId]
        : sanctuary.unlockedSecretQuests;
    saveSanctuaryState({
      ...sanctuary,
      arcadeTokens: next.arcadeTokens,
      starBeans: sanctuary.starBeans + quest.rewardStarBeans,
      userXp: sanctuary.userXp + quest.rewardXp,
      affectionXp: sanctuary.affectionXp + 10,
      unlockedSecretQuests: nextUnlockedSecrets,
      lastSecretQuestId: mappedSecretId ?? sanctuary.lastSecretQuestId,
      lastSecretQuestAt: mappedSecretId ? Date.now() : sanctuary.lastSecretQuestAt,
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
    // Hard pity at 10 draws: guaranteed SSR (90%), UR (9%), or SP (1%)
    const pityRoll = Math.random();
    selected =
      pityRoll < 0.01
        ? ARCADE_PRIZES[0]
        : pityRoll < 0.1
          ? ARCADE_PRIZES[1]
          : ARCADE_PRIZES[2];
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

  const resetPity =
    selected.rarity === "SP" || selected.rarity === "UR" || selected.rarity === "SSR" ? 0 : nextPity;
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
        ? Math.min(current.deepseekTotalUsd, Number((current.deepseekUnlockedUsd + selected.unlockUsd).toFixed(2)))
        : current.deepseekUnlockedUsd,
    flagshipUnlockedUsd:
      selected.unlockPool === "flagship"
        ? Math.min(current.flagshipTotalUsd, Number((current.flagshipUnlockedUsd + selected.unlockUsd).toFixed(2)))
        : current.flagshipUnlockedUsd,
    tripoFreeVouchers:
      selected.id === "prize_sp_mythic_jackpot"
        ? current.tripoFreeVouchers + 3
        : selected.id === "prize_ssr_gpu_cookie"
          ? current.tripoFreeVouchers + 1
          : current.tripoFreeVouchers,
    marketDiscountVouchers:
      selected.id === "prize_sr_golden_wheat" ? current.marketDiscountVouchers + 1 : current.marketDiscountVouchers,
    drawHistory: [record, ...current.drawHistory].slice(0, 20),
  };

  saveQuestArcadeState(next, actorId);
  void syncArcadeRewardToServer(
    { kind: "draw", prizeId: selected.id, drawId: record.id, mode },
    actorId,
  );

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
