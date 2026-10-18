import { LEVELS, getLevelProgress } from "@/domain/growth/levels";

export const SANCTUARY_STORAGE_KEY = "ans.mascot.sanctuary.v1";
export const SANCTUARY_EVENT_NAME = "ans:mascot-sanctuary-sync";

export type DinoSpeciesId = "mint_star" | "cyber_gold" | "sakura_mochi" | "aurora_ice";
export type WardrobeSlot = "headwear" | "eyewear" | "neckwear" | "handheld" | "aura";
export type ItemRarity = "R" | "SR" | "SSR" | "UR";
export type SecretQuestId =
  | "silicon_ulcer"
  | "donkey_strike"
  | "reverse_pua"
  | "midnight_creator"
  | "fashion_mudslide"
  | "bug_eater";

export interface SecretQuestDef {
  id: SecretQuestId;
  code: string;
  icon: string;
  titleZh: string;
  titleEn: string;
  badgeZh: string;
  badgeEn: string;
  speechZh: string;
  speechEn: string;
  rewardLabelZh: string;
  rewardLabelEn: string;
  hintZh: string;
  hintEn: string;
  arcadeTokens: number;
  vaultBonusUsd: number;
  vaultModelKey: "gpt-6.1-sol" | "deepseek-v4.1-flash" | "gpt-5.6-terra" | "none";
  starBeansBonus: number;
  affectionBonus: number;
}

export interface DinoSpeciesDef {
  id: DinoSpeciesId;
  name: string;
  defaultNickname: string;
  title: string;
  mbti: string;
  tagline: string;
  personality: string;
  agentSpecialty: string;
  agentBuffLabel: string;
  greetingLine: string;
  whipLine: string;
  feedLine: string;
  palette: {
    skinHex: string;
    bellyHex: string;
    crestHex: string;
    blushHex: string;
    eyeGlowHex: string;
    badgeGradient: string;
    tintRGB: [number, number, number];
    blushRGB: [number, number, number];
  };
  morph: {
    bodyScale: [number, number, number];
    headScale: number;
    hornStyle: "star_crest" | "cyber_horn" | "puff_ears" | "crystal_crown";
    tailScale: number;
  };
  stats: {
    creativity: number;
    codingSpeed: number;
    empathy: number;
    logic: number;
  };
  starterEquipped: Record<WardrobeSlot, string>;
}

export interface WardrobeItemDef {
  id: string;
  slot: WardrobeSlot;
  name: string;
  rarity: ItemRarity;
  styleTag: "极客" | "甜酷" | "赛博" | "学院" | "星神";
  stylePower: number;
  minUserLevel: number;
  minAffectionLevel: number;
  priceBeans: number;
  icon: string;
  description: string;
  specialQuote: string;
  primaryHex: string;
  accentHex: string;
}

export interface MascotSanctuaryState {
  version: 1;
  adopted: boolean;
  adoptedAt: string | null;
  speciesId: DinoSpeciesId;
  customName: string;
  affectionXp: number;
  userXp: number;
  starBeans: number;
  arcadeTokens: number;
  mood: number;
  energy: number;
  workBoostUntil: number;
  strikeUntil: number;
  totalWhips: number;
  totalFeeds: number;
  totalAgentChats: number;
  roamMode: "roam" | "dock";
  equipped: Record<WardrobeSlot, string>;
  unlockedItems: string[];
  unlockedSecretQuests: SecretQuestId[];
  vaultUnlockedUsd: Record<string, number>;
  lastSecretQuestId: SecretQuestId | null;
  lastSecretQuestAt: number;
  turntableYaw?: number;
  turntableSpin?: boolean;
}

