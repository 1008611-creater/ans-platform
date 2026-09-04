/**
 * 念念技能库路由元数据（静态）
 *
 * 说明：source 清单为本地 `.workbuddy/skills/` 全部技能 + AI 视频链路历史技能，
 *      vendored 至 `ai-video-skills-source/`（脚本以 SKILL_DIR_LAYER 为准遍历导入）。
 * 本文件被两处共用：
 *   1. scripts/import-ai-video-skills.ts —— 灌库时决定每套技能归属的层（Category）与标签；
 *   2. src/app/skills/map/page.tsx —— 渲染分层路由树时叠加下游关系边。
 *
 * 分层优先级：SKILL_DIR_LAYER 显式映射 > SKILL_LAYER_RULES 关键词规则 > other 兜底。
 * 新增技能时优先补显式映射；规则只用于兜底，避免每次都要改代码。
 *
 * 注意：本文件保持零依赖（不使用 @/ 别名），以便 tsx 脚本与 Next 应用都能直接相对/别名导入。
 */

/** 层级（按生产门顺序） */
export interface SkillLayer {
  /** 机器 key，用于 dir->layer 映射与样式 */
  key: string;
  /** 中文层名，同时作为 Category 名 */
  label: string;
  /** 英文层名，用于英文模式；未填写时由 key 生成 */
  labelEn?: string;
  /** 层职责说明 */
  description: string;
  /** 英文层职责说明；未填写时回退中文说明 */
  descriptionEn?: string;
  /** 展示顺序 */
  order: number;
}

export const SKILL_LAYERS: SkillLayer[] = [
  {
    key: "gateway",
    label: "总门",
    description: "AI 视频总方法与路由入口：判断事实来源、交付分类、三道生产门与总路由。",
    order: 1,
  },
  {
    key: "method",
    label: "方法层",
    description: "把小说/大纲/创意转成可拍剧本与资产设计的思维方式与编译方法。",
    order: 2,
  },
  {
    key: "drama",
    label: "短剧制作层",
    description: "AI 短剧五冠军链路：知识卡、编剧、拆镜、提示质控、审查交付与天宫漫剧专项。",
    order: 3,
  },
  {
    key: "execution",
    label: "执行层",
    description: "具体的生视频、资产生产、转绘、素材注入与故事板交接等可直接执行的技能。",
    order: 4,
  },
  {
    key: "routing",
    label: "路由层",
    description: "已有短剧转绘/本土化的总路由、步骤分发与交付件发送。",
    order: 5,
  },
  {
    key: "channel",
    label: "渠道层",
    description: "底层图片/视频生成渠道适配器（GPT Image 2、RunningHub、MiniMax H3、Seedance2 等）。",
    order: 6,
  },
  {
    key: "quality",
    label: "质量层",
    description: "剧本审查、镜头规划、视觉风格、情绪板、生产验证与一致性保障。",
    order: 7,
  },
  {
    key: "iteration",
    label: "迭代层",
    description: "生成后诊断与单变量重做，逼近目标质量。",
    order: 8,
  },
  {
    key: "video",
    label: "视频生成层",
    description: "通用视频编译与动效：HyperFrames、动效图形、字幕烧录、口播剪辑、音乐视频。",
    order: 9,
  },
  {
    key: "social",
    label: "社媒运营层",
    description: "抖音/快手/小红书/闲鱼/视频号的内容生产、发布执行、电商带货与账号运营。",
    order: 10,
  },
  {
    key: "content",
    label: "内容创作层",
    description: "通用内容生产与文风打磨：叙事转化、旅行 IP 内容、去 AI 腔与可读性优化。",
    order: 11,
  },
  {
    key: "media",
    label: "媒体采集层",
    description: "站外内容采集、检索与素材解析：B站/抖音/视频号下载、公众号提取、网页搜索与素材库。",
    order: 12,
  },
  {
    key: "web",
    label: "网页与设计层",
    description: "前端与设计：Figma、网站质量路由、排版、UX、动效、品牌规范与程序化 SEO。",
    order: 13,
  },
  {
    key: "eng",
    label: "工程与安全层",
    description: "工程化能力：安全审计、浏览器自动化、服务器运维、游戏系统、念念自有工程与画布。",
    order: 14,
  },
  {
    key: "docs",
    label: "文档与演示层",
    description: "办公文档与演示：Word/PDF 读写排版、PPT 与 SVG 内容生成。",
    order: 15,
  },
  {
    key: "workflow",
    label: "通用工作流层",
    description: "跨场景协作与自动化：RPA、团队协作、飞书知识沉淀、项目资料归档与同步。",
    order: 16,
  },
  {
    key: "tools",
    label: "工具效率层",
    description: "效率工具：提示词管理、技能治理、磁盘备份清理、模型视觉路由与额度查询。",
    order: 17,
  },
  {
    key: "knowledge",
    label: "方法与商业层",
    description: "方法论与商业判断：创始人视角、市场调研、产品营销、定价与经验沉淀。",
    order: 18,
  },
  {
    key: "other",
    label: "其他技能",
    description: "暂未归入上述分层的通用技能，按来源目录自动归类。",
    order: 19,
  },
];

