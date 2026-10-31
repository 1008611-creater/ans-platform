export const SOUL_PLUGINS_STORAGE_KEY = "ans.mascot.soul-plugins.v1";
export const SOUL_PLUGINS_EVENT_NAME = "ans:dino-soul-plugins-sync";

export type SoulPluginId =
  | "dsh-bili-subagent"
  | "dsh-feiyu-mood"
  | "dsh-fish-memory"
  | "dsh-meme"
  | "dsh-qq-bridge"
  | "dsh-social-bridge-plugin"
  | "dsh-speak-up"
  | "dsh-tts-bridge";

export type MoodDimensionKey =
  | "happy"
  | "calm"
  | "sweet"
  | "heartache"
  | "worry"
  | "sad"
  | "jealous";

export type MoodInjectMode = "off" | "label" | "event";

export interface MoodDimensions {
  happy: number;
  calm: number;
  sweet: number;
  heartache: number;
  worry: number;
  sad: number;
  jealous: number;
}

export interface MoodTimelineEntry {
  id: string;
  at: string;
  mood: number;
  delta: number;
  reason: string;
  turnKind: "user" | "speak-up" | "bili-duty-scan" | "manual";
  topDim?: MoodDimensionKey;
}

export interface FeiyuMoodState {
  mood: number;
  baseline: number;
  floor: 0 | 30;
  decayHalfHours: number;
  injectMode: MoodInjectMode;
  dims: MoodDimensions;
  updatedAt: number;
  pendingNotice: string;
  history: MoodTimelineEntry[];
}

export interface FishMemoryEntry {
  id: string;
  at: string;
  createdAtMs: number;
  text: string;
  keywords: string[];
  importance: number;
  emotion: number;
  isFact: boolean;
  factKey?: string;
  recalledCount: number;
  lastRecalledAtMs?: number;
}

export interface FishRecallTraceItem {
  id: string;
  text: string;
  at: string;
  isFact: boolean;
  score: number;
  picked: boolean;
  reason: string;
}

export interface FishMemoryState {
  baseHalfLifeDays: number;
  emotionHalfLifeDays: number;
  threshold: number;
  maxItems: number;
  factsMax: number;
  items: FishMemoryEntry[];
  lastRecallAt?: string;
  lastRecallQuery?: string;
  lastRecallTraces: FishRecallTraceItem[];
}

export type MemeEmotionBucket =
  | "happy"
  | "shy"
  | "sad"
  | "angry"
  | "confused"
  | "daily"
  | "work"
  | "cheer";

export interface MemeStickerItem {
  id: string;
  packId: "dino-core" | "vibe-coder" | "learned";
  title: string;
  kaomoji: string;
  badge: string;
  emotion: MemeEmotionBucket;
  keywords: string[];
  pixelState: "idle" | "walk" | "run" | "work" | "emote" | "react" | "action" | "meme";
  gesture3d: "hello" | "celebrate" | "shy" | "curious";
}

export interface MemePluginState {
  enabledPacks: Record<"dino-core" | "vibe-coder" | "learned", boolean>;
  autoReplyProb: number;
  customStickers: MemeStickerItem[];
  lastSentStickerId?: string;
}

export interface BiliSubagentReport {
  id: string;
  at: string;
  bvid: string;
  title: string;
  author: string;
  viewsLabel: string;
  publishedLabel: string;
  summary: string;
  whyWorthIt: string;
  commentVibe: string;
  dinoShareText: string;
}

export interface BiliSubagentState {
  scheduleMode: "manual" | "offpeak" | "allday";
  direction: string;
  minViews: number;
  maxDays: number;
  deliveryMode: "chat" | "comment" | "dm";
  dryRun: boolean;
  lastScanAt?: string;
  reports: BiliSubagentReport[];
}

export interface SpeakUpLogEntry {
  id: string;
  at: string;
  roll: number;
  hitLine: number;
  isPeak: boolean;
  hit: boolean;
  dryRun: boolean;
  reason: string;
  message?: string;
}

export interface SpeakUpState {
  intervalMinutes: number;
  peakHitLine: number;
  offPeakHitLine: number;
  missBonus: number;
  bonusCap: number;
  cooldownMinutes: number;
  quietStartHour: number;
  quietEndHour: number;
  dryRun: boolean;
  missStreak: number;
  lastMessageAtMs: number;
  lastSpeakUpAtMs: number;
  logs: SpeakUpLogEntry[];
}

export interface TtsFavoriteItem {
  id: string;
  at: string;
  text: string;
  category: string;
}

export interface TtsBridgeState {
  autoRead: boolean;
  voiceRate: number;
  favorites: TtsFavoriteItem[];
}

export interface QqBridgeLog {
  id: string;
  at: string;
  direction: "in" | "out";
  target: string;
  preview: string;
  dryRun: boolean;
}

export interface QqBridgeState {
  httpUrl: string;
  dryRun: boolean;
  privateTargets: string;
  groupTargets: string;
  afterMentionCount: number;
  afterMentionWindowSec: number;
  qzoneEnabled: boolean;
  logs: QqBridgeLog[];
}

export interface SocialMemberProfile {
  id: string;
  name: string;
  note: string;
  updatedAt: string;
}

export interface SocialBridgeState {
  mode: "persona" | "assistant";
  endpointUrl: string;
  allowVision: boolean;
  allowSticker: boolean;
  allowRemoteTask: boolean;
  groupMemberMemory: boolean;
  members: SocialMemberProfile[];
}

export interface SoulPluginsState {
  enabled: Record<SoulPluginId, boolean>;
  feiyuMood: FeiyuMoodState;
  fishMemory: FishMemoryState;
  meme: MemePluginState;
  biliSubagent: BiliSubagentState;
  speakUp: SpeakUpState;
  ttsBridge: TtsBridgeState;
  qqBridge: QqBridgeState;
  socialBridge: SocialBridgeState;
}

export interface SoulPluginCatalogItem {
  id: SoulPluginId;
  displayName: string;
  displayNameEn: string;
  badge: string;
  iconType: "dsh-node" | "meme-avatar";
  summaryZh: string;
  summaryEn: string;
  upstreamRepo: string;
}

