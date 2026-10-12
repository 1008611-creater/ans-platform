import { z } from "zod";
import zhCopy from "@/../messages/companion/zh.json";
import enCopy from "@/../messages/companion/en.json";
import { db } from "@/lib/db";
import type { AgentInput, AgentLink } from "@/contracts/companion-agent";
import { listPublishedCatalog } from "@/server/catalog/service";
import { listPublishedWorkflows } from "@/server/workflows/service";
import { YUAN_PER_POINT } from "@/lib/credits-pricing";
const argsSchema = z.object({ query: z.string().trim().max(100) }).strict();
const descriptions = {
  site_help: "Get verified in-site destinations for a goal: video, aigc, learning, competition, team, workspace, hub, community, market or discover. This is navigation help, not execution. Query may be empty.",
  search_projects: "Search currently published ANS project references. Check source and executable availability. Query in the user's language; empty query lists a few projects.",
  search_workflows: "Search currently published user workflows. Returns declared estimated price, NOT a live execution quote. Query may be empty.",
  my_projects: "Read this authenticated member's own project summaries only; requires explicit privateAccess. Does not read project facts or file contents. Query may be empty.",
  my_tasks: "Read this authenticated member's most recent workflow task states and actual recorded cost only; requires explicit privateAccess. Does not retry or cancel a task.",
  credits: "Read this member's current balance when privateAccess is granted; otherwise only return public fixed conversion and billing destination.",
} as const;
export type AgentToolName = keyof typeof descriptions;
export const AGENT_TOOLS = Object.entries(descriptions).map(([name, description]) => ({ type: "function" as const, name, description, strict: true,
  parameters: { type: "object", properties: { query: { type: "string", description: "Short search query, or empty string" } }, required: ["query"], additionalProperties: false },
}));
export type ToolResult = { ok: boolean; data: unknown; links: AgentLink[] };
export async function executeAgentTool(name: string, raw: string, actor: string, input: AgentInput): Promise<ToolResult> {
  const copy = input.locale === "zh" ? zhCopy : enCopy;
  let query: string;
  try { query = argsSchema.parse(JSON.parse(raw)).query; }
  catch { return { ok: false, data: { code: "INVALID_TOOL_ARGUMENTS" }, links: [] }; }
  if (!Object.hasOwn(descriptions, name)) return { ok: false, data: { code: "TOOL_UNAVAILABLE" }, links: [] };
  if (["my_projects", "my_tasks"].includes(name) && !input.privateAccess) return { ok: false, data: { code: "PRIVATE_ACCESS_REQUIRED" }, links: [] };
  if (name === "site_help") {
    const routes = [
      { key: "aigc", href: "/workflows/hypit", icon: "video" },
      { key: "video", href: "/workflows/toonflow", icon: "video" },
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
    const terms = query.normalize("NFKC").toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const items = entries.flatMap(entry => {
      const text = input.locale === "en" ? entry.content?.en ?? entry.content?.zh : entry.content?.zh;
      if (!text) return [];
      const search = [entry.slug, entry.category, entry.subcategory, text.title, text.summary].join(" ").normalize("NFKC").toLocaleLowerCase();
      if (!terms.every(term => search.includes(term))) return [];
      // Only real internal detail destinations, never follow a model-provided URL.
      return [{ slug: entry.slug, title: text.title, summary: text.summary.slice(0, 420), input: text.inputs.slice(0, 220), output: text.output.slice(0, 220), source: entry.source, sourceUrl: entry.sourceUrl ?? null,
        executable: Boolean(entry.workflowId), href: entry.memberHref ?? `/explore/${entry.slug}` }];
    }).slice(0, 5);
    return { ok: true, data: { projects: items, note: "References without executable=true are browse/learn entries, not runnable workflows." }, links: items.map(item => ({ href: item.href, title: item.title, detail: item.summary, icon: "discover" })) };
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
