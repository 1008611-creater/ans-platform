import type { CommunityBoard } from "@prisma/client";
import { listPublishedArtifacts } from "@/server/projects/publication";
import { listCommunityPosts, type CommunityFeedSort, type CommunityPostSummary } from "@/server/community/posts";

/** 社区板块。项目库留在项目广场，这里只放人发的东西。 */
export const COMMUNITY_CHANNELS = ["all", "team", "career", "research", "aigc", "campus"] as const;
export type CommunityChannel = typeof COMMUNITY_CHANNELS[number];

const CHANNEL_BOARD: Record<Exclude<CommunityChannel, "all">, CommunityBoard> = {
  team: "TEAM",
  career: "CAREER",
  research: "RESEARCH",
  aigc: "AIGC",
  campus: "CAMPUS",
};
export const BOARD_CHANNEL: Record<CommunityBoard, Exclude<CommunityChannel, "all">> = {
  TEAM: "team",
  CAREER: "career",
  RESEARCH: "research",
  AIGC: "aigc",
  CAMPUS: "campus",
};

export type CommunityFeedItem =
  | { type: "post"; id: string; createdAt: Date; post: CommunityPostSummary }
  | {
    type: "work";
    id: string;
    createdAt: Date;
    href: string;
    title: string;
    excerpt: string;
    version: number;
    author: { name: string; username: string; avatar: string | null };
    likes: number;
    comments: number;
  };

export function parseCommunityChannel(value: unknown): CommunityChannel {
  return COMMUNITY_CHANNELS.find((channel) => channel === value) ?? "all";
}

export function parseCommunitySort(value: unknown): CommunityFeedSort {
  return value === "open" ? "open" : "latest";
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

/** 社区信息流：帖子和已审核公开的作品按时间排在一起；作品归在「AIGC 与作品」。 */
export async function listCommunityFeed(channel: CommunityChannel, sort: CommunityFeedSort = "latest") {
  const board = channel === "all" ? undefined : CHANNEL_BOARD[channel];
  const withWorks = sort === "latest" && (channel === "all" || channel === "aigc");
  const [posts, artifacts] = await Promise.all([
    listCommunityPosts({ board, sort }),
    withWorks ? listPublishedArtifacts(24) : Promise.resolve([]),
  ]);
  const feed: CommunityFeedItem[] = [
    ...posts.map((post) => ({ type: "post" as const, id: post.id, createdAt: post.createdAt, post })),
    ...artifacts.map((artifact) => ({
      type: "work" as const,
      id: artifact.id,
      createdAt: artifact.publishedAt ?? artifact.createdAt,
      href: `/showcase/${artifact.id}`,
      // 作品标题多是工作流默认名（如「README 草稿」），封面用项目名更能说清做了什么。
      title: artifact.project.title,
      excerpt: plainExcerpt(artifact.markdown),
      version: artifact.version,
      author: { name: artifact.author.nickname || artifact.author.username, username: artifact.author.username, avatar: artifact.author.avatar },
      likes: artifact.counts.reactions,
      comments: artifact.counts.comments,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return { feed };
}
