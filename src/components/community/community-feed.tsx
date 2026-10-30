import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Check, Clock, Heart, MessageCircle } from "lucide-react";
import type { CommunityBoardId as CommunityBoard } from "@/contracts/community-posts";
import { BOARD_CHANNEL, type CommunityFeedItem } from "@/server/community/feed";
import type { CommunityPostSummary } from "@/server/community/posts";
import { helpVerb } from "@/contracts/community-posts";

/** 板块标签的颜色，亮暗主题各一套，文字对比度都在 4.5:1 以上。 */
export const BOARD_CHIP: Record<CommunityBoard, string> = {
  TEAM: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  CAREER: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
  RESEARCH: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100",
  AIGC: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
  CAMPUS: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
};
/** 一句话卡片没有图，底色按板块区分。 */
const BOARD_TINT: Record<CommunityBoard, string> = {
  TEAM: "bg-emerald-50 dark:bg-emerald-950/40",
  CAREER: "bg-blue-50 dark:bg-blue-950/40",
  RESEARCH: "bg-violet-50 dark:bg-violet-950/40",
  AIGC: "bg-orange-50 dark:bg-orange-950/40",
  CAMPUS: "bg-amber-50 dark:bg-amber-950/40",
};

const CARD = "relative flex flex-col overflow-hidden rounded-2xl border bg-card transition hover:border-foreground/30 motion-reduce:transition-none";
// 标题链接铺满整张卡片，卡片里的按钮再单独浮在上面。
const STRETCH = "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-ring";

type Labels = Awaited<ReturnType<typeof getTranslations>>;

function Avatar({ name, src }: { name: string; src: string | null }) {
  return src
    ? <img src={src} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" loading="lazy" />
    : <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-foreground/80">{name.charAt(0).toUpperCase()}</span>;
}

