import type { VibeText } from "./ans-practices";

export type BriefScenarioId =
  | "website"
  | "ui-design"
  | "skill-product"
  | "media-pipeline"
  | "agent-team"
  | "creative"
  | "github"
  | "custom";

export type BriefFields = {
  goal: string;
  audience: string;
  references: string;
  acceptance: string;
};

export type BriefScenario = {
  id: BriefScenarioId;
  pathId?: string;
  label: VibeText;
  summary: VibeText;
  template: Record<"zh" | "en", BriefFields>;
  nextHref: string;
  nextLabel: VibeText;
};

export const BRIEF_SCENARIOS: readonly BriefScenario[] = [
  {
    id: "website",
    pathId: "ans-first-website",
    label: { zh: "个人网站 / 作品集", en: "Personal site or portfolio" },
    summary: {
      zh: "适合课程展示、简历页、项目主页和团队介绍。",
      en: "For course showcases, resume pages, project homepages, and team introductions.",
    },
    template: {
      zh: {
        goal: "做一个单页个人作品集网站，展示 3 个真实项目、个人简介和联系入口。",
        audience: "课程老师、招聘方或第一次点开链接的合作同学，需要在 30 秒内看懂我做过什么。",
        references: "现有材料：项目截图 3 张、每个项目一句话结果、GitHub 或演示链接。布局优先保持首屏主视觉、项目卡片和底部联系区清晰。",
        acceptance: "手机 390px 和桌面 1440px 都不横向溢出；所有按钮和外链可点击；没有假数据、占位词或未完成的计数。",
      },
      en: {
        goal: "Build a single-page portfolio website presenting 3 real projects, a short bio, and a contact section.",
        audience: "Instructors, recruiters, or collaborators opening the link for the first time who need to understand my work in 30 seconds.",
        references: "Existing material: 3 project screenshots, one outcome sentence per project, and GitHub or demo links. Keep a clear hero, project cards, and footer contact area.",
        acceptance: "No horizontal overflow at 390px mobile or 1440px desktop; every button and link works; no placeholder copy or fake metrics.",
      },
    },
    nextHref: "/market/resume-website",
    nextLabel: { zh: "打开简历网站工作流", en: "Open resume website workflow" },
  },
  {
    id: "ui-design",
    pathId: "ans-ui-design",
    label: { zh: "UI 多方向探索", en: "Multi-direction UI exploration" },
    summary: {
      zh: "先生成 3 套差异化首屏同屏对比，再启动无上下文子 Agent 按 10 分制做视觉走查与减法打磨。",
      en: "Generate 3 distinct hero directions side by side, then run a context-free sub-agent visual review and strip template clutter.",
    },
    template: {
      zh: {
        goal: "为当前产品设计一套去 AI 模板感的首屏与核心落地页：先拆解 3 个色彩、字体与版式截然不同的视觉方向并生成 style-explorer.html 同屏对比。",
        audience: "对视觉质感敏感的真实用户与产品评审方，第一眼需要记住明确的主体意象，而不是看到千篇一律的蓝紫渐变居中卡片。",
        references: "大胆突破常规居中对称布局，结合生图工具生成风格统一的透明底主视觉插画或序列帧动效；禁止滥用发光描边、无意义的嵌套容器、Emoji 图标和解释性废话副标题。",
        acceptance: "锁定方向后，启动一个不带历史代码上下文的独立子 Agent 对 1440px 与 390px 真实截图按 10 分制挑刺（具体到字重、行高、留白与伪代码），删掉所有不增加信息量的说明小字，视觉评分达到 9/10 以上。",
      },
      en: {
        goal: "Design a non-generic hero and landing page: first propose 3 distinct visual directions across palette, typography, and layout, and render style-explorer.html for side-by-side comparison.",
        audience: "Design-conscious users and reviewers who should remember a clear visual anchor rather than another centered blue-purple gradient card grid.",
        references: "Break away from default centered symmetry; pair custom generated transparent illustrations or frame sequences with restrained motion; avoid glowing borders, nested wrapper boxes, emoji icons, and filler subtitles.",
        acceptance: "After locking a direction, spawn a context-free visual reviewer sub-agent to critique real 1440px and 390px screenshots on a 10-point rubric with exact CSS/layout fixes until it scores 9/10 or higher.",
      },
    },
    nextHref: "/vibe-hub/guides?task=ui-design",
    nextLabel: { zh: "查看 UI 设计探索指南", en: "Open UI design workflow guide" },
  },
  {
    id: "skill-product",
    pathId: "ans-skill-product",
    label: { zh: "封装 Agent Skill", en: "Package an Agent Skill" },
    summary: {
      zh: "把高频重复任务封装为带 SKILL.md、确定性脚本、分片产物与盲测验收的产品级 Skill。",
      en: "Turn recurring workflows into a productized Skill folder with SKILL.md, deterministic scripts, chunked outputs, and blind A/B testing.",
    },
    template: {
      zh: {
        goal: "把团队高频重复的执行流程封装成独立项目级 Skill（含 SKILL.md 入口、scripts/ 确定性脚本、references/ 规范与 HTML 预览模板）。",
        audience: "日常调用该工作流的 AI Agent（含轻量模型与高阶模型）以及需要快速确认中间产物的团队成员。",
        references: "遵循六条产品化准则：1) 默认参数直接执行、尾部输出静默后置配置引导，禁止让 Agent 翻脚本源码查配置；2) 稳定步骤写进脚本，灵活判断留给 Agent；3) 长任务按单页/单步拆分中间文件，防止弱模型截断或删减内容。",
        acceptance: "支持生成本地 HTML 可视化确认页供人工一眼拍板；使用无历史上下文的子 Agent 对「有 Skill vs 无 Skill」执行同题双盲对比测试，确认结果可复现且跨平台路径正常。",
      },
      en: {
        goal: "Package a recurring workflow into a project-scoped Skill directory with SKILL.md, deterministic scripts/, references/, and an HTML preview template.",
        audience: "AI agents across model tiers executing the workflow daily, plus teammates who need fast visual confirmation of intermediate outputs.",
        references: "Apply six productization rules: 1) run with sensible defaults and print silent post-check config hints at the end without reading script source; 2) put deterministic steps in scripts and flexible judgment in the agent; 3) split long outputs into per-page intermediate files so lightweight models never truncate.",
        acceptance: "Injects outputs into a local HTML preview for human review, and passes a context-free sub-agent blind A/B evaluation (with Skill vs. without Skill) on a real task.",
      },
    },
    nextHref: "/vibe-hub/guides?task=skill-product",
    nextLabel: { zh: "查看 Skill 产品化指南", en: "Open Skill productization guide" },
  },
  {
    id: "media-pipeline",
    pathId: "ans-media-pipeline",
    label: { zh: "口播录屏与内容流", en: "Video & content pipeline" },
    summary: {
      zh: "从痛点口述大纲、VAD+ASR 去口误粗剪、画面 OCR 校对字幕到双画幅封面与多平台草稿箱。",
      en: "From outline-first screen recording and VAD+ASR retake removal to OCR subtitle proofreading, dual-aspect covers, and platform drafts.",
    },
    template: {
      zh: {
        goal: "跑通一条口播录屏视频与图文复盘流水线：先输出「一句话结论 + 防发散提醒 + 自由发挥锚点」口述大纲，录屏后完成自动粗剪、专业术语字幕校对、16:9/3:4 双尺寸封面与多平台草稿准备。",
        audience: "关注真实工程实操与工具提效的开发者、创作者与学生受众，偏好平铺直叙的干货分享。",
        references: "粗剪基于 VAD 静音切分与 ASR 词级时间戳自动剔除重录废片；字幕结合录屏画面关键帧 OCR 自动修正代码与产品专有名词；文案通过去 AI 味规范过滤拔高立意与固定口癖。",
        acceptance: "导出的粗剪视频节奏连贯、专有名词字幕零错字；横竖屏双封面主体清晰；自动化脚本仅将视频与元数据填入各平台草稿箱并通过后置校验，绝不自动点击最终发布。",
      },
      en: {
        goal: "Run an end-to-end talking-head screen-recording and content pipeline: generate a concise speaking outline with anti-tangent reminders, then automate rough-cut editing, OCR term-corrected subtitles, 16:9 and 3:4 covers, and multi-platform draft preparation.",
        audience: "Developers, creators, and students looking for practical build-in-public workflows stated plainly without hype.",
        references: "Use VAD silence splitting plus ASR word-level timestamps to cut retakes; extract video keyframes via OCR to fix product and code terms in subtitles; apply anti-AI-slop rules to titles and descriptions.",
        acceptance: "Rough-cut pacing is clean with accurate technical subtitles; 16:9 and 3:4 covers are legible at thumbnail size; automation stops strictly at saved platform drafts and never clicks final publish.",
      },
    },
    nextHref: "/vibe-hub/guides?task=media-pipeline",
    nextLabel: { zh: "查看视频与内容流指南", en: "Open media pipeline guide" },
  },
  {
    id: "agent-team",
    pathId: "ans-agent-team",
    label: { zh: "多 Agent 协作与交付", en: "Multi-agent team & delivery" },
    summary: {
      zh: "配置探索者、执行者、审查者与专家顾问四类子 Agent，结合 Explore/Simplify 规范与 Git Diff 走查交付。",
      en: "Orchestrate Explorer, Executor, Reviewer, and Advisor sub-agents with Explore/Simplify protocols and visual Git diff review.",
    },
    template: {
      zh: {
        goal: "在跨模块复杂任务中启用多 Agent 小队分工：先由轻量高速 Explorer 摸清代码路径，再交由 Executor 按明确文件边界实现，最后由独立 Reviewer 执行 Simplify 审查并输出可视化 Diff 走查。",
        audience: "负责代码合入审查的工程师与需要控制 Token 额度消耗的长期项目维护者。",
        references: "遵循 1:20:100 模型成本分级路由：日常搜索与边界明确的改动使用轻量高推理模型（主 Agent 提前交代必读规范文件以规避长上下文漏召回），疑难架构才唤醒高阶专家顾问；工作区遵循 AGENTS.md 入口与分支隔离。",
        acceptance: "主上下文不被无关源码塞满；提交前砍掉过度防御分支、重复派生状态与死代码；所有改动通过类型检查与测试，并附带清晰的提交拆分与变更影响说明。",
      },
      en: {
        goal: "Run a multi-agent team workflow on a cross-module task: dispatch a fast Explorer to map file paths, an Executor for bounded code edits, and a fresh Reviewer for pre-commit Simplify checks and visual diff walkthroughs.",
        audience: "Engineers reviewing merges and long-running project maintainers managing token budgets.",
        references: "Route models by 1:20:100 cost tiers: pair explicit file/rule handoffs with lightweight high-reasoning executors, reserve top-tier models for hard architectural deadlocks, and isolate work in a dedicated Git branch or worktree.",
        acceptance: "Main context stays compact; redundant defensive branches, duplicate derived state, and dead code are removed before commit; typecheck and unit tests pass with a clean diff summary.",
      },
    },
    nextHref: "/vibe-hub/guides?task=agent-team",
    nextLabel: { zh: "查看多 Agent 协作指南", en: "Open multi-agent team guide" },
  },
  {
    id: "creative",
    pathId: "ans-creative-delivery",
    label: { zh: "视觉 / 视频 / 创意作品", en: "Visual, video, or creative work" },
    summary: {
      zh: "适合海报、分镜、短片、封面图和宣传物料。",
      en: "For posters, storyboards, short videos, covers, and campaign assets.",
    },
    template: {
      zh: {
        goal: "制作一套活动主视觉海报和 15 秒竖版预告短片，用于校内比赛或作品发布。",
        audience: "路过信息流或展板的学生和评委，第一眼需要看懂活动主题、时间和参与方式。",
        references: "主标题、时间和报名入口固定；色调偏清醒克制的科技感，不使用廉价发光字、密集图标和夸张口号。",
        acceptance: "输出 1 张横版封面、1 张竖版海报和 3 段分镜说明；文字在大屏和手机缩略图里都能读清；最终发布前由人工确认。",
      },
      en: {
        goal: "Create an event key visual poster and a 15-second vertical teaser clip for a campus competition or project launch.",
        audience: "Students and judges scanning a feed or poster board who need the theme, date, and entry path at a glance.",
        references: "Keep the title, date, and signup entry fixed; use a restrained technical palette without cheap glow text, dense icons, or inflated slogans.",
        acceptance: "Deliver 1 landscape cover, 1 vertical poster, and a 3-shot storyboard note; text remains readable in thumbnails; a human approves before publishing.",
      },
    },
    nextHref: "/hubs/aigc",
    nextLabel: { zh: "去 AIGC 中心继续制作", en: "Continue in the AIGC Hub" },
  },
  {
    id: "github",
    pathId: "ans-open-source",
    label: { zh: "把开源仓库跑起来", en: "Adapt an open-source repo" },
    summary: {
      zh: "适合复现 GitHub 项目、做本地实验并改成自己的版本。",
      en: "For reproducing a GitHub project, running a local experiment, and making your own version.",
    },
    template: {
      zh: {
        goal: "克隆目标开源仓库，在本地跑通最小示例，并改造成针对我当前课题的演示版本。",
        audience: "一起协作的队友或答辩评委，需要看到我真正理解并改造了哪一部分。",
        references: "保留原作者许可证与致谢；只修改独立分支里的界面文案、样例数据和 1 个核心模块，不一次性重写整个仓库。",
        acceptance: "记录启动命令、环境变量和复现步骤；改完后跑通原有测试或冒烟检查；用 Git Diff 说明我新增和删改的边界。",
      },
      en: {
        goal: "Clone the target open-source repository, run the minimal example locally, and adapt it into a demo for my topic.",
        audience: "Teammates or defense reviewers who need to see which part I understood and customized.",
        references: "Preserve the upstream license and attribution; work on a separate branch and change only the copy, sample data, and 1 core module rather than rewriting the whole repo.",
        acceptance: "Document the setup commands, environment variables, and reproduction steps; pass existing tests or smoke checks; explain the exact changes with a Git diff.",
      },
    },
    nextHref: "/explore",
    nextLabel: { zh: "去探索广场挑开源项目", en: "Browse open-source projects" },
  },
  {
    id: "custom",
    label: { zh: "空白自定义", en: "Blank custom brief" },
    summary: {
      zh: "从零填写你自己的任务目标、受众、参考约束和验收条件。",
      en: "Write your own goal, audience, constraints, and acceptance checks from scratch.",
    },
    template: {
      zh: { goal: "", audience: "", references: "", acceptance: "" },
      en: { goal: "", audience: "", references: "", acceptance: "" },
    },
    nextHref: "/workspace",
    nextLabel: { zh: "带去 ANS 工作台", en: "Take to ANS Workspace" },
  },
];

export function getBriefScenario(id?: string | null): BriefScenario {
  return BRIEF_SCENARIOS.find(item => item.id === id) || BRIEF_SCENARIOS[0];
}

export function briefScenarioForPath(pathId: string): BriefScenario | undefined {
  return BRIEF_SCENARIOS.find(item => item.pathId === pathId);
}
