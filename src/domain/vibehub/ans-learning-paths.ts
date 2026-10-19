import type { VibeText } from "./ans-practices";

export type AnsPathLink = { href: string; label: VibeText };
export type AnsPathStep = { id: string; title: VibeText; action: VibeText; evidence: VibeText; links: AnsPathLink[] };
export type AnsLearningPath = { id: string; number: string; title: VibeText; summary: VibeText; audience: VibeText; outcome: VibeText; steps: AnsPathStep[] };

export const ANS_LEARNING_PATHS: readonly AnsLearningPath[] = [
  {
    id: "ans-first-website",
    number: "01",
    title: { zh: "做第一个个人网站或项目展示页", en: "Build a First Personal Site or Project Page" },
    summary: {
      zh: "按页面结构、视觉方向、真实作品和可访问检查四个阶段准备，不把模板堆砌当成完成。",
      en: "Prepare a page through structure, visual direction, real work, and accessibility checks rather than stacking templates.",
    },
    audience: { zh: "适合需要做个人主页、简历页、课程展示页或团队介绍页的同学。", en: "For students making a personal homepage, resume site, course showcase, or team page." },
    outcome: { zh: "得到一份有真实项目、可访问链接、清晰首屏和基础检查记录的页面方案。", en: "A page plan with real projects, working links, a clear hero, and basic verification notes." },
    steps: [
      {
        id: "hero-and-goal",
        title: { zh: "先写清首屏要让谁看懂什么", en: "Define who the hero speaks to" },
        action: {
          zh: "用一句话说明你的身份或项目用途，再放一个明确的下一步，例如查看项目、下载简历或联系合作。",
          en: "State your role or project purpose in one sentence, then add one clear next action such as viewing work, downloading a resume, or contacting you.",
        },
        evidence: { zh: "打开页面 10 秒内能说出这是谁、做过什么、下一步点哪里。", en: "Within ten seconds, a visitor can say who this is, what was built, and where to click next." },
        links: [
          { href: "/vibe-hub/hero", label: { zh: "Hero 首屏主视觉", en: "Hero" } },
          { href: "/vibe-hub/cta", label: { zh: "CTA 行动号召", en: "Call to action" } },
          { href: "/vibe-hub/ans/portfolio", label: { zh: "个人作品集指南", en: "Portfolio guide" } },
        ],
      },
      {
        id: "layout-and-type",
        title: { zh: "定下布局和字体层级", en: "Set layout and typographic hierarchy" },
        action: {
          zh: "确定桌面和手机的列数、卡片间距和标题字号。重点信息靠字号、对比和留白区分，不靠花哨边框。",
          en: "Decide column counts, card spacing, and heading sizes for desktop and mobile. Separate priorities with size, contrast, and whitespace rather than decorative borders.",
        },
        evidence: { zh: "手机宽度下不横向滚动，标题、正文和辅助信息能一眼区分。", en: "No horizontal scroll on mobile, and headings, body copy, and secondary text are distinct at a glance." },
        links: [
          { href: "/vibe-hub/typography", label: { zh: "Typography 字体排印", en: "Typography" } },
          { href: "/vibe-hub/responsive-design", label: { zh: "响应式设计", en: "Responsive design" } },
          { href: "/vibe-hub/card-grid-layout", label: { zh: "卡片网格布局", en: "Card grid layout" } },
        ],
      },
      {
        id: "real-work-cards",
        title: { zh: "只放能打开、能解释的真实作品", en: "Include only real work you can open and explain" },
        action: {
          zh: "每个项目写清问题、你的角色、使用工具和可验证结果。没有上线链接时放真实截图和仓库说明，不写假数据。",
          en: "For each project, state the problem, your role, tools used, and verifiable outcome. When no live URL exists, use real screenshots and repo notes rather than invented metrics.",
        },
        evidence: { zh: "每张作品卡片都能回答：你做了哪部分，证据在哪里。", en: "Every project card answers what you contributed and where the evidence lives." },
        links: [
          { href: "/market/resume-website", label: { zh: "简历网站工作流", en: "Resume website workflow" } },
          { href: "/showcase", label: { zh: "ANS 作品展", en: "ANS Showcase" } },
          { href: "/vibe-hub/social-proof", label: { zh: "Social Proof 社会证明", en: "Social proof" } },
        ],
      },
      {
        id: "release-check",
        title: { zh: "发布前做一轮链接与可访问检查", en: "Check links and accessibility before publishing" },
        action: {
          zh: "用键盘 Tab 走一遍主要链接，确认图片有替代文本、按钮有明确名称、外部链接不会跳到失效页面。",
          en: "Tab through primary links, confirm images have alt text, buttons have clear names, and external links do not lead to broken pages.",
        },
        evidence: { zh: "桌面、手机和键盘焦点都能走通主要入口。", en: "Desktop, mobile, and keyboard focus all reach the primary actions." },
        links: [
          { href: "/vibe-hub/accessibility", label: { zh: "Accessibility 无障碍", en: "Accessibility" } },
          { href: "/vibe-hub/seo", label: { zh: "SEO 搜索优化", en: "SEO" } },
          { href: "/vibe-hub/courses/product-website-from-0-to-1", label: { zh: "网站专题课", en: "Website course" } },
        ],
      },
    ],
  },
  {
    id: "ans-ui-design",
    number: "02",
    title: { zh: "用多方向探索与子 Agent 走查做出高级 UI", en: "Design High-Craft UI with 3-Direction Exploration & Sub-Agent Review" },
    summary: {
      zh: "打破模型默认预测的蓝紫渐变与对称卡片套路：从三版视觉方向同屏对比出发，结合生图/序列帧素材与无上下文子 Agent 截图挑刺，最后靠减法打磨呼吸感。",
      en: "Break out of default centered cards and blue-purple gradients: compare 3 distinct hero directions side by side, enrich with generated visuals or frame sequences, critique screenshots with a fresh sub-agent, and strip redundant chrome.",
    },
    audience: { zh: "适合希望摆脱“一眼 AI 模板味”、做出具有独立设计工作室质感页面的开发者与设计师。", en: "For builders and designers who want studio-grade interfaces instead of recognizable AI templates." },
    outcome: { zh: "产出包含 style-explorer.html 三方向对比、统一主视觉素材、9/10 分以上子 Agent 视觉走查记录与极简干净 DOM 结构的页面。", en: "A finished interface backed by a 3-direction style explorer, cohesive visual assets, a 9+/10 blind visual audit, and clean DOM hierarchy." },
    steps: [
      {
        id: "three-directions",
        title: { zh: "用一句话需求拆解 3 套跨领域视觉方向并同屏对比", en: "Turn a short prompt into 3 distinct visual directions side by side" },
        action: {
          zh: "不要只对 AI 说“随机做一个独特设计”（模型仍会吐出相似的圆角卡片）。要求 Agent 先从色彩冷暖、衬线/无衬线字体和非常规版式三个维度拆出 3 个具体意象（如暗夜木刻海报、等轴微距视角、工业实体控制面板），并生成 style-explorer.html 把三版首屏并排渲染出来直观挑选。",
          en: "Do not ask for 'random unique design'—models still converge on the same layout. Have the Agent propose 3 concrete visual metaphors varying palette, serif/sans typography, and asymmetric composition, then render all three heroes side by side in style-explorer.html.",
        },
        evidence: { zh: "浏览器打开 style-explorer.html 时，三套首屏在底色、字体性格和构图重心上一眼区分。", en: "Opening style-explorer.html shows three heroes with clearly different palettes, type voices, and focal layouts." },
        links: [
          { href: "/vibe-hub/hero", label: { zh: "Hero 首屏主视觉", en: "Hero" } },
          { href: "/vibe-hub/serif-sans", label: { zh: "衬线与非衬线", en: "Serif and sans serif" } },
          { href: "/vibe-hub/moodboard", label: { zh: "Moodboard 情绪板", en: "Moodboard" } },
        ],
      },
      {
        id: "visual-assets-and-motion",
        title: { zh: "用统一生图、着色器光效或绿幕抠像序列帧建立视觉锚点", en: "Anchor the page with generated art, shaders, or chroma-key frame sequences" },
        action: {
          zh: "纯靠 HTML/CSS 画框和 SVG 小图标撑不起顶级视觉。明确要求 Agent 调用生图工具生成同一画风的透明底主视觉插画；遇到跟随鼠标或滚动条的复杂交互动画，可先生成纯绿幕循环视频，再用色键（Chroma Key）脚本抠成透明序列帧绑定到滚动进度或指针坐标。",
          en: "Raw CSS boxes and generic SVG icons rarely create strong visual tension. Instruct the Agent to generate cohesive transparent illustrations, subtle shaders, or chroma-keyed green-screen frame sequences scrubbed by pointer position or scroll progress.",
        },
        evidence: { zh: "首屏与核心板块拥有风格统一的真实视觉主体，且动效在减弱动画偏好下可平稳降级。", en: "Hero and key sections feature a cohesive visual subject, and motion degrades cleanly under prefers-reduced-motion." },
        links: [
          { href: "/vibe-hub/image", label: { zh: "Image 图像", en: "Image" } },
          { href: "/vibe-hub/animation", label: { zh: "Animation 动画", en: "Animation" } },
          { href: "/hubs/aigc", label: { zh: "ANS AIGC 中心", en: "ANS AIGC Hub" } },
        ],
      },
      {
        id: "context-free-visual-review",
        title: { zh: "启动无历史包袱的「设计评审子 Agent」对真实截图按 10 分制挑刺", en: "Run a context-free visual reviewer sub-agent on real screenshots" },
        action: {
          zh: "写代码的主 Agent 带着历史上下文包袱，自己看自己的页面只会修修补补。每一轮修改后，将 1440px 与 390px 真实渲染截图交给一个全新的无上下文子 Agent（可优先搭配视觉审美更敏锐的模型），要求它对照顶级工作室水准指出构图、字重、间距差距并给出具体修改位置与伪代码，满 9 分才算过关。",
          en: "The coding agent carries historical bias and patches around its own choices. Pass real 1440px and 390px screenshots to a fresh sub-agent with zero prior context, requiring concrete layout/CSS fixes on a 10-point studio rubric until it reaches 9/10.",
        },
        evidence: { zh: "评审反馈包含明确的选择器、字号行高或间距修改指令，而非“再高级一点”的空话。", en: "Review output lists exact selectors, type scales, and spacing adjustments rather than vague 'make it pop' advice." },
        links: [
          { href: "/vibe-hub/sub-agent", label: { zh: "Sub-agent 子智能体", en: "Sub-agent" } },
          { href: "/vibe-hub/space", label: { zh: "Space 间距节奏", en: "Space" } },
          { href: "/vibe-hub/lab", label: { zh: "视觉层级实验台", en: "Visual hierarchy lab" } },
        ],
      },
      {
        id: "subtract-clutter",
        title: { zh: "最后做减法：砍掉解释性废话小字、重复状态与多余嵌套容器", en: "Subtract filler subtitles, redundant status labels, and nested wrappers" },
        action: {
          zh: "AI 极爱在每个区域底下塞一段解释性小字、到处画分割线、或者把 UUID 和“已选 3 项”这种不影响操作的文案摆在台面上。凡是布局和数字本身已经说清楚的地方，果断删掉副标题说明、去掉发光渐变和多余的外层卡片框。",
          en: "Models love adding explanatory subcopy under every heading, drawing dividers everywhere, or exposing UUIDs and passive '3 selected' counters. Delete any helper text, glow effect, or wrapper container where the layout and data already speak for themselves.",
        },
        evidence: { zh: "页面没有多余的解释性副标题、无意义的内部 ID 或层层套娃的边框，留白呼吸感清晰。", en: "The interface has no redundant helper subtitles, exposed internal IDs, or triple-nested card borders." },
        links: [
          { href: "/vibe-hub/anti-ai-flavor", label: { zh: "防止 AI 味儿图鉴", en: "Avoid AI Slop guide" } },
          { href: "/vibe-hub/divider", label: { zh: "Divider 分割线", en: "Divider" } },
          { href: "/vibe-hub/tooltip", label: { zh: "Tooltip 文字提示", en: "Tooltip" } },
        ],
      },
    ],
  },
  {
    id: "ans-skill-product",
    number: "03",
    title: { zh: "像做产品一样设计、分片与盲测 Agent Skill", en: "Design, Chunk, and Blind-Test Agent Skills Like a Product" },
    summary: {
      zh: "把高频重复任务整理为带 SKILL.md 入口、静默后置配置引导、确定性脚本、单页分片产物与双盲子 Agent 评测的工程资产。",
      en: "Turn recurring workflows into durable engineering assets with SKILL.md, silent post-check onboarding, deterministic scripts, per-page chunking, and blind A/B evaluation.",
    },
    audience: { zh: "适合经常重复教 AI 同一套步骤、希望让轻量模型也能稳定跑通多步长任务的开发者与内容创作者。", en: "For developers and creators who want repeatable agent workflows that run reliably even on lightweight models." },
    outcome: { zh: "得到一个目录边界清晰、带本地 HTML 可视化确认页且通过双盲对比测试的项目级 Skill 文件夹。", en: "A project-scoped Skill folder with clear script boundaries, an HTML review preview, and verified blind A/B test results." },
    steps: [
      {
        id: "project-entry-and-scope",
        title: { zh: "初始化精简 AGENTS.md 并把垂类 Skill 隔离在项目目录", en: "Initialize a lean AGENTS.md and isolate domain Skills at the project level" },
        action: {
          zh: "不要把所有垂类 Skill 都装在全局目录里污染上下文。为项目初始化一份精简的 AGENTS.md 写清项目定位与文件索引，将只在该项目使用的工作流放在项目级隐藏目录（如 .codex/skills/），并在 SKILL.md 头部写清精确的触发场景描述。",
          en: "Avoid polluting global context with dozens of domain Skills. Create a concise AGENTS.md mapping project purpose and key files, store domain Skills inside the project directory, and write unambiguous trigger descriptions in SKILL.md.",
        },
        evidence: { zh: "新开会话时 Agent 能自动读取 AGENTS.md 并在匹配任务时准确触发目标 Skill，不与其他项目串味。", en: "A fresh session reads AGENTS.md automatically and triggers the right project Skill without colliding with unrelated global tools." },
        links: [
          { href: "/vibe-hub/skill", label: { zh: "Skill 技能包", en: "Skill" } },
          { href: "/vibe-hub/agent-memory", label: { zh: "Agent Memory 记忆与入口", en: "Agent Memory" } },
          { href: "/vibe-hub/vibehub-skill", label: { zh: "ANS Skill 工作台", en: "ANS Skill Workbench" } },
        ],
      },
      {
        id: "deterministic-script-boundary",
        title: { zh: "确定性步骤归脚本，采用「默认执行 + 尾部静默后置提示」", en: "Put deterministic steps in scripts and use silent post-check config hints" },
        action: {
          zh: "时间戳计算、文件切分合并、格式校验等确定性工作一律封装进 scripts/ 脚本，只把语义判断留给 Agent。禁止让 Agent 每次运行前去翻几百行脚本源码查配置项；脚本应直接以默认参数跑完主流程，在结尾打印一行轻量的自定义配置提示。",
          en: "Move timestamp math, file merging, and schema checks into deterministic scripts/ while keeping semantic judgment in the Agent. Never make the Agent read script source code just to check config—run with defaults first and print a short customization hint at the end.",
        },
        evidence: { zh: "首次调用零配置即可跑通默认产物，Token 消耗与耗时显著下降。", en: "First-time invocation succeeds with zero setup and minimal token overhead." },
        links: [
          { href: "/vibe-hub/config-file", label: { zh: "Config File 配置文件", en: "Config File" } },
          { href: "/vibe-hub/process", label: { zh: "Process 进程与脚本", en: "Process" } },
          { href: "/vibe-hub/terminal", label: { zh: "Terminal 终端执行", en: "Terminal" } },
        ],
      },
      {
        id: "chunked-outputs-and-html-preview",
        title: { zh: "按单页/单步落盘中间文件，并注入本地 HTML 预览页确认", en: "Write per-page intermediate files and inject into a local HTML preview" },
        action: {
          zh: "为了兼容轻量模型并防止长输出后半段偷懒删减，强制让 Agent 按单页或单步生成独立中间文件（如 slide-01.html），再由脚本合并。涉及视觉封面、排版或字幕校对时，将产物注入本地 HTML 预览模板，让人在浏览器里一眼确认。",
          en: "Prevent lightweight models from truncating long outputs by writing one page or stage per intermediate file before script bundling. For visual covers, layouts, or captions, inject results into a local HTML preview page for fast human confirmation.",
        },
        evidence: { zh: "长文档或 15 页演示文稿零内容遗漏，且人工可在本地 HTML 页面一键挑选或确认。", en: "Long documents or multi-slide decks retain all source facts and can be reviewed visually in a local browser tab." },
        links: [
          { href: "/vibe-hub/html", label: { zh: "HTML 预览模板", en: "HTML" } },
          { href: "/vibe-hub/human-in-the-loop", label: { zh: "Human-in-the-Loop 人工把关", en: "Human-in-the-Loop" } },
          { href: "/vibe-hub/quality-gate", label: { zh: "Quality Gate 质量门禁", en: "Quality Gate" } },
        ],
      },
      {
        id: "blind-ab-evaluation",
        title: { zh: "用无上下文子 Agent 做双盲 A/B 评测与跨平台路径检查", en: "Run context-free sub-agent blind A/B tests and cross-platform checks" },
        action: {
          zh: "用同一道真实任务分别在“加载 Skill”和“不加载 Skill”下生成结果，把两份匿名产物交给一个全新的子 Agent 盲测对比完成度、遵循度与 Token 开销；同时检查 Windows/macOS 路径分隔符与外链可用性。",
          en: "Run the same real task with and without the Skill, then pass both anonymized outputs to a fresh sub-agent to grade completeness, rule adherence, and token cost; verify path handling across macOS and Windows.",
        },
        evidence: { zh: "盲测记录明确证明加载 Skill 后的产出在稳定性与规范遵循上优于裸跑。", en: "Blind evaluation logs show the Skill version consistently outperforms the baseline prompt." },
        links: [
          { href: "/vibe-hub/ab-test", label: { zh: "A/B Test 对比测试", en: "A/B Test" } },
          { href: "/vibe-hub/sub-agent", label: { zh: "Sub-agent 子智能体", en: "Sub-agent" } },
          { href: "/vibe-hub/test-case", label: { zh: "Test Case 测试用例", en: "Test Case" } },
        ],
      },
    ],
  },
  {
    id: "ans-media-pipeline",
    number: "04",
    title: { zh: "打造个人 Build in Public 与口播视频自动化流水线", en: "Run a Build-in-Public & Talking-Head Video Automation Pipeline" },
    summary: {
      zh: "用 1–2 小时下班时间跑通“真实痛点选题 → 口述大纲录屏 → VAD+ASR 去口误粗剪 → 画面 OCR 字幕校对 → 横竖双封面 → 多平台草稿箱”全流程。",
      en: "Complete a full content loop in 1–2 hours: pain-point outline, single-take screen recording, VAD+ASR retake rough-cut, screen-OCR caption correction, 16:9/3:4 covers, and draft uploads.",
    },
    audience: { zh: "适合希望通过真实作品复盘、技术分享积累长期影响力，但不想把时间耗在机械剪辑和重复排版上的开发者与学生。", en: "For builders and students sharing real work in public who want to automate mechanical editing and formatting." },
    outcome: { zh: "产出节奏紧凑的粗剪视频、专有名词零错字的字幕稿、16:9 与 3:4 双画幅封面以及待人工确认的多平台草稿。", en: "A tight rough-cut video, term-verified subtitles, 16:9 and 3:4 covers, and validated platform drafts awaiting human publish approval." },
    steps: [
      {
        id: "pain-point-outline",
        title: { zh: "从真实踩坑提炼选题，只写「一句话结论 + 防发散提醒」口述大纲", en: "Pick a real pain point and generate an outline with anti-tangent guardrails" },
        action: {
          zh: "不要让 AI 写生硬的逐字朗读稿。告诉 Agent 你今天解决了什么真实问题，让它结合项目历史数据生成一份口述大纲：只包含一句话核心结论、3 个演示顺序节点、容易跑题的“不要展开项”以及可结合个人经历自由发挥的锚点。",
          en: "Skip robotic word-for-word scripts. Tell the Agent what real problem you solved today and have it generate a speaking outline: one core takeaway, 3 demo beats, explicit 'do not digress into' reminders, and personal story prompts.",
        },
        evidence: { zh: "大纲不超过一屏，看着大纲即可自然完成一镜到底的桌面录屏与口述。", en: "The outline fits on one screen and supports a natural single-take screen recording." },
        links: [
          { href: "/vibe-hub/anti-ai-flavor", label: { zh: "防止 AI 味儿", en: "Avoid AI Slop" } },
          { href: "/vibe-hub/user-voice", label: { zh: "User Voice 真实表达", en: "User Voice" } },
          { href: "/vibe-hub/vibehub-skill?scenario=media-pipeline", label: { zh: "视频流水线需求模板", en: "Media pipeline brief" } },
        ],
      },
      {
        id: "vad-asr-roughcut",
        title: { zh: "一镜到底录屏，用 VAD 静音切分 + ASR 语义识别自动剪掉口误重录", en: "Record in one take and cut pauses and retakes via VAD + ASR" },
        action: {
          zh: "录屏时说错了不用停机重来，直接顺着往下重念一遍正确的句子。录完后运行粗剪脚本：先用 VAD 切掉长停顿，再由 Agent 根据词级时间戳识别重复口播段落，自动丢弃前面的卡壳废片、保留最后一遍流畅表达并合成粗剪视频。",
          en: "When you stumble during recording, simply pause and repeat the sentence cleanly without stopping. Afterward, run the rough-cut pipeline: VAD trims dead air, and the Agent uses word-level ASR timestamps to drop earlier fumbled takes and keep the final clean take.",
        },
        evidence: { zh: "原本 25 分钟的含口误录屏在几分钟内自动缩减为节奏紧凑的 8–10 分钟粗剪片。", en: "A raw 25-minute recording with retakes automatically condenses into a tight 8–10 minute rough cut." },
        links: [
          { href: "/vibe-hub/video", label: { zh: "Video 视频处理", en: "Video" } },
          { href: "/vibe-hub/skill", label: { zh: "Skill 技能封装", en: "Skill" } },
        ],
      },
      {
        id: "ocr-captions-and-covers",
        title: { zh: "用录屏关键帧 OCR 校对专业术语字幕，并渲染 16:9 / 3:4 双封面", en: "Proofread technical terms via screen OCR and render 16:9 & 3:4 covers" },
        action: {
          zh: "抽取录屏关键帧识别画面上的代码文件名、模型名与命令参数，自动修正语音识别里的同音错字；同时抽取人物关键帧配合高对比度双层标题生成 16:9 横版与 3:4 竖版封面，在本地 HTML 预览页确认缩略图可读性。",
          en: "Extract video keyframes to read visible filenames, model names, and CLI flags so the Agent fixes homophone typos in ASR captions; pair a clean speaker frame with high-contrast SVG type to render 16:9 and 3:4 covers in a local HTML preview.",
        },
        evidence: { zh: "字幕中的英文术语和工具名准确无误，横竖两版封面在手机缩略图尺寸下依然醒目。", en: "Technical terms in captions are spelled accurately, and both covers remain legible at mobile thumbnail size." },
        links: [
          { href: "/vibe-hub/typography", label: { zh: "Typography 字幕与封面字重", en: "Typography" } },
          { href: "/vibe-hub/image", label: { zh: "Image 多比例封面", en: "Image" } },
        ],
      },
      {
        id: "draft-only-publish-and-retro",
        title: { zh: "自动填入各平台草稿箱（严禁自动点发布），并用字幕稿做数据复盘", en: "Upload to platform drafts only, then review performance using transcripts" },
        action: {
          zh: "由脚本根据字幕稿生成带时间戳的章节简介与平台标签，自动上传视频与对应比例封面到各平台后台草稿箱并执行后置校验，把最终点击发布的权限留给人。发布后将播放与互动数据拉回项目目录，让 AI 直接读字幕稿复盘哪一段节奏拖沓。",
          en: "Generate timestamped chapters and platform tags from the transcript, upload assets into platform drafts with post-check validation, and leave the final Publish click to a human. Later, feed analytics and the text transcript back to the Agent to diagnose pacing.",
        },
        evidence: { zh: "各平台草稿箱字段齐全且未误触发直接发布；项目目录内留存了可追溯的字幕稿与数据复盘记录。", en: "Platform drafts are populated and verified without auto-publishing, and transcripts plus metrics are archived in the project." },
        links: [
          { href: "/vibe-hub/human-in-the-loop", label: { zh: "Human-in-the-Loop 人工发布把关", en: "Human-in-the-Loop" } },
          { href: "/vibe-hub/permission-mode", label: { zh: "Permission Mode 权限边界", en: "Permission Mode" } },
        ],
      },
    ],
  },
  {
    id: "ans-agent-team",
    number: "05",
    title: { zh: "多 Agent 小队分工、模型费率路由与长期项目治理", en: "Multi-Agent Team Mode, Model Cost Routing & Long-Project Governance" },
    summary: {
      zh: "按 1:20:100 模型成本梯度配置 Explorer / Executor / Reviewer / Advisor 四类角色，结合开发前 Explore、提交前 Simplify 与分支隔离治理长期工程。",
      en: "Configure Explorer, Executor, Reviewer, and Advisor roles across 1:20:100 model cost tiers, combining pre-coding Explore, pre-commit Simplify, and Git worktree isolation.",
    },
    audience: { zh: "适合维护跨目录大型仓库、希望兼顾代码质量与每周 Token 额度健康度的全栈开发者与团队。", en: "For full-stack developers and teams maintaining multi-module repositories while keeping weekly token budgets healthy." },
    outcome: { zh: "建立起角色分工明确、主窗口上下文干净、提交前自动消肿且额度消耗可量化追踪的工程协作流。", en: "A repeatable team workflow with clean main context, pre-commit code simplification, and measurable token budget discipline." },
    steps: [
      {
        id: "role-and-cost-tier",
        title: { zh: "按 1:20:100 费率梯度拆分探索者、执行者、审查者与专家顾问", en: "Split Explorer, Executor, Reviewer, and Advisor across 1:20:100 cost tiers" },
        action: {
          zh: "如果未配置子 Agent 角色文件，系统默认会让所有查文件的子 Agent 继承主窗口的高价模型。将 Explorer（快速扫路径）和 Executor（边界明确的实现）映射到高性价比轻量模型，由主 Agent 提前点明必读规范文件以规避长上下文漏召回；将顶配昂贵模型保留给 Advisor，仅在连续卡壳或定复杂架构时唤醒。",
          en: "Without explicit role configs, sub-agents inherit the expensive main model. Route Explorer and bounded Executor tasks to cost-effective high-reasoning models (with explicit rule/file handoffs from the main agent), and reserve top-tier models for an on-demand Advisor.",
        },
        evidence: { zh: "90% 以上的日常检索与确定性编码由高性价比模型稳健完成，顶配模型额度仅花在刀刃上。", en: "Over 90% of routine search and bounded coding runs on low-cost tiers while reserving top-tier budget for hard architecture." },
        links: [
          { href: "/vibe-hub/sub-agent", label: { zh: "Sub-agent 子智能体", en: "Sub-agent" } },
          { href: "/vibe-hub/reasoning-model", label: { zh: "Reasoning Model 推理档位", en: "Reasoning Model" } },
          { href: "/vibe-hub/ans/account-and-cost", label: { zh: "账号与成本边界指南", en: "Account & cost guide" } },
        ],
      },
      {
        id: "explore-and-simplify",
        title: { zh: "落实「开发前 Explore + 提交前 Simplify」双规范", en: "Enforce pre-coding Explore and pre-commit Simplify protocols" },
        action: {
          zh: "跨目录任务动工前，先派 Explorer 摸清目标文件与调用链，只把几百字的路径摘要带回主窗口；代码写完准备提交前，拉起无历史包袱的 Reviewer 执行 Simplify 审查，砍掉层层嵌套的过度防御判断、重复派生状态与死代码。",
          en: "Before coding across directories, send an Explorer to return a compact path summary so raw source files do not flood the main window; before committing, spawn a fresh Reviewer to strip stacked defensive checks, duplicate state, and dead code.",
        },
        evidence: { zh: "主会话上下文始终清爽，且提交的 Diff 中没有多余的兼容分支和重复造轮子逻辑。", en: "Main conversation context stays lean and committed diffs are free of redundant guards or reinvented utilities." },
        links: [
          { href: "/vibe-hub/context-window", label: { zh: "Context Window 上下文窗口", en: "Context Window" } },
          { href: "/vibe-hub/quality-gate", label: { zh: "Quality Gate 质量门禁", en: "Quality Gate" } },
        ],
      },
      {
        id: "layered-docs-and-memory",
        title: { zh: "用精简 AGENTS.md 与分层文档充当跨会话长期记忆", en: "Use a concise AGENTS.md and layered docs as cross-session memory" },
        action: {
          zh: "AI 每次新开会话都会忘记历史聊天，但代码库与文档就是它的长期记忆。把 AGENTS.md 控制在百行以内做全局导航索引，把架构契约、验证门禁与复盘记录归档在独立目录中，让每次新会话都能在 10 秒内对齐项目上下文。",
          en: "New chat sessions forget prior dialogue, so the repository itself acts as long-term memory. Keep AGENTS.md under a hundred lines as an index pointing to architecture contracts, verification scripts, and retrospectives.",
        },
        evidence: { zh: "开启任意新话题时无需复制粘贴长篇背景，Agent 可自主按索引读取对应规范。", en: "Any new thread aligns with project conventions immediately without manual copy-pasting." },
        links: [
          { href: "/vibe-hub/agent-memory", label: { zh: "Agent Memory 智能体记忆", en: "Agent Memory" } },
          { href: "/vibe-hub/doc-layout", label: { zh: "Doc Layout 文档结构", en: "Doc Layout" } },
        ],
      },
      {
        id: "worktree-and-visual-diff",
        title: { zh: "用 Git Worktree 隔离并行改造，合并前输出可视化 Diff 走查", en: "Isolate parallel work in Git Worktrees and review visual Diffs before merge" },
        action: {
          zh: "多线并行开发时使用独立 Git Branch 或 Worktree 避免工作区互相污染；合并前除跑通类型检查与自动化测试外，生成结构化 Diff 走查摘要，明确标出新增、修改、删除模块与人工重点复核项。",
          en: "Isolate concurrent features in separate Git branches or worktrees; before merging, run typecheck and tests and produce a visual diff summary highlighting modified boundaries and human review points.",
        },
        evidence: { zh: "并行任务互不干扰，每次合并都有清晰的 Diff 边界与测试通过记录。", en: "Parallel tasks never clobber each other, and every merge includes a clear diff boundary and passing test log." },
        links: [
          { href: "/vibe-hub/worktree", label: { zh: "Worktree 工作树", en: "Worktree" } },
          { href: "/vibe-hub/diff", label: { zh: "Diff 差异对比", en: "Diff" } },
          { href: "/vibe-hub/courses/git-collaboration-and-delivery", label: { zh: "Git 协作与交付课", en: "Git collaboration course" } },
        ],
      },
    ],
  },
  {
    id: "ans-creative-delivery",
    number: "06",
    title: { zh: "做一套图像、视频或创意演示作品", en: "Produce an Image, Video, or Creative Demo" },
    summary: {
      zh: "把创意任务拆成画面意图、参考边界、素材生成和发布前确认，避免只生成一堆不能用的图。",
      en: "Break creative work into visual intent, reference boundaries, asset generation, and pre-release review instead of generating unusable piles of assets.",
    },
    audience: { zh: "适合海报、活动视觉、短片分镜、课程演示和 AIGC 作品。", en: "For posters, event visuals, video storyboards, course demos, and AIGC pieces." },
    outcome: { zh: "得到可复用的视觉提示词、分镜或版式结构，以及明确的导出规格。", en: "Reusable visual prompts, a storyboard or layout structure, and explicit export specs." },
    steps: [
      {
        id: "visual-intent",
        title: { zh: "先定情绪板和禁用项", en: "Set the moodboard and exclusions" },
        action: {
          zh: "选 2 到 3 个参考方向，写清色调、材质、主体位置，以及明确不要的默认元素，例如廉价发光、密集小图标或夸张口号。",
          en: "Pick two or three reference directions and state palette, material, subject placement, and unwanted defaults such as cheap glow, dense icons, or inflated slogans.",
        },
        evidence: { zh: "任何人看提示词都知道画面主体、文字留白和禁用风格。", en: "Anyone reading the brief can tell the subject, text safe area, and excluded styles." },
        links: [
          { href: "/vibe-hub/moodboard", label: { zh: "Moodboard 情绪板", en: "Moodboard" } },
          { href: "/vibe-hub/anti-ai-flavor", label: { zh: "避免模板感", en: "Avoid generic output" } },
          { href: "/vibe-hub/ans/creative-production", label: { zh: "AIGC 创作流程指南", en: "Creative workflow guide" } },
        ],
      },
      {
        id: "fixed-elements",
        title: { zh: "把不能变的元素锁住", en: "Lock the elements that must stay consistent" },
        action: {
          zh: "区分角色设定、品牌色、标题位置、画幅比例和可以变化的背景细节，分步生成而不是一次赌成片。",
          en: "Separate character identity, brand colors, title placement, and aspect ratio from background details that can vary, then generate in stages.",
        },
        evidence: { zh: "同一套作品的 3 张图或 3 个镜头看起来属于同一个项目。", en: "Three images or shots from the project clearly belong to the same piece." },
        links: [
          { href: "/hubs/aigc", label: { zh: "ANS AIGC 中心", en: "ANS AIGC Hub" } },
          { href: "/vibe-hub/image", label: { zh: "Image 图像", en: "Image" } },
          { href: "/vibe-hub/video", label: { zh: "Video 视频", en: "Video" } },
        ],
      },
      {
        id: "layout-and-caption",
        title: { zh: "合成版式、字幕和说明", en: "Assemble layout, captions, and notes" },
        action: {
          zh: "检查标题是否压住主体，字幕是否超出安全区，封面在小尺寸卡片里是否还能读清。",
          en: "Check whether titles cover the subject, captions cross safe areas, or covers become unreadable at card size.",
        },
        evidence: { zh: "缩略图和大图都能看清核心标题与主体。", en: "Both thumbnail and full view keep the main title and subject legible." },
        links: [
          { href: "/vibe-hub/space", label: { zh: "Space 间距", en: "Space" } },
          { href: "/vibe-hub/typography", label: { zh: "Typography 字体排印", en: "Typography" } },
        ],
      },
      {
        id: "human-review",
        title: { zh: "保留人工确认再公开提交", en: "Keep human review before public submission" },
        action: {
          zh: "确认素材版权、人物肖像、引用来源和导出格式，再提交到作品展或比赛。",
          en: "Check asset rights, likeness permissions, citations, and export formats before submitting to a showcase or competition.",
        },
        evidence: { zh: "作品说明里能诚实标注工具、人工修改部分和素材来源。", en: "The submission note honestly states the tools used, human edits, and asset sources." },
        links: [
          { href: "/vibe-hub/human-in-the-loop", label: { zh: "Human-in-the-Loop 人工把关", en: "Human-in-the-Loop" } },
          { href: "/explore/submit", label: { zh: "提交作品", en: "Submit work" } },
        ],
      },
    ],
  },
  {
    id: "ans-open-source",
    number: "07",
    title: { zh: "看懂一个开源项目并改成自己的实验", en: "Understand an Open-Source Repo and Make It Your Own Experiment" },
    summary: {
      zh: "从克隆、运行、看改动到小步提交，安全地把别人的开源项目变成自己的学习材料。",
      en: "Move from cloning and running to inspecting diffs and making small commits, turning open-source code into safe learning material.",
    },
    audience: { zh: "适合第一次从探索广场点进 GitHub 仓库、想本地跑通并改造项目的同学。", en: "For students opening a GitHub repository from Explore and wanting to run and adapt it locally." },
    outcome: { zh: "在独立分支上跑通项目、完成一处可回退的修改，并保留复现说明。", en: "A locally running project on a separate branch, one reversible change, and reproduction notes." },
    steps: [
      {
        id: "clone-and-run",
        title: { zh: "先把原项目按 README 跑起来", en: "Run the original project from its README first" },
        action: {
          zh: "记录安装命令、Node 或 Python 版本、环境变量和启动端口。还没跑通前，不要让 AI 大面积改代码。",
          en: "Record install commands, Node or Python versions, environment variables, and ports. Do not ask AI for broad code edits before the baseline runs.",
        },
        evidence: { zh: "本地能看到原项目的首页、命令输出或测试结果。", en: "You can see the original homepage, CLI output, or test result locally." },
        links: [
          { href: "/explore", label: { zh: "ANS 探索广场", en: "ANS Explore" } },
          { href: "/vibe-hub/clone", label: { zh: "Clone 克隆", en: "Clone" } },
          { href: "/vibe-hub/env-var", label: { zh: "环境变量", en: "Environment variables" } },
        ],
      },
      {
        id: "branch-isolation",
        title: { zh: "开一个分支再动手改", en: "Create a branch before making changes" },
        action: {
          zh: "为你的实验建一个清晰分支，一次只改一个页面、一个数据源或一个交互，方便比较和回退。",
          en: "Create a named branch for your experiment and change one page, data source, or interaction at a time so it stays easy to compare and revert.",
        },
        evidence: { zh: "随时可以用 Git Diff 看出你改了哪些文件。", en: "You can run Git Diff at any time and explain every changed file." },
        links: [
          { href: "/vibe-hub/branch", label: { zh: "Branch 分支", en: "Branch" } },
          { href: "/vibe-hub/diff", label: { zh: "Diff 差异对比", en: "Diff" } },
          { href: "/vibe-hub/courses/git-collaboration-and-delivery", label: { zh: "Git 专题课", en: "Git course" } },
        ],
      },
      {
        id: "verify-change",
        title: { zh: "用最小测试确认没有改坏", en: "Verify the change with a minimal check" },
        action: {
          zh: "跑项目的构建、类型检查或冒烟测试；如果原项目没有测试，至少写清手动验证步骤。",
          en: "Run the project's build, typecheck, or smoke test; if the repo has no tests, write down the manual verification steps.",
        },
        evidence: { zh: "改前和改后的差别有截图、命令输出或测试结果支撑。", en: "Before-and-after behavior is backed by screenshots, command output, or tests." },
        links: [
          { href: "/vibe-hub/smoke-test", label: { zh: "Smoke Test 冒烟测试", en: "Smoke test" } },
          { href: "/vibe-hub/build", label: { zh: "Build 构建", en: "Build" } },
        ],
      },
      {
        id: "document-origin",
        title: { zh: "保留原作者信息并写清你的改动", en: "Preserve attribution and document your changes" },
        action: {
          zh: "在 README 或作品说明里写清上游仓库、许可证、你新增的部分，以及别人如何复现。",
          en: "State the upstream repository, license, your additions, and reproduction steps in the README or submission notes.",
        },
        evidence: { zh: "评审或队友能一眼分清上游基础与你的贡献。", en: "Reviewers or teammates can immediately separate the upstream base from your contribution." },
        links: [
          { href: "/vibe-hub/ans/github-to-project", label: { zh: "开源项目改造指南", en: "Open-source adaptation guide" } },
          { href: "/vibe-hub/commit", label: { zh: "Commit 提交", en: "Commit" } },
        ],
      },
    ],
  },
];

export function getAnsLearningPath(id: string): AnsLearningPath | undefined {
  return ANS_LEARNING_PATHS.find(path => path.id === id);
}
