import type { FactConfirmation, FactKey, OfficialWorkflowId, ProjectGoal } from "@/contracts/projects";

export const FACT_FIELDS: Array<{ key: FactKey; label: string; hint: string }> = [
  { key: "problem", label: "要解决的问题", hint: "用一句话说明真实问题。没有就写“暂无”。" },
  { key: "contribution", label: "我的贡献", hint: "只写自己做过的事。分不清时写“项目包含”。" },
  { key: "method", label: "方法或技术", hint: "写实际用过的方法，不写计划使用的技术。" },
  { key: "result", label: "结果", hint: "只写能证明的结果。没有数据就写“暂无”。" },
  { key: "evidence", label: "证据", hint: "仓库、文档、截图或演示地址。没有就写“暂无”。" },
];

export const GOAL_LABEL: Record<ProjectGoal, string> = {
  career: "求职项目",
  contest: "比赛项目",
  portfolio: "作品展示",
};

export type WorkflowSpec = {
  id: OfficialWorkflowId;
  title: string;
  summary: string;
  minutes: number;
  required: FactKey[];
};

export const OFFICIAL_WORKFLOWS: WorkflowSpec[] = [
  { id: "project-facts", title: "项目事实整理", summary: "整理事实、缺口和待确认项。", minutes: 5, required: ["problem"] },
  { id: "resume-bullets", title: "简历项目条目", summary: "生成 2 到 4 条可核对的经历。", minutes: 10, required: ["problem", "contribution"] },
  { id: "readme-draft", title: "README 草稿", summary: "整理项目说明、边界和运行方式。", minutes: 15, required: ["problem", "method"] },
  { id: "project-one-pager", title: "一页项目介绍", summary: "用一页说明问题、方案和贡献。", minutes: 15, required: ["problem", "contribution", "method"] },
  { id: "contest-mvp", title: "比赛最小方案", summary: "拆出可演示范围、任务和风险。", minutes: 20, required: ["problem", "method"] },
  { id: "pitch-outline", title: "路演大纲", summary: "整理讲述顺序和需要核实的数字。", minutes: 15, required: ["problem", "result"] },
  { id: "defense-qa", title: "答辩问答", summary: "列出可能被追问的问题和事实依据。", minutes: 10, required: ["contribution", "result"] },
  { id: "project-retrospective", title: "作品复盘", summary: "保留可复用步骤和下一次改进。", minutes: 10, required: ["method", "result"] },
];

export const OFFICIAL_WORKFLOW_SLUG_PREFIX = "ans-official-";

export function officialWorkflowSlug(id: OfficialWorkflowId): string {
  return `${OFFICIAL_WORKFLOW_SLUG_PREFIX}${id}`;
}

/**
 * Built-in workflows deliberately have a small, auditable DAG. The artifact
 * node delegates to the same pure composer used by the domain tests; the
 * workflow engine still owns the run, node status, timeout and audit trail.
 */
export function officialWorkflowDefinition(id: OfficialWorkflowId) {
  const spec = workflowById(id);
  if (!spec) throw new Error("未知的官方工作流。");
  return {
    version: 1 as const,
    maxNodes: 2,
    nodes: [
      {
        id: "generate",
        type: "model" as const,
        label: spec.title,
        config: { prompt: "{{input.prompt}}" },
        timeoutMs: 90_000,
        maxRetries: 1,
      },
      {
        id: "output",
        type: "output" as const,
        label: "返回成果草稿",
        config: {},
        timeoutMs: 5_000,
        maxRetries: 0,
      },
    ],
    edges: [{ id: "generate-output", from: "generate", to: "output", mapping: {} }],
  };
}

export function workflowById(id: string): WorkflowSpec | undefined {
  return OFFICIAL_WORKFLOWS.find((item) => item.id === id);
}

export type FactRecord = {
  key: FactKey;
  value: string;
  confirmation: FactConfirmation;
  evidenceUrl?: string | null;
};

const NONE_VALUES = new Set(["暂无", "无", "没有", "待确认", "未知", "n/a", "na", "none"]);