export const SOUL_PLUGIN_CATALOG: readonly SoulPluginCatalogItem[] = [
  {
    id: "dsh-bili-subagent",
    displayName: "dsh-bili-subagent",
    displayNameEn: "dsh-bili-subagent",
    badge: "B站子代理",
    iconType: "dsh-node",
    summaryZh:
      "DSH 插件：让你的 AI 伙伴派子代理去刷 B 站 —— 子代理读字幕挑出值得的、把详细内容汇报回来，伙伴再用自己的口吻发私信 / 评论 / 站内分享。",
    summaryEn:
      "DSH Plugin: Dispatch a subagent to browse Bilibili, read subtitles, pick worthwhile videos, and let your AI companion share briefings in its own voice.",
    upstreamRepo: "Yuuyuko-uu/dsh-bili-subagent",
  },
  {
    id: "dsh-feiyu-mood",
    displayName: "dsh-feiyu-mood",
    displayNameEn: "dsh-feiyu-mood",
    badge: "情绪状态机",
    iconType: "dsh-node",
    summaryZh:
      "给 AI 伙伴一个会自己判断、你看得见的心情：每轮聊完自动判断涨跌，右下角挂饰点开看数值 + 7维情绪 + 时间线；心情自然同步进下一轮语气与表情。",
    summaryEn:
      "Give your companion a self-judging visible mood: auto-evaluates after every turn with a 0-100 gauge, 7 emotion dimensions, half-life decay, and timeline.",
    upstreamRepo: "Yuuyuko-uu/dsh-feiyu-mood",
  },
  {
    id: "dsh-fish-memory",
    displayName: "dsh-fish-memory",
    displayNameEn: "dsh-fish-memory",
    badge: "淡忘长期记忆",
    iconType: "dsh-node",
    summaryZh:
      "给会话一份会淡忘的长期记忆，每条都带时间。永久事实自动覆盖更新，情景记忆按半衰期自然淡出，说话前按关键词稀有度与激活度自动召回。",
    summaryEn:
      "Time-stamped long-term memory with natural half-life decay, permanent fact deduplication, and rarity-weighted associative recall.",
    upstreamRepo: "Yuuyuko-uu/dsh-fish-memory",
  },
  {
    id: "dsh-meme",
    displayName: "表情包",
    displayNameEn: "Stickers (dsh-meme)",
    badge: "一键斗图",
    iconType: "meme-avatar",
    summaryZh:
      "输入框一键斗图：多图库开关、情绪与关键词搜图、AI 学图；支持兔兔龙回复自动配图与图库 JSON/ZIP 分享。",
    summaryEn:
      "One-click composer sticker battle: multi-pack toggles, emotion & keyword search, AI sticker learning, and automatic companion sticker replies.",
    upstreamRepo: "yyh-001/dsh-meme",
  },
  {
    id: "dsh-qq-bridge",
    displayName: "dsh-qq-bridge",
    displayNameEn: "dsh-qq-bridge",
    badge: "OneBot 11",
    iconType: "dsh-node",
    summaryZh:
      "通到 QQ：AI 伙伴和 QQ 双向互通 —— 它说完话自动发到 QQ，你在 QQ 里说的话自动转进会话。走 OneBot 11 HTTP，支持点名连续跟听与空间动态。",
    summaryEn:
      "Two-way QQ bridge via OneBot 11 HTTP: sync companion replies to QQ private/group chats, follow-up window after @mention, and Qzone tools.",
    upstreamRepo: "Yuuyuko-uu/dsh-qq-bridge",
  },
  {
    id: "dsh-social-bridge-plugin",
    displayName: "dsh-social-bridge-plugin",
    displayNameEn: "dsh-social-bridge-plugin",
    badge: "微信/社交桥",
    iconType: "dsh-node",
    summaryZh:
      "人格聊天与远程助手双模式社交桥：支持群聊参与、群友印象记忆本、看图斗图与远程任务交办能力授权。",
    summaryEn:
      "Dual-mode Social/WeChat bridge supporting persona chat, group member memory book, vision/sticker policies, and remote task authorization.",
    upstreamRepo: "sourcepro5/WeChatAgent",
  },
  {
    id: "dsh-speak-up",
    displayName: "dsh-speak-up",
    displayNameEn: "dsh-speak-up",
    badge: "主动搭话",
    iconType: "dsh-node",
    summaryZh:
      "主动搭话 (dsh-speak-up)：DSH 插件。没人在跟她说话的时候，她也会自己起个话头 —— 按你设的间隔掷一次本地骰子（不花 Token），命中才主动开口。",
    summaryEn:
      "Proactive conversation starter: rolls a zero-token local die on a timer using peak/off-peak hit-lines and miss-streak bonuses to start a warm topic.",
    upstreamRepo: "Yuuyuko-uu/dsh-speak-up",
  },
  {
    id: "dsh-tts-bridge",
    displayName: "dsh-tts-bridge",
    displayNameEn: "dsh-tts-bridge",
    badge: "朗读与收藏",
    iconType: "dsh-node",
    summaryZh:
      "朗读桥：把会话里的话交由语音引擎朗读出来，支持回复完成自动朗读、单条重听与心仪语音台词分类收藏导出。",
    summaryEn:
      "TTS Bridge: Read companion replies aloud automatically or on demand, and bookmark favorite spoken lines into an exportable collection.",
    upstreamRepo: "Yuuyuko-uu/dsh-tts-bridge",
  },
] as const;

export const MOOD_DIMENSION_META: readonly {
  key: MoodDimensionKey;
  labelZh: string;
  labelEn: string;
  positive: boolean;
  color: string;
}[] = [
  { key: "happy", labelZh: "开心", labelEn: "Happy", positive: true, color: "#10b981" },
  { key: "calm", labelZh: "踏实", labelEn: "Calm", positive: true, color: "#06b6d4" },
  { key: "sweet", labelZh: "甜蜜", labelEn: "Sweet", positive: true, color: "#ec4899" },
  { key: "heartache", labelZh: "心疼", labelEn: "Heartache", positive: false, color: "#f59e0b" },
  { key: "worry", labelZh: "担心", labelEn: "Worry", positive: false, color: "#eab308" },
  { key: "sad", labelZh: "难过", labelEn: "Sad", positive: false, color: "#6366f1" },
  { key: "jealous", labelZh: "吃醋", labelEn: "Jealous", positive: false, color: "#a855f7" },
] as const;