/** English labels/descriptions for the routing map UI. */
export const SKILL_LAYER_EN: Record<string, { label: string; description: string }> = {
  gateway: { label: "Gateway", description: "AI video methods and routing entry points." },
  method: { label: "Method", description: "Methods for turning ideas, novels, and outlines into production-ready scripts and assets." },
  drama: { label: "Short Drama Production", description: "Knowledge cards, screenwriting, shot lists, prompt quality control, delivery, and celestial short drama." },
  execution: { label: "Execution", description: "Executable skills for video generation, asset production, redraw, material injection, and storyboards." },
  routing: { label: "Routing", description: "Short-drama redraw, localization, step routing, and delivery." },
  channel: { label: "Channels", description: "Image and video generation channel adapters, including GPT Image 2, RunningHub, MiniMax H3, and Seedance2." },
  quality: { label: "Quality", description: "Script review, shot planning, visual style, moodboards, production validation, and consistency." },
  iteration: { label: "Iteration", description: "Post-generation diagnosis and controlled rework." },
  video: { label: "Video Generation", description: "General video compilation and motion: HyperFrames, motion graphics, captions, talking-head edits, and music video." },
  social: { label: "Social Operations", description: "Douyin, Kuaishou, Xiaohongshu, Xianyu, WeChat Channels, publishing, commerce, and account operations." },
  content: { label: "Content Creation", description: "General content production, narrative conversion, travel IP content, and prose polish." },
  media: { label: "Media Acquisition", description: "Content collection, search, extraction, and media parsing." },
  web: { label: "Web and Design", description: "Frontend and design: Figma, web quality, typography, UX, motion, branding, and programmatic SEO." },
  eng: { label: "Engineering and Security", description: "Security, browser automation, server operations, game systems, canvas, and product engineering." },
  docs: { label: "Docs and Presentations", description: "Word/PDF authoring, document layout, PPT, and SVG content generation." },
  workflow: { label: "General Workflows", description: "Cross-scenario collaboration and automation: RPA, Feishu, archiving, and synchronization." },
  tools: { label: "Productivity Tools", description: "Prompt management, skill governance, backup, cleanup, model routing, and quotas." },
  knowledge: { label: "Methods and Business", description: "Founder perspective, market research, product marketing, pricing, and experience compounding." },
  other: { label: "Other Skills", description: "General skills not yet assigned to a dedicated layer." },
};

/**
 * 历史层名：分层改名后，旧层名会以 Tag 形式残留在库里且不再被任何技能引用。
 * 导入脚本据此清理孤儿层标签（只清这些已知层名，用户自建标签不受影响）。
 */
export const LEGACY_LAYER_LABELS: string[] = ["知识方法层"];