export const DINO_SPECIES: Record<DinoSpeciesId, DinoSpeciesDef> = {
  mint_star: {
    id: "mint_star",
    name: "薄荷星翼龙",
    defaultNickname: "小薄荷 Minty",
    title: "原初灵感种 · 创意搭子",
    mbti: "ENFP · 快乐小狗型",
    tagline: "薄荷青玉背棘 + 星芒小肉翅，脑洞永远比需求大三圈！",
    personality: "元气E龙、灵感永动机，最擅长帮你拆解神仙项目、包装高颜值作品集；偶尔在屏幕边兜圈摸鱼。",
    agentSpecialty: "项目灵感拆解 / 作品集包装 / 跨学科脑暴",
    agentBuffLabel: "✨ 创意发散度 +25% · 每日首聊赠 15 星豆",
    greetingLine: "咻~ 我是你的专属薄荷星翼龙！今天咱们一起造个什么酷东西？",
    whipLine: "啪！嗷呜小屁股开花啦！本薄荷龙已经在用 300% 手速帮你肝灵感了！",
    feedLine: "哇咔咔！一口吞下十倍快乐！灵感槽直接溢出来啦~",
    palette: {
      skinHex: "#8fd4b8",
      bellyHex: "#e8f8f0",
      crestHex: "#4eb896",
      blushHex: "#ff8da1",
      eyeGlowHex: "#ffe699",
      badgeGradient: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
      tintRGB: [1.0, 1.0, 1.0],
      blushRGB: [1.0, 0.44, 0.54],
    },
    morph: {
      bodyScale: [1.0, 1.0, 1.0],
      headScale: 1.02,
      hornStyle: "star_crest",
      tailScale: 1.05,
    },
    stats: { creativity: 96, codingSpeed: 84, empathy: 92, logic: 85 },
    starterEquipped: {
      headwear: "starter_antenna",
      eyewear: "none",
      neckwear: "starter_scarf",
      handheld: "none",
      aura: "aura_mint",
    },
  },
  cyber_gold: {
    id: "cyber_gold",
    name: "熔金赛博暴龙",
    defaultNickname: "4090暴龙哥",
    title: "算力狂飙种 · 硬核卷王",
    mbti: "ENTJ · 满血算力指挥官",
    tagline: "曜石黑金机甲鳞片 + 熔岩金折角，血管里流淌着 800W 满血算力！",
    personality: "嘴硬心软的硬核卷王，见不得任何低效工作流与空指针 Bug；被抽屁股会傲娇开启超频狂暴模式。",
    agentSpecialty: "工作流自动编排 / 硬核代码 Debug / 算力赛事冲榜",
    agentBuffLabel: "⚡ 搬砖手速 +35% · 抽屁股好感加成翻倍",
    greetingLine: "显卡已预热，算力已拉满！说吧搭档，今天先秒掉哪个硬核任务？",
    whipLine: "嗷！！敢抽本赛博暴龙的钛金屁股？！看我一秒给你飙出十万行零 Bug 代码！",
    feedLine: "咔哧咔哧！算力燃料注入完毕，GPU 核心温度直冲云霄！",
    palette: {
      skinHex: "#4a4e5c",
      bellyHex: "#f5c26b",
      crestHex: "#ff9f1c",
      blushHex: "#ff6b35",
      eyeGlowHex: "#ffd166",
      badgeGradient: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
      tintRGB: [0.68, 0.64, 0.58],
      blushRGB: [1.0, 0.52, 0.22],
    },
    morph: {
      bodyScale: [1.06, 1.04, 1.06],
      headScale: 1.06,
      hornStyle: "cyber_horn",
      tailScale: 1.12,
    },
    stats: { creativity: 85, codingSpeed: 99, empathy: 78, logic: 95 },
    starterEquipped: {
      headwear: "cyber_visor",
      eyewear: "none",
      neckwear: "starter_scarf",
      handheld: "none",
      aura: "aura_gold",
    },
  },
  sakura_mochi: {
    id: "sakura_mochi",
    name: "樱粉云朵泡芙龙",
    defaultNickname: "糯米泡芙 Mochi",
    title: "治愈摸鱼种 · 审美天花板",
    mbti: "INFP · 甜酷美学小龙",
    tagline: "奶油樱花粉Q弹圆肚皮 + 软糯垂耳角，一口吃掉你的精神内耗！",
    personality: "顶级情绪价值搭子与奇迹暖暖级穿搭控，对页面排版、字体审美与去 AI 味文案有近乎偏执的直觉。",
    agentSpecialty: "高颜值简历精修 / 去 AI 味文案润色 / 穿搭审美把关",
    agentBuffLabel: "💖 投喂好感度 +30% · 衣橱时尚评分额外 +15%",
    greetingLine: "贴贴你~ 今天也要漂漂亮亮地搞创作哦，累了随时戳我充个电！",
    whipLine: "呜呜轻点抽泡芙小屁股呀！人家已经在含泪把你的简历擦得blingbling发光啦！",
    feedLine: "幸福到冒粉红泡泡╰(*°▽°*)╯！你是全宇宙最宠小恐龙的好搭档！",
    palette: {
      skinHex: "#f7b2c4",
      bellyHex: "#fff5f7",
      crestHex: "#ec6f98",
      blushHex: "#ff4d79",
      eyeGlowHex: "#ffe3ec",
      badgeGradient: "linear-gradient(135deg, #f472b6 0%, #db2777 100%)",
      tintRGB: [1.28, 0.90, 1.04],
      blushRGB: [1.0, 0.32, 0.56],
    },
    morph: {
      bodyScale: [1.08, 0.96, 1.08],
      headScale: 1.08,
      hornStyle: "puff_ears",
      tailScale: 0.96,
    },
    stats: { creativity: 95, codingSpeed: 80, empathy: 99, logic: 82 },
    starterEquipped: {
      headwear: "beret_cloud",
      eyewear: "none",
      neckwear: "starter_scarf",
      handheld: "none",
      aura: "aura_sakura",
    },
  },
  aurora_ice: {
    id: "aurora_ice",
    name: "极光量子冰龙",
    defaultNickname: "星璇 Nova",
    title: "高冷学神种 · 逻辑审判官",
    mbti: "INTJ · 清醒六边形学神",
    tagline: "冰川极光蓝紫鳞羽 + 星璇棱镜水晶冠，一眼洞穿全链路逻辑漏洞！",
    personality: "表面高冷毒舌的人间清醒龙，实则护短第一名；帮你审论文、抠架构、过 VibeHub 课程稳如泰山。",
    agentSpecialty: "VibeHub 深度陪学 / 提示词工程调优 / 架构逻辑审计",
    agentBuffLabel: "🔮 深度推理加成 +30% · 升级解锁衣装折扣 -15%",
    greetingLine: "推了推眼镜——你的创作轨迹我已经建模完毕，随时可以开始高阶推演。",
    whipLine: "咳…别动手动脚抽屁股！本学神龙不用催也在满负荷帮你推导最优解！",
    feedLine: "唔…口感尚可，多巴胺分泌 +18%，勉强允许你再摸一下我的水晶角。",
    palette: {
      skinHex: "#8ec5fc",
      bellyHex: "#eef6ff",
      crestHex: "#6366f1",
      blushHex: "#c084fc",
      eyeGlowHex: "#a5f3fc",
      badgeGradient: "linear-gradient(135deg, #60a5fa 0%, #4f46e5 100%)",
      tintRGB: [0.82, 0.96, 1.26],
      blushRGB: [0.76, 0.45, 0.98],
    },
    morph: {
      bodyScale: [0.96, 1.05, 0.96],
      headScale: 1.0,
      hornStyle: "crystal_crown",
      tailScale: 1.1,
    },
    stats: { creativity: 90, codingSpeed: 94, empathy: 83, logic: 99 },
    starterEquipped: {
      headwear: "starter_antenna",
      eyewear: "gold_glasses",
      neckwear: "starter_scarf",
      handheld: "none",
      aura: "aura_aurora",
    },
  },
};

export const DINO_SPECIES_LIST: DinoSpeciesDef[] = [
  DINO_SPECIES.mint_star,
  DINO_SPECIES.cyber_gold,
  DINO_SPECIES.sakura_mochi,
  DINO_SPECIES.aurora_ice,
];

export const WARDROBE_SLOT_LABELS: Record<WardrobeSlot, { label: string; icon: string }> = {
  headwear: { label: "头饰冠冕", icon: "👑" },
  eyewear:  { label: "潮酷面饰", icon: "🕶️" },
  neckwear: { label: "背饰披风", icon: "🪽" },
  handheld: { label: "手持法器", icon: "🪄" },
  aura:     { label: "脚底星环", icon: "✨" },
};