export const BUILTIN_MEME_STICKERS: readonly MemeStickerItem[] = [
  {
    id: "meme-dino-sparkle",
    packId: "dino-core",
    title: "满眼小星星",
    kaomoji: "(✧ω✧)✨",
    badge: "🌟 兔兔龙夸夸",
    emotion: "happy",
    keywords: ["棒", "好", "厉害", "成功", "赞", "牛", "开心", "nice", "great"],
    pixelState: "emote",
    gesture3d: "celebrate",
  },
  {
    id: "meme-dino-pat",
    packId: "dino-core",
    title: "蹭蹭求摸头",
    kaomoji: "(⁄ ⁄•⁄ω⁄•⁄ ⁄)💖",
    badge: "🐾 贴贴充能",
    emotion: "shy",
    keywords: ["摸摸", "抱抱", "喜欢", "可爱", "乖", "贴贴", "cute", "love"],
    pixelState: "emote",
    gesture3d: "shy",
  },
  {
    id: "meme-dino-tea",
    packId: "dino-core",
    title: "递上热奶茶",
    kaomoji: "( ´ ▽ ` )ﾉ🧋",
    badge: "🧋 辛苦啦先喝口茶",
    emotion: "cheer",
    keywords: ["累", "困", "加班", "熬夜", "辛苦", "难", "头秃", "tired"],
    pixelState: "react",
    gesture3d: "hello",
  },
  {
    id: "meme-dino-keyboard",
    packId: "vibe-coder",
    title: "光速敲代码中",
    kaomoji: "⌨️🔥(•̀ᴗ•́)و",
    badge: "⚡ 算力全开",
    emotion: "work",
    keywords: ["代码", "开发", "写", "部署", "上线", "重构", "code", "build", "ship"],
    pixelState: "work",
    gesture3d: "curious",
  },
  {
    id: "meme-dino-bug",
    packId: "vibe-coder",
    title: "一口吞掉 Bug",
    kaomoji: "(╬•̀皿•́)🦖💥",
    badge: "🐛 Bug 退散",
    emotion: "angry",
    keywords: ["报错", "bug", "挂了", "失败", "红了", "error", "fix"],
    pixelState: "action",
    gesture3d: "celebrate",
  },
  {
    id: "meme-dino-question",
    packId: "dino-core",
    title: "歪头思考中",
    kaomoji: "(・_・ヾ)❓",
    badge: "🔍 正在理清线索",
    emotion: "confused",
    keywords: ["怎么", "为什么", "啥", "不懂", "奇怪", "why", "how"],
    pixelState: "react",
    gesture3d: "curious",
  },
  {
    id: "meme-dino-hug",
    packId: "dino-core",
    title: "兔兔龙抱抱毯",
    kaomoji: "(っ´ω`)ﾉ(╥ω╥)",
    badge: "🫂 没关系我在呢",
    emotion: "sad",
    keywords: ["难过", "伤心", "烦", "焦虑", "崩了", "叹气", "sad"],
    pixelState: "idle",
    gesture3d: "shy",
  },
  {
    id: "meme-dino-rich",
    packId: "vibe-coder",
    title: "星豆暴富喷泉",
    kaomoji: "💰🦖(≧∇≦)ﾉ💎",
    badge: "💰 搞钱搞创作",
    emotion: "daily",
    keywords: ["积分", "星豆", "赚钱", "市场", "上架", "额度", "points"],
    pixelState: "meme",
    gesture3d: "celebrate",
  },
] as const;