export function normalizeFactValue(value: string): { value: string; confirmation: FactConfirmation } {
  const trimmed = value.trim();
  if (!trimmed) return { value: "", confirmation: "missing" };
  if (NONE_VALUES.has(trimmed.toLowerCase())) return { value: "暂无", confirmation: "confirmed" };
  return { value: trimmed, confirmation: "unconfirmed" };
}

export function snapshotText(facts: FactRecord[]): string {
  return [...facts]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((fact) => JSON.stringify([fact.key, fact.confirmation, fact.value, fact.evidenceUrl ?? null]))
    .join("\n");
}

function labelOf(key: FactKey): string {
  return FACT_FIELDS.find((field) => field.key === key)?.label ?? key;
}

function factOf(facts: FactRecord[], key: FactKey): FactRecord | undefined {
  return facts.find((fact) => fact.key === key);
}

function known(facts: FactRecord[], key: FactKey): string | undefined {
  const fact = factOf(facts, key);
  if (!fact?.value || fact.confirmation === "missing" || fact.value === "暂无") return undefined;
  return fact.confirmation === "confirmed" ? fact.value : `${fact.value}（待确认）`;
}

function shown(facts: FactRecord[], key: FactKey, empty: string): string {
  return known(facts, key) ?? empty;
}

function pending(facts: FactRecord[]): string[] {
  return facts
    .filter((fact) => fact.confirmation !== "confirmed" || !fact.value || fact.value === "暂无")
    .map((fact) => fact.value === "暂无" ? `${labelOf(fact.key)}目前为暂无` : `${labelOf(fact.key)}尚未确认`);
}

function questions(facts: FactRecord[]): string[] {
  const items: string[] = [];
  if (!known(facts, "contribution")) items.push("个人贡献和团队工作怎样分开？");
  if (!known(facts, "result")) items.push("目前有哪些已经发生、可以证明的结果？");
  if (!known(facts, "evidence")) items.push("哪些仓库、文档、截图或演示可以核对这些内容？");
  if (facts.some((fact) => fact.confirmation === "unconfirmed" && fact.value && fact.value !== "暂无")) items.push("哪些事实还需要当事人确认后才能使用？");
  return items.length > 0 ? items : ["按现有事实，哪些表述仍可能在面试或答辩中被继续追问？"];
}

function section(heading: string, lines: string[]): string {
  return [`## ${heading}`, "", ...lines, ""].join("\n");
}

function bullets(items: string[]): string[] {
  return items.map((item) => `- ${item}`);
}

function clean(value: string): string {
  return value.replace(/^(负责|完成了|完成|使用了|使用)/, "");
}

function resume(title: string, facts: FactRecord[]): string[] {
  const problem = shown(facts, "problem", "待确认");
  const contribution = clean(shown(facts, "contribution", "待确认"));
  const method = clean(shown(facts, "method", "方法待确认"));
  const evidence = shown(facts, "evidence", "证据待补充");
  return [
    `- 围绕“${problem}”，本人承担的工作是${contribution}。`,
    `- 项目采用的方法是${method}；证据：${evidence}。`,
    known(facts, "result")
      ? `- 已记录结果：${known(facts, "result")}。`
      : "- 结果暂无，不写入量化成绩。",
    "- 面试时可说明：个人贡献以已确认事实为准，未知部分保持待确认。",
  ];
}

function readme(title: string, facts: FactRecord[]): string[] {
  return [
    section("项目说明", [title, "", `要解决的问题：${shown(facts, "problem", "待确认")}`]),
    section("当前做法", [`已记录的方法：${clean(shown(facts, "method", "待确认"))}`]),
    section("当前边界", [
      `已记录结果：${shown(facts, "result", "暂无，不补充未发生的成绩。")}`,
      `可核对材料：${shown(facts, "evidence", "暂无。")}`,
    ]),
    section("运行方式", ["具体安装、启动和测试步骤待确认。没有记录的步骤不会被自动补写。"]),
  ];
}

function onePager(title: string, facts: FactRecord[]): string[] {
  return [
    `| 项目 | ${title} |`,
    "| --- | --- |",
    `| 问题 | ${shown(facts, "problem", "待确认")} |`,
    `| 个人贡献 | ${shown(facts, "contribution", "待确认")} |`,
    `| 方法 | ${shown(facts, "method", "待确认")} |`,
    `| 结果 | ${shown(facts, "result", "暂无")} |`,
    `| 证据 | ${shown(facts, "evidence", "暂无")} |`,
    "",
    "一页介绍只复述已填写事实，适合继续修改后放进项目说明或作品集。",
  ];
}