export const DINO_WARDROBE_ITEMS: WardrobeItemDef[] = [
  // 1. Headwear (头饰冠冕)
  {
    id: "none_head",
    slot: "headwear",
    name: "清爽裸冠",
    rarity: "R",
    styleTag: "极客",
    stylePower: 10,
    minUserLevel: 0,
    minAffectionLevel: 1,
    priceBeans: 0,
    icon: "🦖",
    description: "露出小恐龙骄傲的原生头顶小背刺。",
    specialQuote: "原生背刺吹着小风，清爽得想原地起飞~",
    primaryHex: "#8fd4b8",
    accentHex: "#ffffff",
  },
  {
    id: "starter_antenna",
    slot: "headwear",
    name: "5G 灵感小天线",
    rarity: "R",
    styleTag: "极客",
    stylePower: 35,
    minUserLevel: 0,
    minAffectionLevel: 1,
    priceBeans: 0,
    icon: "📡",
    description: "新人领养赠礼！随时接收 ANS 宇宙满格创作信号。",
    specialQuote: "哔哔——头顶小天线已捕捉到一条绝妙 Prompt！",
    primaryHex: "#34d399",
    accentHex: "#fde68a",
  },
  {
    id: "beret_cloud",
    slot: "headwear",
    name: "奶油云朵画家帽",
    rarity: "SR",
    styleTag: "甜酷",
    stylePower: 68,
    minUserLevel: 0,
    minAffectionLevel: 1,
    priceBeans: 60,
    icon: "🎨",
    description: "软糯斜戴的法式艺术家贝雷帽，审美气场瞬间拉满。",
    specialQuote: "戴上画家帽，今天你的简历和作品集由本艺术龙亲自操刀！",
    primaryHex: "#f472b6",
    accentHex: "#fff1f2",
  },
  {
    id: "cyber_visor",
    slot: "headwear",
    name: "RTX 全息战术护额",
    rarity: "SR",
    styleTag: "赛博",
    stylePower: 75,
    minUserLevel: 1,
    minAffectionLevel: 2,
    priceBeans: 90,
    icon: "⚡",
    description: "探索者等级解锁！搭载算力监控 HUD 的钛金流光护额。",
    specialQuote: "全息护额启动！正在以 240Hz 帧率扫描你的项目代码~",
    primaryHex: "#f59e0b",
    accentHex: "#38bdf8",
  },
  {
    id: "phd_mortarboard",
    slot: "headwear",
    name: "常春藤金穗学士帽",
    rarity: "SSR",
    styleTag: "学院",
    stylePower: 120,
    minUserLevel: 2,
    minAffectionLevel: 3,
    priceBeans: 160,
    icon: "🎓",
    description: "实践者等级解锁！拨穗镀金流苏，自带满级学术 Buff。",
    specialQuote: "严谨求实，格物致知！这篇项目文档本博士龙给你打出 S+！",
    primaryHex: "#1e293b",
    accentHex: "#fbbf24",
  },
  {
    id: "crown_aurora",
    slot: "headwear",
    name: "ANS 极光星神王冠",
    rarity: "UR",
    styleTag: "星神",
    stylePower: 220,
    minUserLevel: 4,
    minAffectionLevel: 5,
    priceBeans: 320,
    icon: "👑",
    description: "构建者高阶荣耀！悬浮六芒星钻与极光流苏交织的传奇冠冕。",
    specialQuote: "头戴星神冠，整个 ANS 广场最闪耀的仔就是咱俩！",
    primaryHex: "#fbbf24",
    accentHex: "#60a5fa",
  },

  // 2. Eyewear (潮酷面饰)
  {
    id: "none",
    slot: "eyewear",
    name: "澄澈萌眸",
    rarity: "R",
    styleTag: "甜酷",
    stylePower: 10,
    minUserLevel: 0,
    minAffectionLevel: 1,
    priceBeans: 0,
    icon: "👀",
    description: "毫无遮挡的布林布林大眼睛，眨眼卖萌杀伤力满分。",
    specialQuote: "盯——用我 100% 纯真大眼睛看着你干活！",
    primaryHex: "#ffffff",
    accentHex: "#34d399",
  },
  {
    id: "gold_glasses",
    slot: "eyewear",
    name: "斯文金丝半框镜",
    rarity: "SR",
    styleTag: "学院",
    stylePower: 65,
    minUserLevel: 0,
    minAffectionLevel: 1,
    priceBeans: 50,
    icon: "👓",
    description: "知识分子感拉满的玫瑰金细框眼镜，逻辑推理感 +100。",
    specialQuote: "推了推金丝眼镜，发现你刚刚偷懒了 3.14 秒哦~",
    primaryHex: "#fbbf24",
    accentHex: "#e0f2fe",
  },
  {
    id: "pixel_shades",
    slot: "eyewear",
    name: "DealWithIt 像素墨镜",
    rarity: "SR",
    styleTag: "极客",
    stylePower: 85,
    minUserLevel: 1,
    minAffectionLevel: 2,
    priceBeans: 80,
    icon: "🕶️",
    description: "自带 BGM 的经典 8-bit 大佬墨镜，Bug 见了都得绕道走。",
    specialQuote: "墨镜一戴，谁都不爱！这波代码直接一次编译通过！",
    primaryHex: "#111827",
    accentHex: "#f43f5e",
  },
  {
    id: "star_monocle",
    slot: "eyewear",
    name: "星轨全息单片镜",
    rarity: "SSR",
    styleTag: "赛博",
    stylePower: 135,
    minUserLevel: 3,
    minAffectionLevel: 4,
    priceBeans: 180,
    icon: "🧐",
    description: "创作者等级解锁！右眼悬浮翡翠全息星盘，洞察一切 Token 消耗。",
    specialQuote: "星轨单片镜锁定目标——这个项目的核心亮点已经被我拆穿啦！",
    primaryHex: "#38bdf8",
    accentHex: "#fbbf24",
  },

  // 3. Neckwear / Back (背饰披风)
  {
    id: "starter_scarf",
    slot: "neckwear",
    name: "ANS 初创极客领巾",
    rarity: "R",
    styleTag: "极客",
    stylePower: 30,
    minUserLevel: 0,
    minAffectionLevel: 1,
    priceBeans: 0,
    icon: "🧣",
    description: "领养即赠的薄荷撞色小领巾，印有 AI Never Stops 徽章。",
    specialQuote: "系紧小领巾，今天也是元气满满的 ANS 野生代言龙！",
    primaryHex: "#10b981",
    accentHex: "#fef08a",
  },
  {
    id: "boba_jetpack",
    slot: "neckwear",
    name: "吨吨冰美式外挂喷射包",
    rarity: "SR",
    styleTag: "甜酷",
    stylePower: 80,
    minUserLevel: 1,
    minAffectionLevel: 2,
    priceBeans: 85,
    icon: "🧋",
    description: "背后背着双联装超大杯浓缩冰美式，边飞边续命。",
    specialQuote: "冰美式喷射推进器点火！咖啡因浓度 100%，根本不知道什么叫困！",
    primaryHex: "#d97706",
    accentHex: "#fef3c7",
  },
  {
    id: "cyber_wings",
    slot: "neckwear",
    name: "六翼光量子推进羽翼",
    rarity: "SSR",
    styleTag: "赛博",
    stylePower: 165,
    minUserLevel: 3,
    minAffectionLevel: 4,
    priceBeans: 220,
    icon: "🪽",
    description: "创作者等级解锁！半透明霓虹能量羽翼，飞行速度与帅气度拉爆。",
    specialQuote: "光量子六翼展开！围绕你 360° 全景巡航护驾！",
    primaryHex: "#38bdf8",
    accentHex: "#f472b6",
  },
  {
    id: "pioneer_cape",
    slot: "neckwear",
    name: "ANS 先锋熔金星河披风",
    rarity: "UR",
    styleTag: "星神",
    stylePower: 240,
    minUserLevel: 5,
    minAffectionLevel: 6,
    priceBeans: 360,
    icon: "🦸",
    description: "领航员殿堂级背饰！随飞行轨迹猎猎飘扬的流金星河斗篷。",
    specialQuote: "披风迎风猎猎作响——别怕，你的背后有整座 ANS 算力星河！",
    primaryHex: "#ef4444",
    accentHex: "#fbbf24",
  },

  // 4. Handheld (手持法器)
  {
    id: "none",
    slot: "handheld",
    name: "轻装上阵",
    rarity: "R",
    styleTag: "极客",
    stylePower: 10,
    minUserLevel: 0,
    minAffectionLevel: 1,
    priceBeans: 0,
    icon: "🐾",
    description: "挥舞两只小短手随时准备给你鼓掌加油。",
    specialQuote: "虽然小短手够不到后脑勺，但给你比心刚刚好！",
    primaryHex: "#8fd4b8",
    accentHex: "#ffffff",
  },
  {
    id: "magic_wand",
    slot: "handheld",
    name: "零 Bug 祈愿仙女棒",
    rarity: "SR",
    styleTag: "甜酷",
    stylePower: 78,
    minUserLevel: 1,
    minAffectionLevel: 2,
    priceBeans: 75,
    icon: "🪄",
    description: "挥一挥洒下金色星尘，专治各种玄学报错与排版错位。",
    specialQuote: "巴啦啦能量——仙女棒一挥，所有报错全部退散！",
    primaryHex: "#f472b6",
    accentHex: "#fde047",
  },
  {
    id: "gold_keyboard",
    slot: "handheld",
    name: "冒火星子纯金机械键盘",
    rarity: "SSR",
    styleTag: "极客",
    stylePower: 145,
    minUserLevel: 2,
    minAffectionLevel: 3,
    priceBeans: 150,
    icon: "⌨️",
    description: "实践者等级解锁！段落青轴手感，被鞭策时敲击速度突破天际。",
    specialQuote: "啪嗒啪嗒啪嗒！这把黄金青轴键盘已经被我敲出残影啦！",
    primaryHex: "#fbbf24",
    accentHex: "#34d399",
  },
  {
    id: "floating_grimoire",
    slot: "handheld",
    name: "全栈提示词悬浮魔导书",
    rarity: "UR",
    styleTag: "星神",
    stylePower: 210,
    minUserLevel: 4,
    minAffectionLevel: 5,
    priceBeans: 290,
    icon: "📖",
    description: "构建者等级解锁！自动翻页的赛博法典，封印着万千神级工作流。",
    specialQuote: "翻开魔导书第七章——你要的满血 Agent 咒语已经吟唱完毕！",
    primaryHex: "#818cf8",
    accentHex: "#fcd34d",
  },

  // 5. Aura (脚底星环)
  {
    id: "aura_mint",
    slot: "aura",
    name: "薄荷初生星轨环",
    rarity: "R",
    styleTag: "极客",
    stylePower: 30,
    minUserLevel: 0,
    minAffectionLevel: 1,
    priceBeans: 0,
    icon: "🟢",
    description: "清新的双层翡翠薄荷悬浮法阵，伴随 6 颗呼吸星芒。",
    specialQuote: "脚踩薄荷星环，连呼吸都是清爽的灵感味道~",
    primaryHex: "#6ee7b7",
    accentHex: "#fde68a",
  },
  {
    id: "aura_sakura",
    slot: "aura",
    name: "樱吹雪粉晶星阵",
    rarity: "SR",
    styleTag: "甜酷",
    stylePower: 85,
    minUserLevel: 1,
    minAffectionLevel: 2,
    priceBeans: 80,
    icon: "🌸",
    description: "粉紫流光交织的落樱魔法阵，飞过之处尽是浪漫星尘。",
    specialQuote: "樱花星阵转呀转，把好运和Offer全都转到你身边！",
    primaryHex: "#f472b6",
    accentHex: "#fbcfe8",
  },
  {
    id: "aura_gold",
    slot: "aura",
    name: "熔金超频算力矩阵",
    rarity: "SSR",
    styleTag: "赛博",
    stylePower: 150,
    minUserLevel: 2,
    minAffectionLevel: 3,
    priceBeans: 160,
    icon: "🔥",
    description: "金色齿轮与高能粒子对撞环，象征永不停歇的 AI 算力。",
    specialQuote: "熔金矩阵全功率输出！AI Never Stops！",
    primaryHex: "#f59e0b",
    accentHex: "#fef08a",
  },
  {
    id: "aura_aurora",
    slot: "aura",
    name: "超新星量子星云环",
    rarity: "UR",
    styleTag: "星神",
    stylePower: 230,
    minUserLevel: 3,
    minAffectionLevel: 4,
    priceBeans: 260,
    icon: "🌌",
    description: "极光蓝与星云紫双螺旋坍缩光环，先锋训龙师的终极排面。",
    specialQuote: "脚踏超新星量子星云，陪你从 ANS 走向星辰大海！",
    primaryHex: "#60a5fa",
    accentHex: "#c084fc",
  },
];