function Byline({ author, children }: { author: { name: string; avatar: string | null }; children?: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
    <span className="flex min-w-0 items-center gap-1.5"><Avatar name={author.name} src={author.avatar} /><span className="truncate">{author.name}</span></span>
    <span className="flex shrink-0 items-center gap-2.5">{children}</span>
  </div>;
}

function Counts({ likes, replies, t }: { likes: number; replies: number; t: Labels }) {
  return <>
    <span className="flex items-center gap-0.5"><Heart className="h-3.5 w-3.5" aria-hidden="true" />{likes}<span className="sr-only"> {t("likes")}</span></span>
    {replies > 0 && <span className="flex items-center gap-0.5"><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />{replies}<span className="sr-only"> {t("comments")}</span></span>}
  </>;
}

function displayName(user: { nickname: string | null; username: string }) {
  return user.nickname || user.username;
}

function StallCard({ post, t, date }: { post: CommunityPostSummary; t: Labels; date: (value: Date) => string }) {
  const href = `/community/posts/${post.id}`;
  const verb = helpVerb(post.stall);
  const author = { name: displayName(post.author), avatar: post.author.avatar };
  const cta = post.stall === "TEAM" ? t("cta.apply") : verb === "want" ? t("cta.want") : t("cta.help");
  return <article className={`${CARD} gap-2.5 p-3.5 ${post.active ? "" : "bg-muted/40"}`}>
    <div className="flex items-center gap-1.5">
      <span className="rounded-md bg-foreground px-1.5 py-0.5 text-xs font-bold text-background">{t(`stall.${post.stall ?? "SEEK"}`)}</span>
      {!(post.stall === "TEAM" && post.board === "TEAM") && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BOARD_CHIP[post.board]}`}>{t(`channels.${BOARD_CHANNEL[post.board]}`)}</span>}
    </div>
    <h3 className="text-[15px] font-semibold leading-snug"><Link href={href} prefetch={false} className={STRETCH}>{post.title}</Link></h3>
    {post.stall === "TEAM" && (post.competition || post.team) && <p className="truncate text-xs text-muted-foreground">{[post.competition?.title, post.team?.name].filter(Boolean).join(" · ")}</p>}
    {post.vacancies.length > 0 && <ul className="space-y-1">
      {post.vacancies.map((role) => <li key={role.name} className={`flex justify-between rounded-lg bg-muted px-2.5 py-1.5 text-xs ${role.filled >= role.slots ? "text-muted-foreground" : ""}`}>
        <span>{role.name}</span>{role.filled >= role.slots ? <span>{t("roleFull")}</span> : <strong>{role.filled} / {role.slots}</strong>}
      </li>)}
    </ul>}
    {post.status === "RESOLVED" && <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
      <Check className="h-3.5 w-3.5" aria-hidden="true" />{post.stall === "TEAM" ? t("teamFull") : post.helper ? t("resolvedBy", { name: displayName(post.helper) }) : t("resolved")}
    </p>}
    <Byline author={author}>
      {post.active && post.expiresAt && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{t("deadline", { date: date(post.expiresAt) })}</span>}
      {post.active && verb && post._count.helpOffers > 0 && <span>{t(verb === "want" ? "wantCount" : "helpCount", { count: post._count.helpOffers })}</span>}
    </Byline>
    {post.active && <Link href={`${href}#act`} prefetch={false} className={`relative z-10 inline-flex h-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${post.stall === "TEAM" ? "bg-foreground text-background hover:bg-foreground/90" : "border bg-background hover:bg-muted"}`}>{cta}</Link>}
  </article>;
}

function NoteCard({ post, t }: { post: CommunityPostSummary; t: Labels }) {
  const cover = post.images[0];
  return <article className={CARD}>
    {cover
      ? <img src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-[4/5] w-full object-cover" />
      : <div className={`flex aspect-[4/3] items-end p-4 ${BOARD_TINT[post.board]}`}><p className="line-clamp-4 text-lg font-bold leading-snug">{post.title}</p></div>}
    <div className="space-y-2 p-3">
      {cover && <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{post.title}</h3>}
      <Link href={`/community/posts/${post.id}`} prefetch={false} className={`${STRETCH} line-clamp-2 block text-sm leading-snug text-foreground/80`}>{post.body}</Link>
      <Byline author={{ name: displayName(post.author), avatar: post.author.avatar }}><Counts likes={post._count.likes} replies={post._count.replies} t={t} /></Byline>
    </div>
  </article>;
}

function TextCard({ post, t }: { post: CommunityPostSummary; t: Labels }) {
  return <article className={`${CARD} gap-4 px-4 py-5 ${BOARD_TINT[post.board]}`}>
    <p className="text-lg font-semibold leading-relaxed"><Link href={`/community/posts/${post.id}`} prefetch={false} className={STRETCH}>{post.body}</Link></p>
    <Byline author={{ name: displayName(post.author), avatar: post.author.avatar }}><Counts likes={post._count.likes} replies={post._count.replies} t={t} /></Byline>
  </article>;
}

function WorkCard({ item, t }: { item: Extract<CommunityFeedItem, { type: "work" }>; t: Labels }) {
  return <article className={CARD}>
    <div className={`relative flex aspect-square items-end p-4 ${BOARD_TINT.AIGC}`}>
      <span className="absolute left-2.5 top-2.5 rounded-full bg-background/85 px-2 py-0.5 font-mono text-[11px] font-medium">v{item.version}</span>
      <p className="line-clamp-4 text-lg font-bold leading-snug">{item.title}</p>
    </div>
    <div className="space-y-2 p-3">
      <Link href={item.href} prefetch={false} className={`${STRETCH} line-clamp-2 block text-sm leading-snug text-foreground/80`}>{item.excerpt || item.title}</Link>
      <Byline author={item.author}><Counts likes={item.likes} replies={item.comments} t={t} /></Byline>
    </div>
  </article>;
}

export async function CommunityFeed({ items }: { items: CommunityFeedItem[] }) {
  const [t, locale] = await Promise.all([getTranslations("product.communityPage"), getLocale().catch(() => "zh")]);
  const formatter = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", { month: "short", day: "numeric", timeZone: "Asia/Shanghai" });
  const date = (value: Date) => formatter.format(value);
  return <ul className="columns-2 gap-3 md:columns-3 2xl:columns-4" data-testid="community-feed">
    {items.map((item) => <li key={`${item.type}:${item.id}`} className="mb-3 break-inside-avoid">
      {item.type === "work" ? <WorkCard item={item} t={t} />
        : item.post.kind === "STALL" ? <StallCard post={item.post} t={t} date={date} />
          : item.post.kind === "NOTE" ? <NoteCard post={item.post} t={t} />
            : <TextCard post={item.post} t={t} />}
    </li>)}
  </ul>;
}
