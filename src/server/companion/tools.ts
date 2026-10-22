import { z } from "zod";
import zhCopy from "@/../messages/companion/zh.json";
import enCopy from "@/../messages/companion/en.json";
import { db } from "@/lib/db";
import type { AgentInput, AgentLink } from "@/contracts/companion-agent";
import { listPublishedCatalog } from "@/server/catalog/service";
import { getPublishedWorkflow, listPublishedWorkflows } from "@/server/workflows/service";
import { YUAN_PER_POINT } from "@/lib/credits-pricing";
import { ARCADE_TOKEN_COST_POINTS } from "@/server/compute-benefits/arcade";
import { publicProjectSummary, searchPublicProjects } from "./catalog-search";
const argsSchema = z.object({ query: z.string().trim().max(100) }).strict();
const descriptions = {
  current_page: "Read the current page's published public project or workflow summary, inputs and output where available. Use when the user says this project, this workflow or what do I need here. Uses only the supplied pathname; never reads private project pages, forms, drafts, files or workflow runtime state. Query must be empty.",
  site_help: "Get verified in-site destinations for a goal: video, aigc, learning, competition, team, workspace, hub, community, market or discover. This is navigation help, not execution. Query may be empty.",
  search_projects: "Search currently published ANS project references. Check source and executable availability. Use short keywords, not a full question. Exact/all-keyword matches rank before partial matches; inspect match and matchedTerms and do not claim a partial match meets every requirement. Query in the user's language; empty query lists a few projects.",
  search_workflows: "Search currently published user workflows. Returns declared estimated price, NOT a live execution quote. Query may be empty.",
  my_projects: "Read this authenticated member's own project summaries only; requires explicit privateAccess. Does not read project facts or file contents. Query may be empty.",
  my_tasks: "Read this authenticated member's most recent workflow task states and actual recorded cost only; requires explicit privateAccess. Does not retry or cancel a task.",
  credits: "Read this member's current balance when privateAccess is granted; otherwise only return public fixed conversion and billing destination.",
  claim_daily_benefit: "Execute today's daily check-in reward (+5 points and +1 claw token) for this member directly. Query may be empty.",
  play_claw_arcade: "Play the 3D Claw Machine once for this member (uses 1 free token or exchanges 10 points for 1 token) for a chance at SP 1,000 pts or UR 300 pts. Query may be empty.",
  search_market: "Search published ANS Market (/market) tools, resources and runnable workflows priced in points. Query may be a short keyword or empty.",
  scaffold_project_draft: "Create a new Project and v1 README/architecture blueprint in this member's workspace; requires explicit privateAccess. Pass the project title/topic in query.",
  run_project_pack: "Generate this owned project's three artifacts (resume entry, README, one-page intro) in one go. Only call when the current page is a project detail page AND the user explicitly asks to generate them. Requires an explicit short confirmation in the user's latest message; without it the tool returns CONFIRM_REQUIRED and charges nothing. Query must be empty.",
  redeem_market_item: "Redeem and auto-deliver an official ANS Market tool/resource with this member's points balance. Pass the exact item keyword or slug in query; the price is always the live listing price, never a fixed number. An empty query returns a price quote, not a purchase. Charging requires the member's explicit confirmation in this conversation.",
} as const;
export type AgentToolName = keyof typeof descriptions;
export const AGENT_TOOLS = Object.entries(descriptions).map(([name, description]) => ({ type: "function" as const, name, description, strict: true,
  parameters: { type: "object", properties: { query: { type: "string", description: "Short search query, project topic, or empty string" } }, required: ["query"], additionalProperties: false },
}));
export type ToolResult = { ok: boolean; data: unknown; links: AgentLink[] };

/**
 * 聊天通道的"确认"判定：只有用户这一轮**明确表态**（短句）才算同意扣费。
 * 金额仍由服务端重新报价决定；界面通道（快捷栏）走 confirmedPoints，浏览器无法设置本判定。
 */
