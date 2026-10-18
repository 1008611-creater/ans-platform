import type { VibeText } from "./ans-practices";

export type AnsRewriteExample = {
  id: string;
  label: VibeText;
  before: VibeText;
  after: VibeText;
  why: VibeText;
  terms: { slug: string; label: VibeText }[];
};

export type AnsDailySkill = {
  id: string;
  number: string;
  code: string;
  pipelineId: "engineering" | "media" | "content";
  title: VibeText;
  trigger: VibeText;
  mechanism: VibeText;
  boundary: VibeText;
  agentPrompt: VibeText;
  relatedTerms: { slug: string; label: VibeText }[];
  guideHref: string;
};

export type AnsSkillPipeline = {
  id: "engineering" | "media" | "content";
  number: string;
  title: VibeText;
  summary: VibeText;
  flowSteps: VibeText[];
};

export type AnsSkillPrinciple = {
  id: string;
  number: string;
  title: VibeText;
  problem: VibeText;
  solution: VibeText;
};

export const ANS_REWRITE_EXAMPLES: readonly AnsRewriteExample[] = [
  {
    id: "interaction-states",
    label: { zh: "按钮交互与过渡", en: "Button states & transition" },
    before: {
      zh: "这个按钮鼠标放上去变个色，点下去也要有一下反馈，别太生硬。",
      en: "Change the button color when I move the mouse over it, and make it react smoothly when I press it.",
    },
    after: {
      zh: "为当前主操作按钮补充 Hover（悬停）状态、Active（按下）状态与 Focus（键盘聚焦）样式，并使用 160ms Transition（过渡）让颜色与轻微缩放自然衔接，不改动按钮原有尺寸与布局。",
      en: "Add Hover, Active, and keyboard Focus states to the primary button, and apply a 160ms Transition so the color and subtle scale shift feel smooth without changing button dimensions.",
    },
    why: {
      zh: "只补齐消除歧义的状态名（Hover / Active / Focus / Transition），不擅自指定动画库或重画组件。",
      en: "Adds only the exact state terms (Hover / Active / Focus / Transition) without inventing an animation library or redesigning the component.",
    },
    terms: [
      { slug: "hover", label: { zh: "Hover 悬停状态", en: "Hover" } },
      { slug: "active", label: { zh: "Active 激活状态", en: "Active" } },
      { slug: "focus", label: { zh: "Focus 聚焦状态", en: "Focus" } },
      { slug: "transition", label: { zh: "Transition 过渡", en: "Transition" } },
    ],
  },
  {
    id: "instant-toggle",
    label: { zh: "即时生效 vs 表单保存", en: "Instant toggle vs. form save" },
    before: {
      zh: "这个深色模式设置我想改了就马上生效，不想让用户再点一次保存按钮。",
      en: "I want this dark-mode setting to take effect as soon as I change it without clicking another Save button.",
    },
    after: {
      zh: "将该二元设置项改为 Switch（开关）组件：切换后立即更新当前主题状态并持久化到本地配置，移除多余的提交按钮；若后续存在需多项联动确认的设置，仍保留在表单（Form）内统一提交。",
      en: "Use a Switch control for this binary setting so toggling immediately updates and persists the theme without a Save button; keep multi-field settings inside a Form for explicit submission.",
    },
    why: {
      zh: "主动区分立即生效的 Switch 与需要批量确认的 Form / Checkbox，给出适用边界。",
      en: "Distinguishes an immediate two-state Switch from a batched Form or Checkbox and states when not to use it.",
    },
    terms: [
      { slug: "switch", label: { zh: "Switch 开关", en: "Switch" } },
      { slug: "form", label: { zh: "Form 表单", en: "Form" } },
      { slug: "dark-mode", label: { zh: "Dark Mode 深色模式", en: "Dark Mode" } },
    ],
  },
  {
    id: "ui-three-directions",
    label: { zh: "多方向首屏探索", en: "3-direction hero exploration" },
    before: {
      zh: "帮我做一个有设计感的产品介绍页，随便发挥，别做成那种很像 AI 生成的蓝紫渐变卡片。",
      en: "Make a creative product landing page, surprise me, and don't make it look like generic AI blue-purple cards.",
    },
    after: {
      zh: "先为首屏（Hero）与核心行动号召（CTA）拆解 3 套配色、字体（衬线与非衬线对比）和版式结构完全不同的视觉方案，生成 style-explorer.html 并排预览；禁用居中对称卡片堆叠、蓝紫渐变与多余的副标题说明文字，等我选定一版后再展开整页并交由无历史上下文的 Sub-agent 做截图走查。",
      en: "First propose 3 distinct Hero and CTA directions varying palette, Serif/Sans typography, and layout structure in a side-by-side style-explorer.html preview; avoid centered card stacks, blue-purple gradients, and filler subtitles, then expand my chosen direction and run a context-free Sub-agent screenshot review.",
    },
    why: {
      zh: "把无效的“随便发挥”转化为可对比的 3 方向同屏探索 + 明确删减项 + 独立子 Agent 走查。",
      en: "Replaces vague 'surprise me' prompting with a concrete 3-direction side-by-side explorer, explicit de-slop rules, and a fresh sub-agent review.",
    },
    terms: [
      { slug: "hero", label: { zh: "Hero 首屏主视觉", en: "Hero" } },
      { slug: "cta", label: { zh: "CTA 行动号召", en: "CTA" } },
      { slug: "serif-sans", label: { zh: "衬线与非衬线", en: "Serif & Sans" } },
      { slug: "sub-agent", label: { zh: "Sub-agent 子智能体", en: "Sub-agent" } },
    ],
  },
  {
    id: "subagent-cost-routing",
    label: { zh: "小队分工与省额度", en: "Sub-agent team & token budget" },
    before: {
      zh: "这个跨好几个目录的任务太费 Token 了，你派几个小助手分开查代码和改代码，最后帮我把把关。",
      en: "This multi-directory task burns too many tokens. Send helper agents to search and edit code, then review it at the end.",
    },
    after: {
      zh: "开启子智能体（Sub-agent）小队模式：1) 先派轻量高速 Explorer 扫描仓库，只将目标文件路径与接口摘要带回上下文窗口（Context Window）；2) 由主 Agent 写清必读规范与文件边界后派 Executor 完成修改；3) 提交前拉起无历史包袱的 Reviewer 检查是否过度封装或重复派生状态。",
      en: "Enable Sub-agent team mode: 1) dispatch a fast lightweight Explorer to return only target file paths and interface summaries to the main Context Window; 2) hand explicit rule files and file boundaries to an Executor; 3) spawn a fresh Reviewer before commit to strip over-engineering and duplicate state.",
    },
    why: {
      zh: "明确主从 Agent 的上下文交接边界与 Explore → Execute → Simplify 三阶段流程。",
      en: "Defines exact context handoffs between main and sub-agents using an Explore -> Execute -> Simplify loop.",
    },
    terms: [
      { slug: "sub-agent", label: { zh: "Sub-agent 子智能体", en: "Sub-agent" } },
      { slug: "context-window", label: { zh: "Context Window 上下文窗口", en: "Context Window" } },
      { slug: "reasoning-model", label: { zh: "Reasoning Model 推理模型", en: "Reasoning Model" } },
    ],
  },
  {
    id: "git-isolation-ship",
    label: { zh: "分支隔离与改动交付", en: "Branch isolation & clean delivery" },
    before: {
      zh: "我怕改坏现在的线上代码，你先在旁边试着改，改完给我看看动了哪些地方再保存上传。",
      en: "I'm afraid of breaking the current code. Try the changes on the side, show me what changed, and then save and upload.",
    },
    after: {
      zh: "从当前主干创建独立 Git Branch（或使用 Git Worktree 隔离目录）进行开发；完成后先用 Git Diff 列出新增、修改与删除的文件边界并检查 .gitignore 是否排除了环境变量与临时产物，待我确认测试通过后再执行 Commit 与 Push。",
      en: "Create an isolated Git Branch (or Git Worktree) before editing; once complete, summarize added, modified, and removed files via Git Diff and verify .gitignore excludes secrets and build artifacts before running Commit and Push.",
    },
    why: {
      zh: "将“在旁边试着改、看看动了哪”映射为标准的 Branch / Worktree / Diff / Commit 工程流程。",
      en: "Maps 'try on the side and show what changed' to standard Branch, Worktree, Diff, and Commit steps.",
    },
    terms: [
      { slug: "branch", label: { zh: "Branch 分支", en: "Branch" } },
      { slug: "worktree", label: { zh: "Worktree 工作树", en: "Worktree" } },
      { slug: "diff", label: { zh: "Diff 差异对比", en: "Diff" } },
      { slug: "commit", label: { zh: "Commit 提交", en: "Commit" } },
    ],
  },
];