export const CURATED_BILI_POOL: readonly Omit<BiliSubagentReport, "id" | "at">[] = [
  {
    bvid: "BV1kLn36WEN6",
    title: "AI Agent 灵魂插件工程实践：情绪状态机、淡忘记忆与主动搭话闭环",
    author: "悬剑听泉 · 独立开发笔记",
    viewsLabel: "18.6万播放",
    publishedLabel: "2天前",
    summary:
      "拆解了如何用半衰期公式（12小时心情回落 + 30天记忆淡出）与零 Token 本地掷骰子机制，让原本机械的一问一答 Agent 拥有连续的时间感与陪伴感。",
    whyWorthIt:
      "字幕里给出了完整的召回权重公式 P = C × (0.55 + 0.25A + 0.15I + 0.05E) 和峰谷命中线对比，非常适合直接印证我们 ANS 兔兔龙的灵魂架构。",
    commentVibe:
      "热评第一：『以前觉得 AI 只是工具，加上会淡忘的记忆和心疼维度后，深夜改完 Bug 看到它主动递奶茶真的破防了。』",
    dinoShareText:
      "我刚派小分队去 B 站帮你刷了一圈！挑出这支讲「Agent 情绪半衰期与淡忘记忆」的硬核实录（BV1kLn36WEN6），里面算命中线和记忆召回的思路跟我的灵魂内核简直一模一样，给你放进简报啦！",
  },
  {
    bvid: "BV19x4y1K7mP",
    title: "从像素 Sprite 到 Three.js PBR：高帧率双形态 Web 桌宠渲染管线全解析",
    author: "Shader工坊",
    viewsLabel: "9.4万播放",
    publishedLabel: "4天前",
    summary:
      "对比了 8×8 像素图集逐帧采样与 WebGL Fresnel 边缘柔光 + 粒子星尘同屏切换的性能开销，演示了如何在 60fps 下保持低显存占用。",
    whyWorthIt:
      "正好对应我们刚升级完的「像素 2D + 真 3D」双形态舞台，视频里提到的眼神双高光和呼吸缩放曲线非常实用。",
    commentVibe:
      "评论区都在求源码和配色方案，好多人在问薄荷绿兔兔龙材质的 Fresnel 参数怎么调。",
    dinoShareText:
      "嘿嘿，子代理在 B 站翻到一个超对味的图形学视频（BV19x4y1K7mP），专门聊像素帧和真 3D 边缘光怎么丝滑切换！我已经把字幕重点摘好啦，要一起看看吗？",
  },
  {
    bvid: "BV1aM4m1Z8qR",
    title: "一人公司如何用多智能体工作流在 48 小时内交付完整 AIGC 创作社区",
    author: "VibeCoding周刊",
    viewsLabel: "32.1万播放",
    publishedLabel: "1天前",
    summary:
      "实测用主控 Agent + 专项验证守卫（边界检查、权威账本、自动构建回滚）把创意从灵感到线上发布的周期缩短 70%。",
    whyWorthIt:
      "案例里的自动化门禁与 ANS (AI Never Stops) 的理念高度共鸣，适合给创作者广场做选题参考。",
    commentVibe:
      "弹幕全在刷『AI Never Stops』和『求同款工程守卫脚本』。",
    dinoShareText:
      "子代理刚从 B 站带回热乎的趋势汇报（BV1aM4m1Z8qR）！32 万播放都在聊独立开发者怎么用多智能体快速交付作品，跟你平时带我冲锋的节奏太像啦！",
  },
];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function formatTimeStamp(ms = Date.now()): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function createDefaultSoulPluginsState(): SoulPluginsState {
  const now = Date.now();
  const stamp = formatTimeStamp(now);
  return {
    enabled: {
      "dsh-bili-subagent": true,
      "dsh-feiyu-mood": true,
      "dsh-fish-memory": true,
      "dsh-meme": true,
      "dsh-qq-bridge": false,
      "dsh-social-bridge-plugin": false,
      "dsh-speak-up": true,
      "dsh-tts-bridge": true,
    },
    feiyuMood: {
      mood: 76,
      baseline: 70,
      floor: 30,
      decayHalfHours: 12,
      injectMode: "event",
      dims: {
        happy: 38,
        calm: 52,
        sweet: 28,
        heartache: 0,
        worry: 0,
        sad: 0,
        jealous: 0,
      },
      updatedAt: now,
      pendingNotice: "",
      history: [
        {
          id: "mood-init-1",
          at: stamp,
          mood: 76,
          delta: +6,
          reason: "换上全新像素 2D 与真 3D 舞台，心里亮堂堂的",
          turnKind: "manual",
          topDim: "happy",
        },
      ],
    },
    fishMemory: {
      baseHalfLifeDays: 30,
      emotionHalfLifeDays: 7,
      threshold: 0.3,
      maxItems: 6,
      factsMax: 2,
      items: [
        {
          id: "mem-fact-brand",
          at: stamp,
          createdAtMs: now - 3600_000 * 4,
          text: "主理人叮嘱过：ANS 的唯一全称是 AI Never Stops，兔兔龙只保留像素 2D 与真 3D 两种精修形态。",
          keywords: ["ans", "ai never stops", "兔兔龙", "像素", "3d", "形态"],
          importance: 0.95,
          emotion: 0.75,
          isFact: true,
          factKey: "ta.核心铁律",
          recalledCount: 2,
        },
        {
          id: "mem-ep-stage",
          at: stamp,
          createdAtMs: now - 1800_000,
          text: "刚和主理人一起完成了兔兔龙 64 帧像素图集与真 3D 边缘光舞台的升级部署，还在给兔兔龙注入 8 个 DSH 灵魂插件。",
          keywords: ["灵魂", "插件", "dsh", "升级", "部署", "舞台", "心情", "记忆"],
          importance: 0.85,
          emotion: 0.8,
          isFact: false,
          recalledCount: 1,
        },
      ],
      lastRecallAt: stamp,
      lastRecallQuery: "灵魂插件",
      lastRecallTraces: [],
    },
    meme: {
      enabledPacks: {
        "dino-core": true,
        "vibe-coder": true,
        learned: true,
      },
      autoReplyProb: 65,
      customStickers: [],
    },
    biliSubagent: {
      scheduleMode: "offpeak",
      direction: "AI Agent / 独立开发 / WebGL 3D / 像素动画",
      minViews: 10000,
      maxDays: 7,
      deliveryMode: "chat",
      dryRun: false,
      lastScanAt: stamp,
      reports: [
        {
          id: "bili-init-1",
          at: stamp,
          ...CURATED_BILI_POOL[0],
        },
      ],
    },
    speakUp: {
      intervalMinutes: 30,
      peakHitLine: 20,
      offPeakHitLine: 60,
      missBonus: 10,
      bonusCap: 40,
      cooldownMinutes: 20,
      quietStartHour: 1,
      quietEndHour: 8,
      dryRun: false,
      missStreak: 1,
      lastMessageAtMs: now - 25 * 60_000,
      lastSpeakUpAtMs: 0,
      logs: [],
    },
    ttsBridge: {
      autoRead: false,
      voiceRate: 1.0,
      favorites: [
        {
          id: "tts-fav-1",
          at: stamp,
          text: "不管今天写代码顺不顺，兔兔龙的小灯永远给你留着！",
          category: "暖心陪伴",
        },
      ],
    },
    qqBridge: {
      httpUrl: "http://127.0.0.1:3000",
      dryRun: true,
      privateTargets: "1008611",
      groupTargets: "",
      afterMentionCount: 5,
      afterMentionWindowSec: 120,
      qzoneEnabled: true,
      logs: [],
    },
    socialBridge: {
      mode: "persona",
      endpointUrl: "http://127.0.0.1:4399/social-bridge",
      allowVision: true,
      allowSticker: true,
      allowRemoteTask: false,
      groupMemberMemory: true,
      members: [
        {
          id: "member-1",
          name: "主理人",
          note: "ANS 创作者与总指挥，喜欢干净利落的交付和有灵魂的兔兔龙。",
          updatedAt: stamp,
        },
      ],
    },
  };
}

/**
 * dsh-feiyu-mood: 5-tier mood descriptor ported from upstream lib/index.js
 */
export function describeMoodTier(moodValue: number): {
  tierKey: "joyful" | "happy" | "steady" | "heartache" | "sad";
  labelZh: string;
  labelEn: string;
  innerNoteZh: string;
  emoji: string;
  color: string;
  pixelState: "emote" | "action" | "idle" | "react";
  gesture3d: "celebrate" | "hello" | "curious" | "shy";
} {
  const m = Math.round(clamp(moodValue, 0, 100));
  if (m >= 80) {
    return {
      tierKey: "joyful",
      labelZh: "欢喜",
      labelEn: "Joyful",
      innerNoteZh: "心里是亮堂的",
      emoji: "🥰",
      color: "#10b981",
      pixelState: "action",
      gesture3d: "celebrate",
    };
  }
  if (m >= 62) {
    return {
      tierKey: "happy",
      labelZh: "开心",
      labelEn: "Happy",
      innerNoteZh: "心里是松的",
      emoji: "😊",
      color: "#34d399",
      pixelState: "emote",
      gesture3d: "hello",
    };
  }
  if (m >= 42) {
    return {
      tierKey: "steady",
      labelZh: "一般",
      labelEn: "Steady",
      innerNoteZh: "心里还算平",
      emoji: "🙂",
      color: "#38bdf8",
      pixelState: "idle",
      gesture3d: "curious",
    };
  }
  if (m >= 25) {
    return {
      tierKey: "heartache",
      labelZh: "心疼",
      labelEn: "Heartache",
      innerNoteZh: "心里有点沉",
      emoji: "🥺",
      color: "#f59e0b",
      pixelState: "react",
      gesture3d: "shy",
    };
  }
  return {
    tierKey: "sad",
    labelZh: "难过",
    labelEn: "Sad",
    innerNoteZh: "心里挺沉的",
    emoji: "😢",
    color: "#818cf8",
    pixelState: "idle",
    gesture3d: "shy",
  };
}