function contest(facts: FactRecord[]): string[] {
  return [
    section("本次可演示范围", [
      `演示要说明的问题：${shown(facts, "problem", "待确认")}`,
      `演示中可以展示的方法：${shown(facts, "method", "待确认")}`,
    ]),
    section("准备任务", bullets([
      "核对演示路径是否只依赖已经完成的部分。",
      "准备一份能够打开的证据材料。",
      "把尚未完成的内容从演示脚本中移除。",
    ])),
    section("风险", bullets([
      known(facts, "result") ? `结果仍需与“${known(facts, "result")}”核对。` : "结果暂无，演示时不展示量化成绩。",
      known(facts, "evidence") ? "演示前检查证据链接能够打开。" : "证据暂无，缺少可现场核对的材料。",
    ])),
  ];
}

function pitch(title: string, facts: FactRecord[]): string[] {
  return [
    section("讲述顺序", bullets([
      `问题：${shown(facts, "problem", "待确认")}`,
      `我的贡献：${shown(facts, "contribution", "待确认")}`,
      `方法：${shown(facts, "method", "待确认")}`,
      `结果：${shown(facts, "result", "暂无；此处不补充数字。")}`,
      `证据：${shown(facts, "evidence", "暂无。")}`,
    ])),
    section("讲述提醒", [`项目名称使用“${title}”。遇到待确认内容时直接说明，不临时补充经历。`]),
  ];
}

function defense(facts: FactRecord[]): string[] {
  return [
    ...questions(facts).flatMap((question, index) => [
      section(`问题 ${index + 1}`, [
        question,
        `回答依据：${shown(facts, "contribution", "个人贡献待确认")}；${shown(facts, "result", "结果暂无")}；${shown(facts, "evidence", "证据暂无")}。`,
      ]),
    ]),
    "没有依据的问题保持待确认，不生成确定结论。",
    "",
  ];
}

function retrospective(facts: FactRecord[]): string[] {
  return [
    section("已经发生", bullets([
      `使用的方法：${shown(facts, "method", "待确认")}`,
      `记录的结果：${shown(facts, "result", "暂无")}`,
    ])),
    section("可以复用", bullets([
      "先写事实，再生成材料。",
      "未知内容保留“暂无”或“待确认”。",
      "每份材料只使用同一份事实来源。",
    ])),
    section("下一次改进", bullets([
      known(facts, "evidence") ? "为现有证据补充可复核的时间或版本。" : "补充至少一个可打开的证据。",
      known(facts, "result") ? "把结果和证据放在相邻位置，方便核对。" : "只在结果真实发生后补充结果。",
    ])),
  ];
}

function factsSummary(facts: FactRecord[]): string[] {
  return [
    ...FACT_FIELDS.map((field) => `- ${field.label}：${shown(facts, field.key, "待确认")}`),
    "",
    "这份整理用于检查信息缺口，不直接当作对外成果。",
  ];
}

const composers: Record<OfficialWorkflowId, (title: string, facts: FactRecord[]) => string[]> = {
  "project-facts": (_title, facts) => factsSummary(facts),
  "resume-bullets": resume,
  "readme-draft": (title, facts) => readme(title, facts),
  "project-one-pager": onePager,
  "contest-mvp": (_title, facts) => contest(facts),
  "pitch-outline": pitch,
  "defense-qa": (_title, facts) => defense(facts),
  "project-retrospective": (_title, facts) => retrospective(facts),
};

export type GeneratedArtifact = {
  title: string;
  markdown: string;
  json: {
    workflowId: OfficialWorkflowId;
    sections: Array<{ heading: string; body: string }>;
    pending: string[];
    facts: FactRecord[];
  };
};