export const ANS_SKILL_PIPELINES: readonly AnsSkillPipeline[] = [
  {
    id: "engineering",
    number: "01",
    title: {
      zh: "工程研发与代码审查交付流水线",
      en: "Engineering, Sub-Agent Review & Git Delivery Pipeline",
    },
    summary: {
      zh: "先派轻量探索者摸清代码路径，再按明确规范边界执行修改，提交前拉起无历史包袱的独立审查员砍掉冗余防御代码，最后完成分支提交与可视化 Diff 交付。",
      en: "Map file paths with a fast explorer, execute bounded edits, run a context-free pre-commit simplification pass, and ship verified commits with a visual diff walkthrough.",
    },
    flowSteps: [
      { zh: "01 Explore 路径摸底", en: "01 Explore paths" },
      { zh: "02 Bounded 规范实现", en: "02 Bounded implementation" },
      { zh: "03 Simplify 独立挑刺", en: "03 Simplify code review" },
      { zh: "04 Ship 提交与可视化 Diff", en: "04 Ship & visual diff" },
    ],
  },
  {
    id: "media",
    number: "02",
    title: {
      zh: "口播录屏与自媒体工业化流水线",
      en: "Talking-Head Video & Build-in-Public Media Pipeline",
    },
    summary: {
      zh: "从下班后 10 分钟口述大纲与一镜到底录屏出发，串联静音/口误自动粗剪、录屏画面 OCR 专业术语字幕校对、横竖双画幅封面生成与多平台草稿箱投递。",
      en: "Start from a 10-minute speaking outline and single-take screen recording, then chain VAD+ASR retake removal, screen-OCR subtitle correction, 16:9 + 3:4 covers, and draft-only uploads.",
    },
    flowSteps: [
      { zh: "01 痛点选题与口述大纲", en: "01 Pain-point outline" },
      { zh: "02 VAD+ASR 去口误粗剪", en: "02 VAD+ASR rough cut" },
      { zh: "03 画面 OCR 字幕与双画幅封面", en: "03 OCR captions & dual covers" },
      { zh: "04 多平台草稿箱后置校验", en: "04 Draft-only validation" },
    ],
  },
  {
    id: "content",
    number: "03",
    title: {
      zh: "去 AI 味表达与高密度视觉文档流水线",
      en: "De-Slop Writing, Visual Explainer & Slide Deck Pipeline",
    },
    summary: {
      zh: "先用平铺直叙规则洗掉“不是 X 而是 Y”与强行拔高立意，再将枯燥的技术方案转化为单页交互图解、逐页分片 HTML 演示文稿或开源仓库门面。",
      en: "Strip 'not X, but Y' framing and inflated themes first, then turn dense technical notes into interactive single-page visual explainers, per-page HTML slide decks, or clean repository READMEs.",
    },
    flowSteps: [
      { zh: "01 事实提炼与去 AI 口癖", en: "01 Fact extraction & de-slop" },
      { zh: "02 架构与流程可视化图解", en: "02 Visual architecture explainer" },
      { zh: "03 逐页分片单文件 HTML 演示", en: "03 Per-page HTML deck" },
      { zh: "04 开源门面与双语文档交付", en: "04 Bilingual repo showcase" },
    ],
  },
];