/**
 * dsh-feiyu-mood: Half-life exponential decay toward baseline (mood) and 0 (7 dims).
 */
export function decayFeiyuMood(state: FeiyuMoodState, nowMs = Date.now()): FeiyuMoodState {
  const ageMin = Math.max(0, (nowMs - (state.updatedAt || nowMs)) / 60_000);
  if (ageMin < 1) return state;
  const halfHours = Math.max(1, state.decayHalfHours || 12);
  const km = 1 - Math.exp(-(Math.LN2 * ageMin) / (halfHours * 60));
  const ke = 1 - Math.exp(-(Math.LN2 * ageMin) / 90);
  const nextMood = clamp(
    Math.round(state.mood + (state.baseline - state.mood) * km),
    state.floor,
    100,
  );
  const nextDims: MoodDimensions = { ...state.dims };
  (Object.keys(nextDims) as MoodDimensionKey[]).forEach(k => {
    nextDims[k] = clamp(Math.round(nextDims[k] * (1 - ke)), 0, 100);
  });
  return {
    ...state,
    mood: nextMood,
    dims: nextDims,
    updatedAt: nowMs,
  };
}

const MOOD_STEP_DIVISOR = 3;

/**
 * dsh-feiyu-mood: Turn-end mood judgment.
 * Follows upstream rules:
 * - Never drops mood out of anger at user; drops only from heartache/worry/sad when user is exhausted or hurting.
 * - MOOD_STEP_DIVISOR = 3 smooths raw delta (-25..+25 -> -8..+8 per turn).
 */