export const AFFECTION_LEVELS = [
  { level: 1, minXp: 0,    title: "初识搭子", perk: "解锁基础互动、感叹号碎碎念与自由乱飞" },
  { level: 2, minXp: 50,   title: "摸鱼同盟", perk: "解锁 SR 级潮酷穿搭购买权限 · 投喂星豆 +20%" },
  { level: 3, minXp: 140,  title: "灵感拍档", perk: "解锁黄金青轴键盘与学院风穿搭 · 干活加速延长" },
  { level: 4, minXp: 280,  title: "默契死党", perk: "解锁 SSR 级光量子羽翼与单片镜 · 专属撒娇动作" },
  { level: 5, minXp: 480,  title: "王牌训龙师", perk: "解锁 UR 级极光王冠与悬浮魔导书" },
  { level: 6, minXp: 750,  title: "灵魂共鸣", perk: "解锁全部殿堂级星神套装 · 全站闪耀金标" },
];

export function getAffectionProgress(affectionXp: number) {
  const safe = Math.max(0, Number.isFinite(affectionXp) ? affectionXp : 0);
  let idx = 0;
  for (let i = 0; i < AFFECTION_LEVELS.length; i++) {
    if (safe >= AFFECTION_LEVELS[i].minXp) idx = i;
    else break;
  }
  const current = AFFECTION_LEVELS[idx];
  const next = idx < AFFECTION_LEVELS.length - 1 ? AFFECTION_LEVELS[idx + 1] : null;
  const into = safe - current.minXp;
  const span = next ? next.minXp - current.minXp : 100;
  return {
    level: current.level,
    title: current.title,
    perk: current.perk,
    nextLevel: next,
    progress: next ? Math.min(1, into / span) : 1,
    xpIntoLevel: into,
    xpForLevel: span,
  };
}