export function generateOfficialArtifact(workflowId: OfficialWorkflowId, projectTitle: string, facts: FactRecord[]): GeneratedArtifact {
  const spec = workflowById(workflowId);
  if (!spec) throw new Error("未知的官方工作流。");
  const missing = spec.required.filter((key) => {
    const fact = factOf(facts, key);
    return !fact || fact.confirmation === "missing" || !fact.value;
  });
  if (missing.length > 0) {
    throw new Error(`请先填写：${missing.map(labelOf).join("、")}。没有内容时请明确填写“暂无”。`);
  }
  const gaps = pending(facts);
  const body = composers[workflowId](projectTitle, facts).join("\n").trim();
  const sections = [
    { heading: spec.title, body },
    { heading: "待确认", body: gaps.length > 0 ? gaps.join("；") : "没有待确认项。" },
  ];
  const markdown = [
    `# ${spec.title}：${projectTitle}`,
    "",
    body,
    "",
    "## 待确认",
    "",
    gaps.length > 0 ? gaps.map((gap) => `- ${gap}`).join("\n") : "- 没有待确认项。",
    "",
    "## 使用边界",
    "",
    "本文只根据已填写事实整理。空白项保持待确认，不补充数量、排名、用户规模、收益或未发生的经历。",
  ].join("\n");
  return { title: `${spec.title}：${projectTitle}`, markdown, json: { workflowId, sections, pending: gaps, facts } };
}

/** Prompt used by the real model-backed project workflow. */
export function buildArtifactGenerationPrompt(
  workflowId: OfficialWorkflowId,
  projectTitle: string,
  facts: FactRecord[],
): string {
  const spec = workflowById(workflowId);
  if (!spec) throw new Error("Unknown official workflow.");
  return [
    "你是 ANS 的项目成果编辑器。请根据下面的已记录事实，生成一份可以直接继续修改和使用的 Markdown 草稿。",
    "只使用事实中出现的信息，不要补写数字、排名、用户规模、收益、技术细节或未发生的结果。",
    "confirmation=confirmed 的内容可以直接陈述；confirmation=unconfirmed 的内容必须明确标记为‘待确认’；值为‘暂无’的内容不要推断。",
    "如果事实不足，请保留‘待确认’并提出具体核对问题。输出正文 Markdown，不要输出 JSON，不要解释你的写作过程。",
    `目标工作流：${spec.title}（${workflowId}）`,
    `项目名称：${projectTitle}`,
    "已记录事实：",
    JSON.stringify(facts, null, 2),
    `请按“${spec.title}”的用途组织内容，篇幅控制在一页内。`,
  ].join("\n\n");
}

/** Wrap model output with the same provenance and uncertainty sections as the deterministic path. */
export function generatedArtifactFromMarkdown(
  workflowId: OfficialWorkflowId,
  projectTitle: string,
  facts: FactRecord[],
  rawMarkdown: string,
): GeneratedArtifact {
  const spec = workflowById(workflowId);
  if (!spec) throw new Error("Unknown official workflow.");
  const body = rawMarkdown.trim();
  if (!body) throw new Error("模型没有返回可用内容。");
  const gaps = pending(facts);
  const markdown = [
    `# ${spec.title}：${projectTitle}`,
    "",
    body.replace(/^#\s+[^\n]+\n*/u, ""),
    "",
    "## 待确认",
    "",
    gaps.length > 0 ? gaps.map((gap) => `- ${gap}`).join("\n") : "- 没有待确认项。",
    "",
    "## 使用边界",
    "",
    "本草稿只根据项目中已记录的事实生成。没有证据的数字、排名、收益和未发生的经历不会被自动补写。",
  ].join("\n");
  return {
    title: `${spec.title}：${projectTitle}`,
    markdown,
    json: { workflowId, sections: [{ heading: spec.title, body }], pending: gaps, facts },
  };
}

export function renderProjectExport(project: { title: string; goal: ProjectGoal }, versions: Array<{ title: string; markdown: string; version: number }>): string {
  const parts = [
    `# ${project.title}`,
    "",
    `目标：${GOAL_LABEL[project.goal]}`,
    "",
    "本文件只包含已保存的项目成果。未确认事实在对应成果中保留标记。",
  ];
  for (const version of versions) {
    parts.push("", "---", "", `> 成果版本 ${version.version}`, "", version.markdown);
  }
  return parts.join("\n");
}