/** dir 名 -> 层 key（覆盖本地全部 200 套 skill） */
export const SKILL_DIR_LAYER: Record<string, string> = {
  // ── 总门 ──────────────────────────────────────────────
  "ai-video-fundamentals-skill": "gateway",
  "ai-video-skill-route-index": "gateway",
  "ai-video-champion-handoff": "gateway",

  // ── 方法层 ────────────────────────────────────────────
  "ai-video-novel-creation-v1": "method",
  "ai-video-novel-to-script": "method",
  "ai-video-asset-prompts": "method",
  "narrative-to-screen-reader": "method",

  // ── 短剧制作层（五冠军链路 + 天宫漫剧专项）────────────
  "knowledge-card-skill": "drama",
  screenwriter: "drama",
  "shotlist-builder": "drama",
  "hell-grind": "drama",
  "audit-master-thread": "drama",
  "chaoge-assets-trial": "drama",
  "chinese-celestial-palace": "drama",
  "design-xianxia-celestial-shots": "drama",
  "design-seedance-celestial-motion": "drama",
  "sd2.5-tiangong-manju": "drama",
  "sd2.5dolaskill": "drama",
  "novel-to-tiangong-manju": "drama",
  "mini-tiangong-drama": "drama",
  "relic-collector-ip-system": "drama",
  "seedance2-a-contest-orchestrator": "drama",

  // ── 执行层 ────────────────────────────────────────────
  "ai-video-asset-production": "execution",
  "image2-storyboard-video": "execution",
  "sd2.5skill": "execution",
  "seedance2-narrative-shot-workflow": "execution",
  "sd2-5-guofeng-skill": "execution",
  "sd2-5-kidswear-commerce": "execution",
  "lingdou-seedance-material-injector": "execution",
  "mx-shortdrama-01-frame-extract": "execution",
  "mx-shortdrama-02-source-timeline": "execution",
  "mx-shortdrama-04-character-assets": "execution",
  "canvas-image-generation-reliable": "execution",
  "niannian-canvas-asset-import": "execution",
  img2threejs: "execution",

  // ── 路由层 ────────────────────────────────────────────
  "mx-shortdrama-00-router": "routing",
  "short-drama-remake-script": "routing",
  "wechat-redraw-word-sender": "routing",

  // ── 渠道层 ────────────────────────────────────────────
  "mikoto-gpt-image-2": "channel",
  "openlux-image-gen": "channel",
  "agnes-video-gen": "channel",
  "nolan-director-style": "channel",
  "gpt-image-2-style-library": "channel",
  "image2-skill": "channel",
  "image2-direct": "channel",
  "image2-boundary-lab": "channel",
  "ikun-image2": "channel",
  "krill-image2": "channel",
  "beecode-image2": "channel",
  "mxai-rpa-mcp": "channel",
  "mj-tiangong-imagegen": "channel",
  "minimaxh3skill": "channel",
  "minimaxh3skill-use": "channel",
  "runninghub-workflow-api": "channel",
  "runninghub-image2-text": "channel",
  "runninghub-image2-image": "channel",
  "runninghub-canvas-fallback": "channel",
  "runninghub-canvas-media-upload": "channel",
  "runninghub-animate-motion-transfer": "channel",
  "sd2-video-generation": "channel",
  "storeel-seedance2-canvas": "channel",
  "astorie-seedance2-channel": "channel",
  "tmlab-video-channel": "channel",
  "tensor-canvas-direct-node": "channel",

  // ── 质量层 ────────────────────────────────────────────
  "storyboard-director": "quality",
  "mx-shortdrama-production-harness": "quality",
  "mx-shortdrama-visual-style": "quality",
  "tiangong-moodboard": "quality",

  // ── 迭代层 ────────────────────────────────────────────
  "mx-shortdrama-production-iteration": "iteration",

  // ── 视频生成层 ────────────────────────────────────────
  hyperframes: "video",
  "hyperframes-core": "video",
  "hyperframes-animation": "video",
  "hyperframes-creative": "video",
  "hyperframes-media": "video",
  "hyperframes-registry": "video",
  "hyperframes-cli": "video",
  "general-video": "video",
  "cinematic-video-prompt": "video",
  "motion-graphics": "video",
  "music-to-video": "video",
  "product-launch-video": "video",
  "pr-to-video": "video",
  "faceless-explainer": "video",
  "talking-head-recut": "video",
  "embedded-captions": "video",
  "tk-subtitles": "video",
  slideshow: "video",
  "remotion-to-hyperframes": "video",
  "website-to-video": "video",
  "pexoai-agent": "video",

  // ── 社媒运营层 ────────────────────────────────────────
  "douyin-video-selection": "social",
  "douyin-video-production": "social",
  "douyin-caption-cover": "social",
  "douyin-publish-operator": "social",
  "douyin-workflow-orchestrator": "social",
  "douyin-fruit-commerce-strategy": "social",
  "kuaishou-video-scout": "social",
  "kuaishou-video-maker": "social",
  "kuaishou-content-pipeline": "social",
  "kuaishou-publish-packager": "social",
  "kuaishou-publisher": "social",
  "xhs-imagen": "social",
  "xhs-note-creator": "social",
  "xhs-original-image-publisher": "social",
  "xhs-traffic-aesthetic-guard": "social",
  "xiaohongshu-ops": "social",
  "xianyu-ai-demand-radar": "social",
  "xianyu-product-publisher": "social",
  "ip-video-topic-selection": "social",
  "self-media-skill-route": "social",
  "zimeiti-commander": "social",
  "seedance2-commerce-video": "social",
  "realistic-commerce-video-replication": "social",
  "runninghub-fruit-commerce-video": "social",

  // ── 内容创作层 ────────────────────────────────────────
  "niannian-travel-group": "content",
  "stop-slop": "content",
  "i-have-adhd": "content",

  // ── 媒体采集层 ────────────────────────────────────────
  "bilibili-video-downloader": "media",
  "douyin-video-downloader": "media",
  "wechat-video-downloader": "media",
  "wechat-article-extractor": "media",
  "douyin-daily-hot": "media",
  "jina-search": "media",
  "media-use": "media",

  // ── 网页与设计层 ──────────────────────────────────────
  figma: "web",
  "figma-use": "web",
  "figma-create-new-file": "web",
  "figma-generate-design": "web",
  "figma-generate-library": "web",
  "figma-implement-design": "web",
  "figma-create-design-system-rules": "web",
  "frontend-design": "web",
  "top-design": "web",
  "taste-skill": "web",
  hallmark: "web",
  impeccable: "web",
  "redesign-skill": "web",
  "refactoring-ui": "web",
  "web-typography": "web",
  "ux-writing": "web",
  "ux-heuristics": "web",
  "icon-resource-routing": "web",
  "web-motion-champion": "web",
  "web-visual-motion-planner": "web",
  "web-miniapp-product-router": "web",
  "website-product-router": "web",
  "website-quality-router": "web",
  "website-metadata-share-audit": "web",
  "site-architecture": "web",
  "commerce-web-acceleration": "web",
  "programmatic-seo": "web",
  "gpt-tasteskill": "web",
  "niannian-logo-authority": "web",

  // ── 工程与安全层 ──────────────────────────────────────
  "security-best-practices": "eng",
  "security-threat-model": "eng",
  playwright: "eng",
  "playwright-interactive": "eng",
  screenshot: "eng",
  "wizstar-bitbrowser": "eng",
  apiskill: "eng",
  "github-selected-projects": "eng",
  "server-fleet-ssh-router": "eng",
  "win-mac-codex-bridge": "eng",
  "niannian-ai-canvas": "eng",
  "niannian-zhijian": "eng",
  "niannian-commerce-website": "eng",
  "niannian-commerce-release-integrity": "eng",
  "niannian-web-development": "eng",
  "save-systems": "eng",
  "procedural-gen": "eng",
  "prototype-fast": "eng",

  // ── 文档与演示层 ──────────────────────────────────────
  doc: "docs",
  pdf: "docs",
  "ppt-master": "docs",

  // ── 通用工作流层 ──────────────────────────────────────
  "ai-native-collaboration": "workflow",
  "ai-rpa-automation": "workflow",
  "agent-team-workflow": "workflow",
  "teamai-push-windows": "workflow",
  "feishu-evidence-knowledge": "workflow",
  "feishu-skill-router": "workflow",
  "jellyfish-sync": "workflow",
  "project-drive-archive": "workflow",

  // ── 工具效率层 ────────────────────────────────────────
  "prompt-vault": "tools",
  "prompt-skill-router": "tools",
  "skill-optimizer": "tools",
  "skill-governance": "tools",
  "nuwa-skill": "tools",
  "disk-backup-vault": "tools",
  "qingli-skill": "tools",
  "computer-accelerator": "tools",
  "models-vision-routing": "tools",
  "deepseek-vision": "tools",
  "tokenrhythm-quota": "tools",
  "codex-agent-mem": "tools",

  // ── 方法与商业层 ──────────────────────────────────────
  "laoda-perspective": "knowledge",
  "insight-to-skill-compounding": "knowledge",
  "product-marketing": "knowledge",
  pricing: "knowledge",
  刺猬星球: "knowledge",
  归档skill: "knowledge",
};

