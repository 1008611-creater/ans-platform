import type { VibeLocale, VibeText } from "./ans-practices";

export interface IntentTermPill {
  slug: string;
  label: VibeText;
  hint: VibeText;
  appendText: VibeText;
}

export interface IntentClusterMatch {
  id: "agri" | "web" | "aigc" | "backend" | "skill" | "general";
  badge: VibeText;
  clarifyingQuestion: VibeText;
  terms: readonly IntentTermPill[];
}

const INTENT_CLUSTERS: readonly {
  id: IntentClusterMatch["id"];
  keywords: RegExp;
  badge: VibeText;
  clarifyingQuestion: VibeText;
  terms: readonly IntentTermPill[];
}[] = [
  {
    id: "agri",
    keywords: /农|遥感|病虫害|温室|土壤|灌溉|小麦|玉米|ndvi|agri|crop|soil|greenhouse|drone/i,
    badge: {
      zh: "🌾 识别为：智慧农业 / 农客松工程场景",
      en: "🌾 Detected: Smart Agriculture / AgriHackathon Scenario",
    },
    clarifyingQuestion: {
      zh: "动手前确认：数据源是实拍叶片图像、多光谱 NDVI 指标还是模拟传感器流？未提供的实测阈值将标为「待校准」。",
      en: "Before running: Is the input leaf imagery, multispectral NDVI indices, or simulated sensor streams? Unverified thresholds will be marked [To Calibrate].",
    },
    terms: [
      {
        slug: "grounding",
        label: { zh: "依据约束 Grounding", en: "Grounding" },
        hint: { zh: "农艺处方必须绑定输入指标，禁止编造药剂剂量", en: "Bind prescriptions to input metrics; never invent dosages" },
        appendText: {
          zh: "所有诊断结论与农艺处方必须做依据约束（Grounding），仅引用输入数据中的指标，缺失的田间实测参数标为「待实测补充」。",
          en: "Apply strict Grounding to all diagnoses and prescriptions; cite input metrics only and mark missing field parameters as [Pending Field Data].",
        },
      },
      {
        slug: "structured-output",
        label: { zh: "结构化输出 Structured Output", en: "Structured Output" },
        hint: { zh: "固定输出病害等级、置信度与防治动作 JSON/表格", en: "Output fixed JSON/table for severity, confidence, and action" },
        appendText: {
          zh: "使用结构化输出（Structured Output）：固定展示【地块/样本编号、核心异常指标、风险等级、建议农事动作、复查时间】五列。",
          en: "Use Structured Output with 5 fixed columns: Plot/Sample ID, Anomaly Metric, Risk Level, Recommended Action, and Re-check Window.",
        },
      },
      {
        slug: "data-validation",
        label: { zh: "数据校验 Data Validation", en: "Data Validation" },
        hint: { zh: "拦截超出物理范围的温湿度或 NDVI 异常值", en: "Reject out-of-range temperature, moisture, or NDVI values" },
        appendText: {
          zh: "加入输入数据校验（Data Validation）：对含水率（0–100%）、NDVI（-1.0 至 1.0）做边界检查，越界时提示异常传感器读数。",
          en: "Add Data Validation for moisture (0–100%) and NDVI (-1.0 to 1.0), surfacing sensor anomaly warnings when out of bounds.",
        },
      },
      {
        slug: "smoke-test",
        label: { zh: "冒烟测试 Smoke Test", en: "Smoke Test" },
        hint: { zh: "用正常/干旱/病害三组样本验证端到端跑通", en: "Verify normal, drought, and disease samples end to end" },
        appendText: {
          zh: "内置 3 组冒烟测试样本（正常灌浆期、轻度缺水、叶斑病高发）供评委一键切换演练。",
          en: "Include 3 smoke-test presets (normal growth, mild drought, leaf-spot alert) for one-click judge walkthroughs.",
        },
      },
    ],
  },
  {
    id: "web",
    keywords: /网站|网页|简历|作品集|首页|落地页|前端|3d|canvas|bento|website|portfolio|resume|landing|ui/i,
    badge: {
      zh: "✨ 识别为：高质感网页 / 3D 作品集场景",
      en: "✨ Detected: High-Craft Web / 3D Portfolio Scenario",
    },
    clarifyingQuestion: {
      zh: "动手前确认：首屏最核心的 1 个行动按钮是什么？没有真实配图或项目链接的区块将用诚实占位符替代。",
      en: "Before running: What is the single primary CTA above the fold? Sections without real assets will use honest placeholders.",
    },
    terms: [
      {
        slug: "hero-section",
        label: { zh: "首屏主视觉 Hero Section", en: "Hero Section" },
        hint: { zh: "一屏只讲清一件事 + 1 个主行动按钮", en: "One clear message + 1 primary CTA above the fold" },
        appendText: {
          zh: "首屏主视觉（Hero Section）只保留一句话核心价值定位、真实代表作预览与 1 个主行动按钮，拒绝空洞口号。",
          en: "Keep the Hero Section focused on a single value statement, a real work preview, and 1 primary CTA without generic slogans.",
        },
      },
      {
        slug: "style-bento",
        label: { zh: "便当盒布局 Bento Grid", en: "Bento Grid" },
        hint: { zh: "用主次分明的不对称网格取代千篇一律的四宫格", en: "Use asymmetric hierarchy instead of uniform 4-card grids" },
        appendText: {
          zh: "核心亮点采用主次分明的便当盒布局（Bento Grid），主卡占双倍面积展示可交互核心产物，避免同构卡片堆砌。",
          en: "Use an asymmetric Bento Grid where the primary card spans double width to showcase the live interactive artifact.",
        },
      },
      {
        slug: "responsive",
        label: { zh: "响应式断点 Responsive", en: "Responsive Breakpoints" },
        hint: { zh: "桌面端多栏、移动端单栏且按钮触控区 >= 44px", en: "Multi-column on desktop, single-column on mobile with >=44px targets" },
        appendText: {
          zh: "严格适配桌面端（1280px）与移动端（390px）响应式断点，移动端自动折叠为单列且可点击区域不小于 44×44px。",
          en: "Support 1280px desktop and 390px mobile breakpoints, collapsing to a single column on mobile with >=44x44px tap targets.",
        },
      },
      {
        slug: "skeleton",
        label: { zh: "三态与空状态 Empty & Loading", en: "Empty & Loading States" },
        hint: { zh: "补齐加载态、空结果重置按钮与错误提示", en: "Include loading, empty-reset, and error feedback states" },
        appendText: {
          zh: "补齐筛选/交互的加载态、空状态（带一键重置筛选按钮）与错误反馈。",
          en: "Provide complete loading, empty (with one-click filter reset), and error states.",
        },
      },
    ],
  },
  {
    id: "aigc",
    keywords: /视频|短剧|漫剧|分镜|画布|运镜|字幕|口播|封面|角色|infinite-canvas|hypit|video|storyboard|seed/i,
    badge: {
      zh: "🎬 识别为：AIGC 视频分镜 / 自媒体流水线场景",
      en: "🎬 Detected: AIGC Storyboard / Media Pipeline Scenario",
    },
    clarifyingQuestion: {
      zh: "动手前确认：画面比例是 16:9 横屏还是 9:16 竖屏？需要固定几个核心角色的外观锚点？",
      en: "Before running: Is the aspect ratio 16:9 landscape or 9:16 vertical? How many character appearance anchors need to be locked?",
    },
    terms: [
      {
        slug: "aspect-ratio",
        label: { zh: "画幅比例 Aspect Ratio", en: "Aspect Ratio" },
        hint: { zh: "先锁 16:9 或 9:16 画幅与安全字幕区", en: "Lock 16:9 or 9:16 aspect ratio and subtitle safe zone" },
        appendText: {
          zh: "明确画幅比例（16:9 横屏或 9:16 竖屏），底部预留 18% 字幕安全区，防止主体被裁切。",
          en: "Lock the aspect ratio (16:9 or 9:16) and reserve an 18% bottom safe zone for subtitles.",
        },
      },
      {
        slug: "context-engineering",
        label: { zh: "角色锚点 Character Seed", en: "Character Consistency" },
        hint: { zh: "固定角色服饰、发色、光影词，跨分镜复用", en: "Lock attire, hair, and lighting descriptors across shots" },
        appendText: {
          zh: "建立全局角色与美术设定卡（固定服饰、面部特征、色温与材质关键词），在每一幕分镜提示词前缀自动复用。",
          en: "Define a global character & art bible (attire, facial traits, color temperature) and prepend it to every shot prompt.",
        },
      },
      {
        slug: "streaming-response",
        label: { zh: "分幕落盘 Per-Shot Chunking", en: "Per-Shot Chunking" },
        hint: { zh: "按幕独立生成与微调，不满意只重跑单幕", en: "Generate and edit per shot so single-shot retries stay cheap" },
        appendText: {
          zh: "按四幕分镜独立结构化输出（含景别、运镜、画面 Prompt、台词与时长），支持单幕独立修改而不重跑全剧。",
          en: "Structure output per shot (framing, camera move, visual prompt, dialogue, duration) to allow single-shot edits.",
        },
      },
      {
        slug: "ai-evals",
        label: { zh: "去 AI 味台词 De-Slop Script", en: "De-Slop Dialogue" },
        hint: { zh: "删掉排比句与爹味说教，保留口语呼吸感", en: "Strip robotic parallelisms and keep natural spoken rhythm" },
        appendText: {
          zh: "台词与旁白启用 ans-tone-guard 规则：禁止「不仅…而且…」排比腔与空洞金句，全部改为短句自然口语。",
          en: "Apply ans-tone-guard to dialogue and narration: ban robotic parallelisms and keep sentences crisp and conversational.",
        },
      },
    ],
  },
  {
    id: "backend",
    keywords: /接口|数据库|登录|权限|鉴权|队列|缓存|部署|api|auth|sql|prisma|webhook|token/i,
    badge: {
      zh: "🛡️ 识别为：全栈接口 / 数据与权限边界场景",
      en: "🛡️ Detected: Full-Stack API / Auth & Data Boundary Scenario",
    },
    clarifyingQuestion: {
      zh: "动手前确认：哪些操作必须登录或扣减积分？服务端需做幂等与权限校验，不能只靠前端隐藏按钮。",
      en: "Before running: Which actions require auth or credit deduction? Server routes must enforce idempotency and authorization.",
    },
    terms: [
      {
        slug: "idempotency",
        label: { zh: "幂等性 Idempotency", en: "Idempotency" },
        hint: { zh: "连点两次提交不会重复扣积分或生成两条脏数据", en: "Double clicks never double-charge or create duplicate rows" },
        appendText: {
          zh: "写接口必须保证幂等性（Idempotency）：连续点击或网络重试时仅执行一次有效扣费与落库。",
          en: "Enforce Idempotency on write endpoints so duplicate clicks or retries execute and charge only once.",
        },
      },
      {
        slug: "authorization",
        label: { zh: "权限控制 Authorization", en: "Authorization" },
        hint: { zh: "服务端校验资源归属，不只靠前端隐藏按钮", en: "Verify resource ownership on the server, not just in UI" },
        appendText: {
          zh: "在服务端路由强制校验用户身份与资源归属权（Authorization），未登录访客提供只读预览沙箱。",
          en: "Enforce server-side Authorization and resource ownership while keeping a read-only preview mode for guests.",
        },
      },
      {
        slug: "transaction",
        label: { zh: "数据库事务 Transaction", en: "Database Transaction" },
        hint: { zh: "扣积分与写记录同生共死，失败自动回滚", en: "Charge credits and write records atomically with rollback" },
        appendText: {
          zh: "涉及余额/状态变更的操作必须包裹在数据库事务（Transaction）中，任一步失败即完整回滚。",
          en: "Wrap balance and state mutations in a database Transaction so partial failures roll back cleanly.",
        },
      },
      {
        slug: "rate-limit",
        label: { zh: "速率限制 Rate Limit", en: "Rate Limit" },
        hint: { zh: "防止恶意刷接口耗尽大模型额度", en: "Prevent quota exhaustion from rapid automated requests" },
        appendText: {
          zh: "关键生成接口加入速率限制（Rate Limit）与超时降级提示，返回明确的重试等待秒数。",
          en: "Apply Rate Limiting and timeout fallbacks on generation routes with explicit retry-after feedback.",
        },
      },
    ],
  },
];

