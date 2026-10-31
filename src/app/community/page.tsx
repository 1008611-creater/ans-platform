import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { formatLevel } from "@/lib/level";
import { getGrowthProfile } from "@/server/growth/service";
import { COMMUNITY_CHANNELS, listCommunityFeed, parseCommunityChannel, parseCommunitySort } from "@/server/community/feed";
import { getComposeOptions, listMyStalls } from "@/server/community/posts";
import { PostCompose } from "@/components/community/post-compose";
import { CommunityFeed } from "@/components/community/community-feed";
import { CheckInHeatmap } from "@/components/community/check-in-heatmap";
import { CommunityPanel } from "@/components/community/community-panel";
import { ProfileGrowthPanel } from "@/components/growth/profile-growth-panel";
import { Button } from "@/components/ui/button";
import { Waves } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("product.communityPage");
  return { title: `${t("title")} · ANS`, description: t("description") };
}

type SearchParams = Promise<{ c?: string | string[]; tab?: string | string[]; sort?: string | string[] }>;

const tabClass = (active: boolean) => `border-b-2 px-1 pb-2 text-sm font-semibold transition-colors ${active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`;

export default async function CommunityPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const session = await auth();
  const t = await getTranslations("product.communityPage");
  const userId = session?.user?.id;
  const showGrowth = Boolean(userId) && params.tab === "growth";
  const channel = parseCommunityChannel(params.c);
  const sort = parseCommunitySort(params.sort);
  const [growth, feed, compose, stalls] = await Promise.all([
    userId ? getGrowthProfile(userId) : null,
    showGrowth ? null : listCommunityFeed(channel, sort),
    userId ? getComposeOptions(userId) : null,
    userId && !showGrowth ? listMyStalls(userId) : [],
  ]);
  const channelHref = (id: string, nextSort = sort) => {
    const query = new URLSearchParams();
    if (id !== "all") query.set("c", id);
    if (nextSort === "open") query.set("sort", "open");
    const search = query.toString();
    return search ? `/community?${search}` : "/community";
  };
  if (userId && !growth) notFound();

  return (
    <div className="ans-product-container ans-page-content ans-community-page space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5"><Link href="/community/bottles" data-testid="community-bottles-link"><Waves className="h-4 w-4" aria-hidden="true" />{t("bottlesLink")}</Link></Button>
          {compose
            ? <PostCompose teams={compose.teams} competitions={compose.competitions} />
            : <Button asChild size="sm"><Link href="/login?callbackUrl=/community">{t("publish")}</Link></Button>}
        </div>
      </header>

      {userId && <nav className="flex gap-6 border-b" aria-label={t("title")}>
        <Link href="/community" aria-current={showGrowth ? undefined : "page"} className={tabClass(!showGrowth)}>{t("discover")}</Link>
        <Link href="/community?tab=growth" aria-current={showGrowth ? "page" : undefined} className={tabClass(showGrowth)}>{t("growth")}</Link>
      </nav>}

      {showGrowth && userId && growth ? (
        <AccountContentBoundary actorId={userId}>
          <div className="space-y-8">
            <ProfileGrowthPanel key={userId} actorId={userId} editable showActivity={false} avatarFallback={(session?.user?.username ?? "A").charAt(0)} user={{ ...growth, checkedInToday: growth.checkIns.some(record => record.day === growth.growthDay) }} />
            <CommunityPanel key={`${userId}:${growth.xp}:${growth.checkIns[0]?.id ?? "none"}`} actorId={userId} showGrowth={false} />
          </div>
        </AccountContentBoundary>
      ) : feed && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1" aria-label={t("channelsLabel")}>
              {COMMUNITY_CHANNELS.map((id) => <Link key={id} href={channelHref(id)} aria-current={id === channel ? "page" : undefined}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors ${id === channel ? "bg-foreground font-semibold text-background" : "bg-muted text-foreground/80 hover:text-foreground"}`}>
                {t(`channels.${id}`)}
              </Link>)}
            </nav>
            <nav className="flex shrink-0 rounded-lg bg-muted p-0.5 text-sm" aria-label={t("sortLabel")}>
              {(["latest", "open"] as const).map((value) => <Link key={value} href={channelHref(channel, value)} aria-current={sort === value ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 transition-colors ${sort === value ? "bg-background font-semibold shadow-sm" : "text-foreground/80 hover:text-foreground"}`}>
                {t(value === "open" ? "sortOpen" : "sortLatest")}
              </Link>)}
            </nav>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <section aria-labelledby="community-feed-heading" className="min-w-0">
              <h2 id="community-feed-heading" className="sr-only">{t(`channels.${channel}`)}</h2>
              {feed.feed.length > 0 ? <CommunityFeed items={feed.feed} /> : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed px-5 py-6 text-sm text-muted-foreground">
                  <span>{t("empty")}</span>
                  {!compose && <Link href="/login?callbackUrl=/community" className="font-semibold text-primary hover:underline">{t("emptyAction")}</Link>}
                </div>
              )}
            </section>
            <aside className="hidden space-y-4 lg:block">
              {userId && stalls.length > 0 && <AccountContentBoundary actorId={userId}>
                <div className="space-y-2.5 rounded-2xl border bg-card p-4" data-testid="community-my-stalls">
                  <h2 className="text-sm font-semibold">{t("myStalls")}</h2>
                  <ul className="space-y-2">
                    {stalls.map((stall) => <li key={stall.id}><Link href={`/community/posts/${stall.id}`} className="flex flex-col gap-0.5 rounded-xl bg-muted px-3 py-2.5 hover:bg-muted/70">
                      <span className="truncate text-sm font-semibold">{stall.title}</span>
                      <span className={`text-xs ${stall.pending > 0 ? "font-semibold text-emerald-800 dark:text-emerald-200" : "text-muted-foreground"}`}>{stall.pending > 0 ? t(stall.stall === "TEAM" ? "myStallTeam" : "myStallHelp", { count: stall.pending }) : t("myStallNone")}</span>
                    </Link></li>)}
                  </ul>
                </div>
              </AccountContentBoundary>}
              {userId && growth ? (
                <AccountContentBoundary actorId={userId}>
                  <div className="space-y-3 rounded-2xl border bg-card p-4" data-testid="community-checkin-card">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-sm font-semibold">{t("checkInTitle")}</h2>
                      <span className="text-xs text-muted-foreground">{formatLevel(growth.xp)}</span>
                    </div>
                    <CheckInHeatmap today={growth.growthDay} days={growth.checkIns.map(record => record.day)} label={t("checkInLabel")} />
                    <p className="text-xs text-muted-foreground">{t("streak", { days: growth.checkInStreak })} · {growth.xp.toLocaleString()} XP</p>
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link href="/community?tab=growth">{growth.checkIns.some(record => record.day === growth.growthDay) ? t("viewGrowth") : t("goCheckIn")}</Link>
                    </Button>
                  </div>
                </AccountContentBoundary>
              ) : (
                <div className="space-y-3 rounded-2xl border bg-card p-4" data-testid="community-guest-preview">
                  <h2 className="text-sm font-semibold">{t("joinTitle")}</h2>
                  <p className="text-xs leading-relaxed text-muted-foreground">{t("joinBody")}</p>
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1"><Link href="/login?callbackUrl=/community">{t("signIn")}</Link></Button>
                    <Button asChild size="sm" variant="outline" className="flex-1"><Link href="/register?callbackUrl=/community">{t("register")}</Link></Button>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