/**
 * 分层兜底规则：显式映射未命中时，按关键词自动归类，避免新技能全落进「其他」。
 * 匹配文本 = `dir + name + description`（统一转小写）。按顺序取第一条命中的规则。
 */
export interface SkillLayerRule {
  layer: string;
  keywords: string[];
}

export const SKILL_LAYER_RULES: SkillLayerRule[] = [
  { layer: "drama", keywords: ["短剧", "漫剧", "天宫", "仙侠", "拆镜", "shotlist", "分集", "剧本"] },
  {
    layer: "channel",
    keywords: ["runninghub", "seedance", "sd2", "gpt-image", "image2", "midjourney", "minimax", "生图", "图生视频", "渠道"],
  },
  { layer: "social", keywords: ["douyin", "抖音", "kuaishou", "快手", "小红书", "xhs", "闲鱼", "xianyu", "视频号", "带货", "电商"] },
  { layer: "video", keywords: ["hyperframes", "视频", "video", "动效", "字幕", "motion", "captions", "remotion"] },
  { layer: "media", keywords: ["下载", "download", "采集", "热榜", "搜索", "search", "提取", "extract", "素材库"] },
  { layer: "web", keywords: ["figma", "website", "web", "前端", "frontend", "ux", "排版", "typography", "landing", "seo", "设计"] },
  { layer: "eng", keywords: ["security", "安全", "playwright", "浏览器", "server", "ssh", "github", "游戏", "game", "画布", "canvas"] },
  { layer: "docs", keywords: ["docx", "pdf", "ppt", "幻灯片", "演示", "slideshow"] },
  { layer: "workflow", keywords: ["workflow", "协作", "rpa", "自动化", "飞书", "feishu", "归档", "同步", "sync"] },
  { layer: "tools", keywords: ["提示词", "prompt", "skill", "技能", "磁盘", "备份", "清理", "额度", "quota"] },
  { layer: "content", keywords: ["写作", "文案", "叙事", "narrative", "内容生产", "prose"] },
  { layer: "knowledge", keywords: ["方法论", "视角", "营销", "marketing", "定价", "pricing", "调研"] },
  { layer: "execution", keywords: ["资产", "asset", "转绘", "生成", "generate"] },
];

/**
 * 标签兜底规则：在「层标签」之外按关键词自动补充题材/模型标签，提升检索命中率。
 * 与 SKILL_EXTRA_TAGS 的显式标签合并去重。
 */
export interface SkillTagRule {
  tag: string;
  keywords: string[];
}

export const SKILL_TAG_RULES: SkillTagRule[] = [
  { tag: "抖音", keywords: ["douyin", "抖音"] },
  { tag: "快手", keywords: ["kuaishou", "快手"] },
  { tag: "小红书", keywords: ["xhs", "小红书", "xiaohongshu"] },
  { tag: "闲鱼", keywords: ["xianyu", "闲鱼", "goofish"] },
  { tag: "视频号", keywords: ["视频号", "wechat video", "weixin"] },
  { tag: "天宫漫剧", keywords: ["天宫", "仙侠", "celestial", "tiangong"] },
  { tag: "短剧", keywords: ["短剧", "漫剧", "shortdrama", "short-drama"] },
  { tag: "Seedance", keywords: ["seedance", "sd2", "即梦"] },
  { tag: "RunningHub", keywords: ["runninghub", "comfyui"] },
  { tag: "Midjourney", keywords: ["midjourney", "mj-", "mxai"] },
  { tag: "Image2", keywords: ["image2", "gpt-image", "生图"] },
  { tag: "HyperFrames", keywords: ["hyperframes", "remotion"] },
  { tag: "Figma", keywords: ["figma"] },
  { tag: "前端", keywords: ["frontend", "前端", "website", "网页"] },
  { tag: "UX", keywords: ["ux", "usability", "microcopy"] },
  { tag: "自动化", keywords: ["playwright", "rpa", "自动化", "automation", "browser"] },
  { tag: "安全", keywords: ["security", "威胁建模", "threat"] },
  { tag: "文档", keywords: ["docx", "pdf", "ppt", "文档"] },
  { tag: "下载采集", keywords: ["download", "下载", "extract", "提取", "采集"] },
  { tag: "电商带货", keywords: ["带货", "commerce", "电商", "卖货", "listing"] },
  { tag: "提示词", keywords: ["prompt", "提示词"] },
  { tag: "归档", keywords: ["归档", "archive", "备份", "backup"] },
];