const DEFAULT_CLUSTER: IntentClusterMatch = {
  id: "general",
  badge: {
    zh: "🧭 ANS 意图转写器 · 常用需求词条推荐",
    en: "🧭 ANS Intent Bridge · Recommended Prompt Terms",
  },
  clarifyingQuestion: {
    zh: "建议补充：这个产物给谁用、哪 1 个核心交互必须跑通、哪些虚构数据不能编造？",
    en: "Tip: Specify who uses this, which single core interaction must work, and what data must never be fabricated.",
  },
  terms: [
    {
      slug: "structured-output",
      label: { zh: "结构化输出 Structured Output", en: "Structured Output" },
      hint: { zh: "明确输出 HTML 画布、表格还是代码文件", en: "Specify HTML canvas, table, or code file output" },
      appendText: {
        zh: "请输出可直接交互预览的单文件 HTML5 产物（含完整内联样式、真实交互状态与一键重置按钮）。",
        en: "Output a self-contained interactive HTML5 artifact with inline styles, real interactive states, and a reset button.",
      },
    },
    {
      slug: "grounding",
      label: { zh: "依据约束 Grounding", en: "Grounding" },
      hint: { zh: "只用可核验事实，缺失项标「待补充」", en: "Use verified facts only; mark missing items [TBD]" },
      appendText: {
        zh: "严格遵守依据约束（Grounding）：仅使用已提供的真实信息，未提供的价格/指标/外链一律标为「待补充」，不要自行编造。",
        en: "Follow strict Grounding: use provided facts only and mark unverified prices, metrics, or links as [TBD].",
      },
    },
    {
      slug: "smoke-test",
      label: { zh: "验收标准 Acceptance Check", en: "Acceptance Check" },
      hint: { zh: "附上 3 条打开浏览器就能核对的完成标准", en: "Attach 3 browser-verifiable completion checks" },
      appendText: {
        zh: "交付时请附带 3 条可在预览画布直接点击验证的冒烟测试（Smoke Test）检查项。",
        en: "Include 3 smoke-test checks that can be verified directly in the live preview canvas.",
      },
    },
    {
      slug: "ai-evals",
      label: { zh: "去 AI 味 ans-tone-guard", en: "De-Slop ans-tone-guard" },
      hint: { zh: "禁用空洞套话、大词排比与同构发光卡片墙", en: "Ban filler intros, pompous buzzwords, and uniform neon grids" },
      appendText: {
        zh: "启用 ans-tone-guard 规范：删除空洞套话与生造黑话，界面遵循主次分明的编辑部信息层级。",
        en: "Apply ans-tone-guard: strip filler prose and buzzwords, and use clear editorial visual hierarchy.",
      },
    },
  ],
};

