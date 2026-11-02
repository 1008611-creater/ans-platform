import type { CommunityBoard } from "@prisma/client";
import { listPublishedArtifacts } from "@/server/projects/publication";
import { listCommunityPosts, PINNED_MAX, type CommunityFeedSort, type CommunityPostSummary } from "@/server/community/posts";
import { listFollowingIds } from "@/server/community/follows";

/** 社区板块。项目库留在项目广场，这里只放人发的东西。「关注」只给登录的人看。 */
export const COMMUNITY_CHANNELS = ["following", "all", "team", "career", "research", "aigc", "campus"] as const;
export type CommunityChannel = typeof COMMUNITY_CHANNELS[number];
type BoardChannel = Exclude<CommunityChannel, "all" | "following">;

const CHANNEL_BOARD: Record<BoardChannel, CommunityBoard> = {
  team: "TEAM",
  career: "CAREER",
  research: "RESEARCH",
  aigc: "AIGC",
  campus: "CAMPUS",
};
export const BOARD_CHANNEL: Record<CommunityBoard, BoardChannel> = {
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

export function parseCommunityChannel(value: unknown, signedIn = true): CommunityChannel {
  const channel = COMMUNITY_CHANNELS.find((item) => item === value) ?? "all";
  return channel === "following" && !signedIn ? "all" : channel;
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

/** 验收、测试类的作品不进公开信息流。标题里带这些词的跳过；别的用环境变量按作品 ID 补充，逗号分隔。 */
const SAMPLE_WORK_PATTERN = /验收|测试|冒烟|smoke|e2e|\btest\b/i;
export function isSampleWork(work: { id: string; title: string; projectTitle: string }, hiddenIds = (process.env.COMMUNITY_FEED_HIDDEN_WORKS ?? "").split(",").map((id) => id.trim()).filter(Boolean)) {
  return hiddenIds.includes(work.id) || SAMPLE_WORK_PATTERN.test(work.title) || SAMPLE_WORK_PATTERN.test(work.projectTitle);
}

/**
 * 社区信息流：帖子和已审核公开的作品按时间排在一起；作品归在「AIGC 与作品」。
 * 「关注」频道只放关注的人发的帖子，不混作品；还没关注任何人时 followingCount 为 0。
 */
export async function listCommunityFeed(channel: CommunityChannel, sort: CommunityFeedSort = "latest", viewerId: string | null = null) {
  if (channel === "following") {
    const ids = viewerId ? await listFollowingIds(viewerId) : [];
    const posts = ids.length ? await listCommunityPosts({ sort, authorIds: ids }) : [];
    return { feed: posts.map((post) => ({ type: "post" as const, id: post.id, createdAt: post.createdAt, post })) as CommunityFeedItem[], followingCount: ids.length, pinned: [] };
  }
  const board = channel === "all" ? undefined : CHANNEL_BOARD[channel];
  const withWorks = sort === "latest" && (channel === "all" || channel === "aigc");
  // 置顶帖只放在推荐频道的「最新」顶上，下面的信息流不再重复出现。
  const pinned = channel === "all" && sort === "latest" ? await listCommunityPosts({ pinned: true, take: PINNED_MAX }) : [];
  const [posts, artifacts] = await Promise.all([
    listCommunityPosts({ board, sort, excludeIds: pinned.map((post) => post.id) }),
    withWorks ? listPublishedArtifacts(24) : Promise.resolve([]),
  ]);
  const feed: CommunityFeedItem[] = [
    ...posts.map((post) => ({ type: "post" as const, id: post.id, createdAt: post.createdAt, post })),
    ...artifacts.filter((artifact) => !isSampleWork({ id: artifact.id, title: artifact.title, projectTitle: artifact.project.title })).map((artifact) => ({
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
  return { feed, followingCount: null, pinned: pinned.map((post) => ({ type: "post" as const, id: post.id, createdAt: post.createdAt, post })) as CommunityFeedItem[] };
}
