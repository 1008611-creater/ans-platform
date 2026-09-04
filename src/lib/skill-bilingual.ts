/**
 * Skill 双语字段生成与语言回退。
 *
 * 原则：
 * - 中文是站内默认显示语言；英文优先保留技能原始执行文本。
 * - API、MCP、RPA、UI、UX、SEO、GPT、Image2、Seedance 等专有缩写不翻译。
 * - SKILL.md 可通过 nameZh/nameEn/descriptionZh/descriptionEn 提供人工校准字段。
 * - 没有人工中文正文时，contentZh 只增加中文导航摘要并保留英文原文，避免误译命令、代码和约束。
 */

/**
 * 术语白名单：这些词在双语展示、标题自动中文化和正文包装中保持原样。
 * 这是“特定词汇缩写可以保存”的稳定入口，后续可继续追加产品名/模型名。
 */
export const PRESERVED_TERMS = [
  "API", "MCP", "RPA", "UI", "UX", "SEO", "GPT", "AI",
  "Image2", "Seedance", "RunningHub", "HyperFrames", "Figma",
  "GitHub", "OpenClaw", "ComfyUI", "CDP", "CLI", "React", "Next.js",
] as const;

const TOKEN_ZH: Record<string, string> = {
  ai: "AI",
  agent: "智能体",
  agents: "智能体",
  api: "API",
  audit: "审计",
  automation: "自动化",
  browser: "浏览器",
  canvas: "画布",
  channel: "渠道",
  chat: "对话",
  commerce: "商业",
  content: "内容",
  create: "创建",
  creative: "创意",
  design: "设计",
  developer: "开发者",
  development: "开发",
  direct: "直连",
  download: "下载",
  editor: "编辑器",
  extract: "提取",
  frontend: "前端",
  generation: "生成",
  generate: "生成",
  github: "GitHub",
  image: "图片",
  implement: "实现",
  interactive: "交互",
  knowledge: "知识",
  library: "库",
  media: "媒体",
  motion: "动效",
  music: "音乐",
  node: "节点",
  operations: "运营",
  optimizer: "优化",
  package: "打包",
  pdf: "PDF",
  prompt: "提示词",
  publisher: "发布器",
  publishing: "发布",
  quality: "质量",
  router: "路由",
  routing: "路由",
  search: "搜索",
  security: "安全",
  server: "服务器",
  skill: "技能",
  slideshow: "幻灯片",
  storyboard: "故事板",
  subtitles: "字幕",
  system: "系统",
  team: "团队",
  threat: "威胁",
  to: "转",
  tool: "工具",
  traffic: "流量",
  video: "视频",
  visual: "视觉",
  web: "网页",
  website: "网站",
  workflow: "工作流",
  writing: "写作",
  xhs: "小红书",
  // 中文平台 / 工具品牌
  xiaohongshu: "小红书",
  xianyu: "闲鱼",
  douyin: "抖音",
  kuaishou: "快手",
  wechat: "微信",
  weixin: "微信",
  bilibili: "B站",
  bitbrowser: "Bitbrowser",
  wizstar: "Wizstar",
  codex: "Codex",
  claude: "Claude",
  remotion: "Remotion",
  // 常见技能动作 / 对象
  ops: "运营",
  radar: "雷达",
  guard: "护栏",
  sender: "发送器",
  extractor: "提取器",
  bridge: "桥接",
  redraw: "重绘",
  article: "文章",
  demand: "需求",
  product: "商品",
  original: "原创",
  note: "笔记",
  creator: "创作器",
  aesthetic: "审美",
  fundamentals: "基础",
  novel: "小说",
  script: "剧本",
  asset: "素材",
  assets: "素材",
  production: "制作",
  index: "索引",
  champion: "冠军",
  handoff: "交接",
  injection: "注入",
  injector: "注入器",
  material: "素材",
  frame: "帧",
  frames: "帧",
  timeline: "时间线",
  character: "角色",
  iteration: "迭代",
  harness: "装配",
  mini: "迷你",
  tiangong: "天宫",
  manju: "漫剧",
  drama: "漫剧",
  remake: "翻拍",
  short: "短剧",
  shotlist: "分镜表",
  builder: "构建器",
  site: "站点",
  architecture: "架构",
  slop: "注水内容",
  stop: "去除",
  vault: "库",
  governance: "治理",
  contest: "赛事",
  orchestrator: "编排器",
  marketing: "营销",
  shortdrama: "短剧",
  imagegen: "生图",
  image2: "Image2",
  metadata: "元数据",
  share: "分享",
  miniapp: "小程序",
  self: "自",
  model: "建模",
  practices: "实践",
  fleet: "集群",
  ssh: "SSH",
  planner: "规划器",
  upload: "上传",
  fallback: "降级",
  transfer: "迁移",
  animate: "Animate",
  fruit: "水果",
  tk: "TikTok",
  sd2: "SD2",
  ux: "UX",
  ui: "UI",
  mcp: "MCP",
  rpa: "RPA",
  seo: "SEO",
  gpt: "GPT",
  runninghub: "RunningHub",
  hyperframes: "HyperFrames",
  openclaw: "OpenClaw",
  comfyui: "ComfyUI",
  figma: "Figma",
  nextjs: "Next.js",
};