/**
 * 建议在库内复用的标签（除统一的 ai-video 外）。
 * 导入脚本会按层自动加一个层标签；下方为按题材/模型补充的标签。
 */
export const SKILL_EXTRA_TAGS: Record<string, string[]> = {
  // 总门
  "ai-video-fundamentals-skill": ["方法论", "路由"],
  "ai-video-skill-route-index": ["路由", "索引", "方法论"],
  "ai-video-champion-handoff": ["交接", "冠军", "协作"],
  // 方法层
  "ai-video-novel-creation-v1": ["小说", "剧本"],
  "ai-video-novel-to-script": ["剧本", "短剧"],
  "ai-video-asset-prompts": ["资产图", "Midjourney", "Image2"],
  "narrative-to-screen-reader": ["读本", "影视", "开发"],
  // 短剧制作层
  "knowledge-card-skill": ["知识卡", "五冠军", "规则提取"],
  screenwriter: ["编剧", "五冠军", "剧本"],
  "shotlist-builder": ["拆镜", "五冠军", "镜头表"],
  "hell-grind": ["提示质控", "五冠军", "连续性"],
  "audit-master-thread": ["审查", "五冠军", "交付"],
  "chaoge-assets-trial": ["导演前期", "关键资产", "基准"],
  "chinese-celestial-palace": ["中式天宫", "电影感", "诊断"],
  "design-xianxia-celestial-shots": ["仙侠", "构图", "运镜"],
  "design-seedance-celestial-motion": ["图生视频", "云海", "运动提示词"],
  "sd2.5-tiangong-manju": ["天宫漫剧", "3D国漫", "抖音9:16"],
  "sd2.5dolaskill": ["旧入口", "兼容", "转交"],
  "novel-to-tiangong-manju": ["天宫漫剧", "小说改编", "3D"],
  "mini-tiangong-drama": ["天宫漫剧", "三集", "小说蒸馏"],
  "relic-collector-ip-system": ["原创IP", "获奖", "叙事"],
  "seedance2-a-contest-orchestrator": ["竞赛片", "获奖", "全流程"],
  // 执行层
  "ai-video-asset-production": ["资产生产", "Image2", "一键生成"],
  "image2-storyboard-video": ["故事板", "Image2", "分镜"],
  "sd2.5skill": ["Seedance2.5", "文生视频", "图生视频"],
  "seedance2-narrative-shot-workflow": ["Seedance2.5", "连续镜头", "尾帧续接"],
  "sd2-5-guofeng-skill": ["Seedance2.5", "国风", "天宫漫剧"],
  "sd2-5-kidswear-commerce": ["Seedance2.5", "童装", "电商"],
  "lingdou-seedance-material-injector": ["灵豆", "Seedance2.5", "素材注入"],
  "mx-shortdrama-01-frame-extract": ["转绘", "抽帧", "增强"],
  "mx-shortdrama-02-source-timeline": ["转绘", "源片", "时间线"],
  "mx-shortdrama-04-character-assets": ["转绘", "角色一致性"],
  "canvas-image-generation-reliable": ["画布生图", "轮询", "失败修复"],
  "niannian-canvas-asset-import": ["画布", "素材导入", "资产登记"],
  img2threejs: ["3D模型", "程序化", "动画就绪"],
  // 路由层
  "mx-shortdrama-00-router": ["转绘", "路由"],
  "short-drama-remake-script": ["本土化", "双语", "改编"],
  "wechat-redraw-word-sender": ["交付", "微信", "转绘"],
  // 渠道层
  "mikoto-gpt-image-2": ["GPT-Image-2", "图片生成"],
  "openlux-image-gen": ["OpenLux", "生图", "渠道"],
  "agnes-video-gen": ["Agnes", "生视频", "视频生成"],
  "nolan-director-style": ["诺兰", "导演风格", "高概念"],
  "gpt-image-2-style-library": ["风格库", "提示词模板", "GPT-Image-2"],
  "image2-skill": ["云雾", "4K", "文生图"],
  "image2-direct": ["Codex", "直连", "生图"],
  "image2-boundary-lab": ["能力图谱", "分类学", "评测"],
  "ikun-image2": ["Ikun", "NewAPI", "图生图"],
  "krill-image2": ["Krill", "图生图", "渠道"],
  "beecode-image2": ["BeeCode", "中转", "生图"],
  "mxai-rpa-mcp": ["MXAI", "MJ中文镜像", "自动下载"],
  "mj-tiangong-imagegen": ["Midjourney", "V8.2", "天宫出图"],
  "minimaxh3skill": ["MiniMax-H3", "FL2VA", "开源通道"],
  "minimaxh3skill-use": ["MiniMax-H3", "创作契约", "首尾帧"],
  "runninghub-workflow-api": ["RunningHub", "ComfyUI", "API化"],
  "runninghub-image2-text": ["RunningHub", "文生图", "低价通道"],
  "runninghub-image2-image": ["RunningHub", "图生图", "参考图"],
  "runninghub-canvas-fallback": ["三通道兜底", "画布", "降级"],
  "runninghub-canvas-media-upload": ["素材上传", "节点绑定", "画布"],
  "runninghub-animate-motion-transfer": ["动作迁移", "视频", "V9"],
  "sd2-video-generation": ["StoReel", "总路由", "Seedance2"],
  "storeel-seedance2-canvas": ["StoReel", "画布操作", "底层"],
  "astorie-seedance2-channel": ["AStorie", "画布", "Smini"],
  "tmlab-video-channel": ["TMLab", "通道", "预检"],
  "tensor-canvas-direct-node": ["Tensor.art", "CDP", "画布自动化"],
  // 质量层
  "storyboard-director": ["故事板", "镜头规划", "审查"],
  "mx-shortdrama-production-harness": ["转绘", "生产验证"],
  "mx-shortdrama-visual-style": ["视觉风格", "提示词注入", "迭代"],
  "tiangong-moodboard": ["天宫", "情绪板", "视觉一致性"],
  // 迭代层
  "mx-shortdrama-production-iteration": ["迭代", "诊断"],
  // 视频生成层
  hyperframes: ["HyperFrames", "总入口", "视频"],
  "hyperframes-core": ["合成契约", "渲染", "规范"],
  "hyperframes-animation": ["原子动效", "多阶段", "动效规则"],
  "hyperframes-creative": ["创意方向", "设计规范", "frame.md"],
  "hyperframes-media": ["音频", "素材", "音频引擎"],
  "hyperframes-registry": ["注册表", "组件", "接线"],
  "hyperframes-cli": ["CLI", "开发循环", "catalog"],
  "general-video": ["兜底工作流", "自定义合成", "任意时长"],
  "cinematic-video-prompt": ["电影感", "提示词编译", "图生视频"],
  "motion-graphics": ["动效图形", "设计驱动", "短片"],
  "music-to-video": ["音乐视频", "音频驱动", "MV"],
  "product-launch-video": ["产品发布", "营销视频", "URL转视频"],
  "pr-to-video": ["PR转视频", "GitHub", "变更可视化"],
  "faceless-explainer": ["无脸解说", "文本转视频", "知识科普"],
  "talking-head-recut": ["口播剪辑", "字幕包装", "访谈"],
  "embedded-captions": ["字幕烧录", "32种样式", "口播"],
  "tk-subtitles": ["TikTok字幕", "CapCut", "短语级"],
  slideshow: ["幻灯片", "演示", "交互式"],
  "remotion-to-hyperframes": ["Remotion迁移", "React", "移植"],
  "website-to-video": ["网站转视频", "站点漫游", "展示片"],
  "pexoai-agent": ["短视频", "5-120秒", "一站式"],
  // 社媒运营层
  "douyin-video-selection": ["选题", "优先级", "复盘"],
  "douyin-video-production": ["拍摄计划", "粗剪", "制作"],
  "douyin-caption-cover": ["标题", "文案", "封面"],
  "douyin-publish-operator": ["发布", "创作者中心", "浏览器"],
  "douyin-workflow-orchestrator": ["端到端", "编排", "抖音"],
  "douyin-fruit-commerce-strategy": ["水果带货", "人设", "账号定位"],
  "kuaishou-video-scout": ["选题", "爆款挖掘", "二次创作"],
  "kuaishou-video-maker": ["制作计划", "快手", "素材"],
  "kuaishou-content-pipeline": ["端到端", "运营", "编排"],
  "kuaishou-publish-packager": ["发布包", "封面", "标题"],
  "kuaishou-publisher": ["创作者平台", "发布执行", "排障"],
  "xhs-imagen": ["小红书", "图文", "种草"],
  "xhs-note-creator": ["笔记素材", "封面", "正文卡片"],
  "xhs-original-image-publisher": ["原创图", "AitoEarn", "发布"],
  "xhs-traffic-aesthetic-guard": ["流量优先", "审美护栏", "审核"],
  "xiaohongshu-ops": ["全链路运营", "OpenClaw", "复盘"],
  "xianyu-ai-demand-radar": ["需求雷达", "选品", "评分"],
  "xianyu-product-publisher": ["闲鱼", "上架", "竞品"],
  "ip-video-topic-selection": ["选题", "打分", "长期IP"],
  "self-media-skill-route": ["自媒体", "路由", "多平台"],
  "zimeiti-commander": ["自媒体", "运营", "发布"],
  "seedance2-commerce-video": ["带货视频", "IP人设", "即梦"],
  "realistic-commerce-video-replication": ["真人口播", "脚本复刻", "质控"],
  "runninghub-fruit-commerce-video": ["水果电商", "Wan", "工作流"],
  // 内容创作层
  "niannian-travel-group": ["旅行", "IP", "原创"],
  "stop-slop": ["去AI腔", "文风", "润色"],
  "i-have-adhd": ["可读性", "结构化", "注意力友好"],
  // 媒体采集层
  "bilibili-video-downloader": ["B站", "下载", "解析"],
  "douyin-video-downloader": ["抖音", "批量下载", "解析"],
  "wechat-video-downloader": ["视频号", "下载", "解析"],
  "wechat-article-extractor": ["公众号", "Markdown", "存档"],
  "douyin-daily-hot": ["抖音", "热榜", "数据"],
  "jina-search": ["网页搜索", "Reader", "轻量检索"],
  "media-use": ["BGM", "音效", "素材库"],
  // 网页与设计层
  figma: ["Figma", "MCP", "设计上下文"],
  "figma-use": ["Figma", "前置技能", "工具调用"],
  "figma-create-new-file": ["新建文件", "Figma", "空白稿"],
  "figma-generate-design": ["页面还原", "设计稿", "应用页"],
  "figma-generate-library": ["设计系统", "代码库", "Design Token"],
  "figma-implement-design": ["设计还原", "1:1", "生产代码"],
  "figma-create-design-system-rules": ["规范生成", "代码库", "定制规则"],
  "frontend-design": ["高设计质量", "生产级界面", "差异化"],
  "top-design": ["Awwwards", "沉浸式", "获奖级"],
  "taste-skill": ["反套路", "着陆页", "作品集"],
  hallmark: ["反AI味", "绿地项目", "设计提取"],
  impeccable: ["设计评审", "打磨", "澄清"],
  "redesign-skill": ["改版升级", "审计", "高端化"],
  "refactoring-ui": ["视觉层级", "间距", "配色"],
  "web-typography": ["字体选择", "搭配", "排版落地"],
  "ux-writing": ["微文案", "无障碍", "界面文案"],
  "ux-heuristics": ["启发式评估", "可用性", "界面改进"],
  "icon-resource-routing": ["图标资源", "选型", "产品UI"],
  "web-motion-champion": ["网站动效", "GSAP", "授权核对"],
  "web-visual-motion-planner": ["视觉层级", "滚动叙事", "性能"],
  "web-miniapp-product-router": ["网站", "小程序", "立项路由"],
  "website-product-router": ["Framer", "Next.js", "改版"],
  "website-quality-router": ["质量审计", "着陆页", "改进"],
  "website-metadata-share-audit": ["SEO", "Open Graph", "分享预览"],
  "site-architecture": ["信息架构", "导航", "页面层级"],
  "commerce-web-acceleration": ["性能", "商品图", "私有媒体"],
  "programmatic-seo": ["模板化SEO", "规模化", "落地页"],
  "gpt-tasteskill": ["GSAP", "交互", "UX/UI"],
  "niannian-logo-authority": ["品牌", "Logo", "Favicon"],
  // 工程与安全层
  "security-best-practices": ["代码审计", "安全规范", "语言相关"],
  "security-threat-model": ["威胁建模", "信任边界", "攻击者能力"],
  playwright: ["浏览器自动化", "终端", "表单填写"],
  "playwright-interactive": ["持久化浏览器", "Electron", "UI调试"],
  screenshot: ["截图", "桌面", "系统"],
  "wizstar-bitbrowser": ["指纹浏览器", "CDP", "多窗口"],
  apiskill: ["媒体API", "打包", "图片音频视频"],
  "github-selected-projects": ["项目集", "本地运行", "精选仓库"],
  "server-fleet-ssh-router": ["SSH", "服务器清单", "跨平台"],
  "win-mac-codex-bridge": ["多机协作", "Windows", "Mac"],
  "niannian-ai-canvas": ["无限画布", "AI媒体", "质量门禁"],
  "niannian-zhijian": ["念念智剪", "视频编辑器", "部署验证"],
  "niannian-commerce-website": ["官网", "用户路径", "修复演进"],
  "niannian-commerce-release-integrity": ["发布完整性", "缓存", "重复占用"],
  "niannian-web-development": ["Issue到上线", "隔离分支", "验收"],
  "save-systems": ["存档", "序列化", "游戏状态"],
  "procedural-gen": ["程序化生成", "噪声", "种子随机"],
  "prototype-fast": ["快速原型", "可玩验证", "一小时内"],
  // 文档与演示层
  doc: ["Word", "docx", "读写排版"],
  pdf: ["PDF", "版式", "审阅"],
  "ppt-master": ["PPT", "SVG", "多格式转换"],
  // 通用工作流层
  "ai-native-collaboration": ["协作", "工作流"],
  "ai-rpa-automation": ["RPA", "自动化", "浏览器"],
  "agent-team-workflow": ["团队", "协作", "工作流"],
  "teamai-push-windows": ["TeamAI", "同步", "GitHub"],
  "feishu-evidence-knowledge": ["飞书", "知识卡", "沉淀"],
  "feishu-skill-router": ["飞书", "路由", "会话识别"],
  "jellyfish-sync": ["Jellyfish", "同步", "工作台"],
  "project-drive-archive": ["资料库", "归档", "交接"],
  // 工具效率层
  "prompt-vault": ["提示词", "管理", "模板"],
  "prompt-skill-router": ["路由", "技能栈", "草稿前"],
  "skill-optimizer": ["技能优化", "审计", "SKILL"],
  "skill-governance": ["技能治理", "评分", "选型"],
  "nuwa-skill": ["人物Skill", "深度调研", "思维框架"],
  "disk-backup-vault": ["备份", "资料", "磁盘"],
  "qingli-skill": ["清理", "磁盘", "Windows"],
  "computer-accelerator": ["性能优化", "Windows", "进程排查"],
  "models-vision-routing": ["视觉", "模型路由", "配置"],
  "deepseek-vision": ["看图", "视觉模型", "截图理解"],
  "tokenrhythm-quota": ["额度", "Token", "中转"],
  "codex-agent-mem": ["记忆层", "MCP", "项目记忆"],
  // 方法与商业层
  "laoda-perspective": ["创始人视角", "决策", "方法论"],
  "insight-to-skill-compounding": ["经验沉淀", "复用", "路由"],
  "product-marketing": ["产品营销", "上下文文档", "定位"],
  pricing: ["定价", "包装", "商业化"],
  刺猬星球: ["提示词", "视觉创作", "方法课"],
  归档skill: ["归档", "交接", "审计"],
};

