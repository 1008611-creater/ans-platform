import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { formatLevel } from "@/lib/level";
import { getGrowthProfile } from "@/server/growth/service";
import { COMMUNITY_CHANNELS, listCommunityFeed, parseCommunityChannel, parseCommunitySort } from "@/server/community/feed";
import { getComposeOptions, listMyStalls, listOpenCompetitions } from "@/server/community/posts";
import { suggestFollows } from "@/server/community/follows";
import { FollowButton } from "@/components/community/follow-button";
import { PostCompose, type ComposePreset } from "@/components/community/post-compose";
import { loadRemixProjects } from "@/server/community/remix";
import { catalogSlugSchema } from "@/contracts/community-posts";
import { CommunityFeed } from "@/components/community/community-feed";
import { CheckInHeatmap } from "@/components/community/check-in-heatmap";
import { CommunityPanel } from "@/components/community/community-panel";
import { ProfileGrowthPanel } from "@/components/growth/profile-growth-panel";
import { Button } from "@/components/ui/button";
import { ChevronRight, Pin, Waves } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("product.communityPage");
  return { title: t("title"), description: t("description") };
}

type SearchParams = Promise<{ c?: string | string[]; tab?: string | string[]; sort?: string | string[]; project?: string | string[]; compose?: string | string[] }>;

/** 在哪个板块发帖，就预选那个板块和最常用的帖子类型。推荐频道默认一句话，门槛最低。 */
const CHANNEL_PRESET: Record<string, ComposePreset> = {
  all: { board: "CAMPUS", kind: "TEXT" },
  team: { board: "TEAM", kind: "STALL", stall: "TEAM" },
  career: { board: "CAREER", kind: "NOTE" },
  research: { board: "RESEARCH", kind: "NOTE" },
  aigc: { board: "AIGC", kind: "NOTE" },
  campus: { board: "CAMPUS", kind: "STALL", stall: "SEEK" },
  open: { board: "CAMPUS", kind: "STALL", stall: "SEEK" },
};

const tabClass = (active: boolean) => `border-b-2 px-1 pb-2 text-sm font-semibold transition-colors ${active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`;