export const SECRET_QUESTS: Record<SecretQuestId, SecretQuestDef> = {
  silicon_ulcer: {
    id: "silicon_ulcer",
    code: "SECRET #01",
    icon: "🧱",
    titleZh: "硅基胃穿孔",
    titleEn: "Silicon Stomach Ulcer",
    badgeZh: "SSR 硬核投喂彩蛋",
    badgeEn: "SSR Hardcore Feeding",
    speechZh: "嗝——！主人你喂的是正经食物吗？！本龙肚子里长出了 Tensor Core，不小心吐出一块算力金砖（+8 积分）！",
    speechEn: "*Burp*—! Master, is this even real food?! A Tensor Core sprouted in my belly and I coughed up 8 compute points!",
    rewardLabelZh: "解锁 $0.8（8 积分）GPT-6.1-sol 额度 + 1 枚灵龙扭蛋币",
    rewardLabelEn: "Unlocked $0.8 (8 Pts) GPT-6.1-sol Credit + 1 Gacha Token",
    hintZh: "投喂夜宵抽中 SSR 级『4090 满血显卡饼干』或『农大实验室发光见手青』",
    hintEn: "Draw SSR '4090 GPU Cookie' or 'CAU Glowing Mushroom' when feeding snacks",
    arcadeTokens: 1,
    vaultBonusUsd: 0.8,
    vaultModelKey: "gpt-6.1-sol",
    starBeansBonus: 50,
    affectionBonus: 30,
  },
  donkey_strike: {
    id: "donkey_strike",
    code: "SECRET #02",
    icon: "📜",
    titleZh: "生产队的驴也得休假",
    titleEn: "Even Cyber Donkeys Need Leave",
    badgeZh: "《小恐龙劳动法》反常识彩蛋",
    badgeEn: "Dino Labor Law",
    speechZh: "嗷呜~ 这口夜宵真香！看在主人诚心认错的份上，本龙满血复工，顺便把工会发的 8 积分私房算力和扭蛋币分你！",
    speechEn: "Nom nom~ Apology accepted! I'm back at 300% power and sharing my union's 8 Flash compute points + 1 Gacha Token with you!",
    rewardLabelZh: "解锁 $0.8（8 积分）Flash 额度 + 1 枚抓娃娃币",
    rewardLabelEn: "Unlocked $0.8 (8 Pts) Flash Credit + 1 Claw Token",
    hintZh: "10 秒内连抽 7 鞭触发 30 秒罢工，期间投喂 1 次夜宵哄好小恐龙",
    hintEn: "Whip ≥7 times within 10s to trigger a 30s strike, then feed 1 snack to make peace",
    arcadeTokens: 1,
    vaultBonusUsd: 0.8,
    vaultModelKey: "deepseek-v4.1-flash",
    starBeansBonus: 40,
    affectionBonus: 25,
  },
  reverse_pua: {
    id: "reverse_pua",
    code: "SECRET #03",
    icon: "🏖️",
    titleZh: "赛博活菩萨 · 反向 PUA 大师",
    titleEn: "Reverse PUA Master · AI Vacation",
    badgeZh: "给 AI 放假的人类",
    badgeEn: "Human Who Gives AI a Break",
    speechZh: "呜哇感动哭了！全校都在逼 AI 卷代码，只有主人给我放假 5 分钟！本龙偷藏的 6 积分私房算力全塞给你！",
    speechEn: "Tears of joy! Everyone else overworks their AI, but you gave me a 5-minute break! Take my 6-point stash of flagship compute!",
    rewardLabelZh: "解锁 $0.6（6 积分）GPT-6.1-sol 额度 + 1 枚抓娃娃币",
    rewardLabelEn: "Unlocked $0.6 (6 Pts) GPT-6.1-sol Credit + 1 Claw Token",
    hintZh: "在『互动投喂』面板点击『给龙放假 5 分钟』，触发反向 PUA 感动彩蛋",
    hintEn: "Click '5m Dino Vacation' in the Interact tab to give your hardworking AI a break",
    arcadeTokens: 1,
    vaultBonusUsd: 0.6,
    vaultModelKey: "gpt-6.1-sol",
    starBeansBonus: 50,
    affectionBonus: 30,
  },
  midnight_creator: {
    id: "midnight_creator",
    code: "SECRET #04",
    icon: "🫖",
    titleZh: "凌晨三点的造物主",
    titleEn: "3 AM Creator",
    badgeZh: "夜猫子奇遇限定称号",
    badgeEn: "Night-Owl Limited Title",
    speechZh: "嘘… 主人，凌晨三点的代码会自己长出麦穗。本龙端着枸杞保温杯陪你，拿上这 6 积分熬夜补贴，跑完这轮赶紧去睡！",
    speechEn: "Shh… Master, code written at 3 AM grows golden wheat by itself. Take my thermos and this 6-point night-owl subsidy, then get some rest!",
    rewardLabelZh: "解锁 $0.6（6 积分）GPT-5.6-terra 金库额度",
    rewardLabelEn: "Unlocked $0.6 (6 Pts) GPT-5.6-terra Vault Credit",
    hintZh: "北京时间 01:30–04:30 点击小恐龙叹号气泡（或连续戳 3 次叹号气泡）",
    hintEn: "Click the dino's '!' bubble between 01:30–04:30 BJT (or poke it 3 times in a row)",
    arcadeTokens: 0,
    vaultBonusUsd: 0.6,
    vaultModelKey: "gpt-5.6-terra",
    starBeansBonus: 45,
    affectionBonus: 28,
  },
  fashion_mudslide: {
    id: "fashion_mudslide",
    code: "SECRET #05",
    icon: "🪩",
    titleZh: "时尚泥石流",
    titleEn: "Fashion Mudslide",
    badgeZh: "暖暖衣橱反差混搭彩蛋",
    badgeEn: "Chaotic Wardrobe Mashup",
    speechZh: "石化 3 秒… 这套反差混搭走在农大东区回头率 1000%！虽然审美很抽象，但气场很嚣张，赏你 5 积分算力！",
    speechEn: "Petrified for 3 seconds… This chaotic mashup turns 1000% of heads on campus! Abstract aesthetics, maximum aura—take 5 Flash points!",
    rewardLabelZh: "解锁 $0.5（5 积分）Flash 金库额度",
    rewardLabelEn: "Unlocked $0.5 (5 Pts) Flash Vault Credit",
    hintZh: "在暖暖衣橱装备反差混搭单品（甜酷 × 赛博/学院/星神）或穿戴 3 件以上配饰",
    hintEn: "Equip a high-contrast Sweet × Cyber/Academic/Astral outfit mix in the wardrobe",
    arcadeTokens: 0,
    vaultBonusUsd: 0.5,
    vaultModelKey: "deepseek-v4.1-flash",
    starBeansBonus: 60,
    affectionBonus: 20,
  },
  bug_eater: {
    id: "bug_eater",
    code: "SECRET #06",
    icon: "🐛",
    titleZh: "薛定谔的报错 · Bug 吞噬者",
    titleEn: "Bug Devourer · Crunch the Error",
    badgeZh: "化崩为宝隐藏彩蛋",
    badgeEn: "Turn Bugs into Treasure",
    speechZh: "咔嚓咔嚓！404 和 NullPointerException 嚼起来居然是烧烤味的！报错已被本龙消化成 5 积分算力啦！",
    speechEn: "Crunch crunch! 404 and NullPointerException taste like BBQ chips! Digested your runtime bugs into 5 Flash points!",
    rewardLabelZh: "解锁 $0.5（5 积分）Flash 金库额度",
    rewardLabelEn: "Unlocked $0.5 (5 Pts) Flash Vault Credit",
    hintZh: "在『互动投喂』面板点击『吞噬 Bug 脆片』，让小恐龙把报错当薯片嚼碎",
    hintEn: "Click 'Crunch Bug Chip' in the Interact tab to feed runtime errors to your Dino",
    arcadeTokens: 0,
    vaultBonusUsd: 0.5,
    vaultModelKey: "deepseek-v4.1-flash",
    starBeansBonus: 35,
    affectionBonus: 18,
  },
};