function hasChinese(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const CJK_CHAR = /[\u3400-\u9fff]/;

/** 只有两侧都是汉字时才去掉空格：中文词连写，中英之间保留空格便于阅读。 */
function joinTokens(tokens: string[]): string {
  return tokens
    .map((token, index) => {
      if (index === 0) return token;
      const prev = tokens[index - 1] ?? "";
      const prevEndsCjk = CJK_CHAR.test(prev.charAt(prev.length - 1));
      const curStartsCjk = CJK_CHAR.test(token.charAt(0));
      return prevEndsCjk && curStartsCjk ? token : ` ${token}`;
    })
    .join("");
}

/** 归一化已有标题里中文字之间的多余空格。 */
export function normalizeCjkSpacing(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .reduce<string[]>((acc, token) => {
      const prev = acc[acc.length - 1];
      if (prev && CJK_CHAR.test(prev.charAt(prev.length - 1)) && CJK_CHAR.test(token.charAt(0))) {
        acc[acc.length - 1] = prev + token;
      } else {
        acc.push(token);
      }
      return acc;
    }, [])
    .join(" ");
}

/** 常见复合技能名人工校准，避免逐词翻译产生“网站 To 视频”这类生硬结果。 */
export const SKILL_NAME_ZH_OVERRIDES: Record<string, string> = {
  "website-to-video": "网站转视频",
  "website-quality-router": "网站质量路由",
  "website-product-router": "网站产品路由",
  "web-typography": "网页字体排版",
  "ux-writing": "UX 文案",
  "ux-heuristics": "UX 启发式评估",
  "top-design": "顶级网页设计",
  "motion-graphics": "动效图形",
  "product-launch-video": "产品发布视频",
  "faceless-explainer": "无脸解说视频",
  "talking-head-recut": "口播视频重剪",
  "xhs-note-creator": "小红书笔记创作",
  "xhs-original-image-publisher": "小红书原创图片发布",
  "xhs-traffic-aesthetic-guard": "小红书流量审美护栏",
  "douyin-video-selection": "抖音视频选题",
  "douyin-video-production": "抖音视频制作",
  "douyin-publish-operator": "抖音发布执行",
  "kuaishou-video-scout": "快手视频选题",
  "kuaishou-video-maker": "快手视频制作",
  "prompt-skill-router": "提示词技能路由",
  "skill-governance": "技能治理",
  "skill-optimizer": "技能优化器",
  "runninghub-workflow-api": "RunningHub 工作流 API",
  "gpt-tasteskill": "GPT Taste Skill",
  "gpt-taste": "GPT Taste Skill",
  "stop-slop": "去除 AI 注水内容",
  "site-architecture": "站点架构",
  "shotlist-builder": "分镜表构建器",
  "short-drama-remake-script": "短剧翻拍剧本",
  "xiaohongshu-ops": "小红书运营",
  "xianyu-product-publisher": "闲鱼商品发布器",
  "xianyu-ai-demand-radar": "闲鱼 AI 需求雷达",
  "win-mac-codex-bridge": "Win/Mac Codex 桥接",
  "wechat-redraw-word-sender": "微信重绘文案发送器",
  "wechat-article-extractor": "微信文章提取器",
  "sd2.5dolaskill": "SD2 Dola 技能",
  "product-marketing": "产品营销",
  "seedance2-a-contest-orchestrator": "Seedance2 赛事编排",
  "mx-shortdrama-02-source-timeline": "漫剧源片时间线",
  "mj-tiangong-imagegen": "天宫漫剧生图",
  "sd2.5-tiangong-manju": "SD2.5 天宫漫剧",
  "sd2-video-generation": "SD2 视频生成",
  "web-motion-champion": "网页动效优选",
  "security-threat-model": "安全威胁建模",
  "security-best-practices": "安全最佳实践",
  "self-media-skill-route": "自媒体技能路由",
  "server-fleet-ssh-router": "服务器集群 SSH 路由",
  "website-metadata-share-audit": "网站元数据分享审计",
  "web-miniapp-product-router": "网页小程序商品路由",
  "web-visual-motion-planner": "网页视觉动效规划器",
  "runninghub-fruit-commerce-video": "RunningHub 水果电商视频",
  "runninghub-canvas-media-upload": "RunningHub 画布媒体上传",
  "runninghub-canvas-fallback": "RunningHub 画布降级",
  "runninghub-animate-motion-transfer": "RunningHub Animate 动效迁移",
  "runninghub-image2-image": "RunningHub Image2 图片转图片",
  "tk-subtitles": "TikTok 字幕",
};

/** 将英文目录名变成稳定的中文显示名，专有缩写保持原样。 */
export function humanizeSkillName(dir: string): string {
  const override = SKILL_NAME_ZH_OVERRIDES[dir];
  if (override) return override;
  return joinTokens(
    dir
      .replace(/[._]+/g, "-")
      .split("-")
      .filter(Boolean)
      .map((token) => TOKEN_ZH[token.toLowerCase()] ?? titleCase(token))
  );
}

/**
 * 英文标题里必须保持大写形态的缩写/品牌词。
 * 键是 slug token（小写），值是展示形态。
 */
const TOKEN_EN: Record<string, string> = {
  ai: "AI",
  api: "API",
  cdp: "CDP",
  cli: "CLI",
  comfyui: "ComfyUI",
  figma: "Figma",
  github: "GitHub",
  gpt: "GPT",
  hyperframes: "HyperFrames",
  image2: "Image2",
  mcp: "MCP",
  nextjs: "Next.js",
  openclaw: "OpenClaw",
  pdf: "PDF",
  rpa: "RPA",
  runninghub: "RunningHub",
  seedance: "Seedance",
  seo: "SEO",
  sop: "SOP",
  ui: "UI",
  ux: "UX",
  xhs: "XHS",
  // 中文平台/工具的罗马化品牌，按品牌写法首字大写
  douyin: "Douyin",
  kuaishou: "Kuaishou",
  xianyu: "Xianyu",
  xiaohongshu: "Xiaohongshu",
  bilibili: "Bilibili",
  wechat: "WeChat",
  codex: "Codex",
};

/** 标题中间的虚词保持小写（首词除外）。 */
const TITLE_STOPWORDS = new Set(["to", "and", "of", "the", "for", "in", "on", "with", "a", "an", "or"]);

/** 复合技能名的英文人工校准，避免机器断词产生奇怪结果。 */
const SKILL_NAME_EN_OVERRIDES: Record<string, string> = {
  "gpt-tasteskill": "GPT Taste Skill",
  "gpt-taste": "GPT Taste Skill",
  "win-mac-codex-bridge": "Win/Mac Codex Bridge",
  "ai-video-novel-to-script": "AI Video Novel to Script",
  "ai-video-asset-production": "AI Video Asset Production",
  "ai-video-fundamentals-skill": "AI Video Fundamentals Skill",
  "ai-video-skill-route-index": "AI Video Skill Route Index",
  "website-to-video": "Website to Video",
  "novel-to-tiangong-manju": "Novel to Tiangong Manju",
  // 版本号型目录名：sd2.5skill / sd2.5-tiangong-manju
  // 若走通用分词会被切成 "Sd2 5skill"，这里直接给可读标题。
  "sd2-5skill": "Seedance 2.5 Prompt Compiler",
  "sd2-5-tiangong-manju": "SD2.5 Tiangong Manju",
  "sd2-5dolaskill": "Seedance 2.5 Dola Skill",
  "sd2-5-kidswear-commerce": "SD2.5 Kidswear Commerce",
  "sd2-5-guofeng-skill": "SD2.5 Guofeng Skill",
  // 目录名本身是中文时，英文标题必须有对应译名，否则会原样输出中文
  "归档skill": "Archive Skill",
  "刺猬星球": "Ciwei Star Method",
};

/**
 * 把 slug / 目录名规范成可读的英文标题。
 * 例：xiaohongshu-ops -> "Xiaohongshu Ops"；ai-video-fundamentals-skill -> "AI Video Fundamentals Skill"。
 */
export function englishizeSkillName(dir: string): string {
  const override = SKILL_NAME_EN_OVERRIDES[dir.replace(/[._]+/g, "-")];
  if (override) return override;

  // 版本号小数点（sd2.5skill / gpt-4.1）不能被当成分隔符，先临时保护，
  // 否则会被切成 "Sd2 5skill" 这种断掉的标题。
  const guarded = dir.replace(/(\d)\.(\d)/g, "$1\x00$2");

  // 同时兼容目录名（xiaohongshu-ops）与已带空格的英文名（ai video fundamentals）
  const tokens = guarded
    .split(/[-\s._]+/)
    .filter(Boolean);

  return tokens
    .map((token, index) => {
      const key = token.toLowerCase();
      if (TOKEN_EN[key]) return TOKEN_EN[key];
      if (index > 0 && TITLE_STOPWORDS.has(key)) return key;
      return titleCase(token);
    })
    .join(" ")
    .replace(/\x00/g, ".");
}

export interface SkillBilingualMetaInput {
  dir: string;
  name: string;
  description: string;
  raw: string;
  nameZh?: string;
  nameEn?: string;
  descriptionZh?: string;
  descriptionEn?: string;
  contentZh?: string;
  contentEn?: string;
}

export interface SkillBilingualMeta {
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
  contentZh: string;
  contentEn: string;
}

export function buildSkillBilingualMeta(input: SkillBilingualMetaInput): SkillBilingualMeta {
  // 英文标题必须可读：slug（xiaohongshu-ops）要规范成 "Xiaohongshu Ops"，
  // 不能直接把目录名/原始 slug 当标题显示。
  const titleEn =
    input.nameEn ||
    (hasChinese(input.name)
      ? englishizeSkillName(input.dir)
      : englishizeSkillName(input.name || input.dir));
  const titleZh = input.nameZh || (hasChinese(input.name) ? input.name : humanizeSkillName(input.dir));
  const descriptionEn = input.descriptionEn || input.description;
  const descriptionZh =
    input.descriptionZh ||
    (hasChinese(input.description)
      ? input.description
      : `${titleZh}：${input.description}`);

  const contentEn = input.contentEn || input.raw;
  const contentZh =
    input.contentZh ||
    (hasChinese(input.raw)
      ? input.raw
      : `# ${titleZh}\n\n## 中文说明\n\n${descriptionZh}\n\n> 执行正文保留 English 原文，以确保 API、MCP、RPA、UI、UX、SEO、GPT、Seedance 等缩写、代码、命令和约束准确可执行。需要查看原始英文正文时，点击右上角 English。\n\n## English original\n\n${contentEn}`);

  return { titleZh, titleEn, descriptionZh, descriptionEn, contentZh, contentEn };
}

export function localizedSkillTitle(
  prompt: { title: string; titleZh?: string | null; titleEn?: string | null },
  locale: string
): string {
  return locale === "en" ? prompt.titleEn || prompt.title : prompt.titleZh || prompt.title;
}

export function localizedSkillDescription(
  prompt: { description?: string | null; descriptionZh?: string | null; descriptionEn?: string | null },
  locale: string
): string | null {
  return locale === "en"
    ? prompt.descriptionEn || prompt.description || null
    : prompt.descriptionZh || prompt.description || null;
}

export function localizedSkillContent(
  prompt: { content: string; contentZh?: string | null; contentEn?: string | null },
  locale: string
): string {
  return locale === "en" ? prompt.contentEn || prompt.content : prompt.contentZh || prompt.content;
}
