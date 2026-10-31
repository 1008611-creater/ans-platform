// 工作台工作流清单：每个工作流一份说明，工作台按它切换输入框参数、模板、运行步骤和下一步入口。
// 新增工作流只需要在这里加一项，不用再单独做一套页面。

export type WorkflowId = "code" | "hypit" | "easel" | "toonflow" | "ask";

export interface WorkflowParam {
  key: string;
  options: string[];
}

export interface WorkflowTemplate {
  id: string;
  title: string;
  sub: string;
  image: string;
  /** 竖版插画类素材用 contain，避免裁掉主体 */
  contain?: boolean;
  /** 点模板后切到哪个工作流（首页画廊里混排时用） */
  workflow?: WorkflowId;
  prompt: string;
}

export interface WorkflowManifest {
  id: WorkflowId;
  name: string;
  /** 颜色点，区分工作流 */
  color: string;
  mode: "code" | "ask";
  placeholder: string;
  sub: string;
  params: WorkflowParam[];
  templatesTitle: string;
  templates: WorkflowTemplate[];
  /** 运行节点里展示的步骤名 */
  stages: string[];
  /** 交给 Agent 的工作流说明，拼在用户描述前面 */
  brief?: (prompt: string, params: Record<string, string>) => string;
  /** 产出交给专门工具继续做时的入口 */
  next?: { label: string; href: string };
}

const SHOWCASE: WorkflowTemplate[] = [
  { id: "g-podcast", title: "播客切片", sub: "Hypit", image: "/catalog/hypit-examples/podcast.webp", workflow: "hypit", prompt: "两个人聊「大学第一个 AI 项目怎么选题」，做成播客切片" },
  { id: "g-poster", title: "活动海报", sub: "Easel", image: "/catalog/image2-live.jpg", workflow: "easel", prompt: "ANS 开放日活动海报，主标题「来做你的第一个 AI 项目」" },
  { id: "g-resume", title: "简历主页", sub: "写代码", image: "/catalog/resume-live.jpg", workflow: "code", prompt: "把我的简历做成一个能分享的单页个人主页，深色、简洁" },
  { id: "g-toon", title: "四格漫剧", sub: "Toonflow", image: "/catalog/oil-v1/showcase-toonflow.svg", contain: true, workflow: "toonflow", prompt: "兔兔龙第一次写代码，四格，结尾有反转" },
];