/**
 * 下游路由关系（建议路由，非强制）。
 * key 为源 dir，value 为下游 dir 列表。用于 /skills/map 的连线与跳转。
 */
export const SKILL_ROUTES: Record<string, string[]> = {
  "ai-video-fundamentals-skill": [
    "ai-video-novel-creation-v1",
    "ai-video-novel-to-script",
    "ai-video-asset-prompts",
    "ai-video-asset-production",
    "storyboard-director",
    "sd2.5skill",
    "seedance2-narrative-shot-workflow",
    "mx-shortdrama-00-router",
  ],
  "ai-video-novel-creation-v1": ["ai-video-novel-to-script"],
  "ai-video-novel-to-script": ["ai-video-asset-prompts"],
  "ai-video-asset-prompts": ["ai-video-asset-production"],
  "ai-video-asset-production": ["storyboard-director"],
  "storyboard-director": ["sd2.5skill", "seedance2-narrative-shot-workflow"],
  "sd2.5skill": ["seedance2-narrative-shot-workflow"],
  "mikoto-gpt-image-2": ["ai-video-asset-production"],
  "openlux-image-gen": ["ai-video-asset-prompts"],
  "mx-shortdrama-00-router": ["mx-shortdrama-01-frame-extract", "mx-shortdrama-04-character-assets"],
  "mx-shortdrama-01-frame-extract": ["mx-shortdrama-02-source-timeline"],
  "mx-shortdrama-02-source-timeline": ["mx-shortdrama-04-character-assets"],
  "mx-shortdrama-04-character-assets": ["mx-shortdrama-production-harness"],
  "mx-shortdrama-production-harness": ["mx-shortdrama-production-iteration"],
  "mx-shortdrama-production-iteration": [],
  "seedance2-narrative-shot-workflow": [],
  // 五冠军链路
  "knowledge-card-skill": ["screenwriter"],
  screenwriter: ["shotlist-builder"],
  "shotlist-builder": ["hell-grind"],
  "hell-grind": ["audit-master-thread"],
  "audit-master-thread": [],
  "chaoge-assets-trial": ["shotlist-builder"],
  "sd2.5-tiangong-manju": ["novel-to-tiangong-manju"],
  "novel-to-tiangong-manju": ["mj-tiangong-imagegen"],
  "chinese-celestial-palace": ["design-xianxia-celestial-shots"],
  "design-xianxia-celestial-shots": ["design-seedance-celestial-motion"],
  // HyperFrames 链路
  hyperframes: ["hyperframes-core"],
  "hyperframes-core": ["hyperframes-animation", "hyperframes-creative", "hyperframes-media"],
  "hyperframes-creative": ["hyperframes-animation"],
  "hyperframes-animation": [],
  "hyperframes-media": [],
  "hyperframes-registry": ["hyperframes-core"],
  "hyperframes-cli": ["hyperframes-core"],
  "general-video": ["hyperframes-core"],
  "remotion-to-hyperframes": ["hyperframes-core"],
  // 社媒链路
  "douyin-video-selection": ["douyin-video-production"],
  "douyin-video-production": ["douyin-caption-cover"],
  "douyin-caption-cover": ["douyin-publish-operator"],
  "douyin-publish-operator": [],
  "douyin-workflow-orchestrator": [
    "douyin-video-selection",
    "douyin-video-production",
    "douyin-caption-cover",
    "douyin-publish-operator",
  ],
  "kuaishou-video-scout": ["kuaishou-video-maker"],
  "kuaishou-video-maker": ["kuaishou-publish-packager"],
  "kuaishou-publish-packager": ["kuaishou-publisher"],
  "kuaishou-publisher": [],
  "kuaishou-content-pipeline": ["kuaishou-video-scout"],
  "xhs-note-creator": ["xhs-traffic-aesthetic-guard"],
  "xhs-traffic-aesthetic-guard": ["xhs-original-image-publisher"],
  "xhs-original-image-publisher": [],
  "xiaohongshu-ops": ["xhs-note-creator"],
  "xianyu-ai-demand-radar": ["xianyu-product-publisher"],
  "xianyu-product-publisher": [],
  "self-media-skill-route": ["douyin-workflow-orchestrator", "kuaishou-content-pipeline", "zimeiti-commander"],
  // 网站链路
  "website-product-router": ["frontend-design"],
  "frontend-design": ["web-visual-motion-planner"],
  "website-quality-router": ["refactoring-ui"],
  "web-miniapp-product-router": ["website-product-router"],
  "figma-implement-design": ["frontend-design"],
  "figma-generate-library": ["figma-implement-design"],
};

/** 源目录（已 vendoring 进仓库的技能根目录，供导入脚本读取） */
export const SKILL_SOURCE_ROOT = "ai-video-skills-source";