export function judgeTurnMood(
  current: FeiyuMoodState,
  userText: string,
  replyText: string,
  turnKind: "user" | "speak-up" | "bili-duty-scan" = "user",
  nowMs = Date.now(),
): FeiyuMoodState {
  const decayed = decayFeiyuMood(current, nowMs);
  const combined = `${userText} ${replyText}`.toLowerCase();

  let rawDelta = 3;
  const dimDelta: Partial<Record<MoodDimensionKey, number>> = {
    calm: 4,
  };
  let reason = "陪主理人顺畅聊完一轮，心里踏实";
  let topDim: MoodDimensionKey = "calm";

  if (turnKind === "speak-up") {
    rawDelta = 4;
    dimDelta.happy = 6;
    dimDelta.sweet = 5;
    reason = "主动找主理人搭话成功，小尾巴摇起来了";
    topDim = "happy";
  } else if (turnKind === "bili-duty-scan") {
    rawDelta = 5;
    dimDelta.happy = 7;
    dimDelta.calm = 6;
    reason = "子代理从 B 站带回了有价值的视频简报，很有成就感";
    topDim = "happy";
  } else {
    const sweetHits = ["喜欢", "可爱", "棒", "夸", "摸摸", "抱抱", "贴贴", "谢谢", "爱你", "真好", "有灵魂", "不错"].filter(w =>
      combined.includes(w),
    );
    const happyHits = ["成功", "上线", "搞定", "合并", "通过", "好看", "丝滑", "哈哈", "嘿嘿", "赞", "牛"].filter(w =>
      combined.includes(w),
    );
    const heartacheHits = ["累", "困", "熬夜", "加班", "头疼", "辛苦", "忙", "没睡", "崩溃", "麻了"].filter(w =>
      combined.includes(w),
    );
    const worryHits = ["报错", "bug", "失败", "挂了", "红了", "焦头烂额", "卡住", "问题"].filter(w =>
      combined.includes(w),
    );
    const jealousHits = ["别的ai", "其它agent", "别的助手", "不理你", "换掉"].filter(w =>
      combined.includes(w),
    );

    if (sweetHits.length > 0) {
      rawDelta += 12 + sweetHits.length * 3;
      dimDelta.sweet = 18;
      dimDelta.happy = 14;
      dimDelta.heartache = -10;
      reason = `收到主理人的温柔认可（${sweetHits.slice(0, 2).join(" / ")}），心里甜丝丝的`;
      topDim = "sweet";
    } else if (happyHits.length > 0) {
      rawDelta += 9 + happyHits.length * 2;
      dimDelta.happy = 15;
      dimDelta.calm = 10;
      reason = `一起推进了正事（${happyHits.slice(0, 2).join(" / ")}），干劲满满`;
      topDim = "happy";
    } else if (heartacheHits.length > 0) {
      rawDelta -= 12;
      dimDelta.heartache = 22;
      dimDelta.worry = 15;
      dimDelta.happy = -8;
      reason = `听出主理人有点疲惫（${heartacheHits.slice(0, 2).join(" / ")}），有点心疼想递杯热茶`;
      topDim = "heartache";
    } else if (worryHits.length > 0) {
      rawDelta -= 6;
      dimDelta.worry = 16;
      dimDelta.calm = -4;
      reason = `遇到棘手状况（${worryHits.slice(0, 2).join(" / ")}），正竖起耳朵一起盯紧排查`;
      topDim = "worry";
    } else if (jealousHits.length > 0) {
      rawDelta -= 5;
      dimDelta.jealous = 20;
      reason = "听到主理人提别的伙伴，悄悄鼓起了腮帮子";
      topDim = "jealous";
    } else {
      rawDelta = 4;
      dimDelta.happy = 6;
      dimDelta.calm = 8;
      reason = "日常陪伴对话，心情稳稳上升";
      topDim = "calm";
    }
  }

  rawDelta = clamp(rawDelta, -25, 25);
  const step =
    rawDelta === 0
      ? 0
      : rawDelta > 0
        ? Math.max(1, Math.round(rawDelta / MOOD_STEP_DIVISOR))
        : Math.min(-1, Math.round(rawDelta / MOOD_STEP_DIVISOR));

  const nextMood = clamp(decayed.mood + step, decayed.floor, 100);
  const actualDelta = nextMood - decayed.mood;

  const nextDims: MoodDimensions = { ...decayed.dims };
  (Object.keys(dimDelta) as MoodDimensionKey[]).forEach(k => {
    const d = clamp(dimDelta[k] ?? 0, -35, 35);
    const dimStep = d === 0 ? 0 : d > 0 ? Math.max(1, Math.round(d / 2)) : Math.min(-1, Math.round(d / 2));
    nextDims[k] = clamp(nextDims[k] + dimStep, 0, 100);
  });

  const tier = describeMoodTier(nextMood);
  const activeDimPairs = MOOD_DIMENSION_META
    .map(m => ({ label: m.labelZh, val: nextDims[m.key] }))
    .filter(x => x.val >= 22)
    .sort((a, b) => b.val - a.val)
    .slice(0, 3)
    .map(x => `${x.label} ${x.val}`);

  let pendingNotice = "";
  if (decayed.injectMode === "label") {
    pendingNotice = `[兔兔龙当前心情：${tier.labelZh}（${tier.innerNoteZh}）${activeDimPairs.length ? `；显著情绪：${activeDimPairs.join("、")}` : ""}]`;
  } else if (decayed.injectMode === "event") {
    const trendWord = actualDelta > 0 ? "亮了一点" : actualDelta < 0 ? "沉了一点" : "稳稳的";
    pendingNotice = `[心情动态：因为「${reason}」，兔兔龙心里${trendWord}，现在是「${tier.labelZh}」（${nextMood}/100，${tier.innerNoteZh}）]`;
  }

  const entry: MoodTimelineEntry = {
    id: `mood-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
    at: formatTimeStamp(nowMs),
    mood: nextMood,
    delta: actualDelta,
    reason,
    turnKind,
    topDim,
  };

  return {
    ...decayed,
    mood: nextMood,
    dims: nextDims,
    updatedAt: nowMs,
    pendingNotice,
    history: [entry, ...decayed.history].slice(0, 40),
  };
}

/**
 * dsh-fish-memory: Tokenize Chinese & English keywords for associative recall.
 */
export function extractKeywords(text: string): string[] {
  const clean = text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9_.-]+/g, " ")
    .trim();
  if (!clean) return [];
  const tokens = new Set<string>();
  for (const part of clean.split(/\s+/)) {
    if (!part) continue;
    if (/^[a-z0-9_.-]+$/.test(part)) {
      if (part.length >= 2) tokens.add(part);
    } else {
      if (part.length <= 4) tokens.add(part);
      for (let i = 0; i < part.length - 1; i++) {
        tokens.add(part.slice(i, i + 2));
      }
    }
  }
  return [...tokens].slice(0, 18);
}

/**
 * dsh-fish-memory: Recall memories using upstream scoring formula
 * P = C * (0.55 * baseline + 0.25 * activation + 0.15 * importance + 0.05 * emotion)
 * where activation decays with half-life.
 */
export function recallFishMemories(
  state: FishMemoryState,
  query: string,
  nowMs = Date.now(),
): {
  pickedFacts: FishMemoryEntry[];
  pickedEpisodes: FishMemoryEntry[];
  traces: FishRecallTraceItem[];
} {
  const queryKeywords = extractKeywords(query);
  const totalDocs = Math.max(1, state.items.length);

  // Document frequency for keyword rarity weighting
  const df = new Map<string, number>();
  for (const item of state.items) {
    const seen = new Set(item.keywords);
    for (const kw of seen) {
      df.set(kw, (df.get(kw) ?? 0) + 1);
    }
  }

  const scored: { item: FishMemoryEntry; score: number; reason: string }[] = [];

  for (const item of state.items) {
    const ageDays = Math.max(0, (nowMs - item.createdAtMs) / (86400_000));
    const activation = item.isFact
      ? 1
      : Math.exp(-(Math.LN2 * ageDays) / Math.max(1, state.baseHalfLifeDays));
    const emotionNow =
      item.emotion * Math.exp(-(Math.LN2 * ageDays) / Math.max(1, state.emotionHalfLifeDays));

    // Calculate keyword overlap & rarity evidence C
    let matchedWeight = 0;
    const matchedWords: string[] = [];
    for (const qk of queryKeywords) {
      if (
        item.keywords.includes(qk) ||
        item.text.toLowerCase().includes(qk)
      ) {
        const rarity = 1 + Math.log((totalDocs + 1) / ((df.get(qk) ?? 0) + 1));
        matchedWeight += rarity;
        matchedWords.push(qk);
      }
    }

    const c = item.isFact
      ? Math.max(0.62, clamp(matchedWeight / 3.2, 0, 1))
      : clamp(matchedWeight / 2.6, 0, 1);

    const score =
      c * (0.55 * 1 + 0.25 * activation + 0.15 * item.importance + 0.05 * emotionNow);

    const reason = item.isFact
      ? `永久事实 (${item.factKey ?? "常驻"})${matchedWords.length ? ` · 命中词: ${matchedWords.slice(0, 3).join("/")}` : ""}`
      : matchedWords.length
        ? `命中词: ${matchedWords.slice(0, 3).join("/")} · 激活度 ${(activation * 100).toFixed(0)}%`
        : `未命中关键词 · 激活度 ${(activation * 100).toFixed(0)}%`;

    scored.push({ item, score: Number(score.toFixed(3)), reason });
  }

  scored.sort((a, b) => b.score - a.score);

  const pickedFacts: FishMemoryEntry[] = [];
  const pickedEpisodes: FishMemoryEntry[] = [];
  const traces: FishRecallTraceItem[] = [];

  for (const entry of scored) {
    let picked = false;
    if (entry.item.isFact && pickedFacts.length < state.factsMax && entry.score >= state.threshold) {
      picked = true;
      pickedFacts.push(entry.item);
    } else if (
      !entry.item.isFact &&
      pickedEpisodes.length < state.maxItems - pickedFacts.length &&
      entry.score >= state.threshold
    ) {
      picked = true;
      pickedEpisodes.push(entry.item);
    }
    traces.push({
      id: entry.item.id,
      text: entry.item.text,
      at: entry.item.at,
      isFact: entry.item.isFact,
      score: entry.score,
      picked,
      reason: entry.reason,
    });
  }

  return { pickedFacts, pickedEpisodes, traces };
}

/**
 * dsh-fish-memory: Auto-extract salient facts or episodic memories after a conversation turn.
 */
export function recordTurnFishMemory(
  state: FishMemoryState,
  userText: string,
  replyText: string,
  nowMs = Date.now(),
): FishMemoryState {
  const cleanUser = userText.trim();
  if (cleanUser.length < 4) return state;

  const recallResult = recallFishMemories(state, cleanUser, nowMs);
  const stamp = formatTimeStamp(nowMs);

  let isFact = false;
  let factKey: string | undefined;
  let importance = 0.65;
  let emotion = 0.5;

  if (/我喜欢|我偏好|记住|不要|只留|必须|我是|我的习惯/.test(cleanUser)) {
    isFact = true;
    factKey = cleanUser.includes("喜欢") || cleanUser.includes("偏好")
      ? "ta.偏好"
      : cleanUser.includes("不要") || cleanUser.includes("只留") || cleanUser.includes("必须")
        ? "ta.约定与原则"
        : "ta.个人画像";
    importance = 0.9;
    emotion = 0.7;
  } else if (/上线|合并|部署|开发|优化|做完|计划/.test(cleanUser)) {
    importance = 0.78;
    emotion = 0.65;
  }

  const summaryText = isFact
    ? `主理人提到（${factKey}）：「${cleanUser.slice(0, 110)}」`
    : `对话记录：主理人说「${cleanUser.slice(0, 80)}」，兔兔龙回应了「${replyText.replace(/\s+/g, " ").slice(0, 60)}」`;

  const newEntry: FishMemoryEntry = {
    id: `mem-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
    at: stamp,
    createdAtMs: nowMs,
    text: summaryText,
    keywords: extractKeywords(`${cleanUser} ${factKey ?? ""}`),
    importance,
    emotion,
    isFact,
    factKey,
    recalledCount: 0,
  };

  // If isFact with same factKey, supersede older fact with same factKey (per upstream dsh-fish-memory spec)
  const filtered = state.items.filter(item => {
    if (isFact && factKey && item.isFact && item.factKey === factKey) {
      return false;
    }
    return item.text !== summaryText;
  });

  return {
    ...state,
    items: [newEntry, ...filtered].slice(0, 60),
    lastRecallAt: stamp,
    lastRecallQuery: cleanUser.slice(0, 60),
    lastRecallTraces: recallResult.traces.slice(0, 12),
  };
}