export const SECRET_QUEST_LIST: SecretQuestDef[] = [
  SECRET_QUESTS.silicon_ulcer,
  SECRET_QUESTS.donkey_strike,
  SECRET_QUESTS.reverse_pua,
  SECRET_QUESTS.midnight_creator,
  SECRET_QUESTS.fashion_mudslide,
  SECRET_QUESTS.bug_eater,
];

const VALID_SECRET_QUEST_IDS = new Set<SecretQuestId>([
  "silicon_ulcer",
  "donkey_strike",
  "reverse_pua",
  "midnight_creator",
  "fashion_mudslide",
  "bug_eater",
]);

export function isBeijingNightOwlWindow(nowMs: number = Date.now()): boolean {
  // Beijing time is UTC+8
  const beijingDate = new Date(nowMs + 8 * 3600_000);
  const hours = beijingDate.getUTCHours();
  const minutes = beijingDate.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;
  // 01:30 (90) to 04:30 (270) inclusive
  return totalMinutes >= 90 && totalMinutes <= 270;
}

export function isContrastMixOutfit(
  equipped: Record<WardrobeSlot, string>,
  speciesId: DinoSpeciesId = "mint_star",
): boolean {
  const nonDefaultIds = new Set(["none", "none_head", "starter_antenna", "starter_scarf", "aura_mint"]);
  const activeItems = (Object.keys(equipped) as WardrobeSlot[])
    .map(slot => DINO_WARDROBE_ITEMS.find(item => item.id === equipped[slot]))
    .filter((item): item is WardrobeItemDef => item !== undefined && !nonDefaultIds.has(item.id));

  if (activeItems.length >= 3) return true;
  if (activeItems.length < 2) return false;

  const tags = new Set(activeItems.map(item => item.styleTag));
  const hasSweet = tags.has("甜酷");
  const hasHardcore = tags.has("赛博") || tags.has("学院") || tags.has("星神");

  // Trigger if mixing Sweet with Cyber/Academic/Astral, or Cyber Gold dragon wearing Sweet items, or 3+ distinct style tags
  if (hasSweet && hasHardcore) return true;
  if (speciesId === "cyber_gold" && hasSweet) return true;
  if (speciesId === "sakura_mochi" && (tags.has("赛博") || tags.has("学院"))) return true;
  return tags.size >= 3;
}

const QUEST_ARCADE_STORAGE_KEY = "ans_quest_arcade_v3";
const QUEST_ARCADE_EVENT = "ans:quest-arcade-updated";

export const SECRET_TO_ARCADE_QUEST_ID: Record<SecretQuestId, string> = {
  silicon_ulcer: "secret_ssr_gpu_cookie",
  donkey_strike: "secret_whip_strike",
  reverse_pua: "secret_reverse_pua",
  midnight_creator: "secret_midnight_farmer",
  fashion_mudslide: "secret_fashion_mudslide",
  bug_eater: "secret_bug_eater",
};