export function detectIntentAndMatchTerms(input: string): IntentClusterMatch {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_CLUSTER;
  for (const cluster of INTENT_CLUSTERS) {
    if (cluster.keywords.test(trimmed)) return cluster;
  }
  return DEFAULT_CLUSTER;
}

/**
 * Upgrades a casual 1-sentence request into a 4-part ANS Brief + ans-tone-guard check.
 */
export function upgradeToStructuredBrief(
  rawInput: string,
  locale: VibeLocale,
  goalLabel?: string,
): string {
  const clean = rawInput.trim() || (locale === "zh" ? "构建一个可交互的项目原型与演示看板" : "Build an interactive project prototype and demo dashboard");
  const cluster = detectIntentAndMatchTerms(clean);
  if (locale === "en") {
    return [
      `【1. Goal & Target Audience】`,
      `${clean}${goalLabel ? ` (Track: ${goalLabel})` : ""}. Focus on a single clear primary workflow that a reviewer or user can complete in 30 seconds.`,
      ``,
      `【2. Scope & Non-Goals】`,
      `Build the core interactive view, state feedback (idle / active / completed), and 3 built-in sample presets first. Do not add fake login walls or dead buttons.`,
      ``,
      `【3. Inputs & Grounding Rules】`,
      `${cluster.terms[0].appendText.en} ${cluster.terms[1].appendText.en}`,
      ``,
      `【4. Acceptance Criteria & De-Slop Guardrail (ans-tone-guard)】`,
      `- ${cluster.terms[2].appendText.en}`,
      `- Strip AI clichés, empty slogans, and uniform 4-card neon grids; lead with verifiable metrics and runnable interactions.`,
    ].join("\n");
  }
  return [
    `【1. 目标与受众】`,
    `${clean}${goalLabel ? `（立项方向：${goalLabel}）` : ""}。聚焦 1 条最核心的交互主路径，让评委或用户在 30 秒内看懂并跑通。`,
    ``,
    `【2. 保留范围与不做项】`,
    `优先交付可实时点击的核心画布、完整的状态反馈（默认/运行中/已完成）与 3 组内置演练样本；不堆砌无功能的假菜单或空按钮。`,
    ``,
    `【3. 输入素材与依据约束】`,
    `${cluster.terms[0].appendText.zh} ${cluster.terms[1].appendText.zh}`,
    ``,
    `【4. 可验证交付标准（含 ans-tone-guard 去 AI 味门禁）】`,
    `- ${cluster.terms[2].appendText.zh}`,
    `- 启用 ans-tone-guard：删掉宏大口号与同构发光卡片墙，所有文案直奔「输入数据 → 处理机制 → 可观察结果」。`,
  ].join("\n");
}