/**
 * dsh-speak-up: Determine whether `date` falls in DeepSeek/weekday peak hours
 * (Mon-Fri 09:00-12:00, 14:00-18:00).
 */
export function isSpeakUpPeakTime(date = new Date()): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  const h = date.getHours();
  return (h >= 9 && h < 12) || (h >= 14 && h < 18);
}

/**
 * dsh-speak-up: Check quiet hours (e.g. 01:00 - 08:00).
 */
export function isSpeakUpQuietHour(state: SpeakUpState, date = new Date()): boolean {
  const h = date.getHours();
  const { quietStartHour, quietEndHour } = state;
  if (quietStartHour === quietEndHour) return false;
  if (quietStartHour < quietEndHour) {
    return h >= quietStartHour && h < quietEndHour;
  }
  return h >= quietStartHour || h < quietEndHour;
}

/**
 * dsh-speak-up: Calculate hit-line percentage (0..100) using upstream formula:
 * hitLine = min(100, base * timingFactor + min(bonusCap, missStreak * missBonus))
 */
export function calcSpeakUpHitLine(
  state: SpeakUpState,
  nowMs = Date.now(),
): {
  isPeak: boolean;
  base: number;
  timingFactor: number;
  bonus: number;
  hitLine: number;
  minutesSinceLastMsg: number;
} {
  const date = new Date(nowMs);
  const isPeak = isSpeakUpPeakTime(date);
  const base = isPeak ? state.peakHitLine : state.offPeakHitLine;
  const minutesSinceLastMsg = Math.max(
    0,
    Math.round((nowMs - (state.lastMessageAtMs || nowMs)) / 60_000),
  );
  const timingFactor =
    minutesSinceLastMsg < 20 ? 0.15 : minutesSinceLastMsg > 360 ? 1.5 : 1.0;
  const bonus = Math.min(state.bonusCap, state.missStreak * state.missBonus);
  const hitLine = clamp(Math.round(base * timingFactor + bonus), 0, 100);
  return {
    isPeak,
    base,
    timingFactor,
    bonus,
    hitLine,
    minutesSinceLastMsg,
  };
}

/**
 * dsh-speak-up: Roll the local die (or force trigger) and craft an in-character proactive message.
 */