export const ANS_DAILY_SKILLS: readonly AnsDailySkill[] = [
  {
    id: "ans-team-mode",
    number: "01",
    code: "ans-team-mode",
    pipelineId: "engineering",
    title: {
      zh: "多角色子 Agent 小队编排与费率路由",
      en: "Multi-Role Sub-Agent Team & Cost Routing",
    },
    trigger: {
      zh: "跨多个目录排查问题、长链路重构，或希望按 1:20:100 模型成本梯度节省高阶模型周额度时触发。",
      en: "Use on multi-directory investigations, long-chain refactors, or when routing tasks across 1:20:100 model cost tiers.",
    },
    mechanism: {
      zh: "预设四类子角色：探索者（Explorer，轻量高速模型扫路径，只带回摘要不塞满主窗口）、执行者（Executor，主 Agent 显式点名必读规范与目标文件后执行修改，规避轻量模型长上下文漏召回）、审查者（Reviewer，中等高推理模型独立复核）、专家顾问（Advisor，仅在连续多轮卡壳或复杂架构设计时按需唤醒顶配模型）。",
      en: "Defines four sub-agent roles: Explorer (fast lightweight model returning only file paths and summaries), Executor (high-reasoning lightweight model given explicit rule and file paths by the main agent to avoid long-context recall drops), Reviewer (independent quality check), and Expert Advisor (top-tier model invoked only for architectural deadlocks).",
    },
    boundary: {
      zh: "顺手可改的单文件小需求由主 Agent 直接完成，不机械派发子 Agent；禁止让不擅长沟通的编程模型在无人介入下无限层拆解子任务。",
      en: "Small single-file edits stay in the main agent; never let a coding model recursively split vague sub-tasks without human direction.",
    },
    agentPrompt: {
      zh: "请对当前任务启用 ans-team-mode 小队模式：1) 先派 Explorer 子 Agent 摸清相关文件路径与接口摘要，只向主窗口返回结构化摘要；2) 由你明确列出必读规范文件与修改文件清单后，交由 Executor 完成实现；3) 除非遇到连续两轮未解决的架构卡点，不调用高开销 Advisor。",
      en: "Run this task in ans-team-mode: 1) dispatch an Explorer sub-agent to map relevant file paths and interfaces and return a compact summary; 2) specify exact rule files and target files before handing implementation to an Executor; 3) invoke the top-tier Advisor only if an architectural blocker persists across two rounds.",
    },
    relatedTerms: [
      { slug: "sub-agent", label: { zh: "Sub-agent 子智能体", en: "Sub-agent" } },
      { slug: "context-window", label: { zh: "Context Window 上下文窗口", en: "Context Window" } },
      { slug: "reasoning-model", label: { zh: "Reasoning Model 推理模型", en: "Reasoning Model" } },
    ],
    guideHref: "/vibe-hub/guides?task=agent-team",
  },
  {
    id: "ans-code-simplify",
    number: "02",
    code: "ans-code-simplify",
    pipelineId: "engineering",
    title: {
      zh: "提交前无包袱代码精简与去模板审查",
      en: "Context-Free Pre-Commit Code & UI Simplification",
    },
    trigger: {
      zh: "功能代码或前端页面初稿写完、准备执行 Git Commit 之前自动触发。",
      en: "Trigger automatically after feature code or frontend UI is drafted and before running Git Commit.",
    },
    mechanism: {
      zh: "启动一个不包含历史编写上下文的干净子 Agent 充当挑刺审查员，重点排查：1) 一层套一层的过度防御判断与无意义门禁；2) 不看存量代码而重复维护的派生状态；3) 迁移后未清理的死代码与兼容分支；4) 页面上暴露的 UUID、内部枚举或不影响任何操作的“已选 X 项”冗余文案。",
      en: "Spawns a clean sub-agent with zero coding history to strip: 1) stacked defensive conditionals and unnecessary guards; 2) duplicate derived state that ignores existing helpers; 3) stale compatibility branches left after migration; 4) exposed UUIDs, internal enums, or non-actionable status labels in the UI.",
    },
    boundary: {
      zh: "只砍除冗余实现与视觉噪音，不改变已确认的业务契约与外部接口签名；审查结论直接列出文件、行号与替换方案，不填冗长套话表格。",
      en: "Removes redundant code and UI noise without altering verified contracts; outputs exact file/line replacements rather than bloated review tables.",
    },
    agentPrompt: {
      zh: "请启动一个不带当前会话历史包袱的独立审查子 Agent（ans-code-simplify），对刚刚修改的代码与界面做提交前精简检查：重点指出过度防御分支、重复派生状态、未删除的旧兼容代码，以及界面上暴露的内部枚举或多余解释小字，并直接完成精简。",
      en: "Spawn a fresh context-free review sub-agent (ans-code-simplify) to audit our uncommitted changes: remove redundant defensive branches, duplicate derived state, leftover migration code, and exposed internal IDs or filler UI helper text.",
    },
    relatedTerms: [
      { slug: "sub-agent", label: { zh: "Sub-agent 子智能体", en: "Sub-agent" } },
      { slug: "quality-gate", label: { zh: "Quality Gate 质量门禁", en: "Quality Gate" } },
      { slug: "regression-test", label: { zh: "Regression Test 回归测试", en: "Regression Test" } },
    ],
    guideHref: "/vibe-hub/guides?task=agent-team",
  },
  {
    id: "ans-git-ship",
    number: "03",
    code: "ans-git-ship",
    pipelineId: "engineering",
    title: {
      zh: "分支隔离、规范提交与可视化 Diff 走查",
      en: "Branch Isolation, Clean Commits & Visual Diff Ship",
    },
    trigger: {
      zh: "完成一轮需求开发并跑通验证脚本，需要整理提交记录、推送远端或向团队汇报改动架构时触发。",
      en: "Use when a feature passes verification and needs structured commits, branch push, or a visual diff walkthrough for teammates.",
    },
    mechanism: {
      zh: "先检查 Working Tree 与 .gitignore，拦截误加入的密钥、日志或临时构建产物；按改动意图拆分为清晰的 Commit；若涉及多模块重构，额外生成一份单页交互式 Diff 走查报告（高亮核心数据流变化与人工必看风险点）。",
      en: "Audits the Working Tree and .gitignore to block secrets or build artifacts, groups changes into intent-based Commits, and optionally generates a single-page visual Diff walkthrough highlighting architecture changes and human review checkpoints.",
    },
    boundary: {
      zh: "默认推送到当前特性分支（Feature Branch），未经人工明确授权绝不强制推送（force push）或直接合并受保护主分支。",
      en: "Pushes only to the active feature branch and never force-pushes or merges protected branches without explicit human confirmation.",
    },
    agentPrompt: {
      zh: "请按 ans-git-ship 流程检查当前 Git 工作树：1) 确认 .gitignore 已排除临时文件与敏感配置；2) 运行类型检查与相关单元测试；3) 按功能意图整理清晰的 Commit 说明，并输出本次改动的模块边界与核心 Diff 走查摘要。",
      en: "Run the ans-git-ship checklist on the current working tree: 1) verify .gitignore excludes temp files and secrets; 2) run typecheck and unit tests; 3) create clean intent-scoped commits and summarize module boundaries and key diffs.",
    },
    relatedTerms: [
      { slug: "working-tree", label: { zh: "Working Tree 工作树", en: "Working Tree" } },
      { slug: "diff", label: { zh: "Diff 差异对比", en: "Diff" } },
      { slug: "commit", label: { zh: "Commit 提交", en: "Commit" } },
      { slug: "push", label: { zh: "Push 推送", en: "Push" } },
    ],
    guideHref: "/vibe-hub/guides?task=open-source",
  },
  {
    id: "ans-video-roughcut",
    number: "04",
    code: "ans-video-roughcut",
    pipelineId: "media",
    title: {
      zh: "口播录屏静音切分与口误重录自动粗剪",
      en: "Screen-Recording Silence & Retake Auto Rough-Cut",
    },
    trigger: {
      zh: "录完一条一镜到底的口播或桌面演示视频（含停顿、卡壳和重复念的多遍句子），需要快速产出紧凑粗剪成片时触发。",
      en: "Use right after recording a single-take talking-head or screen-demo video containing pauses, stumbles, and repeated takes.",
    },
    mechanism: {
      zh: "确定性脚本先调用 VAD（语音活动检测）切掉长静音片段，再结合 ASR 词级时间戳生成带时间轴的转录文本；Agent 负责识别前后重复口播的语义重录段（永远保留最后一遍最流畅的表达），输出保留区间 JSON 交由 FFmpeg 无损拼接。",
      en: "A deterministic script runs VAD silence detection and ASR word-level timestamp transcription; the Agent identifies repeated semantic takes (keeping the final clean take) and writes a keep-ranges JSON for FFmpeg concatenation.",
    },
    boundary: {
      zh: "切点计算与视频合成全部由本地确定性脚本执行，禁止让大模型手算毫秒级时间戳；始终保留原始录屏源文件。",
      en: "Timestamp math and video rendering stay in deterministic scripts rather than LLM guesswork, and the raw recording is never overwritten.",
    },
    agentPrompt: {
      zh: "请按 ans-video-roughcut 流程处理这段录屏素材：先用静音检测与词级语音识别导出带时间戳的文稿，识别并剔除我口误重念的前序废片（保留最后一次完整表述）与过长空白停顿，输出保留片段清单并合成为粗剪视频。",
      en: "Process this recording with ans-video-roughcut: run silence detection and word-timestamp ASR, remove earlier stumbled takes in favor of the final clean take, trim dead air, and render the concatenated rough-cut video.",
    },
    relatedTerms: [
      { slug: "video", label: { zh: "Video 视频", en: "Video" } },
      { slug: "skill", label: { zh: "Skill 技能包", en: "Skill" } },
      { slug: "process", label: { zh: "Process 进程与批处理", en: "Process" } },
    ],
    guideHref: "/vibe-hub/guides?task=media-pipeline",
  },
  {
    id: "ans-subtitle-sync",
    number: "05",
    code: "ans-subtitle-sync",
    pipelineId: "media",
    title: {
      zh: "录屏画面 OCR 术语校对与高可读字幕烧录",
      en: "Screen-OCR Technical Term Proofreading & Subtitle Burn-In",
    },
    trigger: {
      zh: "技术演示或产品实操视频完成粗剪后，需要修正语音识别中的代码名、模型名、英文命令错别字并压制字幕时触发。",
      en: "Use after rough-cutting a technical demo video to fix misspelled model names, CLI flags, and code identifiers in ASR captions.",
    },
    mechanism: {
      zh: "脚本每隔数秒抽取录屏画面关键帧并提取屏幕可见文本（文件名、终端命令、UI 词条）构建当期专有名词词表；Agent 对照词表修正 SRT 字幕中的同音错字与断句长度，注入本地 HTML 校对页供人工扫一眼确认后烧录进视频。",
      en: "Extracts screen keyframes to build a glossary of visible filenames, terminal commands, and UI labels; the Agent corrects homophones and line lengths in the SRT captions, renders a local HTML review page, and burns approved subtitles.",
    },
    boundary: {
      zh: "严格保持粗剪后的时间轴对齐，单行字幕不超过屏宽安全区，不擅自改写口播原意。",
      en: "Preserves exact rough-cut timing and safe-area line lengths without rewriting the speaker's spoken meaning.",
    },
    agentPrompt: {
      zh: "请执行 ans-subtitle-sync 字幕校对：从当前视频画面抽取关键帧识别出所有出现的工具名、代码文件名与英文术语，修正字幕稿里的同音错别字，控制单行字数不超宽，并生成本地 HTML 字幕预览页供我确认。",
      en: "Run ans-subtitle-sync: extract keyframes from the video to collect visible tool names, filenames, and English terms, fix homophone typos in the subtitles, enforce single-line length limits, and open a local HTML preview for confirmation.",
    },
    relatedTerms: [
      { slug: "typography", label: { zh: "Typography 排版", en: "Typography" } },
      { slug: "video", label: { zh: "Video 视频", en: "Video" } },
      { slug: "human-in-the-loop", label: { zh: "Human-in-the-Loop 人工确认", en: "Human-in-the-Loop" } },
    ],
    guideHref: "/vibe-hub/guides?task=media-pipeline",
  },
  {
    id: "ans-cover-studio",
    number: "06",
    code: "ans-cover-studio",
    pipelineId: "media",
    title: {
      zh: "横竖双画幅高识别度视频封面生成",
      en: "Dual-Aspect (16:9 & 3:4) Video Cover Studio",
    },
    trigger: {
      zh: "需要为同一期内容同时准备 B 站/YouTube 横版（16:9）与小红书/抖音竖版（3:4）封面图时触发。",
      en: "Use when generating matching 16:9 landscape and 3:4 vertical thumbnails for a video or tutorial release.",
    },
    mechanism: {
      zh: "从视频抽取表情自然的人物关键帧（或调用去背景抠像合成），结合高对比度双层大字 SVG 模板（主标题直击痛点结果、副标题点明具体工具或数字），一次性渲染 16:9 与 3:4 两种比例并嵌入本地 HTML 预览页直观对比缩略图可读性。",
      en: "Selects a clean speaker keyframe or cutout subject, pairs it with a high-contrast two-line SVG typography layout, and renders both 16:9 and 3:4 covers inside a local HTML thumbnail preview.",
    },
    boundary: {
      zh: "封面文字控制在 10 个字以内，确保手机信息流缩略图一眼能看清；禁止堆砌超过 3 种颜色或遮挡主体面部。",
      en: "Keeps cover text concise enough to read at mobile feed thumbnail size, using at most 3 colors without covering the subject.",
    },
    agentPrompt: {
      zh: "请使用 ans-cover-studio 为本期内容生成 16:9 横版与 3:4 竖版双尺寸封面：提炼 3 组不超过 10 个字的高反差平实主标题候选，结合主体画面渲染进本地 HTML 缩略图预览页，供我挑选最清晰的一版。",
      en: "Use ans-cover-studio to generate 16:9 and 3:4 covers for this release: propose 3 punchy, non-hype title options under 8 words and render them into a local HTML thumbnail preview for selection.",
    },
    relatedTerms: [
      { slug: "image", label: { zh: "Image 图像资产", en: "Image" } },
      { slug: "hero", label: { zh: "Hero 视觉焦点", en: "Hero" } },
      { slug: "typography", label: { zh: "Typography 字体排印", en: "Typography" } },
    ],
    guideHref: "/vibe-hub/guides?task=media-pipeline",
  },
  {
    id: "ans-draft-publisher",
    number: "07",
    code: "ans-draft-publisher",
    pipelineId: "media",
    title: {
      zh: "多平台差异化文案与草稿箱安全投递",
      en: "Multi-Platform Metadata & Safe Draft Uploader",
    },
    trigger: {
      zh: "成片、字幕与双尺寸封面准备就绪，需要一键整理各平台标题、简介、时间戳章节与标签并填入后台草稿箱时触发。",
      en: "Use when video, captions, and covers are ready to be packaged with platform-specific titles, chapters, and tags into platform drafts.",
    },
    mechanism: {
      zh: "读取当期字幕稿自动提炼带时间轴的章节节点、B 站/YouTube 深度长简介与小红书痛点图文摘要；自动化脚本上传视频与对应比例封面后，逐项执行后置校验（标题字数、话题标签、封面裁切框），全部通过后保存为平台草稿。",
      en: "Extracts timestamp chapters, long-form descriptions, and short social notes directly from the verified transcript, uploads matching aspect-ratio covers, runs post-upload field validation, and saves as a draft.",
    },
    boundary: {
      zh: "安全铁律：自动化流程永远停在“保存草稿 / 待人工确认”一步，绝不自动点击最终公开发布按钮。",
      en: "Safety rule: automation always stops at 'Save draft' and never clicks the final public Publish button.",
    },
    agentPrompt: {
      zh: "请按 ans-draft-publisher 规范读取本期字幕稿：1) 生成带时间戳的章节目录、横屏长视频简介与竖屏图文笔记文案（遵守去 AI 味规范）；2) 校验 16:9 与 3:4 封面及标签格式，生成多平台草稿投递清单，严格停在草稿保存阶段。",
      en: "Run ans-draft-publisher on the verified transcript: 1) generate timestamped chapters, long-form video notes, and short social copy (following anti-AI-slop rules); 2) validate 16:9 and 3:4 covers and tags, stopping strictly at saved drafts.",
    },
    relatedTerms: [
      { slug: "human-in-the-loop", label: { zh: "Human-in-the-Loop 人工把关", en: "Human-in-the-Loop" } },
      { slug: "permission-mode", label: { zh: "Permission Mode 权限控制", en: "Permission Mode" } },
      { slug: "quality-gate", label: { zh: "Quality Gate 质量门禁", en: "Quality Gate" } },
    ],
    guideHref: "/vibe-hub/guides?task=media-pipeline",
  },
  {
    id: "ans-tone-guard",
    number: "08",
    code: "ans-tone-guard",
    pipelineId: "content",
    title: {
      zh: "平铺直叙写作与去 AI 口癖约束",
      en: "Plainspoken Writing & Anti-AI-Slop Guard",
    },
    trigger: {
      zh: "撰写技术文章、产品更新说明、汇报文档、口播提纲或 UI 界面文案时全程启用。",
      en: "Apply whenever drafting technical articles, release notes, project briefs, speaking outlines, or UI microcopy.",
    },
    mechanism: {
      zh: "从事实、句式和排版三层拦截典型 AI 味：1) 禁用“不是 X，而是 Y”假对比与无证据的宏大升华（如“重塑秩序”“温柔回答”）；2) 禁用“稳稳接住”“收一下/提一层/落回去”等单字动词黑话与开场情绪安抚；3) 拒绝把连贯因果拆成满屏两三个字的碎屑列表，回归完整通顺的自然段。",
      en: "Filters AI tells across facts, phrasing, and structure: 1) bans 'not X, but Y' false contrasts and unsupported grand claims; 2) removes compressed action-verb jargon and scripted emotional validation; 3) replaces fragmented micro-bullets with coherent causal paragraphs.",
    },
    boundary: {
      zh: "只改写表达方式与信息组织，绝不凭空编造原文未提供的测试数据、用户反馈或业务结论。",
      en: "Revises phrasing and structure only, never fabricating metrics, user quotes, or unverified claims.",
    },
    agentPrompt: {
      zh: "请启用 ans-tone-guard 规范润色以下内容：删除所有“不是 A 而是 B”句式、单字动词口癖、开场客套肯定与无事实支撑的拔高结语；把碎裂的短词列表合并为交代清楚具体对象与结果的自然句，保持平铺直叙。",
      en: "Polish this text with ans-tone-guard: remove 'not X, but Y' frames, compressed action-verb jargon, opening flattery, and inflated conclusions; merge fragmented micro-bullets into direct sentences that name exact objects and outcomes.",
    },
    relatedTerms: [
      { slug: "system-prompt", label: { zh: "System Prompt 系统提示词", en: "System Prompt" } },
      { slug: "ai-hallucination", label: { zh: "AI Hallucination 幻觉防范", en: "AI Hallucination" } },
      { slug: "markdown", label: { zh: "Markdown 文档结构", en: "Markdown" } },
    ],
    guideHref: "/vibe-hub/anti-ai-flavor",
  },
  {
    id: "ans-visual-explainer",
    number: "09",
    code: "ans-visual-explainer",
    pipelineId: "content",
    title: {
      zh: "单页架构图解、流程走查与高密度卡片",
      en: "Single-Page Visual Explainer & Architecture Walkthrough",
    },
    trigger: {
      zh: "需要向团队或读者讲清复杂系统架构、多步工作流、数据复盘或长篇技术方案时触发。",
      en: "Use when explaining complex architectures, multi-step workflows, metrics retrospectives, or technical proposals.",
    },
    mechanism: {
      zh: "读取代码库或长文档后，提炼核心状态流转、模块边界与前后对比，直接生成高信息密度的单页 HTML/SVG 交互式图解（支持阶段切换、关键节点高亮与导出高清配图），让读者在 30 秒内看懂全局拓扑。",
      en: "Reads code or long docs to extract state transitions, module boundaries, and before/after diffs, rendering a high-density interactive HTML/SVG diagram with stage toggles and exportable visuals.",
    },
    boundary: {
      zh: "图解中的每个节点必须对应真实代码模块或文档事实，不画没有业务含义的装饰性抽象几何图形。",
      en: "Every diagram node must map to a real module, file, or documented fact—never decorative abstract shapes.",
    },
    agentPrompt: {
      zh: "请使用 ans-visual-explainer 将当前方案/代码链路转化为单页可视化图解：只保留真实模块名称、输入输出箭头与关键边界说明，提供改动前后对比视图，剔除一切装饰性废话。",
      en: "Use ans-visual-explainer to turn this workflow or code path into a single-page visual diagram: show real module names, input/output arrows, boundary notes, and a before/after comparison without decorative filler.",
    },
    relatedTerms: [
      { slug: "single-page-layout", label: { zh: "Single-Page 单页布局", en: "Single-Page Layout" } },
      { slug: "card-grid-layout", label: { zh: "Card Grid 卡片网格", en: "Card Grid" } },
      { slug: "html", label: { zh: "HTML 结构化图解", en: "HTML" } },
    ],
    guideHref: "/vibe-hub/guides?task=ui-design",
  },
  {
    id: "ans-slide-and-readme",
    number: "10",
    code: "ans-slide-and-readme",
    pipelineId: "content",
    title: {
      zh: "逐页分片 HTML 演示文稿与开源仓库门面改造",
      en: "Per-Page HTML Slide Deck & Open-Source README Craft",
    },
    trigger: {
      zh: "需要将长篇方案做成可全屏翻页的 HTML 演示文稿（PPT），或把开源仓库 README 改造成一眼看懂价值的门面时触发。",
      en: "Use when turning a detailed proposal into a full-screen HTML slide deck or upgrading an open-source repository README.",
    },
    mechanism: {
      zh: "制作演示文稿时采用「逐页分片生成 → 脚本合并为单文件 HTML」架构（强制一页一文件落盘，彻底杜绝大模型在写长文件时偷懒删减后半程内容）；改造 README 时按「一句话定位 + 真实动图/截图预览 + 30 秒快速开始 + 架构目录树」重排，并同步生成双语版本。",
      en: "Generates HTML slide decks by writing one slide file at a time before merging into a standalone HTML deck (preventing LLM truncation on long files); restructures READMEs around a one-line value prop, real preview media, 30-second quickstart, and bilingual parity.",
    },
    boundary: {
      zh: "严格保留原稿全部核心论据与数据细节，禁止为了凑极简版式而把实质内容删成空洞口号。",
      en: "Preserves every substantive argument and metric from the source draft rather than stripping real content into empty slogans.",
    },
    agentPrompt: {
      zh: "请按 ans-slide-and-readme 规范处理当前文稿：1) 若生成 HTML 演示文稿，请先按每页一个独立中间文件逐页生成完整内容（严禁删减原稿数据与论据），最后合并为支持键盘翻页的单文件 HTML；2) 若改造 README，请按一句话定位、真实运行预览、快速开始命令与模块结构顺序重排并保持中英双语一致。",
      en: "Apply ans-slide-and-readme: 1) for an HTML slide deck, generate each slide as a separate intermediate file without dropping source facts, then merge into a keyboard-navigable single-file HTML; 2) for a README, order by one-line summary, real preview, quickstart commands, and directory overview in both Chinese and English.",
    },
    relatedTerms: [
      { slug: "html", label: { zh: "HTML 单文件交付", en: "HTML" } },
      { slug: "markdown", label: { zh: "Markdown 仓库文档", en: "Markdown" } },
      { slug: "responsive-design", label: { zh: "Responsive 响应式适配", en: "Responsive Design" } },
    ],
    guideHref: "/vibe-hub/guides?task=skill-product",
  },
];