export interface RoadshowAndSocialPack {
  roadshowPitch: string;
  readmeMarkdown: string;
  socialPostDraft: string;
  cleanedSummary: string;
}

const SLOP_BUZZWORDS = /在当今数字化时代，?|随着 AI 的飞速发展，?|旨在|全方位|生态闭环|赋能|抓手|闭环|生态位|颠覆性|史诗级|圣殿|超新星爆发|全维度|极致丝滑|无缝衔接/g;

export function stripAiBuzzwords(raw: string): string {
  return raw.replace(SLOP_BUZZWORDS, "").replace(/\s+/g, " ").trim();
}

/**
 * Generates de-slopped roadshow pitch, GitHub README, and Xiaohongshu/Bilibili draft from a creator's project form.
 */
export function generateRoadshowAndSocialPack(
  draft: { title: string; summary: string; deliverables: string | readonly string[]; category: string },
  locale: VibeLocale = "zh",
): RoadshowAndSocialPack {
  const cleanTitle = (draft.title.trim() || "ANS 可复现 AI 工程项目").replace(SLOP_BUZZWORDS, "").trim();
  const rawSummary = draft.summary.trim() || "基于 ANS 工作台构建的可交互工程产物，支持实时沙箱预览与源码复现。";
  const cleanedSummary = rawSummary.replace(SLOP_BUZZWORDS, "").replace(/\s+/g, " ").trim();
  const rawItems = Array.isArray(draft.deliverables)
    ? draft.deliverables
    : String(draft.deliverables).split("\n");
  const items = rawItems
    .map(s => s.trim())
    .filter(Boolean);
  const delivList = items.length
    ? items
    : ["可独立运行的 HTML5/全栈交互原型", "结构化输入校验与 3 组内置冒烟测试样本", "完整复现指南与 Prompt 架构说明"];

  if (locale === "en") {
    return {
      cleanedSummary,
      roadshowPitch: [
        `[60s Roadshow Pitch · Checked by ans-tone-guard]`,
        `1. Problem & Real Scenario (15s):`,
        `When handling ${cleanTitle}, manual workflows or raw LLM prompts often invent unverified parameters and require full-pipeline reruns for minor edits.`,
        `2. Core Mechanism (25s):`,
        `${cleanedSummary} We separated deterministic validation scripts from AI semantic judgment, adding a local preview gate before final output.`,
        `3. Verifiable Deliverables (20s):`,
        delivList.map((item, i) => `   (${i + 1}) ${item}`).join("\n"),
        `All artifacts can be tested live in the ANS Sandbox with 3 built-in smoke-test presets.`,
      ].join("\n"),
      readmeMarkdown: [
        `# ${cleanTitle}`,
        ``,
        `> ${cleanedSummary}`,
        ``,
        `## 1. What This Project Solves`,
        `- **Target Scenario**: Built for ${draft.category} workflows requiring verifiable outputs rather than generic chat replies.`,
        `- **Engineering Boundary**: Deterministic input checks run in code; unverified external facts are explicitly marked \`[TBD]\`.`,
        ``,
        `## 2. Deliverables`,
        ...delivList.map(item => `- [x] ${item}`),
        ``,
        `## 3. Quick Verification (Smoke Test)`,
        `1. Open the live preview sandbox URL.`,
        `2. Switch across the 3 built-in test presets and verify state transitions.`,
        `3. Export the standalone artifact or inspect the source tree.`,
      ].join("\n"),
      socialPostDraft: [
        `【标题备选 1】不吹概念！我用 ANS 搭了一个可复现的「${cleanTitle}」`,
        `【标题备选 2】实测省一半 Token：把「${cleanTitle}」拆成确定性脚本 + AI 工作流`,
        ``,
        `很多时候直接让大模型做任务，不是编造参数就是改一处崩全局。`,
        `这次用 ANS 的产品化 Skill 思路重构了「${cleanTitle}」：`,
        `1️⃣ 核心做法：${cleanedSummary}`,
        `2️⃣ 真实交付物：`,
        ...delivList.map(item => `• ${item}`),
        `3️⃣ 防翻车设计：能用代码校验的绝不让 AI 猜，先在本地沙箱预览确认再导出成品。`,
        ``,
        `👉 在线沙箱实测与复现指南已放进 ANS 项目广场，欢迎直接跑冒烟测试！`,
        `#VibeCoding #AI工作流 #Agent开发 #ANS平台 #开源项目`,
      ].join("\n"),
    };
  }

  return {
    cleanedSummary,
    roadshowPitch: [
      `【60 秒路演逐字稿 · 已过 ans-tone-guard 去 AI 味校验】`,
      `1. 痛点与真实场景（前 15 秒）：`,
      `在做「${cleanTitle}」时，如果直接裸调大模型，最容易遇到两个问题：一是模型容易编造未核实的参数，二是改一个小细节就得整条链路重跑。`,
      `2. 核心机制与工程边界（中间 25 秒）：`,
      `${cleanedSummary} 我们把固定格式校验剥离给确定性代码，让 AI 只负责语义判断，并在生成最终结果前加了一道本地实时预览门禁。`,
      `3. 可现场核验的交付物（最后 20 秒）：`,
      delivList.map((item, i) => `   （${i + 1}）${item}`).join("\n"),
      `评委现在点击预览链接，可以直接切换 3 组内置样本完成端到端冒烟测试。`,
    ].join("\n"),
    readmeMarkdown: [
      `# ${cleanTitle}`,
      ``,
      `> ${cleanedSummary}`,
      ``,
      `## 一、解决什么真实问题`,
      `- **适用场景**：面向 \`${draft.category}\` 赛道的真实任务交付，拒绝空洞套话，所有结论绑定输入数据（Grounding）。`,
      `- **工程与安全边界**：输入参数先经确定性规则校验；未提供的实测数据统一标为「待补充」，不伪造外部结果。`,
      ``,
      `## 二、核心交付清单`,
      ...delivList.map(item => `- [x] ${item}`),
      ``,
      `## 三、30 秒冒烟测试（Smoke Test）`,
      `1. 打开项目在线沙箱预览地址；`,
      `2. 依次点击内置的正常态、边界态与异常态样本，核对界面反馈；`,
      `3. 一键导出单文件产物或查看源码目录树。`,
    ].join("\n"),
    socialPostDraft: [
      `【标题备选 1】不讲空话！用 ANS 做了一个可直接跑的「${cleanTitle}」`,
      `【标题备选 2】告别抽卡返工：我是怎么把「${cleanTitle}」拆成稳定 AI 工作流的`,
      ``,
      `以前让 AI 生成整套方案，经常给一堆看着热闹但没法落地的套话，改一行还得重头跑。`,
      `这次按 ANS 的「确定性脚本 + 分片预览」思路把「${cleanTitle}」跑通了：`,
      ``,
      `🔹 一句话看懂：${cleanedSummary}`,
      `🔹 实际产出的交付物：`,
      ...delivList.map(item => `  • ${item}`),
      `🔹 为什么更稳：把数据校验和排版固定在代码里，AI 只管核心判断，还能在沙箱里单步预览微调。`,
      ``,
      `在线可交互沙箱和完整 Prompt 已经发在 ANS 项目广场，可以直接点进去试跑 👇`,
      `#VibeCoding #AI工程化 #Agent工作流 #ANS项目广场 #独立开发`,
    ].join("\n"),
  };
}