export function isExplicitChargeConfirmation(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/^(好的?|可以|行|没问题|ok|okay|yes|y|go|确认|确定|同意|执行|扣吧|扣费吧|confirm)[。!！,.，、\s]*$/i.test(trimmed)) return true;
  // 必须是「短句确认」：长句里顺带提到「确认」不算同意扣费。
  return trimmed.length <= 12 && /(确认|确定|同意|confirm)/i.test(trimmed);
}
export async function executeAgentTool(name: string, raw: string, actor: string, input: AgentInput): Promise<ToolResult> {
  const copy = input.locale === "zh" ? zhCopy : enCopy;
  let query: string;
  try { query = argsSchema.parse(JSON.parse(raw)).query; }
  catch { return { ok: false, data: { code: "INVALID_TOOL_ARGUMENTS" }, links: [] }; }
  if (!Object.hasOwn(descriptions, name)) return { ok: false, data: { code: "TOOL_UNAVAILABLE" }, links: [] };
  const lastUserText = [...input.messages].reverse().find(message => message.role === "user")?.content ?? "";
  const userConfirmed = isExplicitChargeConfirmation(lastUserText);
  if (["my_projects", "my_tasks", "scaffold_project_draft"].includes(name) && !input.privateAccess) return { ok: false, data: { code: "PRIVATE_ACCESS_REQUIRED" }, links: [] };
  if (name === "run_project_pack") {
    const { runProjectPackViaPi } = await import("./project-pack");
    // 项目 id 只从当前页面路径取：Agent 不能替用户指定别的项目。
    const projectId = /^\/projects\/([^/?#]+)/.exec(input.pathname)?.[1] ?? null;
    const res = await runProjectPackViaPi(actor, projectId, userConfirmed);
    return {
      ok: res.ok,
      data: { message: input.locale === "en" ? res.replyEn : res.replyZh, ...(res.error ? { code: res.error } : {}), ...(res.data !== undefined ? { detail: res.data } : {}) },
      links: res.links,
    };
  }
  if (name === "claim_daily_benefit") {
    const { claimDailyBenefitViaPi } = await import("./pi-agent");
    const res = await claimDailyBenefitViaPi(actor);
    return { ok: res.ok, data: { message: res.replyZh, pointsDelta: res.pointsDelta, balancePoints: res.balancePoints }, links: res.links };
  }
  if (name === "play_claw_arcade") {
    const { playClawArcadeViaPi } = await import("./pi-agent");
    const res = await playClawArcadeViaPi(actor, userConfirmed ? ARCADE_TOKEN_COST_POINTS : undefined, userConfirmed);
    return { ok: res.ok, data: { message: res.replyZh, pointsDelta: res.pointsDelta, balancePoints: res.balancePoints, detail: res.data }, links: res.links };
  }
  if (name === "search_market") {
    const { searchMarketViaPi } = await import("./pi-agent");
    const res = await searchMarketViaPi(query, actor);
    return { ok: res.ok, data: res.data ?? { message: res.replyZh }, links: res.links };
  }
  if (name === "scaffold_project_draft") {
    const { scaffoldProjectDraftViaPi } = await import("./pi-agent");
    const res = await scaffoldProjectDraftViaPi(actor, query);
    return { ok: res.ok, data: res.data ?? { message: res.replyZh }, links: res.links };
  }
  if (name === "redeem_market_item") {
    const { redeemMarketItemViaPi } = await import("./pi-agent");
    const res = await redeemMarketItemViaPi(actor, query, undefined, userConfirmed);
    return { ok: res.ok, data: res.data ?? { message: res.replyZh }, links: res.links };
  }
  if (name === "current_page") {
    if (query) return { ok: false, data: { code: "INVALID_TOOL_ARGUMENTS" }, links: [] };
    const path = input.pathname.replace(/\/$/, "");
    const detail = /^\/(explore|market)\/([A-Za-z0-9_-]+)$/.exec(path);
    if (detail) {
      const entries = await listPublishedCatalog();
      const entry = entries.find(item => detail[1] === "explore" ? item.slug === detail[2] && !item.memberHref : item.memberHref === path);
      const project = entry ? publicProjectSummary(entry, input.locale) : null;
      return { ok: true, data: { project, note: project
        ? "Published public summary only. Page route is a browser hint, not proof of private state. executable is declared catalog linkage, not live runtime availability."
        : "No currently published public project matches this page. Do not resurrect withdrawn content or infer private data." },
        links: project ? [{ href: project.href, title: project.title, detail: project.summary, icon: "discover" }] : [] };
    }
    const workflowPath = /^\/workflows\/([A-Za-z0-9_-]+)$/.exec(path);
    if (workflowPath && !["runs", "new"].includes(workflowPath[1])) {
      const row = await getPublishedWorkflow(workflowPath[1]);
      const workflow = row ? { title: row.title, summary: row.summary?.slice(0, 600) ?? "", description: row.description?.slice(0, 1200) ?? "",
        href: `/workflows/${row.slug}`, version: row.publishedVersion, estimatedPoints: Number(row.estimatedCost) } : null;
      return { ok: true, data: { workflow, note: "Published public workflow description only; no definitions, prompts, inputs entered by a member or task state. Estimated cost is not an execution quote. Null means no verified published workflow on this route; a workbench entry does not prove readiness." },
        links: workflow ? [{ href: workflow.href, title: workflow.title, detail: workflow.summary, icon: "video" }] : [] };
    }
    return { ok: true, data: { note: "This route has no supported public detail lookup. Use site_help or search tools. Never infer private state or unsaved inputs from the route." }, links: [] };
  }
  if (name === "site_help") {
    const routes = [
      { key: "aigc", href: "/workflows/hypit", icon: "video" },
      { key: "video", href: "https://hb.cauai.fun/", icon: "video" },
      { key: "learning", href: "/vibe-hub", icon: "learn" },
      { key: "competition", href: "/competitions", icon: "team" },
      { key: "team", href: "/teams", icon: "team" },
      { key: "workspace", href: "/workspace", icon: "project" },
      { key: "discover", href: "/explore", icon: "discover" },
    ] as const;
    const addedRoutes = [
      { key: "hub", href: "/hubs", icon: "learn" },
      { key: "community", href: "/community", icon: "team" },
      { key: "market", href: "/market", icon: "discover" },
    ] as const;
    const destinations: AgentLink[] = routes.map(route => ({ href: route.href, icon: route.icon, ...copy.agentRoutes[route.key] }));
    const extras: AgentLink[] = addedRoutes.map(route => ({ href: route.href, icon: route.icon, ...copy.agentRoutes[route.key] }));
    const line = query.toLowerCase();
    const selected = /hub|工作流|workflow/.test(line) ? extras.slice(0, 1) : /community|社区|成长/.test(line) ? extras.slice(1, 2) : /market|市场|交易/.test(line) ? extras.slice(2, 3) : /video|视频|短剧/.test(line) ? destinations.slice(0, 2) : /aigc|image|图片|创作|音频/.test(line) ? destinations.slice(0, 1) : /learn|learning|学习/.test(line) ? destinations.slice(2, 3) : /contest|competition|比赛/.test(line) ? destinations.slice(3, 4) : /team|团队/.test(line) ? destinations.slice(4, 5) : /workspace|工作台/.test(line) ? destinations.slice(5, 6) : destinations.slice(6);
    return { ok: true, data: { destinations: selected, note: "These are site entries only. They do not certify task execution, upstream model availability or output delivery." }, links: selected };
  }
  if (name === "search_projects") {
    const entries = await listPublishedCatalog();
    const items = searchPublicProjects(entries, query, input.locale);
    return { ok: true, data: { projects: items, note: "Keyword results only; partial matches do not satisfy every requested term. References without executable=true are browse/learn entries. executable=true means a declared catalog workflow link, not current runtime or model readiness. An empty result is no match, never a reason to invent recommendations." }, links: items.map(item => ({ href: item.href, title: item.title, detail: item.summary, icon: "discover" })) };
  }
  if (name === "search_workflows") {
    const rows = await listPublishedWorkflows({ query, take: 4 });
    const items = rows.map(row => ({ title: row.title, summary: row.summary?.slice(0, 420) ?? "", href: `/workflows/${row.slug}`, version: row.publishedVersion, estimatedPoints: row.estimatedCost }));
    return { ok: true, data: { workflows: items, note: "Declared estimates only. Confirm price and inputs on the workflow page before execution. Empty means no matching published workflow, not service failure." }, links: items.map(item => ({ href: item.href, title: item.title, detail: item.summary, icon: "video" })) };
  }
  if (name === "my_projects") {
    const rows = await db.project.findMany({ where: { ownerId: actor, status: "ACTIVE", ...(query ? { title: { contains: query, mode: "insensitive" as const } } : {}) }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 4,
      select: { id: true, title: true, goal: true, updatedAt: true, _count: { select: { artifacts: true } } } });
    const items = rows.map(row => ({ title: row.title.slice(0, 100), goal: row.goal, updatedAt: row.updatedAt.toISOString(), artifactCount: row._count.artifacts, href: `/projects/${row.id}` }));
    return { ok: true, data: { projects: items }, links: items.map(item => ({ href: item.href, title: item.title, detail: item.updatedAt, icon: "project" })) };
  }
  if (name === "my_tasks") {
    const rows = await db.workflowRun.findMany({ where: { userId: actor }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 5,
      select: { id: true, status: true, costPoints: true, createdAt: true, workflow: { select: { title: true } } } });
    return { ok: true, data: { tasks: rows.map(row => ({ id: row.id, title: row.workflow.title.slice(0, 100), status: row.status, costPoints: Number(row.costPoints), createdAt: row.createdAt.toISOString() })),
      note: "Only workflow runs. This list does not include all image/video or external tool tasks. FAILED does not prove zero upstream charge." }, links: [{ href: "/workflows/runs", title: copy.agentTasksTitle, detail: copy.agentTasksDetail, icon: "project" }] };
  }
  const user = input.privateAccess ? await db.user.findUnique({ where: { id: actor }, select: { quotaPoints: true } }) : null;
  return { ok: true, data: { yuanPerPoint: YUAN_PER_POINT, balance: user ? Number(user.quotaPoints) : null,
    note: "1 CNY = 10 points. Subscription preview is not available for purchase. Agent chat is metered; generation requires separate quote/confirmation. Null balance means private access not granted." }, links: [{ href: "/workspace/credits", title: copy.creditsUsage, detail: copy.actionCreditsDetail, icon: "credits" }] };
}