export const WORKFLOWS: WorkflowManifest[] = [
  {
    id: "code",
    name: "写代码",
    color: "#3fbf94",
    mode: "code",
    placeholder: "描述你想做的网页、脚本或小游戏",
    sub: "写网页、做短视频、出海报、画漫剧，一个输入框就够",
    params: [],
    templatesTitle: "用工作流做出来的",
    templates: SHOWCASE,
    stages: ["读懂需求", "规划改动", "写入文件", "检查结果"],
  },
  {
    id: "hypit",
    name: "短视频",
    color: "#e0567f",
    mode: "code",
    placeholder: "说说视频讲什么，比如「欢迎新生来 ANS」",
    sub: "Hypit 工作流：先出脚本和分镜，再去 Hypit 渲染成片",
    params: [
      { key: "ratio", options: ["9:16 竖屏", "16:9 横屏"] },
      { key: "length", options: ["30 秒", "60 秒", "15 秒"] },
      { key: "format", options: ["口播", "访谈", "榜单", "播客"] },
    ],
    templatesTitle: "选一个模板",
    templates: [
      { id: "h-podcast", title: "播客切片", sub: "两人对谈", image: "/catalog/hypit-examples/podcast.webp", prompt: "两个人聊「大学第一个 AI 项目怎么选题」" },
      { id: "h-interview", title: "街头访谈", sub: "快问快答", image: "/catalog/hypit-examples/interview.webp", prompt: "在校园里随机问同学：你用 AI 做过最酷的事是什么" },
      { id: "h-ranking", title: "榜单盘点", sub: "Top 5", image: "/catalog/hypit-examples/ranking.webp", prompt: "盘点大学生最常用的 5 个 AI 工具" },
    ],
    stages: ["读懂需求", "写脚本", "拆分镜", "整理交付"],
    brief: (prompt, p) =>
      `按 Hypit 短视频工作流做一条${p.ratio ?? "9:16 竖屏"}、${p.length ?? "30 秒"}的${p.format ?? "口播"}视频方案。用 Markdown 输出：标题；逐句口播脚本（每句带时间码）；分镜表（镜头、画面、字幕、时长）；配乐建议。内容：${prompt}`,
    next: { label: "去 Hypit 渲染成片", href: "/workflows/hypit#hypit-workspace" },
  },
  {
    id: "easel",
    name: "海报",
    color: "#e8a23a",
    mode: "code",
    placeholder: "海报给谁看、要写哪几行字",
    sub: "Easel 工作流：先定文案和画面，再去无限画布出图",
    params: [
      { key: "ratio", options: ["3:4 竖版", "1:1 方形", "16:9 横版"] },
      { key: "style", options: ["中文大字", "极简", "插画"] },
    ],
    templatesTitle: "选一个版式",
    templates: [
      { id: "e-event", title: "活动海报", sub: "大标题", image: "/catalog/image2-live.jpg", prompt: "ANS 开放日活动海报，主标题「来做你的第一个 AI 项目」" },
      { id: "e-card", title: "个人名片", sub: "极简", image: "/catalog/resume-live.jpg", prompt: "我的个人名片海报，突出名字和三个技能标签" },
    ],
    stages: ["读懂需求", "写文案", "定画面", "整理出图提示词"],
    brief: (prompt, p) =>
      `按 Easel 海报工作流做一张${p.ratio ?? "3:4 竖版"}、${p.style ?? "中文大字"}风格的海报方案。用 Markdown 输出：主标题、副标题、正文要点；画面构图与配色；可直接用于生图的中文提示词 2 条。内容：${prompt}`,
    next: { label: "去无限画布出图", href: "/workflows/easel" },
  },
  {
    id: "toonflow",
    name: "漫剧",
    color: "#7c6cf0",
    mode: "code",
    placeholder: "讲一个小故事，主角是谁",
    sub: "Toonflow 工作流：剧本到分镜，再去画布出图成片",
    params: [
      { key: "panels", options: ["四格", "八格", "单页"] },
      { key: "style", options: ["手绘水彩", "日漫", "像素"] },
    ],
    templatesTitle: "选一个画风",
    templates: [
      { id: "t-water", title: "手绘水彩", sub: "四格", image: "/catalog/oil-v1/showcase-toonflow.svg", contain: true, prompt: "兔兔龙第一次写代码，四格，结尾有反转" },
    ],
    stages: ["读懂需求", "写剧本", "拆分镜", "整理出图提示词"],
    brief: (prompt, p) =>
      `按 Toonflow 漫剧工作流做一个${p.panels ?? "四格"}、${p.style ?? "手绘水彩"}风格的漫剧方案。用 Markdown 输出：剧情梗概；分格脚本（画面、台词、镜头）；角色设定；每格的生图提示词。故事：${prompt}`,
    next: { label: "去画布出图", href: "/workflows/toonflow" },
  },
  {
    id: "ask",
    name: "提问",
    color: "#8a8a85",
    mode: "ask",
    placeholder: "问 Agent 任何问题，只回答不改文件",
    sub: "只回答，不改文件",
    params: [],
    templatesTitle: "",
    templates: [],
    stages: ["读懂问题", "查找上下文", "整理回答"],
  },
];

export function getWorkflow(id: WorkflowId | undefined): WorkflowManifest {
  return WORKFLOWS.find(item => item.id === id) ?? WORKFLOWS[0];
}

export function defaultParams(workflow: WorkflowManifest): Record<string, string> {
  return Object.fromEntries(workflow.params.map(param => [param.key, param.options[0]]));
}

/** 把服务端返回的执行记录整理成人能读的一句话，去掉内部工具名 */
export function readableStep(raw: string): string {
  const text = raw.replace(/^\s*\[\d+\/\d+\]\s*/, "").replace(/^agent\.[a-z_]+\s*(→|->|·)?\s*/i, "");
  return text.trim() || raw;
}