export const ANS_SKILL_PRODUCT_PRINCIPLES: readonly AnsSkillPrinciple[] = [
  {
    id: "silent-post-check",
    number: "01",
    title: {
      zh: "默认直接执行 + 尾部静默后置配置引导",
      en: "Run with Defaults First + Silent Post-Check Config Hints",
    },
    problem: {
      zh: "如果每次调用都让 Agent 先检查配置文件或翻阅几百行脚本源码确认参数，会白白浪费数万 Token 和几十秒等待时间。",
      en: "Forcing the Agent to inspect config files or read hundreds of lines of script source before every run wastes tokens and latency.",
    },
    solution: {
      zh: "让 Agent 直接以默认参数调用脚本完成主任务；由脚本在执行结尾输出简短的状态提示（如“当前使用默认配色，如需自定义可在 config.json 修改”），只有在真实报错时才引导配置。",
      en: "Let the Agent run the script immediately with sensible defaults; have the script print a brief footer note about optional customization, prompting setup only when a required credential is missing.",
    },
  },
  {
    id: "script-vs-agent",
    number: "02",
    title: {
      zh: "确定性步骤归脚本，灵活判断归 Agent",
      en: "Deterministic Steps in Code, Flexible Judgment in the Agent",
    },
    problem: {
      zh: "把时间戳加减、文件合并、DOM 尺寸校验等确定性工作交给大模型手算，既慢又容易出错。",
      en: "Asking an LLM to calculate timestamps, concatenate files, or measure DOM geometry by hand is slow and error-prone.",
    },
    solution: {
      zh: "凡是输入输出规则固定的步骤一律写成 Python/Node 脚本；只把语义理解、口误甄别、视觉方向发散与文案润色留给 Agent。",
      en: "Put every rule-bound transformation into a Python or Node script, and reserve semantic judgment, visual direction, and copy editing for the Agent.",
    },
  },
  {
    id: "chunked-intermediate-files",
    number: "03",
    title: {
      zh: "按单页/单步拆分中间产物，兼容轻量模型",
      en: "Per-Page Intermediate Files So Lightweight Models Never Truncate",
    },
    problem: {
      zh: "让轻量模型或处于长上下文末端的模型一次性输出上千行 HTML，模型极易偷懒省略后半段或擅自删减原稿信息。",
      en: "When lightweight models generate a thousand-line HTML file in one shot, they frequently truncate later sections or silently drop source details.",
    },
    solution: {
      zh: "强制要求每页幻灯片或每个处理阶段先落盘为独立的小文件（如 slide-01.html、slide-02.html），再由脚本自动校验并拼接成单文件成品。",
      en: "Write each slide or stage to its own small intermediate file first, then use a deterministic build script to validate and bundle the final artifact.",
    },
  },
  {
    id: "html-visual-review",
    number: "04",
    title: {
      zh: "注入本地 HTML 预览页，让人一眼拍板",
      en: "Inject into a Local HTML Preview for Instant Human Review",
    },
    problem: {
      zh: "在终端里看 JSON 数据、字幕文本或设计描述，人很难直观判断最终画面到底好不好看、有没有错位。",
      en: "Reading raw JSON, SRT text, or layout descriptions in a terminal makes it hard for humans to judge visual quality or alignment.",
    },
    solution: {
      zh: "为 UI 多方向探索、视频封面挑选和字幕校对内置轻量 HTML 预览模板（如 style-explorer.html），点击卡片即可复制选中指令回传给 Agent。",
      en: "Render candidate UI directions, video covers, or subtitle edits into a local HTML preview page with one-click copyable selection prompts.",
    },
  },
  {
    id: "blind-subagent-eval",
    number: "05",
    title: {
      zh: "无上下文子 Agent 双盲 A/B 评测",
      en: "Context-Free Sub-Agent Blind A/B Evaluation",
    },
    problem: {
      zh: "让刚写完代码或刚改完 Skill 的主 Agent 自己评价产出效果，它会顺着历史包袱自我夸奖，打分毫无参考价值。",
      en: "Asking the same Agent that wrote the code or Skill to grade its own output produces biased self-praise.",
    },
    solution: {
      zh: "用相同任务同时跑“加载 Skill”与“不加载 Skill”两组输出，交给一个完全不知道哪份是谁写的独立子 Agent 按明确量表盲测挑刺。",
      en: "Run the same task with and without the Skill, then pass both outputs (or screenshots) to a fresh sub-agent for blind rubric scoring.",
    },
  },
  {
    id: "project-scoped-isolation",
    number: "06",
    title: {
      zh: "项目级隔离存放 + AGENTS.md 入口路由",
      en: "Project-Scoped Skill Isolation + AGENTS.md Entry Routing",
    },
    problem: {
      zh: "把几十个垂类 Skill 全部塞在全局目录里，不仅浪费初始上下文，还容易让模型在描述相近的工具间选错并污染会话。",
      en: "Installing dozens of domain-specific Skills globally bloats startup context and causes models to trigger the wrong tool when descriptions overlap.",
    },
    solution: {
      zh: "只在全局保留极少数通用 Skill；把视频剪辑、特定业务规范等 Skill 放进项目目录（如 .codex/skills），并在精简的 AGENTS.md 中写明何时读取哪个文件。",
      en: "Keep only universal Skills global; store domain workflows inside the project directory and route them cleanly from a concise AGENTS.md entry file.",
    },
  },
];