export default async function CommunityPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const session = await auth();
  const t = await getTranslations("product.communityPage");
  const userId = session?.user?.id;
  const showGrowth = Boolean(userId) && params.tab === "growth";
  const channel = parseCommunityChannel(params.c, Boolean(userId));
  const sort = parseCommunitySort(params.sort);
  // 从项目广场「晒我的同款」进来：弹窗直接打开，项目已经附好。
  const projectSlug = userId && typeof params.project === "string" && catalogSlugSchema.safeParse(params.project).success ? params.project : null;
  const [growth, feed, compose, stalls, suggestions, remixProjects, openCompetitions] = await Promise.all([
    userId ? getGrowthProfile(userId) : null,
    showGrowth ? null : listCommunityFeed(channel, sort, userId ?? null),
    userId ? getComposeOptions(userId) : null,
    userId && !showGrowth ? listMyStalls(userId) : [],
    userId && !showGrowth ? suggestFollows(userId) : [],
    loadRemixProjects([projectSlug]),
    !showGrowth && channel === "team" ? listOpenCompetitions() : [],
  ]);
  const remixProject = projectSlug ? remixProjects.get(projectSlug) : undefined;
  // 游客点「发帖」先写，登录回来带着 compose=1，弹窗直接打开、草稿放回去。
  const composeIntent = params.compose === "1";
  const canOfficial = session?.user?.role === "ADMIN";
  const preset = CHANNEL_PRESET[sort === "open" ? "open" : channel] ?? CHANNEL_PRESET.all;
  const guideKey = sort === "open" ? "open" : channel;
  const composeBack = (() => {
    const query = new URLSearchParams();
    if (channel !== "all" && channel !== "following") query.set("c", channel);
    if (sort === "open") query.set("sort", "open");
    query.set("compose", "1");
    return `/community?${query.toString()}`;
  })();
  const channels = COMMUNITY_CHANNELS.filter((id) => id !== "following" || Boolean(userId));
  const suggestReason = (person: (typeof suggestions)[number]) => person.reason === "fan" ? t("suggestFan") : t(person.reason === "relays" ? "suggestRelays" : "suggestPosts", { count: person.count });
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
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
          {!userId && <p className="text-sm text-muted-foreground text-pretty" data-testid="community-tagline">{t("tagline")}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5"><Link href="/community/bottles" data-testid="community-bottles-link"><Waves className="h-4 w-4" aria-hidden="true" />{t("bottlesLink")}</Link></Button>
          {compose
            ? <PostCompose teams={compose.teams} competitions={compose.competitions} preset={preset} canOfficial={canOfficial} project={remixProject && { slug: remixProject.slug, title: remixProject.title }} defaultOpen={Boolean(remixProject) || composeIntent} />
            : <PostCompose guest teams={[]} competitions={[]} preset={preset} returnTo={composeBack} />}
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
            {/* 手机上分类条横滑：不露滚动条，右边渐隐提示还能往右滑；每个分类按钮够 44px 高。 */}
            <nav className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] max-sm:-mr-4 max-sm:pr-8 max-sm:[mask-image:linear-gradient(to_right,#000_85%,transparent)] [&::-webkit-scrollbar]:hidden" aria-label={t("channelsLabel")}>
              {channels.map((id) => <Link key={id} href={channelHref(id)} aria-current={id === channel ? "page" : undefined}
                className={`inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-sm transition-colors max-sm:min-h-11 ${id === channel ? "bg-foreground font-semibold text-background" : "bg-muted text-foreground/80 hover:text-foreground"}`}>
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
            <section aria-labelledby="community-feed-heading" className="min-w-0 space-y-3">
              <h2 id="community-feed-heading" className="sr-only">{t(`channels.${channel}`)}</h2>
              {feed.pinned.length > 0 && <div className="space-y-2" data-testid="community-pinned">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Pin className="h-3.5 w-3.5" aria-hidden="true" />{t("pinned")}</h3>
                <CommunityFeed items={feed.pinned} />
              </div>}
              {channel === "following" && feed.followingCount !== null && feed.followingCount > 0 && <p className="text-xs text-muted-foreground ans-num">{t("followingHint", { count: feed.followingCount })}</p>}
              {feed.feed.length > 0 ? <CommunityFeed items={feed.feed} /> : channel === "following" ? (
                <div className="space-y-4 rounded-2xl bg-card px-5 py-6 shadow-[inset_0_0_0_0.5px_var(--hairline)]" data-testid="community-following-empty">
                  <p className="text-sm text-muted-foreground text-pretty">{feed.followingCount ? t("followingQuiet") : t("followingEmpty")}</p>
                  {suggestions.length > 0 && <ul className="grid gap-2 sm:grid-cols-3">
                    {suggestions.map((person) => <li key={person.id} className="flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2.5">
                      <Link href={`/@${person.username}`} className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{person.nickname || person.username}</span><span className="block truncate text-xs text-muted-foreground ans-num">{suggestReason(person)}</span></Link>
                      <FollowButton userId={person.id} relation={{ following: false, followedBy: person.reason === "fan" }} size="sm" />
                    </li>)}
                  </ul>}
                </div>
              ) : (
                // 空板块不只说「没有帖子」：一句话告诉新人这里发什么，再给一个预选好的发帖按钮。
                <div className="space-y-3 rounded-2xl bg-card px-5 py-6 shadow-[inset_0_0_0_0.5px_var(--hairline)]" data-testid="community-empty-guide">
                  <p className="text-[15px] font-semibold text-pretty">{t(`guide.${guideKey}.title`)}</p>
                  <PostCompose guest={!compose} teams={compose?.teams ?? []} competitions={compose?.competitions ?? []} preset={preset} returnTo={composeBack} triggerLabel={t(`guide.${guideKey}.action`)} />
                  {guideKey === "team" && <Link href="/teams" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">{t("guide.teamCreate")}<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>}
                  {openCompetitions.length > 0 && <ul className="space-y-1 border-t pt-3">
                    {openCompetitions.map((item) => <li key={item.id}><Link href={item.href} className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                      {t("guide.competition", { title: item.title })}<ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link></li>)}
                  </ul>}
                </div>
              )}
            </section>
            <aside className="hidden space-y-4 lg:block">
              {userId && suggestions.length > 0 && <AccountContentBoundary actorId={userId}>
                <section aria-labelledby="community-suggest-heading" className="space-y-3 rounded-2xl bg-card p-4 shadow-[inset_0_0_0_0.5px_var(--hairline)]" data-testid="community-follow-suggestions">
                  <h2 id="community-suggest-heading" className="text-sm font-semibold">{t("suggestTitle")}</h2>
                  <ul className="space-y-3">
                    {suggestions.map((person) => <li key={person.id} className="flex items-center gap-2.5">
                      {person.avatar
                        ? <img src={person.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                        : <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">{(person.nickname || person.username).charAt(0).toUpperCase()}</span>}
                      <Link href={`/@${person.username}`} className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{person.nickname || person.username}</span><span className="block truncate text-xs text-muted-foreground ans-num">{suggestReason(person)}</span></Link>
                      <FollowButton userId={person.id} relation={{ following: false, followedBy: person.reason === "fan" }} size="sm" />
                    </li>)}
                  </ul>
                </section>
              </AccountContentBoundary>}
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
                    <p className="text-xs text-muted-foreground">{t("streak", { days: growth.checkInStreak })} <span className="ans-num">{growth.xp.toLocaleString()} XP</span></p>
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
