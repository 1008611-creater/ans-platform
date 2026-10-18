/**
 * ANS editorial content, grounded in existing routes and product boundaries.
 * This is guidance, never an execution receipt or a claim of model/provider availability.
 */
export type VibeLocale = "zh" | "en";
export type VibeText = Record<VibeLocale, string>;
export type AnsPracticeLink = { href: string; label: VibeText; description: VibeText };
export type AnsPracticeSection = { id: string; title: VibeText; body: VibeText; checklist?: Record<VibeLocale, string[]> };
export type AnsPractice = {
  slug: string;
  number: string;
  icon: "brief" | "portfolio" | "creative" | "repo" | "competition" | "cost" | "design" | "skill" | "media" | "team";
  category: VibeText;
  title: VibeText;
  summary: VibeText;
  audience: VibeText;
  outcome: VibeText;
  relatedTerms: { slug: string; label: VibeText }[];
  keywords: string[];
  sections: AnsPracticeSection[];
  requestExample: { title: VibeText; prompt: VibeText; note: VibeText };
  nextDestinations: AnsPracticeLink[];
};

export const ANS_PRACTICES: readonly AnsPractice[] = [
  {
    slug: "clear-brief",
    number: "01",
    icon: "brief",
    category: { zh: "AI 协作起点", en: "Working with AI" },
    title: { zh: "把一句模糊想法写成可验收的 AI 任务单", en: "Turn a Vague Idea into a Verifiable AI Brief" },
    summary: {
      zh: "先交代目标、对象、参考材料和验收标准，再让 Agent 动手；避免生成一堆好看但不能用的结果。",
      en: "State the goal, audience, references, and acceptance check before asking an Agent to build, avoiding polished output that cannot be used.",
    },
    audience: { zh: "适合第一次用 AI 做网页、海报、课程作业或比赛原型的同学。", en: "For students using AI for a first site, poster, course assignment, or competition prototype." },
    outcome: { zh: "得到一份可以直接发给编码或创作工具的结构化需求说明。", en: "A four-part brief ready to paste into a coding or creative tool." },
    relatedTerms: [
      { slug: "prd", label: { zh: "PRD 产品需求文档", en: "PRD" } },
      { slug: "acceptance-criteria", label: { zh: "Acceptance Criteria 验收条件", en: "Acceptance Criteria" } },
      { slug: "scope-creep", label: { zh: "Scope Creep 范围蔓延", en: "Scope Creep" } },
      { slug: "human-in-the-loop", label: { zh: "Human-in-the-Loop 人工把关", en: "Human-in-the-Loop" } },
    ],
    keywords: ["需求", "提示词", "任务单", "prd", "brief", "prompt", "acceptance", "验收"],
    sections: [
      {
        id: "goal",
        title: { zh: "先写完不成就不算过关的那件事", en: "Start with what must work" },
        body: {
          zh: "不要一上来指定复杂技术名词。先用一句话说明：谁在什么场景打开它、看完之后要完成什么动作。目标越具体，AI 越不容易自作主张加无关模块。",
          en: "Skip technical jargon at the start. State in one sentence who opens the work, in what context, and what action they need to complete. Specific goals stop AI from inventing extra sections.",
        },
        checklist: {
          zh: ["写明面向谁：老师、评委、社团成员还是招聘方", "写明核心结果：展示作品、收集报名、解释实验还是提交证明", "写明不做的内容：例如不需要登录、不需要后台、不造假数据"],
          en: ["Name the audience: instructor, judge, club member, or recruiter", "Name the core result: showcase work, collect signups, explain an experiment, or submit evidence", "Name non-goals: no login, no admin panel, no fabricated metrics"],
        },
      },
      {
        id: "references",
        title: { zh: "把参考资料和现有材料交出来", en: "Provide existing material and references" },
        body: {
          zh: "AI 最容易在没有素材时编造假数字、假评价和空洞口号。把你已有的项目标题、截图、数据表、课程要求或参考页面贴进去，没有的部分明确标成待补充。",
          en: "AI invents fake numbers, testimonials, and slogans when real material is missing. Supply your actual titles, screenshots, data tables, assignment rules, or reference pages, and mark missing pieces explicitly.",
        },
      },
      {
        id: "acceptance",
        title: { zh: "最后补三条能用肉眼检查的验收条件", en: "End with three visible acceptance checks" },
        body: {
          zh: "好的验收条件不是“高级、现代、丝滑”，而是“手机宽度下不横向溢出、三个作品链接都能点开、表单为空时给出提示”。",
          en: "Useful acceptance criteria are not 'modern' or 'premium'; they are 'no horizontal overflow on mobile, all three project links open, and an empty form shows an error.'",
        },
      },
    ],
    requestExample: {
      title: { zh: "可直接复制的需求模板", en: "Copyable brief template" },
      prompt: {
        zh: "我要做一个单页作品展示页，面向课程评委。只展示我已完成的 3 个真实项目：每个项目包含标题、解决的问题、1 张截图和仓库/演示链接。不要虚构用户数、评分或获奖信息。验收要求：桌面和手机都能正常浏览，主要按钮可键盘聚焦，所有外链在新标签页打开。",
        en: "Build a single-page project showcase for course judges. Include only my 3 completed projects: each needs a title, problem solved, 1 screenshot, and repository or demo link. Do not invent user counts, ratings, or awards. Acceptance: works on desktop and mobile, primary buttons have keyboard focus styles, and external links open in a new tab.",
      },
      note: { zh: "把括号或示例替换成你的真实项目后再发送。", en: "Replace the example details with your own real project facts before sending." },
    },
    nextDestinations: [
      { href: "/vibe-hub/vibehub-skill", label: { zh: "打开 VibeHub Skill", en: "Open VibeHub Skill" }, description: { zh: "把模糊描述改写成带术语的清晰请求。", en: "Rewrite rough descriptions into clear requests with linked terms." } },
      { href: "/vibe-hub/anti-ai-flavor", label: { zh: "对照避免模板感清单", en: "Check the anti-generic guide" }, description: { zh: "提交前排查常见口癖、空话和套路化布局。", en: "Screen out recurring clichés, filler copy, and default layouts before shipping." } },
    ],
  },
  {
    slug: "portfolio",
    number: "02",
    icon: "portfolio",
    category: { zh: "个人网站与作品集", en: "Portfolios & Sites" },
    title: { zh: "把课程作业或项目做成别人一眼看懂的展示页", en: "Present Coursework or Projects as a Clear Portfolio Page" },
    summary: {
      zh: "围绕首屏结论、项目卡片、证据截图和可访问链接组织页面，不靠夸张词和复杂动效撑场面。",
      en: "Structure your page around a clear hero, project cards, evidence screenshots, and working links rather than hype or heavy motion.",
    },
    audience: { zh: "适合准备个人简历网站、作品集、社团主页或开源项目主页的同学。", en: "For students building a resume site, portfolio, club page, or open-source project homepage." },
    outcome: { zh: "明确首屏、作品区、过程证据和联系入口四块内容。", en: "A clear structure for hero, work cards, process evidence, and contact links." },
    relatedTerms: [
      { slug: "hero", label: { zh: "Hero 首屏主视觉", en: "Hero" } },
      { slug: "cta", label: { zh: "CTA 行动号召", en: "CTA" } },
      { slug: "responsive-design", label: { zh: "Responsive Design 响应式设计", en: "Responsive Design" } },
      { slug: "accessibility", label: { zh: "Accessibility 无障碍", en: "Accessibility" } },
    ],
    keywords: ["简历", "作品集", "个人网站", "portfolio", "resume", "website", "hero", "主页"],
    sections: [
      {
        id: "hero",
        title: { zh: "首屏只回答你是谁、做过什么、怎么联系", en: "Let the hero answer who you are, what you built, and how to reach you" },
        body: {
          zh: "访客停留时间很短。首屏放清姓名或团队名、一句具体方向（例如“农业遥感数据可视化与前端交互”），以及两个最重要入口：看项目、看代码或下载简历。",
          en: "Visitors scan quickly. Put your name or team, one concrete focus line, and at most two primary actions: view projects, inspect code, or download a resume.",
        },
      },
      {
        id: "cards",
        title: { zh: "每张项目卡片都要有真实结果和你的分工", en: "Give every project card a real outcome and your role" },
        body: {
          zh: "避免只放“基于 AI 的智能系统”这种大标题。写清输入是什么、输出是什么、你负责哪一部分、现在能否在线体验或查看仓库。",
          en: "Avoid generic titles like 'AI Smart System.' State the input, output, the part you built, and whether visitors can try a live demo or read the repository.",
        },
        checklist: {
          zh: ["一句话说明解决的具体问题", "标注你的真实角色与使用工具", "提供可点击的演示、仓库或截图证据"],
          en: ["One sentence explaining the concrete problem", "Your actual contribution and tools used", "A working demo link, repository, or screenshot evidence"],
        },
      },
      {
        id: "check",
        title: { zh: "发布前用手机宽度和键盘走一遍", en: "Test at mobile width and with keyboard navigation before publishing" },
        body: {
          zh: "把浏览器缩到 390px 宽，看标题是否断行失控、图片是否变形、按钮是否太小；再用 Tab 键确认每个链接都能看清焦点位置。",
          en: "Resize the browser to 390px to check line breaks, image aspect ratios, and tap targets, then press Tab through the page to confirm visible focus states.",
        },
      },
    ],
    requestExample: {
      title: { zh: "个人展示页自检提示词", en: "Portfolio review prompt" },
      prompt: {
        zh: "请检查我当前的个人展示页文案和结构：删掉没有事实支撑的自我评价，把每个项目改写成“问题 → 我的做法 → 可验证结果”，并指出手机屏幕下可能拥挤的区块。",
        en: "Review my portfolio copy and layout: remove unsupported self-praise, rewrite each project as 'problem -> my work -> verifiable result,' and point out sections that may crowd a mobile screen.",
      },
      note: { zh: "也可直接使用 ANS 简历网站工作流从模板开始。", en: "You can also start from the ANS Resume Website workflow." },
    },
    nextDestinations: [
      { href: "/market/resume-website", label: { zh: "使用简历网站工作流", en: "Use Resume Website Workflow" }, description: { zh: "在 ANS 市场查看并准备个人网站模板。", en: "Inspect and prepare the personal website workflow in the ANS Market." } },
      { href: "/showcase", label: { zh: "浏览社区公开作品展", en: "Browse Public Showcase" }, description: { zh: "看看其他同学如何展示真实作品与封面。", en: "See how other members present real work and covers." } },
    ],
  },
  {
    slug: "ui-design-workflow",
    number: "03",
    icon: "design",
    category: { zh: "高水准 UI 与审美走查", en: "High-Craft UI & Visual Review" },
    title: { zh: "用三方向同屏探索与无上下文子 Agent 做出去模板化 UI", en: "Design Studio-Grade UI with 3-Direction Exploration & Context-Free Sub-Agent Review" },
    summary: {
      zh: "先让 Agent 拆解 3 套色彩、字体与构图截然不同的首屏并生成 style-explorer.html 同屏对比，锁定后再结合生图/序列帧与独立子 Agent 10 分制截图挑刺。",
      en: "Have the Agent propose 3 distinct hero directions in a side-by-side style-explorer.html preview, enrich with custom illustrations or frame sequences, and run a 10-point blind screenshot critique via a fresh sub-agent.",
    },
    audience: { zh: "适合希望摆脱“蓝紫渐变 + 居中卡片堆叠 + 满屏解释小字”AI 模板感的前端开发者与设计师。", en: "For frontend builders and designers who want to eliminate generic blue-purple centered card templates." },
    outcome: { zh: "掌握从一句话需求到多方向视觉探索、动态素材融合、独立子 Agent 视觉走查与最终减法打磨的完整工作流。", en: "A complete workflow covering 3-direction exploration, custom visual assets, context-free sub-agent critique, and subtractive polish." },
    relatedTerms: [
      { slug: "hero", label: { zh: "Hero 首屏主视觉", en: "Hero" } },
      { slug: "serif-sans", label: { zh: "衬线与非衬线", en: "Serif & Sans" } },
      { slug: "sub-agent", label: { zh: "Sub-agent 子智能体", en: "Sub-agent" } },
      { slug: "space", label: { zh: "Space 间距与留白", en: "Space" } },
    ],
    keywords: ["ui", "设计", "视觉", "审美", "多方向", "style-explorer", "走查", "去AI味", "绿幕", "序列帧", "design"],
    sections: [
      {
        id: "three-directions",
        title: { zh: "别写“随机设计”，直接让 Agent 生成 3 版截然不同的首屏同屏对比", en: "Skip 'random design'—render 3 distinct hero directions side by side" },
        body: {
          zh: "仅仅在提示词里写“请做一个独特、随机的设计”，大模型依然会顺着最高概率吐出相似的圆角卡片。正确做法是要求 Agent 围绕产品场景拆解 3 个跨领域的具体视觉意象（例如：16 世纪木刻告示海报风、45 度等轴微距 3D 街区风、实体工业控制面板风），并生成本地 style-explorer.html 将三版首屏并排展示，用肉眼挑出最有张力的一版后再展开整页。",
          en: "Asking for 'a unique random design' still produces near-identical rounded cards. Instead, ask the Agent to propose 3 concrete cross-domain visual directions varying color temperature, serif/sans typography, and asymmetric layout, and render all three heroes side by side in style-explorer.html before building the full page.",
        },
        checklist: {
          zh: ["每套方案必须在底色明暗、字体性格（衬线/无衬线/等宽）和版式结构上拉开明显差距", "如果是已有项目新增页面，先提取现有设计规范，再一次性生成弹窗、抽屉、独立页 3 种交互方案对比", "通过 style-explorer.html 并排预览首屏，选中一个方向后再继续写完整页"],
          en: ["Each direction must differ in surface brightness, type family (serif/sans/mono), and layout structure", "For existing apps, preserve design tokens and compare 3 UX patterns (modal, drawer, dedicated page) side by side", "Pick the winning direction from style-explorer.html before expanding the full page"],
        },
      },
      {
        id: "assets-and-motion",
        title: { zh: "结合统一画风生图、微着色器与绿幕视频拆帧丰富画面层次", en: "Enrich hierarchy with cohesive generated illustrations, shaders, and chroma-key frame sequences" },
        body: {
          zh: "只写 HTML 和 CSS 最多只能排文字和画简单几何框。在提示词里明确要求调用生图工具生成同一套光影与笔触的透明底主视觉插图；遇到跟随鼠标转头或随滚动条推进的复杂交互动画，可先生成纯绿幕背景的循环视频，再写一段色键（Chroma Key）脚本抠成透明 PNG 序列帧，绑定到指针坐标或滚动进度上。",
          en: "Pure HTML and CSS alone cannot match studio sites that rely on custom art and lighting. Instruct the Agent to generate cohesive transparent illustrations or subtle shaders; for complex interactive motion, generate a green-screen video loop, chroma-key it into transparent frames, and bind frame playback to pointer position or scroll progress.",
        },
      },
      {
        id: "subagent-review-and-subtraction",
        title: { zh: "拉起无历史包袱的「评审子 Agent」挑刺，并果断删掉冗余文字与外层框", en: "Critique screenshots with a context-free sub-agent, then ruthlessly subtract clutter" },
        body: {
          zh: "写代码的主 Agent 对自己的历史决策有滤镜，很难客观发现构图俗套。在每轮修改后，启动一个不带任何历史代码上下文的子 Agent，把真实网页截图喂给它，要求对照顶尖设计水准按 10 分制打分并输出具体到选择器、字号、间距的修改指令（满 9 分才停）。最后亲手做减法：凡是图标、数字和布局本身已经表达清楚的地方，果断删掉解释性副标题、去掉发光渐变和多余的外层嵌套容器。",
          en: "The coding agent is biased by its own history. After each pass, spawn a fresh sub-agent with zero code context to score real screenshots on a 10-point studio rubric and output exact CSS/layout fixes until it hits 9/10. Finally, subtract: wherever icons, numbers, and layout are self-explanatory, delete helper subtitles, glow effects, and redundant wrapper boxes.",
        },
        checklist: {
          zh: ["启动无历史上下文的独立子 Agent 看真实截图打分，反馈必须包含具体修改位置与伪代码", "删掉所有“为了丰富页面”硬塞进去的副标题说明小字与“已选 X 项”无用状态提示", "将布局简化为以内容和图像为中心的网格，去掉蓝紫渐变、发光描边和多余的嵌套底板"],
          en: ["Use a context-free sub-agent to grade real screenshots with actionable selector/CSS fixes", "Delete filler subtitles and passive status counters that do not affect user actions", "Simplify into a content-first grid and strip glowing borders and nested container chrome"],
        },
      },
    ],
    requestExample: {
      title: { zh: "三方向探索 + 子 Agent 视觉走查提示词", en: "3-direction explorer + blind visual audit prompt" },
      prompt: {
        zh: "请为当前产品设计首屏与核心介绍页：1) 先不要直接写整页代码，请从色彩、字体（衬线/无衬线）与非常规不对称版式拆解 3 个截然不同的视觉方向，并生成 style-explorer.html 同屏展示三版首屏；2) 禁用蓝紫渐变、Emoji 图标、层层嵌套的卡片容器与解释性废话小字；3) 等我选定一版完成整页并配齐统一风格插图后，启动一个不带历史上下文的子 Agent 对桌面与手机真实截图按 10 分制挑刺修改，直到满 9 分。",
        en: "Design the hero and landing page: 1) before coding the full page, propose 3 distinct visual directions varying palette, serif/sans typography, and asymmetric layout, and render all three heroes in style-explorer.html; 2) ban blue-purple gradients, emoji icons, nested card wrappers, and filler subtitles; 3) once I pick a direction and the full page is rendered, spawn a context-free sub-agent to critique desktop and mobile screenshots on a 10-point rubric until it reaches 9/10.",
      },
      note: { zh: "适用于任何需要跳出 SaaS 默认模板的新页面或改版任务。", en: "Ideal for any new landing page or redesign that needs to break away from default SaaS templates." },
    },
    nextDestinations: [
      { href: "/vibe-hub/vibehub-skill?scenario=ui-design", label: { zh: "用 UI 探索模板写需求", en: "Start a UI exploration brief" }, description: { zh: "在需求工作台直接加载三方向探索与视觉走查模板。", en: "Load the 3-direction UI exploration template in the Brief Workbench." } },
      { href: "/vibe-hub/anti-ai-flavor", label: { zh: "查看防止 AI 味儿图鉴", en: "Open Avoid AI Slop guide" }, description: { zh: "逐条排查页面模板感与不好用的交互。", en: "Inspect recurring UI defaults and UX shortcuts entry by entry." } },
    ],
  },
  {
    slug: "skill-as-product",
    number: "04",
    icon: "skill",
    category: { zh: "Agent 技能工程化", en: "Agent Skill Engineering" },
    title: { zh: "像做产品一样开发 Skill：静默检查、单页分片与双盲评测", en: "Build Agent Skills Like a Product: Silent Checks, Per-Page Chunking & Blind A/B Eval" },
    summary: {
      zh: "把重复提示词升级为可复现的工程资产：默认参数直接跑、确定性逻辑写进脚本、长输出按单页分片防截断、注入本地 HTML 预览页并做子 Agent 双盲测试。",
      en: "Upgrade repeated prompts into productized Skills: run with defaults first, put deterministic logic in scripts, chunk long outputs per page, inject into HTML previews, and run blind sub-agent A/B tests.",
    },
    audience: { zh: "适合希望把团队高频流程（周报、PPT、视频粗剪、代码审查、页面走查）封装成稳定 Skill 的开发者。", en: "For builders packaging recurring workflows (decks, video cuts, code reviews, UI audits) into reliable Skills." },
    outcome: { zh: "掌握让轻量模型和顶配模型都能零失误执行的 6 条 Skill 产品化架构准则。", en: "Six engineering rules that make Skills fast, token-efficient, and reliable across both lightweight and frontier models." },
    relatedTerms: [
      { slug: "skill", label: { zh: "Skill 技能包", en: "Skill" } },
      { slug: "sub-agent", label: { zh: "Sub-agent 子智能体", en: "Sub-agent" } },
      { slug: "ab-test", label: { zh: "A/B Test 对比测试", en: "A/B Test" } },
      { slug: "config-file", label: { zh: "Config File 配置文件", en: "Config File" } },
    ],
    keywords: ["skill", "SKILL.md", "技能", "脚本", "分片", "盲测", "评测", "AGENTS.md", "产品化"],
    sections: [
      {
        id: "silent-post-check-and-scripts",
        title: { zh: "准则一与二：默认直接执行 + 尾部静默提示，确定性步骤一律归脚本", en: "Rules 1 & 2: Run with defaults + silent footer hints, and keep deterministic work in scripts" },
        body: {
          zh: "很多开发者在 SKILL.md 里写“运行前先检查配置文件是否存在”，结果 Agent 每次都要去翻几百行 Python 脚本源码确认字段名，白白烧掉几万 Token。产品级做法是：让 Agent 直接用默认参数跑脚本完成任务，脚本在标准输出末尾打印一行简短提示（告知当前使用的默认配置及修改路径）；同时把时间轴计算、文件合并、格式校验全部写进确定性脚本，绝不让大模型手算。",
          en: "Telling an Agent to 'check configuration before running' often causes it to read hundreds of lines of script source code on every run. Instead, let the Agent invoke the script immediately with sensible defaults and print a one-line footer hint about optional config; keep all timestamp math, file merging, and schema checks inside deterministic scripts.",
        },
        checklist: {
          zh: ["在 SKILL.md 中明确写“不要阅读 scripts/ 源码，直接按命令行参数调用”", "脚本缺省配置时自动采用安全默认值，仅在输出尾部附带一行修改说明", "凡是规则固定的转换（FFmpeg 切片、HTML 拼接、字数与比例校验）全部写成脚本"],
          en: ["Explicitly instruct in SKILL.md: 'Do not read scripts/ source; invoke the CLI directly'", "Use safe defaults automatically and print a one-line customization hint at the end of stdout", "Move all deterministic transformations (FFmpeg cuts, HTML bundling, geometry checks) into scripts"],
        },
      },
      {
        id: "chunking-and-html-preview",
        title: { zh: "准则三与四：按单页/单步拆分中间产物，并用本地 HTML 预览代替终端盲猜", en: "Rules 3 & 4: Write per-page intermediate files and inject into a local HTML preview" },
        body: {
          zh: "当使用轻量级模型或会话上下文已经很长时，如果让模型一次性写出上千行的单文件 HTML 演示文稿，模型极易在后半程偷懒省略或删减原稿论据。解决方案是强制要求“一页一文件”分片落盘（如 slides/page-01.html），最后用脚本拼合；同时为封面、字幕或 UI 方案提供本地 HTML 预览容器，让人在浏览器里直观确认。",
          en: "Lightweight models or long sessions frequently truncate or drop source facts when asked to emit a 1,000-line HTML file in one shot. Force the workflow to write one page or stage per intermediate file (e.g., slides/page-01.html) before script bundling, and inject visual outputs into a local HTML preview page for instant human inspection.",
        },
      },
      {
        id: "blind-eval-and-scope",
        title: { zh: "准则五与六：无上下文子 Agent 双盲 A/B 评测 + 项目级目录隔离", en: "Rules 5 & 6: Context-free sub-agent blind A/B testing + project-scoped Skill isolation" },
        body: {
          zh: "评估主观生成质量（如去 AI 味文案、PPT 排版）时，绝不能让刚干完活的主 Agent 自己给自己打分。应该拉起一个全新的无上下文子 Agent，把“有 Skill”和“无 Skill”跑出的两份结果匿名喂给它做双盲对比。日常维护时，把垂类 Skill 放在项目级目录（如 .codex/skills）而非全部塞进全局环境，防止相似工具描述互相干扰。",
          en: "Never let the authoring Agent grade its own subjective output. Spawn a fresh sub-agent with zero context to blindly compare anonymized outputs generated with and without the Skill. Store domain-specific Skills at the project level rather than globally so overlapping descriptions never pollute unrelated workspaces.",
        },
        checklist: {
          zh: ["相同任务并行跑“加载 Skill”与“不加载 Skill”，交由无上下文子 Agent 盲测打分", "检查 Windows 与 macOS 路径分隔符兼容，避免硬编码个人绝对路径", "将垂类 Skill 收纳进项目目录，并在精简的 AGENTS.md 中维护触发索引"],
          en: ["Compare 'with Skill' vs. 'without Skill' outputs using a fresh blind reviewer sub-agent", "Verify cross-platform path handling without hardcoded local paths", "Keep domain Skills inside the project directory and index them in a concise AGENTS.md"],
        },
      },
    ],
    requestExample: {
      title: { zh: "产品级 Skill 封装与双盲测试提示词", en: "Productized Skill creation & blind eval prompt" },
      prompt: {
        zh: "请帮我把当前这套重复工作流封装为项目级 Skill：1) SKILL.md 写清触发场景、输入输出与禁止事项，并注明直接调用 scripts/ 而不必阅读脚本源码；2) 将固定格式转换与后置校验写成确定性脚本，长输出采用逐页/逐段中间文件落盘再合并；3) 生成完成后，启动一个无上下文子 Agent 对加载该 Skill 前后的产出做一次同题双盲对比评测。",
        en: "Package this workflow as a project-scoped Skill: 1) define triggers, inputs, outputs, and exclusions in SKILL.md, instructing agents to invoke scripts/ directly without reading their source; 2) put deterministic transforms and post-checks in scripts, writing one intermediate file per page before bundling; 3) spawn a fresh sub-agent to run a blind A/B evaluation comparing outputs with and without the Skill.",
      },
      note: { zh: "也可在 VibeHub Skill 页面查看日常高频 10 大 Skill 的完整蓝图。", en: "See the full 10 Daily Skills blueprint on the VibeHub Skill page." },
    },
    nextDestinations: [
      { href: "/vibe-hub/vibehub-skill#ans-skill-matrix", label: { zh: "查看 10 大高频 Skill 图谱", en: "Explore the 10 Daily Skills Matrix" }, description: { zh: "浏览研发、视频、文档三条流水线的 10 个核心 Skill。", en: "Browse 10 core Skills across engineering, media, and document pipelines." } },
      { href: "/vibe-hub/skill", label: { zh: "阅读 Skill 核心概念词条", en: "Read the Skill concept entry" }, description: { zh: "通过交互图解理解 SKILL.md、scripts 与 references 的结构。", en: "Inspect how SKILL.md, scripts, and references fit together." } },
    ],
  },
  {
    slug: "media-content-flywheel",
    number: "05",
    icon: "media",
    category: { zh: "自媒体与口播视频流", en: "Media & Video Pipeline" },
    title: { zh: "用 1–2 小时跑通口播录屏、自动粗剪、OCR 字幕与多平台草稿流", en: "Ship Talking-Head Videos in 1–2 Hours: Outline, Auto Rough-Cut, OCR Captions & Drafts" },
    summary: {
      zh: "围绕真实工程痛点做 Build in Public：不写逐字稿只写防发散大纲，一镜到底录屏后由脚本+Agent 完成去口误粗剪、屏幕术语字幕校对、双尺寸封面与草稿箱投递。",
      en: "Build in public around real engineering pain points: record in one take from a lean outline, then automate VAD+ASR retake cuts, screen-OCR caption fixes, 16:9/3:4 covers, and safe draft uploads.",
    },
    audience: { zh: "适合利用课余或下班后 1–2 小时持续分享真实项目进展、工具实操与踩坑复盘的创作者与开发者。", en: "For developers and students sharing real build-in-public progress in 1–2 hours after work or class." },
    outcome: { zh: "把耗时最长的剪停顿、改错字、做横竖双封面、填多平台简介全部压缩为标准流水线。", en: "Compresses silence trimming, technical typo fixing, dual-aspect cover design, and multi-platform metadata into a repeatable pipeline." },
    relatedTerms: [
      { slug: "video", label: { zh: "Video 视频", en: "Video" } },
      { slug: "typography", label: { zh: "Typography 字幕与封面排版", en: "Typography" } },
      { slug: "human-in-the-loop", label: { zh: "Human-in-the-Loop 人工发布把关", en: "Human-in-the-Loop" } },
      { slug: "skill", label: { zh: "Skill 自动化流水线", en: "Skill" } },
    ],
    keywords: ["视频", "粗剪", "字幕", "封面", "自媒体", "小红书", "B站", "录屏", "口播", "video", "roughcut", "subtitle"],
    sections: [
      {
        id: "outline-and-recording",
        title: { zh: "选题源于真实痛点，只让 AI 写「一句话结论 + 防发散提醒」的大纲", en: "Anchor topics in real pain points and record from a lean anti-tangent outline" },
        body: {
          zh: "持续高产的核心不是苦想脚本，而是把你每天写代码、调工具踩到的真实痛点顺手记下来。开录前不要让 AI 写生硬的逐字稿（照着念既假又慢），只让它生成一份一屏看清的口述大纲：写明一句话核心结论、演示先后顺序、最容易讲嗨跑题的“不要展开项”，以及可以结合自身经历临场发挥的句子。录屏时说错了不用停，直接重说一遍正确的句子继续往下录。",
          en: "Sustainable output comes from documenting real problems you solved today. Before recording, never ask AI for a word-for-word script; ask for a one-screen speaking outline containing a one-line takeaway, demo sequence, explicit 'do not digress into' warnings, and personal anecdote prompts. If you stumble while recording, simply repeat the sentence cleanly and keep going.",
        },
        checklist: {
          zh: ["选题必须解决一个具体可感知的真实痛点，前 3 秒直接亮出结果或对比", "大纲只列结论、顺序与“不要展开项”，不写逐字朗读稿", "录屏遇口误直接重念完整句，全程一镜到底不断流"],
          en: ["Each topic solves a concrete pain point and shows the outcome in the first 3 seconds", "Outlines list takeaway, sequence, and 'do not expand' reminders rather than verbatim scripts", "Repeat stumbled sentences in place during a single continuous recording"],
        },
      },
      {
        id: "roughcut-and-ocr-subtitles",
        title: { zh: "VAD+ASR 自动剪掉停顿与重录废片，结合画面关键帧 OCR 校对专业术语字幕", en: "Cut pauses and retakes via VAD+ASR, and fix technical captions with screen OCR" },
        body: {
          zh: "录完后交给粗剪与字幕流水线：1) 脚本先用 VAD 切掉长静音，再由 Agent 对照词级时间戳找出前后重复的口误重录段，永远保留最后一遍最自然的表达并由 FFmpeg 无损拼接；2) 针对语音识别最容易写错的英文模型名、代码文件名和命令参数，脚本每隔数秒抽取录屏关键帧做 OCR 提取屏幕真实词表，自动修正字幕同音错字并注入本地 HTML 校对页。",
          en: "Hand the raw recording to the editing pipeline: 1) VAD strips silence while the Agent uses word-level ASR timestamps to drop earlier stumbled takes and keep the final clean take; 2) to fix garbled model names, filenames, and CLI flags in ASR captions, a script extracts screen keyframes via OCR to build a ground-truth term list and renders corrected captions in a local HTML preview.",
        },
      },
      {
        id: "dual-covers-and-safe-drafts",
        title: { zh: "一次性渲染 16:9 与 3:4 双画幅封面，自动填好各平台草稿箱并由人工点发布", en: "Render 16:9 and 3:4 covers together, and stop strictly at platform drafts" },
        body: {
          zh: "从视频抽取清晰的半身关键帧，配合高对比度双行标题（10 字以内直击痛点）一次性生成 B 站/YouTube 横版（16:9）与小红书竖版（3:4）封面。最后由发布脚本根据字幕稿生成带时间戳的章节简介与话题标签，自动上传至各平台草稿箱并完成后置字段校验——安全底线是永远停在草稿箱，留给人工做最后一眼审核与发布。",
          en: "Pair a clean speaker keyframe with high-contrast two-line typography to render both 16:9 landscape and 3:4 vertical covers at once. Finally, generate timestamped chapters and platform tags from the transcript and upload everything to platform drafts with post-check validation—always stopping at the draft stage so a human clicks Publish.",
        },
        checklist: {
          zh: ["同时导出 16:9 横版与 3:4 竖版封面，在缩略图尺寸下确认大字清晰可读", "自动化脚本只上传并保存至平台草稿箱，绝不自动点击最终发布", "发布后将字幕稿与后台播放数据沉淀回项目目录，供下一期复盘节奏"],
          en: ["Export both 16:9 and 3:4 covers and verify legibility at thumbnail size", "Automation stops at saved platform drafts and never triggers public publishing", "Archive transcripts and performance metrics in the project folder to refine future pacing"],
        },
      },
    ],
    requestExample: {
      title: { zh: "口播视频大纲与后期流水线提示词", en: "Video outline & post-production pipeline prompt" },
      prompt: {
        zh: "我准备录一期关于「用子 Agent 小队节省 90% 模型额度」的实操视频。请先帮我生成一份一屏口述大纲（含一句话结论、3 步演示顺序、防发散提醒与自由发挥锚点，不要写逐字稿）；等我录完后，依次执行 VAD+ASR 去口误粗剪、录屏画面 OCR 术语字幕校对、16:9 与 3:4 双尺寸封面生成，并整理带时间戳章节的多平台草稿文案。",
        en: "I'm recording a practical video on saving 90% of model budget with sub-agent teams. First generate a one-screen speaking outline (one-line conclusion, 3-step demo order, anti-tangent reminders, and personal story hooks—no verbatim script); once recorded, run VAD+ASR retake rough-cut, screen-OCR term subtitle correction, 16:9 & 3:4 cover generation, and timestamped draft metadata.",
      },
      note: { zh: "将大纲、字幕稿和各期复盘数据统一保存在独立项目目录中管理。", en: "Keep outlines, transcripts, and analytics inside a dedicated project workspace." },
    },
    nextDestinations: [
      { href: "/vibe-hub/vibehub-skill?scenario=media-pipeline", label: { zh: "使用视频流水线需求模板", en: "Use Media Pipeline Brief" }, description: { zh: "在需求工作台一键生成口播视频与内容流任务单。", en: "Generate a structured video and content pipeline brief." } },
      { href: "/hubs/aigc", label: { zh: "前往 ANS AIGC 中心", en: "Open ANS AIGC Hub" }, description: { zh: "查看平台登记的视觉、视频与媒体工具资源。", en: "Explore registered visual, video, and media tools on ANS." } },
    ],
  },
  {
    slug: "agent-team-and-cost",
    number: "06",
    icon: "team",
    category: { zh: "多 Agent 协作与工程治理", en: "Multi-Agent & Project Governance" },
    title: { zh: "多 Agent 小队分工、1:20:100 模型费率路由与长期项目治理", en: "Multi-Agent Team Mode, 1:20:100 Cost Routing & Long-Project Governance" },
    summary: {
      zh: "用 Explorer / Executor / Reviewer / Advisor 四角色分工替代单模型盲目硬啃，结合开发前 Explore、提交前 Simplify 与 AGENTS.md 索引管理长期代码库。",
      en: "Replace single-model brute force with Explorer, Executor, Reviewer, and Advisor sub-agents, pairing pre-coding Explore and pre-commit Simplify with a lean AGENTS.md project index.",
    },
    audience: { zh: "适合在大型仓库或多模块项目中高频使用编码 Agent、希望稳住代码质量并防止额度瞬间见底的开发者。", en: "For developers using coding agents on multi-module repos who want clean code without burning through weekly token quotas." },
    outcome: { zh: "掌握主从模型角色错位搭配、长上下文防漏召回、提交前代码消肿与长期项目目录治理的实战方法。", en: "Practical rules for main/sub-agent model pairing, long-context recall, pre-commit code simplification, and repository memory." },
    relatedTerms: [
      { slug: "sub-agent", label: { zh: "Sub-agent 子智能体", en: "Sub-agent" } },
      { slug: "context-window", label: { zh: "Context Window 上下文窗口", en: "Context Window" } },
      { slug: "agent-memory", label: { zh: "Agent Memory 智能体记忆", en: "Agent Memory" } },
      { slug: "worktree", label: { zh: "Worktree 工作树", en: "Worktree" } },
    ],
    keywords: ["子agent", "小队模式", "sub-agent", "team", "token", "额度", "luna", "sol", "astra", "simplify", "AGENTS.md"],
    sections: [
      {
        id: "cost-tiers-and-roles",
        title: { zh: "看懂 1:20:100 费率差：为什么轻量模型当主执行或子执行需要不同喂法", en: "Understand 1:20:100 cost tiers and how to feed lightweight executors" },
        body: {
          zh: "不同档位模型的单价往往相差 20 倍甚至 100 倍。实测表明，轻量级高推理模型足以胜任 95% 的日常开发、浏览器自动化与内容脚本维护，它唯一的短板是“超长上下文末端叠加含糊指令时，容易漏掉项目里已有的规范或 Skill”。解决办法有两条：1) 若直接用轻量模型当主对话模型，由人用一两句清晰指令直接点明要用的 Skill 名；2) 若开启小队模式，由主 Agent 在派发任务前把要读哪几份规范、要改哪几个文件交代清楚，交给轻量 Executor 执行，而把最昂贵的顶配模型设为按需唤醒的专家顾问（Advisor）。",
          en: "Model pricing across tiers often spans 1:20:100. Lightweight high-reasoning models can handle 95% of daily coding, browser automation, and script maintenance—their main weakness is missing implicit Skills or rules at the end of a long context when given vague prompts. Fix this two ways: 1) when using a lightweight model directly, name the target Skill or file explicitly; 2) in team mode, have the main agent pass exact rule paths and file boundaries to a lightweight Executor, reserving the most expensive model for an on-demand Expert Advisor.",
        },
        checklist: {
          zh: ["Explorer（轻量高速）：只负责跨目录查文件与调用链，向主窗口返回精简路径摘要", "Executor（轻量高推理）：接收明确的文件边界与必读规范路径，完成具体代码实现", "Reviewer & Advisor（中/高阶模型）：提交前独立挑刺消肿，仅在连续多轮卡壳时唤醒顶配顾问"],
          en: ["Explorer (fast lightweight): maps files and call chains, returning only compact summaries to the main window", "Executor (high-reasoning lightweight): implements bounded edits with explicit rule and file paths", "Reviewer & Advisor (mid/top tier): runs pre-commit simplification, invoking top-tier advisors only on hard deadlocks"],
        },
      },
      {
        id: "explore-and-simplify-loop",
        title: { zh: "开发前 Explore 保主窗口清爽，提交前 Simplify 砍过度封装与死代码", en: "Explore before coding to keep context clean; Simplify before commit to strip bloat" },
        body: {
          zh: "大模型写代码有个通病：喜欢一层接一层加防守判断、不看存量代码重复维护同一份派生状态、或者迁移完新方案后把旧代码留在仓库里烂掉。因此在小队规范中内置两道动作：动工前先 Explore（避免主窗口一上来被十几份源码塞满）；改完代码准备提交前自动拉起无历史包袱的 Reviewer 执行 Simplify，专门砍掉冗余分支、合并重复工具函数并清理过时代码。",
          en: "Coding models love stacking defensive checks, duplicating derived state instead of reusing existing helpers, and leaving stale code behind after migrations. Enforce a two-step loop: run Explore before coding so raw files never flood the main context, and spawn a fresh Reviewer to run Simplify before committing—stripping redundant conditionals, duplicate state, and dead code.",
        },
      },
      {
        id: "long-project-governance",
        title: { zh: "用精简 AGENTS.md、项目级 Skill 与可视化 Diff 管理长期工程", en: "Manage long-running projects with a lean AGENTS.md, project Skills, and visual Diffs" },
        body: {
          zh: "管理长期项目（无论是代码仓库还是持续沉淀数据的自媒体/创业工作区）的核心是“用目录和文件充当跨会话记忆”。在根目录放一份精简的 AGENTS.md 写清项目定位与关键文件索引；把垂类工作流收纳在项目级隐藏目录（如 .codex/skills）中；并行开发时使用 Git Worktree 隔离分支，并在合入前输出结构化 Diff 走查报告。",
          en: "Long-running projects rely on files and directory structure as cross-session memory. Keep a concise AGENTS.md at the root indexing key docs and workflows, scope domain Skills to the project folder, isolate concurrent tasks in Git Worktrees, and review structured diffs before merging.",
        },
      },
    ],
    requestExample: {
      title: { zh: "开启小队模式与提交前精简审查提示词", en: "Team mode + pre-commit Simplify prompt" },
      prompt: {
        zh: "请按多 Agent 小队规范处理本次跨模块改造：1) 先派 Explorer 摸清相关组件、接口与测试文件位置，只带回结构化摘要；2) 明确列出需要遵守的边界规则与修改文件后完成实现；3) 提交前启动一个不带历史上下文的 Reviewer 子 Agent，检查是否存在重复派生状态、过度防御分支、未清理的旧代码或暴露在 UI 上的内部字段，精简通过后再运行测试与 Git Diff 汇总。",
        en: "Run this cross-module change with the multi-agent team workflow: 1) send an Explorer to locate relevant components, contracts, and tests and return a compact summary; 2) state explicit boundary rules and target files before implementing; 3) before committing, spawn a context-free Reviewer sub-agent to strip duplicate derived state, over-defensive branches, leftover migration code, and exposed internal UI fields, then run tests and summarize the Git diff.",
      },
      note: { zh: "顺手可改的单文件小改动无需强行拆分子 Agent，按任务复杂度灵活启用。", en: "Keep trivial single-file edits in the main agent; invoke sub-agents when tasks span multiple modules." },
    },
    nextDestinations: [
      { href: "/vibe-hub/vibehub-skill?scenario=agent-team", label: { zh: "打开多 Agent 协作需求模板", en: "Open Multi-Agent Brief Template" }, description: { zh: "在需求工作台生成带 Explore/Simplify 约束的工程任务单。", en: "Generate an engineering brief with Explore and Simplify guardrails." } },
      { href: "/workspace/credits", label: { zh: "查看工作台积分与账单记录", en: "Check Workspace Credits" }, description: { zh: "结合账单流水复盘不同任务与模型的真实消耗。", en: "Review real credit usage across tasks and workflows in your workspace." } },
    ],
  },
  {
    slug: "creative-production",
    number: "07",
    icon: "creative",
    category: { zh: "AIGC 视觉与视频创作", en: "AIGC Visual & Video Work" },
    title: { zh: "把图像、分镜和短片流程拆成可控步骤", en: "Break Image, Storyboard, and Video Work into Controllable Steps" },
    summary: {
      zh: "先定情绪板、角色或画幅，再分步生成素材、挑选版本和合成字幕，不把一次抽卡当成完整作品。",
      en: "Lock moodboard, character, and aspect ratio first, then generate assets, select takes, and assemble captions step by step instead of relying on one-shot generation.",
    },
    audience: { zh: "适合用 AIGC 做海报、漫剧分镜、课程短片、活动预告和视觉实验的同学。", en: "For students creating posters, comic storyboards, course shorts, event teasers, and visual experiments." },
    outcome: { zh: "把创作拆成风格设定、固定元素、镜头列表和导出检查四步。", en: "A four-step pipeline covering style direction, fixed elements, shot list, and export checks." },
    relatedTerms: [
      { slug: "moodboard", label: { zh: "Moodboard 情绪板", en: "Moodboard" } },
      { slug: "image", label: { zh: "Image 图像组件与比例", en: "Image" } },
      { slug: "video", label: { zh: "Video 视频与封面", en: "Video" } },
      { slug: "typography", label: { zh: "Typography 字体排印", en: "Typography" } },
    ],
    keywords: ["aigc", "视频", "海报", "分镜", "生图", "漫剧", "image", "video", "storyboard", "moodboard"],
    sections: [
      {
        id: "moodboard",
        title: { zh: "先定 3 张参考图和明确不要的风格", en: "Pick three references and name the styles to avoid" },
        body: {
          zh: "告诉工具色调、光线、材质、镜头距离和画面比例，同时写明不要过度磨皮、不要霓虹赛博乱光、不要堆满无意义英文小字。",
          en: "Specify palette, lighting, texture, camera distance, and aspect ratio, while excluding plastic skin, random neon glow, or meaningless decorative micro-text.",
        },
      },
      {
        id: "consistency",
        title: { zh: "把固定元素和可变镜头分开管理", en: "Separate fixed identity from changing shots" },
        body: {
          zh: "连续分镜或系列海报里，角色服装、主色、字体位置和画幅比例要保持一致；每个镜头只改动作、景别或场景焦点。",
          en: "Across a storyboard or poster series, keep wardrobe, key color, type placement, and aspect ratio steady while varying only action, framing, or focal scene.",
        },
        checklist: {
          zh: ["固定画幅：横版 16:9、竖版 9:16 或海报 3:4", "固定角色或主视觉特征词，不每张重写", "文字标题后期排版，不依赖生图模型直接拼长句"],
          en: ["Lock aspect ratio: 16:9 landscape, 9:16 vertical, or 3:4 poster", "Reuse character or key-visual descriptors across shots", "Set headlines in layout tools rather than relying on image models for long text"],
        },
      },
      {
        id: "export",
        title: { zh: "导出前检查封面、字幕安全区和来源说明", en: "Check cover frame, caption safe area, and attribution before export" },
        body: {
          zh: "视频要确认首帧不是黑屏、字幕没有压住底部按钮；公开展示时写清使用的生成工具、人工剪辑部分与配乐来源。",
          en: "Confirm the video cover frame is not black, captions clear bottom UI controls, and public descriptions credit the generation tools, human editing, and audio sources.",
        },
      },
    ],
    requestExample: {
      title: { zh: "三镜头短片分镜需求示例", en: "Three-shot storyboard brief" },
      prompt: {
        zh: "为校园农科创新展做一段 15 秒竖版预告片（9:16），共 3 个镜头：1）清晨温室叶片特写，自然晨光；2）学生调试传感器数据面板，中景；3）展览主题与时间落版，留出底部三分之一排文字。风格写实克制，不要科幻霓虹光效。",
        en: "Create a 15-second vertical teaser (9:16) in 3 shots for a campus agri-tech exhibition: 1) close-up of greenhouse leaves in morning light; 2) medium shot of a student calibrating a sensor dashboard; 3) closing card with bottom third reserved for title and date. Keep a realistic, restrained look without sci-fi neon glow.",
      },
      note: { zh: "先确认分镜文字，再进入图像或视频生成工具。", en: "Confirm the shot list in text before generating images or video." },
    },
    nextDestinations: [
      { href: "/hubs/aigc", label: { zh: "进入 ANS AIGC 中心", en: "Open ANS AIGC Hub" }, description: { zh: "查看平台已登记的 AIGC 项目与托管工具入口。", en: "View registered AIGC projects and hosted tool entries." } },
      { href: "/explore", label: { zh: "在探索广场查看视觉与视频项目", en: "Explore Visual & Video Projects" }, description: { zh: "参考真实上架项目如何组织示例与说明。", en: "See how published projects organize demos and documentation." } },
    ],
  },
  {
    slug: "github-to-project",
    number: "08",
    icon: "repo",
    category: { zh: "开源学习与复现", en: "Open-Source Learning" },
    title: { zh: "从探索广场点进 GitHub 仓库后，怎么学、怎么改、怎么留痕", en: "How to Study, Adapt, and Document a GitHub Repo from Explore" },
    summary: {
      zh: "先跑通原项目，再在独立分支上做小步改动；用 Diff、Commit 和测试记录你真正理解并修改了什么。",
      en: "Run the original project first, make small changes on a separate branch, and use diffs, commits, and tests to show what you understood and changed.",
    },
    audience: { zh: "适合在 ANS 探索广场看开源项目、准备复现实验或二次开发的同学。", en: "For students browsing open-source projects in ANS Explore to reproduce experiments or build adaptations." },
    outcome: { zh: "学会克隆、跑通、看改动边界、写清复现步骤和保留原作者署名。", en: "A repeatable habit for cloning, running, reviewing diffs, documenting setup, and preserving upstream credit." },
    relatedTerms: [
      { slug: "clone", label: { zh: "Clone 克隆仓库", en: "Clone" } },
      { slug: "branch", label: { zh: "Branch 分支隔离", en: "Branch" } },
      { slug: "diff", label: { zh: "Diff 差异对比", en: "Diff" } },
      { slug: "commit", label: { zh: "Commit 提交记录", en: "Commit" } },
    ],
    keywords: ["github", "git", "开源", "仓库", "复现", "clone", "branch", "diff", "commit", "readme"],
    sections: [
      {
        id: "run-first",
        title: { zh: "还没跑通原项目前，不要让 AI 大改代码", en: "Run the upstream baseline before asking AI for broad edits" },
        body: {
          zh: "先读 README、package.json 或 requirements.txt，确认本地环境能启动原版。这样后面出错时，你能分清是原仓库配置问题还是新改动引入的问题。",
          en: "Read README, package.json, or requirements.txt and get the original version running first. That way you can tell baseline setup issues apart from regressions caused by your edits.",
        },
      },
      {
        id: "small-diff",
        title: { zh: "一次只改一个明确模块，并看懂 Git Diff", en: "Change one bounded area at a time and read the Git diff" },
        body: {
          zh: "新建一个分支专门放你的实验。每次让 Agent 改完，先看 Diff 里动了哪些文件、有没有误删配置或把密钥写进仓库，再决定是否 Commit。",
          en: "Create a branch for your experiment. After each Agent edit, inspect the diff to verify touched files, intact configs, and no leaked secrets before committing.",
        },
        checklist: {
          zh: ["确认 .env、密钥和大体积临时文件已在 .gitignore 中忽略", "每次 Commit 只表达一个清楚意图，方便随时回退", "跑一遍项目自带的 lint、typecheck 或最小测试"],
          en: ["Confirm .env, secrets, and large temp files are ignored by .gitignore", "Keep each commit focused on one clear intent for easy rollback", "Run the project's lint, typecheck, or minimal test suite"],
        },
      },
      {
        id: "credit",
        title: { zh: "公开展示时诚实区分上游原作者与你的改造", en: "Clearly separate upstream authorship from your adaptation" },
        body: {
          zh: "保留原仓库许可证和致谢链接，在 README 或提交说明中写清：原项目解决了什么、你改了哪些页面或数据、别人如何复现你的版本。",
          en: "Keep the upstream license and credit link, and state in your README or submission notes what the original repo did, what you changed, and how others can reproduce your version.",
        },
      },
    ],
    requestExample: {
      title: { zh: "让 Agent 先解释仓库结构的提示词", en: "Repo orientation prompt" },
      prompt: {
        zh: "先不要修改任何代码。请阅读当前仓库的 README 和目录结构，告诉我：1）入口文件在哪里；2）本地启动和测试命令是什么；3）如果我只想替换示例数据和首页文案，最小需要改哪几个文件。",
        en: "Do not edit any code yet. Read the README and directory structure, then tell me: 1) where the entry file is; 2) which commands start and test the project locally; 3) the minimum files to touch if I only want to replace sample data and homepage copy.",
      },
      note: { zh: "先看懂边界，再开分支动手。", en: "Understand the boundary first, then create a branch and edit." },
    },
    nextDestinations: [
      { href: "/explore", label: { zh: "去 ANS 探索广场挑项目", en: "Browse Projects in ANS Explore" }, description: { zh: "按分类查看真实开源项目、封面和仓库链接。", en: "Browse open-source projects, covers, and repository links by category." } },
      { href: "/vibe-hub/courses/git-collaboration-and-delivery", label: { zh: "学习 Git 协作与交付专题课", en: "Open Git Collaboration Course" }, description: { zh: "把工作树、分支、Diff、合并冲突和回退一次理顺。", en: "Walk through working tree, branches, diffs, merge conflicts, and recovery." } },
    ],
  },
  {
    slug: "competition-evidence",
    number: "09",
    icon: "competition",
    category: { zh: "竞赛提交与成果留档", en: "Competitions & Evidence" },
    title: { zh: "参加农客松或课程答辩时，怎么整理可核验的作品证据包", en: "Prepare a Verifiable Submission Package for AgriHackathon or Course Defense" },
    summary: {
      zh: "评委看重真实问题、可运行演示、团队分工和过程记录；提前准备截图、链接和回退预案，不在截止前临时拼凑。",
      en: "Judges look for a real problem, a working demo, clear team roles, and process evidence; prepare screenshots, links, and a backup plan before the deadline.",
    },
    audience: { zh: "适合参加中国农大农客松（AgriHackathon）、校园黑客松、创新创业赛或课程结题答辩的团队。", en: "For teams entering CAU AgriHackathon, campus hackathons, innovation contests, or course defenses." },
    outcome: { zh: "整理出一份包含问题背景、演示入口、关键截图、仓库说明和团队分工的提交材料。", en: "A submission package with problem context, demo entry, key screenshots, repository notes, and team roles." },
    relatedTerms: [
      { slug: "mvp", label: { zh: "MVP 最小可行产品", en: "MVP" } },
      { slug: "smoke-test", label: { zh: "Smoke Test 冒烟测试", en: "Smoke Test" } },
      { slug: "fallback", label: { zh: "Fallback 降级预案", en: "Fallback" } },
      { slug: "quality-gate", label: { zh: "Quality Gate 质量门禁", en: "Quality Gate" } },
    ],
    keywords: ["比赛", "农客松", "答辩", "提交", "黑客松", "agrihackathon", "competition", "hackathon", "mvp", "证据"],
    sections: [
      {
        id: "mvp-path",
        title: { zh: "围绕一条能完整走通的主路径准备演示", en: "Build the demo around one complete end-to-end path" },
        body: {
          zh: "比赛时间有限，与其摆十个点不开的空按钮，不如把一条真实业务路径跑通：输入一段真实样本、展示清晰处理过程、给出可核对的结果。",
          en: "Contest time is short. One working path with real sample input, visible processing, and verifiable output beats ten decorative buttons that do nothing.",
        },
      },
      {
        id: "evidence-pack",
        title: { zh: "把链接、截图、录屏和分工放进同一份说明", en: "Keep links, screenshots, screen recordings, and team roles in one note" },
        body: {
          zh: "现场网络或外部接口可能波动。除了线上地址，准备 3 到 5 张关键状态截图和一段简短操作录屏，并写清每位成员负责的模块。",
          en: "Live Wi-Fi or external APIs can fail during judging. Alongside your live URL, prepare 3 to 5 key state screenshots, a short screen recording, and each teammate's role.",
        },
        checklist: {
          zh: ["主流程在无缓存或新窗口下跑过一遍冒烟检查", "准备离线截图或录屏作为现场网络降级预案", "诚实标注哪些部分已实装、哪些是后续规划"],
          en: ["Smoke-test the primary flow in a fresh window", "Prepare offline screenshots or a short recording as a live-network fallback", "State honestly which parts are implemented now versus planned next"],
        },
      },
      {
        id: "submit-clean",
        title: { zh: "截止前冻结大改动，只修阻塞问题", en: "Freeze broad changes before the deadline and fix blockers only" },
        body: {
          zh: "提交前最后两小时不要顺手重构样式或改数据库结构。确认提交表单、附件链接、团队信息和公开展示内容一致。",
          en: "In the final two hours, avoid sweeping style refactors or schema changes. Verify that your submission form, attachment links, team roster, and public showcase card match.",
        },
      },
    ],
    requestExample: {
      title: { zh: "比赛答辩一页说明整理提示词", en: "One-page defense summary prompt" },
      prompt: {
        zh: "根据我们项目目前已实现的真实功能，整理一份比赛提交说明：1）痛点与服务对象；2）现场可演示的 3 个步骤；3）已验证的数据或测试结果；4）团队成员分工；5）尚未实现、计划赛后继续完成的部分。不要夸大未上线能力。",
        en: "From the features we have actually implemented, draft a competition submission summary: 1) problem and target users; 2) the 3 live demo steps; 3) verified data or test results; 4) teammate roles; 5) work planned for after the event. Do not overstate unshipped capabilities.",
      },
      note: { zh: "如实区分已跑通功能与未来规划，往往比满篇口号更有说服力。", en: "Separating working functionality from future plans is more credible than grand slogans." },
    },
    nextDestinations: [
      { href: "/competitions/agrihackathon", label: { zh: "查看农客松赛事页面", en: "Open AgriHackathon" }, description: { zh: "进入赛事说明、任务要求与提交入口。", en: "Read competition rules, tasks, and submission entry points." } },
      { href: "/hubs/cauhub", label: { zh: "进入中国农大中心 CAUHub", en: "Open CAUHub" }, description: { zh: "查看中国农大相关的真实活动与社团入口。", en: "View explicit China Agricultural University activities and resources." } },
    ],
  },
  {
    slug: "account-and-cost",
    number: "10",
    icon: "cost",
    category: { zh: "凭据安全与成本控制", en: "Credentials & Cost" },
    title: { zh: "在工作台调用模型或流程前，管好密钥、额度与失败回退", en: "Manage Keys, Quotas, and Fallbacks Before Running Models or Workflows" },
    summary: {
      zh: "把 API Key、环境变量、积分额度和错误提示看清楚，不把密钥写进前端或公开仓库，也不把一次超时当成黑盒崩溃。",
      en: "Keep API keys, environment variables, credit usage, and failure states explicit; never commit secrets to frontend code or public repos.",
    },
    audience: { zh: "适合使用 ANS 工作台、配置自带凭据（BYOK）或在本地项目里接入模型接口的同学。", en: "For members using ANS Workspace, configuring BYOK credentials, or calling model APIs in local projects." },
    outcome: { zh: "建立密钥隔离、小样本试跑、账单核对和失败排查四条安全习惯。", en: "Four habits for secret isolation, small test runs, ledger review, and failure diagnosis." },
    relatedTerms: [
      { slug: "api-key", label: { zh: "API Key 接口密钥", en: "API Key" } },
      { slug: "env-var", label: { zh: "环境变量 Environment Variable", en: "Environment Variable" } },
      { slug: "rate-limiting", label: { zh: "Rate Limiting 限流保护", en: "Rate Limiting" } },
      { slug: "retry", label: { zh: "Retry 重试与幂等", en: "Retry" } },
    ],
    keywords: ["密钥", "积分", "额度", "工作台", "api-key", "env", "credits", "byok", "workspace", "成本"],
    sections: [
      {
        id: "secrets",
        title: { zh: "密钥只放在服务端配置或受保护凭据中心", en: "Keep keys in server environment variables or the protected credential vault" },
        body: {
          zh: "任何写进浏览器代码、截图或公开 Git 仓库的密钥都等于公开泄露。使用环境变量或工作台的模型凭据管理，并在提交前检查 .gitignore。",
          en: "Any key placed in browser code, screenshots, or a public Git repo is exposed. Use server environment variables or Workspace model credentials, and verify .gitignore before committing.",
        },
        checklist: {
          zh: ["不在前端组件、README 或提问截图里粘贴真实 API Key", "一旦怀疑泄露，先去供应方后台吊销旧 Key 再换新 Key", "区分测试环境与正式环境的凭据权限"],
          en: ["Never paste real API keys into client components, READMEs, or screenshots", "Revoke and rotate any key immediately if exposure is suspected", "Separate test credentials from production permissions"],
        },
      },
      {
        id: "small-batch",
        title: { zh: "先用一条最小输入试跑，再批量生成", en: "Run one minimal input before batch execution" },
        body: {
          zh: "无论是生成图片、跑长文档还是执行多步工作流，先用一条小样本确认输出格式、耗时和积分消耗，再决定是否扩大规模。",
          en: "Whether generating images, processing long documents, or running a multi-step workflow, test one small sample to verify format, latency, and credit cost before scaling up.",
        },
      },
      {
        id: "ledger",
        title: { zh: "遇到失败先看状态、错误码和账单记录", en: "Check status, error codes, and credit ledger when a run fails" },
        body: {
          zh: "区分网络超时、参数格式错误、额度不足和上游限流。不要盲目连点重试，避免重复扣费或触发更严格的限流。",
          en: "Distinguish network timeouts, invalid parameters, insufficient credits, and upstream rate limits. Avoid rapid blind retries that can duplicate charges or trigger stricter throttling.",
        },
      },
    ],
    requestExample: {
      title: { zh: "让 Agent 排查密钥泄露与重试风险的提示词", en: "Secret & retry audit prompt" },
      prompt: {
        zh: "请扫描当前项目的环境变量读取和接口调用代码：1）确认没有把私密 API Key 暴露给客户端 bundle；2）确认外部请求设置了超时和明确的错误提示；3）列出本地启动需要配置的环境变量名（不要打印真实密钥值）。",
        en: "Audit environment variable usage and API calls in this project: 1) confirm no private API keys are exposed to the client bundle; 2) confirm external requests set timeouts and clear error messages; 3) list required environment variable names without printing secret values.",
      },
      note: { zh: "让 AI 检查配置名和调用边界，不要把真实密钥发进公开对话。", en: "Ask AI to inspect variable names and call boundaries—never paste live secrets into public chats." },
    },
    nextDestinations: [
      { href: "/workspace/credits", label: { zh: "查看工作台积分与账单", en: "Open Workspace Credits" }, description: { zh: "核对当前账户余额、兑换记录与使用流水。", en: "Review your current balance, redemptions, and usage ledger." } },
      { href: "/workspace/settings/models", label: { zh: "管理模型凭据设置", en: "Manage Model Credentials" }, description: { zh: "在受保护的工作台设置里配置或更新凭据。", en: "Configure or update credentials inside protected Workspace settings." } },
    ],
  },
];

export function getAnsPractice(slug: string): AnsPractice | undefined {
  return ANS_PRACTICES.find(item => item.slug === slug);
}

export function findAnsPracticesForTerm(slug: string): AnsPractice[] {
  return ANS_PRACTICES.filter(item => item.relatedTerms.some(term => term.slug === slug));
}

export function searchAnsPractices(query: string): AnsPractice[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...ANS_PRACTICES];
  return ANS_PRACTICES.filter(item =>
    [item.slug, item.title.zh, item.title.en, item.summary.zh, item.summary.en, ...item.keywords, ...item.relatedTerms.map(t => `${t.slug} ${t.label.zh} ${t.label.en}`)]
      .some(text => text.toLowerCase().includes(q)),
  );
}