export const ARCADE_TO_SECRET_QUEST_ID: Record<string, SecretQuestId> = {
  secret_ssr_gpu_cookie: "silicon_ulcer",
  secret_whip_strike: "donkey_strike",
  secret_reverse_pua: "reverse_pua",
  secret_midnight_farmer: "midnight_creator",
  secret_fashion_mudslide: "fashion_mudslide",
  secret_bug_eater: "bug_eater",
};

function syncSecretQuestToArcadeStorage(quest: SecretQuestDef, nowMs: number) {
  if (typeof window === "undefined") return;
  try {
    const arcadeQuestId = SECRET_TO_ARCADE_QUEST_ID[quest.id];
    const raw = window.localStorage.getItem(QUEST_ARCADE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const questClaimed =
      parsed.questClaimed && typeof parsed.questClaimed === "object"
        ? { ...(parsed.questClaimed as Record<string, string>) }
        : {};
    if (questClaimed[arcadeQuestId]) return;

    const questProgress =
      parsed.questProgress && typeof parsed.questProgress === "object"
        ? { ...(parsed.questProgress as Record<string, number>) }
        : {};
    const secretUnlockedAt =
      parsed.secretUnlockedAt && typeof parsed.secretUnlockedAt === "object"
        ? { ...(parsed.secretUnlockedAt as Record<string, string>) }
        : {};

    const prevTokens = typeof parsed.arcadeTokens === "number" ? parsed.arcadeTokens : 3;
    const prevDeepseek = typeof parsed.deepseekUnlockedUsd === "number" ? parsed.deepseekUnlockedUsd : 5;
    const prevFlagship = typeof parsed.flagshipUnlockedUsd === "number" ? parsed.flagshipUnlockedUsd : 0;

    const isDeepseek = quest.vaultModelKey === "deepseek-v4.1-flash";
    const isFlagship = quest.vaultModelKey === "gpt-6.1-sol" || quest.vaultModelKey === "gpt-5.6-terra";

    const nextArcade = {
      version: 1,
      ...parsed,
      arcadeTokens: prevTokens + quest.arcadeTokens,
      deepseekUnlockedUsd: isDeepseek ? Math.min(15, Number((prevDeepseek + quest.vaultBonusUsd).toFixed(2))) : prevDeepseek,
      flagshipUnlockedUsd: isFlagship ? Math.min(6, Number((prevFlagship + quest.vaultBonusUsd).toFixed(2))) : prevFlagship,
      questProgress: {
        ...questProgress,
        [arcadeQuestId]: 1,
      },
      questClaimed: {
        ...questClaimed,
        [arcadeQuestId]: "claimed",
      },
      secretUnlockedAt: {
        ...secretUnlockedAt,
        [arcadeQuestId]: new Date(nowMs).toISOString(),
      },
    };
    window.localStorage.setItem(QUEST_ARCADE_STORAGE_KEY, JSON.stringify(nextArcade));
    window.dispatchEvent(new CustomEvent(QUEST_ARCADE_EVENT, { detail: nextArcade }));
    if (typeof fetch === "function" && process.env.NODE_ENV !== "test") {
      void fetch("/api/compute-benefits/arcade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "quest", questId: arcadeQuestId }),
      })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data) {
            window.dispatchEvent(
              new CustomEvent("ans:quest-arcade-server-credited", { detail: data }),
            );
          }
        })
        .catch(() => {});
    }
  } catch {
    /* Ignore storage errors */
  }
}

export function unlockSecretQuest(
  prev: MascotSanctuaryState,
  questId: SecretQuestId,
  nowMs: number = Date.now(),
): { state: MascotSanctuaryState; newlyUnlocked: boolean; quest: SecretQuestDef } {
  const quest = SECRET_QUESTS[questId];
  const already = prev.unlockedSecretQuests.includes(questId);
  if (already) {
    return { state: prev, newlyUnlocked: false, quest };
  }
  const nextVault = { ...prev.vaultUnlockedUsd };
  if (quest.vaultBonusUsd > 0 && quest.vaultModelKey !== "none") {
    nextVault[quest.vaultModelKey] = (nextVault[quest.vaultModelKey] || 0) + quest.vaultBonusUsd;
  }
  const nextState: MascotSanctuaryState = {
    ...prev,
    arcadeTokens: prev.arcadeTokens + quest.arcadeTokens,
    starBeans: prev.starBeans + quest.starBeansBonus,
    affectionXp: prev.affectionXp + quest.affectionBonus,
    unlockedSecretQuests: [...prev.unlockedSecretQuests, questId],
    vaultUnlockedUsd: nextVault,
    lastSecretQuestId: questId,
    lastSecretQuestAt: nowMs,
  };
  syncSecretQuestToArcadeStorage(quest, nowMs);
  return { state: nextState, newlyUnlocked: true, quest };
}

export function createDefaultSanctuaryState(speciesId: DinoSpeciesId = "mint_star"): MascotSanctuaryState {
  const sp = DINO_SPECIES[speciesId] || DINO_SPECIES.mint_star;
  const starterIds = Object.values(sp.starterEquipped);
  const baseUnlocked = Array.from(new Set([
    "none_head", "starter_antenna", "none", "starter_scarf", "aura_mint",
    ...starterIds,
  ]));
  return {
    version: 1,
    adopted: false,
    adoptedAt: null,
    speciesId: sp.id,
    customName: sp.defaultNickname,
    affectionXp: 25,
    userXp: 120, // Starts at Explorer (Lv.1 探索者) so users can immediately experience Lv.1 unlocks & progress toward Lv.2..7!
    starBeans: 180,
    arcadeTokens: 2,
    mood: 88,
    energy: 92,
    workBoostUntil: 0,
    strikeUntil: 0,
    totalWhips: 0,
    totalFeeds: 0,
    totalAgentChats: 0,
    roamMode: "roam",
    equipped: { ...sp.starterEquipped },
    unlockedItems: baseUnlocked,
    unlockedSecretQuests: [],
    vaultUnlockedUsd: {},
    lastSecretQuestId: null,
    lastSecretQuestAt: 0,
  };
}