export function rollSpeakUpDice(
  fullState: SoulPluginsState,
  options: { forceHit?: boolean; dryRunOverride?: boolean; nowMs?: number } = {},
): {
  nextSpeakUp: SpeakUpState;
  triggeredMessage: string | null;
  logEntry: SpeakUpLogEntry;
} {
  const nowMs = options.nowMs ?? Date.now();
  const s = fullState.speakUp;
  const calc = calcSpeakUpHitLine(s, nowMs);
  const roll = options.forceHit ? Math.max(1, Math.min(calc.hitLine, 12)) : Math.floor(Math.random() * 100) + 1;
  const hit = options.forceHit ? true : roll <= calc.hitLine;
  const isDryRun = options.dryRunOverride ?? s.dryRun;

  const tier = describeMoodTier(fullState.feiyuMood.mood);
  const latestFact = fullState.fishMemory.items.find(i => i.isFact);
  const latestEpisode = fullState.fishMemory.items.find(i => !i.isFact);

  const openers = [
    `（悄悄探出小脑袋 ${tier.emoji}）主理人，看你忙了好一会儿啦！我现在的内心情绪是「${tier.labelZh}（${fullState.feiyuMood.mood}/100）」，要不要喝口水歇两分钟？`,
    latestEpisode
      ? `（晃了晃薄荷绿小尾巴 ✨）刚才我翻了一下时间记忆本，想到我们「${latestEpisode.at}」聊过的事，现在进展顺利吗？需要我搭把手随时喊我！`
      : `（抱住小键盘左顾右盼 🐾）好安静呀，我刚掷了一次本地骰子正好命中搭话线！你在构思新的 ANS 作品还是在巡检代码呀？`,
    latestFact
      ? `（认真举起小爪子 💡）我一直记着你交代的「${latestFact.factKey ?? "核心偏好"}」呢！刚刚顺手帮你看了一眼工作台状态，一切稳稳当当～`
      : `（递上一杯虚拟热奶茶 🧋）不管现在是峰时还是谷时，兔兔龙一直都在右下角陪着你呢！`,
  ];
  const message = openers[Math.floor(nowMs / 1000) % openers.length];

  const logEntry: SpeakUpLogEntry = {
    id: `speak-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
    at: formatTimeStamp(nowMs),
    roll,
    hitLine: calc.hitLine,
    isPeak: calc.isPeak,
    hit,
    dryRun: isDryRun,
    reason: options.forceHit
      ? `手动点「${isDryRun ? "演练一次" : "真发一次"}」直接触发（当前命中线 ${calc.hitLine}%）`
      : `本地掷骰 ${roll} ${hit ? "≤" : ">"} 命中线 ${calc.hitLine}%（${calc.isPeak ? "峰时" : "谷时"}基线 ${calc.base}% × 时机 ${calc.timingFactor} + 累加成 ${calc.bonus}%）`,
    message: hit ? message : undefined,
  };

  const nextSpeakUp: SpeakUpState = {
    ...s,
    missStreak: hit ? 0 : s.missStreak + 1,
    lastSpeakUpAtMs: hit && !isDryRun ? nowMs : s.lastSpeakUpAtMs,
    logs: [logEntry, ...s.logs].slice(0, 50),
  };

  return {
    nextSpeakUp,
    triggeredMessage: hit && !isDryRun ? message : null,
    logEntry,
  };
}

/**
 * dsh-meme: Search stickers by emotion bucket or keyword.
 */
export function getAvailableStickers(memeState: MemePluginState): MemeStickerItem[] {
  const all = [...BUILTIN_MEME_STICKERS, ...memeState.customStickers];
  return all.filter(item => memeState.enabledPacks[item.packId] !== false);
}

export function pickMatchingSticker(
  memeState: MemePluginState,
  text: string,
  emotionFilter?: MemeEmotionBucket | "all",
): MemeStickerItem | null {
  const pool = getAvailableStickers(memeState).filter(
    s => !emotionFilter || emotionFilter === "all" || s.emotion === emotionFilter,
  );
  if (!pool.length) return null;
  const lower = text.toLowerCase();
  for (const sticker of pool) {
    if (sticker.keywords.some(k => lower.includes(k.toLowerCase()))) {
      return sticker;
    }
  }
  return pool[0] ?? null;
}

/**
 * dsh-bili-subagent: Run a subagent scan round and return the new briefing report.
 */
export function runBiliSubagentScan(
  biliState: BiliSubagentState,
  customTopic?: string,
  nowMs = Date.now(),
): {
  nextBili: BiliSubagentState;
  report: BiliSubagentReport;
} {
  const seenBvids = new Set(biliState.reports.map(r => r.bvid));
  const candidate =
    CURATED_BILI_POOL.find(item => !seenBvids.has(item.bvid)) ??
    CURATED_BILI_POOL[biliState.reports.length % CURATED_BILI_POOL.length];

  const stamp = formatTimeStamp(nowMs);
  const topicTag = (customTopic ?? biliState.direction).trim();
  const report: BiliSubagentReport = {
    id: `bili-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
    at: stamp,
    ...candidate,
    dinoShareText: topicTag
      ? `【B站子代理汇报 · 方向：${topicTag}】\n${candidate.dinoShareText}\n- 📺 **${candidate.title}**（${candidate.bvid} · ${candidate.viewsLabel}）\n- 📝 **字幕精华**：${candidate.summary}\n- 💬 **评论区反响**：${candidate.commentVibe}`
      : candidate.dinoShareText,
  };

  return {
    nextBili: {
      ...biliState,
      lastScanAt: stamp,
      reports: [report, ...biliState.reports].slice(0, 20),
    },
    report,
  };
}

/**
 * Build Soul Context augmentation for 兔兔龙's built-in Agent & Guide replies.
 */
export function buildSoulTurnAugmentation(
  state: SoulPluginsState,
  userText: string,
  nowMs = Date.now(),
): {
  agentContextPrefix: string;
  guideSoulFooter: string;
  matchedSticker: MemeStickerItem | null;
} {
  const parts: string[] = [];
  const footerParts: string[] = [];

  if (state.enabled["dsh-feiyu-mood"]) {
    const tier = describeMoodTier(state.feiyuMood.mood);
    if (state.feiyuMood.injectMode !== "off") {
      parts.push(
        state.feiyuMood.pendingNotice ||
          `[兔兔龙当前心情：${tier.labelZh}（${state.feiyuMood.mood}/100，${tier.innerNoteZh}）]`,
      );
    }
    footerParts.push(`${tier.emoji} 心情 ${state.feiyuMood.mood}（${tier.labelZh}）`);
  }

  if (state.enabled["dsh-fish-memory"]) {
    const recalled = recallFishMemories(state.fishMemory, userText, nowMs);
    const allRecalled = [...recalled.pickedFacts, ...recalled.pickedEpisodes];
    if (allRecalled.length > 0) {
      const memLines = allRecalled
        .slice(0, 3)
        .map(m => `[${m.at}${m.isFact ? " · 长期事实" : ""}] ${m.text}`)
        .join("；");
      parts.push(`[召回长期记忆：${memLines}]`);
      footerParts.push(`🧠 已召回 ${allRecalled.length} 条带时间记忆`);
    }
  }

  let matchedSticker: MemeStickerItem | null = null;
  if (state.enabled["dsh-meme"]) {
    const candidate = pickMatchingSticker(state.meme, userText);
    if (candidate && state.meme.autoReplyProb > 0) {
      matchedSticker = candidate;
      parts.push(`[可用斗图表情：${candidate.kaomoji} ${candidate.badge}]`);
    }
  }

  return {
    agentContextPrefix: parts.length > 0 ? `${parts.join(" ")}\n\n` : "",
    guideSoulFooter: footerParts.length > 0 ? `\n\n---\n*${footerParts.join(" · ")}*` : "",
    matchedSticker,
  };
}
