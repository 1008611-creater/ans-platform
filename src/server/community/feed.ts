import { getLocale, getTranslations } from "next-intl/server";
import { catalogText } from "@/domain/catalog/content";
import { resolveProjectCovers, type CatalogProject } from "@/domain/catalog/projects";
import { listPublishedCatalog } from "@/server/catalog/service";
import { listPublishedArtifacts } from "@/server/projects/publication";

/** 社区频道。只按真实分类归档，不为凑数补内容。 */
export const COMMUNITY_CHANNELS = ["all", "competition", "aigc", "github", "web", "learning"] as const;
export type CommunityChannel = typeof COMMUNITY_CHANNELS[number];

export type CommunityFeedItem =
  | {
    type: "note";
    id: string;
    href: string;
    channel: Exclude<CommunityChannel, "all">;
    title: string;
    excerpt: string;
    version: number;
    repo: string;
    author: { name: string; username: string; avatar: string | null };
    likes: number;
    comments: number;
  }
  | {
    type: "repo";
    id: string;
    href: string;
    external: boolean;
    channel: Exclude<CommunityChannel, "all">;
    title: string;
    excerpt: string;
    repo: string;
    cover: string | null;
    category: CatalogProject["category"];
    source: CatalogProject["source"];
  };

const CATEGORY_CHANNEL: Record<CatalogProject["category"], Exclude<CommunityChannel, "all">> = {
  competition: "competition",
  aigc: "aigc",
  github: "github",
  productivity: "github",
  web: "web",
  career: "web",
  learning: "learning",
  business: "learning",
};
const GOAL_CHANNEL: Record<string, Exclude<CommunityChannel, "all">> = { CONTEST: "competition", CAREER: "web", PORTFOLIO: "web" };

export function parseCommunityChannel(value: unknown): CommunityChannel {
  return COMMUNITY_CHANNELS.find((channel) => channel === value) ?? "all";
}

/** 把 Markdown 正文压成卡片摘要：去掉标记，只留可读文字。 */
export function plainExcerpt(markdown: string, max = 90) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function repoOwner(project: CatalogProject) {
  if (project.sourceUrl) {
    const github = /^https:\/\/github\.com\/([^/]+\/[^/#?]+)/.exec(project.sourceUrl);
    if (github) return github[1];
  }
  return `${project.creator ?? "ans"}/${project.slug}`;
}

/** 社区信息流：已审核公开的作品（笔记）与公开项目库（仓库）交替排列。 */
export async function listCommunityFeed(channel: CommunityChannel) {
  const [artifacts, catalog, t, locale] = await Promise.all([
    listPublishedArtifacts(36),
    listPublishedCatalog(),
    getTranslations("product"),
    getLocale().catch(() => "zh"),
  ]);
  const notes: CommunityFeedItem[] = artifacts.map((artifact) => ({
    type: "note",
    id: artifact.id,
    href: `/showcase/${artifact.id}`,
    channel: GOAL_CHANNEL[artifact.project.goal ?? ""] ?? "learning",
    title: artifact.title,
    excerpt: plainExcerpt(artifact.markdown),
    version: artifact.version,
    repo: `${artifact.project.team?.slug ?? artifact.author.username}/${artifact.project.title}`,
    author: { name: artifact.author.nickname || artifact.author.username, username: artifact.author.username, avatar: artifact.author.avatar },
    likes: artifact.counts.reactions,
    comments: artifact.counts.comments,
  }));
  const repos: CommunityFeedItem[] = catalog.map((project) => {
    const href = project.memberHref ?? `/explore/${project.slug}`;
    return {
      type: "repo",
      id: project.slug,
      href,
      external: /^https?:\/\//.test(href),
      channel: CATEGORY_CHANNEL[project.category] ?? "learning",
      title: catalogText(project, t, "title", locale),
      excerpt: catalogText(project, t, "summary", locale),
      repo: repoOwner(project),
      cover: resolveProjectCovers(project).outerCoverUrl ?? null,
      category: project.category,
      source: project.source,
    };
  });
  const pick = (items: CommunityFeedItem[]) => channel === "all" ? items : items.filter((item) => item.channel === channel);
  const [n, r] = [pick(notes), pick(repos)];
  // 每两条作品之后插一个项目，作品永远排在前面。
  const feed: CommunityFeedItem[] = [];
  for (let i = 0, j = 0; i < n.length || j < r.length;) {
    if (i < n.length) feed.push(n[i++]);
    if (i < n.length) feed.push(n[i++]);
    if (j < r.length) feed.push(r[j++]);
  }
  return { feed, noteCount: n.length, repoCount: r.length };
}
