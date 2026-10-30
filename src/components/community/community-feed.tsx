import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, GitFork, Heart, MessageCircle } from "lucide-react";
import type { CommunityFeedItem } from "@/server/community/feed";

/** 文字封面的底色按频道区分，亮暗主题各一套。 */
const CHANNEL_TONE: Record<CommunityFeedItem["channel"], string> = {
  competition: "from-emerald-200 via-lime-100 to-amber-50 text-emerald-950 dark:from-emerald-900 dark:via-emerald-950 dark:to-lime-950 dark:text-emerald-50",
  aigc: "from-rose-200 via-pink-100 to-orange-50 text-rose-950 dark:from-rose-950 dark:via-fuchsia-950 dark:to-orange-950 dark:text-rose-50",
  github: "from-slate-200 via-zinc-100 to-sky-50 text-slate-950 dark:from-slate-800 dark:via-zinc-900 dark:to-sky-950 dark:text-slate-50",
  web: "from-sky-200 via-cyan-100 to-indigo-50 text-sky-950 dark:from-sky-950 dark:via-cyan-950 dark:to-indigo-950 dark:text-sky-50",
  learning: "from-amber-200 via-yellow-100 to-stone-50 text-amber-950 dark:from-amber-950 dark:via-stone-900 dark:to-yellow-950 dark:text-amber-50",
};

// 标题越长封面越高，让瀑布流有错落感。
function coverAspect(title: string) {
  return title.length > 22 ? "aspect-[3/4]" : title.length > 12 ? "aspect-[4/5]" : "aspect-square";
}

function TextCover({ item }: { item: CommunityFeedItem }) {
  return <div className={`relative flex ${coverAspect(item.title)} w-full flex-col justify-end overflow-hidden bg-gradient-to-br p-4 ${CHANNEL_TONE[item.channel]}`}>
    <p className="line-clamp-5 text-lg font-bold leading-snug tracking-tight sm:text-xl">{item.title}</p>
  </div>;
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  return src
    ? <img src={src} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" loading="lazy" />
    : <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">{name.charAt(0).toUpperCase()}</span>;
}

function NoteCard({ item, labels }: { item: Extract<CommunityFeedItem, { type: "note" }>; labels: { likes: string; comments: string } }) {
  return <Link href={item.href} prefetch={false} className="group block overflow-hidden rounded-2xl border bg-card transition hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:transition-none">
    <div className="relative">
      <TextCover item={item} />
      <span className="absolute left-2.5 top-2.5 rounded-full bg-background/85 px-2 py-0.5 font-mono text-[11px] font-medium text-foreground backdrop-blur">v{item.version}</span>
    </div>
    <div className="space-y-2 p-3">
      <p title={item.excerpt} className="line-clamp-2 text-sm leading-snug text-foreground/85">{item.excerpt || item.title}</p>
      <p className="truncate font-mono text-[11px] text-muted-foreground">{item.repo}</p>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5"><Avatar name={item.author.name} src={item.author.avatar} /><span className="truncate">{item.author.name}</span></span>
        <span className="flex shrink-0 items-center gap-2.5">
          <span className="flex items-center gap-0.5" aria-label={`${item.likes} ${labels.likes}`}><Heart className="h-3.5 w-3.5" aria-hidden="true" />{item.likes}</span>
          {item.comments > 0 && <span className="flex items-center gap-0.5" aria-label={`${item.comments} ${labels.comments}`}><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />{item.comments}</span>}
        </span>
      </div>
    </div>
  </Link>;
}

function RepoCard({ item, category }: { item: Extract<CommunityFeedItem, { type: "repo" }>; category: string }) {
  const body = <>
    {item.cover
      ? <img src={item.cover} alt="" loading="lazy" className="aspect-[4/3] w-full border-b object-cover object-top" />
      : <TextCover item={item} />}
    <div className="space-y-1.5 p-3">
      <p className="flex items-center gap-1 truncate font-mono text-[11px] text-muted-foreground"><GitFork className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="truncate">{item.repo}</span></p>
      {item.cover && <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h3>}
      <p title={item.excerpt} className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.excerpt}</p>
      <div className="flex items-center justify-between pt-0.5 text-[11px] text-muted-foreground">
        <span className="rounded-full border px-2 py-0.5">{category}</span>
        <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:text-primary" aria-hidden="true" />
      </div>
    </div>
  </>;
  const className = "group block overflow-hidden rounded-2xl border bg-card transition hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:transition-none";
  return item.external
    ? <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>{body}</a>
    : <Link href={item.href} prefetch={false} className={className}>{body}</Link>;
}

export async function CommunityFeed({ items }: { items: CommunityFeedItem[] }) {
  const [t, product] = await Promise.all([getTranslations("product.communityPage"), getTranslations("product")]);
  const labels = { likes: t("likes"), comments: t("comments") };
  return <ul className="columns-2 gap-3 md:columns-3 2xl:columns-4" data-testid="community-feed">
    {items.map((item) => <li key={`${item.type}:${item.id}`} className="mb-3 break-inside-avoid">
      {item.type === "note" ? <NoteCard item={item} labels={labels} /> : <RepoCard item={item} category={product(`categories.${item.category}`)} />}
    </li>)}
  </ul>;
}