export function loadSanctuaryState(): MascotSanctuaryState {
  if (typeof window === "undefined") return createDefaultSanctuaryState();
  try {
    const raw = window.localStorage.getItem(SANCTUARY_STORAGE_KEY);
    if (!raw) return createDefaultSanctuaryState();
    const parsed = JSON.parse(raw) as Partial<MascotSanctuaryState> & {
      dinoName?: string;
      unlockedItemIds?: string[];
      roamMode?: string;
    };
    const speciesAlias: Record<string, DinoSpeciesId> = {
      mint_star: "mint_star",
      mint_sky: "mint_star",
      cyber_gold: "cyber_gold",
      sakura_mochi: "sakura_mochi",
      sakura_puff: "sakura_mochi",
      aurora_ice: "aurora_ice",
      aurora_frost: "aurora_ice",
    };
    const mappedSpecies = parsed.speciesId ? speciesAlias[String(parsed.speciesId)] : undefined;
    const speciesId: DinoSpeciesId = mappedSpecies && DINO_SPECIES[mappedSpecies] ? mappedSpecies : "mint_star";
    const base = createDefaultSanctuaryState(speciesId);
    const mergedName = (parsed.customName || parsed.dinoName || base.customName).trim();
    const mergedUnlocked = Array.from(
      new Set([
        ...base.unlockedItems,
        ...(Array.isArray(parsed.unlockedItems) ? parsed.unlockedItems : []),
        ...(Array.isArray(parsed.unlockedItemIds) ? parsed.unlockedItemIds : []),
      ])
    );
    const mergedSecretQuests = Array.from(
      new Set(
        (Array.isArray(parsed.unlockedSecretQuests) ? parsed.unlockedSecretQuests : []).filter(
          (id): id is SecretQuestId => VALID_SECRET_QUEST_IDS.has(id as SecretQuestId),
        ),
      ),
    );
    const rawEquipped = { ...base.equipped, ...(parsed.equipped || {}) };
    if (rawEquipped.headwear === "none") rawEquipped.headwear = "none_head";
    const normalizedRoam: "roam" | "dock" = parsed.roamMode === "dock" ? "dock" : "roam";
    const safeArcadeTokens =
      typeof parsed.arcadeTokens === "number" && Number.isFinite(parsed.arcadeTokens)
        ? Math.max(0, Math.floor(parsed.arcadeTokens))
        : base.arcadeTokens;
    const safeStrikeUntil =
      typeof parsed.strikeUntil === "number" && Number.isFinite(parsed.strikeUntil)
        ? parsed.strikeUntil
        : 0;
    const safeVault =
      parsed.vaultUnlockedUsd && typeof parsed.vaultUnlockedUsd === "object"
        ? { ...parsed.vaultUnlockedUsd }
        : {};
    const safeLastQuestId =
      parsed.lastSecretQuestId && VALID_SECRET_QUEST_IDS.has(parsed.lastSecretQuestId)
        ? parsed.lastSecretQuestId
        : null;
    const safeLastQuestAt =
      typeof parsed.lastSecretQuestAt === "number" && Number.isFinite(parsed.lastSecretQuestAt)
        ? parsed.lastSecretQuestAt
        : 0;
    return {
      ...base,
      ...parsed,
      speciesId,
      customName: mergedName,
      arcadeTokens: safeArcadeTokens,
      strikeUntil: safeStrikeUntil,
      roamMode: normalizedRoam,
      equipped: rawEquipped,
      unlockedItems: mergedUnlocked,
      unlockedSecretQuests: mergedSecretQuests,
      vaultUnlockedUsd: safeVault,
      lastSecretQuestId: safeLastQuestId,
      lastSecretQuestAt: safeLastQuestAt,
    };
  } catch {
    return createDefaultSanctuaryState();
  }
}

export function saveSanctuaryState(next: MascotSanctuaryState): MascotSanctuaryState {
  if (typeof window === "undefined") return next;
  try {
    const unlocked = Array.from(new Set(next.unlockedItems || []));
    const unlockedQuests = Array.from(new Set(next.unlockedSecretQuests || []));
    const compatPayload = {
      ...next,
      customName: next.customName,
      dinoName: next.customName,
      unlockedItems: unlocked,
      unlockedItemIds: unlocked,
      unlockedSecretQuests: unlockedQuests,
    };
    window.localStorage.setItem(SANCTUARY_STORAGE_KEY, JSON.stringify(compatPayload));
    window.dispatchEvent(new CustomEvent(SANCTUARY_EVENT_NAME, { detail: compatPayload }));
    window.dispatchEvent(new CustomEvent("ans:sanctuary-updated", { detail: compatPayload }));
    window.dispatchEvent(new CustomEvent("ans-sanctuary-sync", { detail: compatPayload }));
  } catch {
    /* Ignore storage quota errors in private browsing */
  }
  return next;
}

export function calculateStyleEvaluation(state: MascotSanctuaryState) {
  const sp = DINO_SPECIES[state.speciesId] || DINO_SPECIES.mint_star;
  const equippedItems = (Object.keys(state.equipped) as WardrobeSlot[])
    .map(slot => DINO_WARDROBE_ITEMS.find(item => item.id === state.equipped[slot]))
    .filter((item): item is WardrobeItemDef => Boolean(item));

  const rawPower = equippedItems.reduce((sum, item) => sum + item.stylePower, 0);
  const tagCounts: Record<string, number> = {};
  for (const item of equippedItems) {
    tagCounts[item.styleTag] = (tagCounts[item.styleTag] || 0) + 1;
  }
  const dominantTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "极客";
  const setBonus = Object.values(tagCounts).some(c => c >= 3) ? 65 : Object.values(tagCounts).some(c => c >= 2) ? 25 : 0;
  const speciesBonus = state.speciesId === "sakura_mochi" ? Math.round((rawPower + setBonus) * 0.15) : 0;
  const totalScore = rawPower + setBonus + speciesBonus;

  const grade = totalScore >= 600 ? "SSS · 殿堂星神" : totalScore >= 420 ? "SS · 闪耀搭配师" : totalScore >= 260 ? "S · 潮流先锋" : totalScore >= 140 ? "A · 元气新星" : "B · 清爽萌新";
  return {
    totalScore,
    grade,
    dominantTag,
    setBonus,
    equippedItems,
    species: sp,
    userLevel: getLevelProgress(state.userXp),
    affection: getAffectionProgress(state.affectionXp),
  };
}

export function getLevelCatalogSummary(userXp: number) {
  return {
    current: getLevelProgress(userXp),
    allLevels: LEVELS,
  };
}