export interface CoverStudioPreset {
  id: "dark-tech" | "editorial" | "hackathon";
  label: VibeText;
  accent: string;
  bg: string;
  fg: string;
  sub: string;
  tagBg: string;
  tagFg: string;
}

export const COVER_STUDIO_PRESETS: readonly CoverStudioPreset[] = [
  {
    id: "editorial",
    label: {
      zh: "🎨 外封 · oil 大字插画海报 Skill (点进去前 · 列表卡片)",
      en: "🎨 Outer · oil Editorial Poster Skill (Before Click · Card)",
    },
    accent: "#d95d39",
    bg: "#f5f2eb",
    fg: "#18181b",
    sub: "#3f3f46",
    tagBg: "#18181b",
    tagFg: "#f5f2eb",
  },
  {
    id: "dark-tech",
    label: {
      zh: "🌌 内封 · GitGlow 3D 界面透视 Skill (点进去后 · 详情主图)",
      en: "🌌 Inner · GitGlow 3D UI Spotlight Skill (After Click · Detail)",
    },
    accent: "#10b981",
    bg: "#090f1a",
    fg: "#f8fafc",
    sub: "#94a3b8",
    tagBg: "#064e3b",
    tagFg: "#6ee7b7",
  },
  {
    id: "hackathon",
    label: {
      zh: "🏆 赛事 · 神农金绿双模路演封面 (16:9)",
      en: "🏆 Hackathon · Roadshow Dual-Mode Cover (16:9)",
    },
    accent: "#f59e0b",
    bg: "#052e2b",
    fg: "#ecfdf5",
    sub: "#a7f3d0",
    tagBg: "#78350f",
    tagFg: "#fde68a",
  },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates a self-contained 16:9 SVG typography layout preview for roadshow drafts:
 * - "editorial" (light paper layout wireframe)
 * - "dark-tech" (dark console layout wireframe)
 * - "hackathon" (hackathon roadshow layout wireframe)
 */
export function buildCoverStudioSvg(
  presetId: CoverStudioPreset["id"],
  title: string,
  summary: string,
  categoryBadge: string,
): string {
  const preset = COVER_STUDIO_PRESETS.find(item => item.id === presetId) ?? COVER_STUDIO_PRESETS[0];
  const cleanTitle = (title.trim() || "ANS 可复现 AI 工程工作流").replace(SLOP_BUZZWORDS, "");
  const line1 = cleanTitle.slice(0, 13);
  const line2 = cleanTitle.slice(13, 26);
  const shortSummary = (summary.trim() || "Deterministic Script + Grounded Agent + Live Preview Gate").slice(0, 42);
  const badge = (categoryBadge.trim() || "ANS VERIFIED WORKFLOW").toUpperCase();

  if (preset.id === "editorial") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <pattern id="grid-editorial" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#18181b" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="675" fill="#f5f2eb"/>
  <rect width="1200" height="675" fill="url(#grid-editorial)"/>
  <rect x="44" y="42" width="1116" height="596" rx="28" fill="#18181b"/>
  <rect x="34" y="32" width="1116" height="596" rx="28" fill="#faf8f3" stroke="#18181b" stroke-width="4.5"/>
  <rect x="34" y="32" width="1116" height="16" rx="8" fill="${preset.accent}"/>
  <g transform="translate(76, 82)">
    <rect x="4" y="4" width="320" height="44" rx="12" fill="#18181b"/>
    <rect x="0" y="0" width="320" height="44" rx="12" fill="${preset.accent}" stroke="#18181b" stroke-width="3"/>
    <text x="160" y="28" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI', sans-serif" font-size="16" font-weight="900" letter-spacing="1">${escapeXml(badge.slice(0, 24))}</text>
  </g>
  <text x="76" y="236" fill="#18181b" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="60" font-weight="900" letter-spacing="-1.2">${escapeXml(line1)}</text>
  ${line2 ? `<text x="76" y="314" fill="#18181b" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="60" font-weight="900" letter-spacing="-1.2">${escapeXml(line2)}</text>` : ""}
  <rect x="76" y="${line2 ? 344 : 272}" width="190" height="12" rx="6" fill="${preset.accent}" stroke="#18181b" stroke-width="2.5"/>
  <text x="76" y="${line2 ? 404 : 334}" fill="#3f3f46" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI', sans-serif" font-size="23" font-weight="700">${escapeXml(shortSummary)}</text>
  <g transform="translate(76, 516)">
    <rect x="4" y="4" width="210" height="48" rx="12" fill="#18181b"/>
    <rect x="0" y="0" width="210" height="48" rx="12" fill="#fef3c7" stroke="#18181b" stroke-width="3"/>
    <text x="105" y="30" text-anchor="middle" fill="#18181b" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="16" font-weight="900">📐 LAYOUT WIREFRAME</text>
    <rect x="230" y="4" width="240" height="48" rx="12" fill="#18181b"/>
    <rect x="226" y="0" width="240" height="48" rx="12" fill="#ffffff" stroke="#18181b" stroke-width="3"/>
    <text x="346" y="30" text-anchor="middle" fill="#18181b" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" font-weight="800">ANS VIBEHUB · AI NEVER STOPS</text>
  </g>
</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <pattern id="grid-${preset.id}" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${preset.fg}" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="675" fill="${preset.bg}"/>
  <rect width="1200" height="675" fill="url(#grid-${preset.id})"/>
  <rect x="44" y="40" width="1112" height="595" rx="28" fill="none" stroke="${preset.accent}" stroke-opacity="0.45" stroke-width="2.5"/>
  <circle cx="960" cy="220" r="240" fill="${preset.accent}" fill-opacity="0.14"/>
  <rect x="82" y="88" width="330" height="42" rx="21" fill="${preset.tagBg}" stroke="${preset.accent}" stroke-opacity="0.5"/>
  <text x="247" y="115" text-anchor="middle" fill="${preset.tagFg}" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI', sans-serif" font-size="16" font-weight="800" letter-spacing="1.2">${escapeXml(badge.slice(0, 26))}</text>
  <text x="82" y="232" fill="${preset.fg}" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI', sans-serif" font-size="56" font-weight="800" letter-spacing="-1.2">${escapeXml(line1)}</text>
  ${line2 ? `<text x="82" y="306" fill="${preset.fg}" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI', sans-serif" font-size="56" font-weight="800" letter-spacing="-1.2">${escapeXml(line2)}</text>` : ""}
  <rect x="82" y="${line2 ? 340 : 272}" width="170" height="8" rx="4" fill="${preset.accent}"/>
  <text x="82" y="${line2 ? 396 : 332}" fill="${preset.sub}" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI', sans-serif" font-size="22" font-weight="500">${escapeXml(shortSummary)}</text>
  <g transform="translate(82, 536)">
    <rect x="0" y="0" width="210" height="44" rx="12" fill="${preset.fg}" fill-opacity="0.08" stroke="${preset.accent}" stroke-opacity="0.4"/>
    <text x="105" y="28" text-anchor="middle" fill="${preset.fg}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" font-weight="700">📐 ROADSHOW DRAFT</text>
    <rect x="226" y="0" width="220" height="44" rx="12" fill="${preset.fg}" fill-opacity="0.08" stroke="${preset.fg}" stroke-opacity="0.2"/>
    <text x="336" y="28" text-anchor="middle" fill="${preset.fg}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" font-weight="700">LIVE SANDBOX</text>
  </g>
  <text x="1114" y="572" text-anchor="end" fill="${preset.accent}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="20" font-weight="800">ANS VIBEHUB</text>
</svg>`;
}
