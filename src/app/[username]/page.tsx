import { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { formatDistanceToNow } from "@/lib/date";
import { getPromptUrl } from "@/lib/urls";
import { Calendar, ArrowBigUp, FileText, Settings, GitPullRequest, Clock, Check, X, Pin, BadgeCheck, Users, ShieldCheck, Heart, ImageIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import config from "@/../prompts.config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PromptList } from "@/components/prompts/prompt-list";
import { PromptCard, type PromptCardProps } from "@/components/prompts/prompt-card";
import { Masonry } from "@/components/ui/masonry";
import { McpServerPopup } from "@/components/mcp/mcp-server-popup";
import { PrivatePromptsNote } from "@/components/prompts/private-prompts-note";
import { ActivityChartWrapper } from "@/components/user/activity-chart-wrapper";
import { getPublicDisplayName, toPublicAuthor } from "@/lib/public-identity";
import { listPublishedArtifacts } from "@/server/projects/publication";
import { listPublishedMarketListingsBySeller } from "@/server/marketplace/listings";
import { MarketOfferCard } from "@/components/marketplace/offer-card";
import { ProfileGrowthPanel } from "@/components/growth/profile-growth-panel";
import { AvatarFrame } from "@/components/growth/avatar-frame";
import { getLevelProgress } from "@/lib/level";
import { getCommunityDay } from "@/lib/community";
import { getGrowthProfile } from "@/server/growth/service";

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string; tab?: string; date?: string }>;
}

const getProfileUser = cache((username: string) => db.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" }, deletedAt: null, flagged: false },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nickname: true,
      username: true,
      avatar: true,
      role: true,
      verified: true,
      bio: true,
      xp: true,
      communityPoints: true,
      checkInStreak: true,
      lastCheckInAt: true,
      avatarFrameKey: true,
      chatBubbleKey: true,
      createdAt: true,
      _count: {
        select: {
          prompts: { where: { deletedAt: null, isPrivate: false } },
          contributions: { where: { deletedAt: null, isPrivate: false } },
        },
      },
    },
}));

export async function generateMetadata({ params }: UserProfilePageProps): Promise<Metadata> {
  const tErrors = await getTranslations("errors");
  const tUser = await getTranslations("user");
  const { username: rawUsername } = await params;
  const decodedUsername = decodeURIComponent(rawUsername);
  
  // Only support /@username format
  if (!decodedUsername.startsWith("@")) {
    return { title: tErrors("notFound") };
  }
  
  const username = decodedUsername.slice(1);
    
  const user = await getProfileUser(username);

  if (!user) {
    return { title: tErrors("notFound") };
  }

  return {
    title: `${getPublicDisplayName(user)} (@${user.username})`,
    description: `${tUser("profile")} · ${getPublicDisplayName(user)}`,
  };
}

export default async function UserProfilePage({ params, searchParams }: UserProfilePageProps) {
  const { username: rawUsername } = await params;
  const { page: pageParam, tab, date: dateFilter } = await searchParams;
  const session = await auth();
  const t = await getTranslations("user");
  const tProfile = await getTranslations("product.profile");
  const tGrowth = await getTranslations("product.growth");
  const tChanges = await getTranslations("changeRequests");
  const tPrompts = await getTranslations("prompts");
  const locale = await getLocale();

  // Decode URL-encoded @ symbol
  const decodedUsername = decodeURIComponent(rawUsername);
  
  // Only support /@username format - reject URLs without @
  if (!decodedUsername.startsWith("@")) {
    notFound();
  }
  
  const username = decodedUsername.slice(1);

  const user = await getProfileUser(username);

  if (!user) {
    notFound();
  }

  const page = Math.max(1, parseInt(pageParam || "1") || 1);
  const perPage = 24;
  const isOwner = session?.user?.id === user.id;
  const defaultTab = tab === "changes" ? "changes" : tab === "contributions" ? "contributions" : tab === "likes" ? "likes" : tab === "examples" ? "examples" : "prompts";

  // Parse date filter for filtering prompts by day (validate YYYY-MM-DD format)
  const isValidDateFilter = dateFilter && /^\d{4}-\d{2}-\d{2}$/.test(dateFilter);
  const filterDateStart = isValidDateFilter ? new Date(dateFilter + "T00:00:00") : null;
  const filterDateEnd = isValidDateFilter ? new Date(dateFilter + "T23:59:59") : null;
  // Also verify the Date objects are valid (e.g., 2024-02-30 would fail)
  const validFilterDateStart = filterDateStart && !isNaN(filterDateStart.getTime()) ? filterDateStart : null;
  const validFilterDateEnd = filterDateEnd && !isNaN(filterDateEnd.getTime()) ? filterDateEnd : null;

  // Build where clause - show private prompts only if owner (unlisted prompts are visible on profiles)
  // Exclude intermediate flow prompts (only show first prompts or standalone)
  // Note: "related" connections are AI-suggested similar prompts, not flow connections
  const where = {
    authorId: user.id,
    deletedAt: null,
    incomingConnections: { none: { label: { not: "related" } } },
    ...(isOwner ? {} : { isPrivate: false }),
    ...(validFilterDateStart && validFilterDateEnd ? {
      createdAt: {
        gte: validFilterDateStart,
        lte: validFilterDateEnd,
      },
    } : {}),
  };

  // Common prompt include for both queries
  const promptInclude = {
    author: {
      select: {
        id: true,
        nickname: true,
        username: true,
        avatar: true,
        verified: true,
      },
    },
    category: {
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
      },
    },
    tags: {
      include: {
        tag: true,
      },
    },
    _count: {
      select: {
        votes: true,
        contributors: true,
        outgoingConnections: { where: { label: { not: "related" } } },
        incomingConnections: { where: { label: { not: "related" } } },
      },
    },
  };

  // Calculate date range for activity (last 12 months)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setHours(0, 0, 0, 0);

  // Fetch prompts, pinned prompts, contributions, liked prompts, user examples, counts, and activity data
  const [promptsRaw, total, totalUpvotes, pinnedPromptsRaw, contributionsRaw, likedPromptsRaw, userExamplesRaw, privatePromptsCount, activityRows, growthProfile, publicArtifacts, publicListings] = await Promise.all([
    defaultTab === "prompts" ? db.prompt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: promptInclude,
    }) : Promise.resolve([]),
    defaultTab === "prompts" ? db.prompt.count({ where }) : Promise.resolve(0),
    db.promptVote.count({
      where: {
        prompt: {
          authorId: user.id,
        },
      },
    }),
    defaultTab === "prompts" ? db.pinnedPrompt.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
      include: {
        prompt: {
          include: promptInclude,
        },
      },
    }) : Promise.resolve([]),
    // Fetch contributions (prompts where user is contributor but not author)
    // Limited to 50 to prevent memory issues
    defaultTab === "contributions" ? db.prompt.findMany({
      where: {
        contributors: {
          some: { id: user.id },
        },
        authorId: { not: user.id },
        isPrivate: false,
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: promptInclude,
    }) : Promise.resolve([]),
    // Fetch liked prompts (prompts user has voted for)
    defaultTab === "likes" ? db.prompt.findMany({
      where: {
        votes: {
          some: { userId: user.id },
        },
        isPrivate: false,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: promptInclude,
    }) : Promise.resolve([]),
    // Fetch user's example media submissions (only their own examples, not original prompt media)
    // Get the prompts that user has added examples to, including their specific example
    defaultTab === "examples" ? db.prompt.findMany({
      where: {
        userExamples: {
          some: { userId: user.id },
        },
        isPrivate: false,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        ...promptInclude,
        userExamples: {
          where: { userId: user.id },
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { mediaUrl: true },
        },
      },
    }) : Promise.resolve([]),
    // Count private prompts (only relevant for owner)
    isOwner && defaultTab === "prompts" ? db.prompt.count({
      where: {
        authorId: user.id,
        isPrivate: true,
        deletedAt: null,
      },
    }) : Promise.resolve(0),
    // Aggregate the real activity timeline in one database round trip.
    db.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT to_char(date_trunc('day', a."createdAt"), 'YYYY-MM-DD') AS date, count(*)::int AS count
      FROM (
        SELECT "createdAt" FROM prompts WHERE "authorId" = ${user.id} AND "createdAt" >= ${oneYearAgo}
        UNION ALL SELECT "createdAt" FROM prompt_votes WHERE "userId" = ${user.id} AND "createdAt" >= ${oneYearAgo}
        UNION ALL SELECT "createdAt" FROM change_requests WHERE "authorId" = ${user.id} AND "createdAt" >= ${oneYearAgo}
        UNION ALL SELECT "createdAt" FROM comments WHERE "authorId" = ${user.id} AND "createdAt" >= ${oneYearAgo}
      ) a GROUP BY date_trunc('day', a."createdAt") ORDER BY date
    `,
    isOwner ? getGrowthProfile(user.id) : Promise.resolve(null),
    listPublishedArtifacts(12, user.id),
    listPublishedMarketListingsBySeller(user.id),
  ]);

  // Transform to include voteCount and contributorCount
  const prompts = promptsRaw.map((p) => ({
    ...p,
    author: toPublicAuthor(p.author),
    voteCount: p._count?.votes ?? 0,
    contributorCount: p._count?.contributors ?? 0,
  }));

  // Transform contributions
  const contributions = contributionsRaw.map((p) => ({
    ...p,
    author: toPublicAuthor(p.author),
    voteCount: p._count?.votes ?? 0,
    contributorCount: p._count?.contributors ?? 0,
  }));

  // Transform liked prompts
  const likedPrompts = likedPromptsRaw.map((p) => ({
    ...p,
    author: toPublicAuthor(p.author),
    voteCount: p._count?.votes ?? 0,
    contributorCount: p._count?.contributors ?? 0,
  }));

  // Transform user examples (prompts where user added examples)
  // Override mediaUrl with user's example mediaUrl
  const userExamples = userExamplesRaw.map((p) => ({
    ...p,
    author: toPublicAuthor(p.author),
    mediaUrl: p.userExamples?.[0]?.mediaUrl ?? p.mediaUrl,
    userExamples: undefined, // Remove to avoid type conflict with PromptCard
    voteCount: p._count?.votes ?? 0,
    contributorCount: p._count?.contributors ?? 0,
  }));

  const activityData = activityRows;

  // Transform pinned prompts - filter out private prompts for non-owners (unlisted are visible)
  const pinnedPrompts = pinnedPromptsRaw
    .filter((pp) => isOwner || !pp.prompt.isPrivate)
    .map((pp) => ({
      ...pp.prompt,
      author: toPublicAuthor(pp.prompt.author),
      voteCount: pp.prompt._count?.votes ?? 0,
      contributorCount: pp.prompt._count?.contributors ?? 0,
    }));

  // Get set of pinned prompt IDs for easy lookup
  const pinnedIds = new Set<string>(pinnedPrompts.map((p: { id: string }) => p.id));

  const totalPages = Math.ceil(total / perPage);
  const checkedInToday = user.lastCheckInAt ? getCommunityDay(user.lastCheckInAt) === getCommunityDay(new Date()) : false;

  // Fetch change requests for this user
  // 1. Change requests the user submitted (all statuses for owner, approved only for others)
  // 2. Change requests received on user's prompts (approved ones)
  // Limited to 100 each to prevent memory issues
  const [submittedChangeRequests, receivedChangeRequests] = await Promise.all([
    // CRs user submitted
    defaultTab === "changes" ? db.changeRequest.findMany({
      where: {
        authorId: user.id,
        // Non-owners only see approved CRs
        ...(isOwner ? {} : { status: "APPROVED" }),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        author: {
          select: {
            nickname: true,
          },
        },
        prompt: {
          select: {
            id: true,
            slug: true,
            title: true,
            author: {
              select: {
                nickname: true,
              },
            },
          },
        },
      },
    }) : Promise.resolve([]),
    // CRs received on user's prompts (all statuses for owner, approved only for others)
    defaultTab === "changes" ? db.changeRequest.findMany({
      where: {
        prompt: {
          authorId: user.id,
        },
        ...(isOwner ? {} : { status: "APPROVED" }),
        authorId: { not: user.id }, // Exclude self-submitted
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        author: {
          select: {
            nickname: true,
          },
        },
        prompt: {
          select: {
            id: true,
            slug: true,
            title: true,
            author: {
              select: {
                nickname: true,
              },
            },
          },
        },
      },
    }) : Promise.resolve([]),
  ]);

  // Combine and sort by date, marking the type
  const allChangeRequests = [
    ...submittedChangeRequests.map((cr) => ({ ...cr, type: "submitted" as const })),
    ...receivedChangeRequests.map((cr) => ({ ...cr, type: "received" as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingCount = submittedChangeRequests.filter((cr) => cr.status === "PENDING").length +
    receivedChangeRequests.filter((cr) => cr.status === "PENDING").length;


  const statusColors = {
    PENDING: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    APPROVED: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };



  const statusIcons = {
    PENDING: Clock,
    APPROVED: Check,
    REJECTED: X,
  };

  return (
    <div className="container py-6">
      {/* Profile Header */}
      <div className="flex flex-col gap-4 mb-8">
        {/* Avatar + Name row */}
        <div className="flex items-center gap-4">
          <AvatarFrame frameKey={user.avatarFrameKey} className="h-[68px] w-[68px] md:h-[84px] md:w-[84px] shrink-0">
            <Avatar className="h-full w-full">
              <AvatarImage src={user.avatar || undefined} alt={getPublicDisplayName(user)} />
              <AvatarFallback className="text-xl md:text-2xl">{getPublicDisplayName(user).charAt(0)}</AvatarFallback>
            </Avatar>
          </AvatarFrame>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold truncate">{getPublicDisplayName(user)}</h1>
              {user.verified && (
                <BadgeCheck className="h-5 w-5 text-blue-500 shrink-0" />
              )}
              {user.role === "ADMIN" && (
                <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              )}
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-2 flex-wrap">@{user.username}<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{tGrowth(`levels.${getLevelProgress(user.xp).level.key}.name`)}</span></p>
            {user.bio && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{user.bio}</p>}
          </div>
          {/* Actions - desktop only */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {config.features.mcp !== false && <McpServerPopup initialUsers={[user.username]} showOfficialBranding={!config.homepage?.useCloneBranding} />}
            {isOwner && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-1.5" />
                  {t("editProfile")}
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Actions - mobile only */}
        <div className="md:hidden flex gap-2">
          {config.features.mcp !== false && <McpServerPopup initialUsers={[user.username]} showOfficialBranding={!config.homepage?.useCloneBranding} />}
          {isOwner && (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link href="/settings">
                <Settings className="h-4 w-4 mr-1.5" />
                {t("editProfile")}
              </Link>
            </Button>
          )}
        </div>

        {/* Stats - stacked on mobile, inline on desktop */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{user._count.prompts}</span>
            <span className="text-muted-foreground">{t("prompts").toLowerCase()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowBigUp className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{totalUpvotes}</span>
            <span className="text-muted-foreground">{t("upvotesReceived")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{user._count.contributions}</span>
            <span className="text-muted-foreground">{t("contributionsCount")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{t("joined")} {formatDistanceToNow(user.createdAt, locale)}</span>
          </div>
        </div>

        </div>

      <ProfileGrowthPanel user={{ xp: user.xp, communityPoints: user.communityPoints, checkInStreak: user.checkInStreak, avatarFrameKey: user.avatarFrameKey, chatBubbleKey: user.chatBubbleKey, checkedInToday, recentEvents: growthProfile?.recentEvents ?? [], checkIns: growthProfile?.checkIns ?? [] }} avatarFallback={getPublicDisplayName(user).charAt(0) || "A"} editable={isOwner} />

      {publicListings.length > 0 ? <section className="mb-7 space-y-4" aria-labelledby="profile-services-heading"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">ANS MARKET</p><h2 id="profile-services-heading" className="mt-1 text-xl font-bold">{tProfile("services")}</h2></div><Link href="/market" className="text-sm text-primary hover:underline">{tProfile("browseMarket")}</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{publicListings.map((offer) => <MarketOfferCard key={offer.id} offer={offer} headingLevel={3} />)}</div></section> : null}

      {publicArtifacts.length > 0 ? <section className="mb-7 space-y-4" aria-labelledby="public-works-heading"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">ANS SHOWCASE</p><h2 id="public-works-heading" className="mt-1 text-xl font-bold">{tProfile("works")}</h2></div><Link href="/showcase" className="text-sm text-primary hover:underline">{tProfile("browseWorks")}</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{publicArtifacts.map((artifact) => <Link key={artifact.id} href={`/showcase/${artifact.id}`} className="group rounded-2xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"><div className="flex items-center justify-between gap-2"><Badge variant="secondary">{tProfile("workVersion", { version: artifact.version })}</Badge><span className="text-xs text-muted-foreground">{tProfile("reactions", { count: artifact.counts.reactions })}</span></div><h3 className="mt-4 line-clamp-2 font-semibold group-hover:text-primary">{artifact.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-5 text-muted-foreground">{artifact.markdown}</p><p className="mt-4 border-t pt-3 text-xs text-muted-foreground">{artifact.project.title}</p></Link>)}</div></section> : null}

      {/* Activity Chart - above tabs */}
      <div className="mb-6">
        <ActivityChartWrapper data={activityData} locale={locale} />
      </div>

      {/* Tabs for Prompts and Change Requests */}
      <div className="w-full">
        <nav aria-label={t("profile")} className="mb-4 flex w-full gap-1 overflow-x-auto rounded-2xl border bg-muted/40 p-1.5">
          {[
            { key: "prompts", label: t("prompts"), icon: FileText },
            { key: "contributions", label: t("contributions"), icon: Users },
            { key: "likes", label: t("likes"), icon: Heart },
            { key: "examples", label: t("examples"), icon: ImageIcon },
            { key: "changes", label: tChanges("title"), icon: GitPullRequest },
          ].map(({ key, label, icon: Icon }) => (
            <Link key={key} href={`/@${user.username}?tab=${key}`} prefetch={false} scroll={false}
              aria-current={defaultTab === key ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${defaultTab === key ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:bg-card/70 hover:text-foreground"}`}>
              <Icon className="h-4 w-4" />{label}
              {key === "changes" && isOwner && pendingCount > 0 ? <Badge variant="destructive" className="h-5 min-w-5 px-1 text-xs">{pendingCount}</Badge> : null}
            </Link>
          ))}
        </nav>

        {defaultTab === "prompts" && <div>
          {/* Date Filter Indicator */}
          {validFilterDateStart && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm">
                {t("filteringByDate", { date: validFilterDateStart.toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" }) })}
              </span>
              <Link 
                href={`/@${user.username}`} 
                className="ml-auto text-xs text-primary hover:underline"
              >
                {t("clearFilter")}
              </Link>
            </div>
          )}

          {/* Private Prompts MCP Note - only shown to owner with private prompts */}
          {isOwner && <PrivatePromptsNote count={privatePromptsCount} />}

          {/* Pinned Prompts Section */}
          {pinnedPrompts.length > 0 && (
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center gap-2 mb-3">
                <Pin className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">{tPrompts("pinnedPrompts")}</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pinnedPrompts.map((prompt: PromptCardProps["prompt"]) => (
                  <PromptCard key={prompt.id} prompt={prompt} showPinButton={isOwner} isPinned={isOwner} />
                ))}
              </div>
            </div>
          )}

          {prompts.length === 0 && pinnedPrompts.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              {validFilterDateStart ? (
                <>
                  <p className="text-muted-foreground">
                    {isOwner ? t("noPromptsOnDateOwner") : t("noPromptsOnDate")}
                  </p>
                  {isOwner && (
                    <Button asChild className="mt-4" size="sm">
                      <Link href="/prompts/new">{t("createForToday")}</Link>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">{isOwner ? t("noPromptsOwner") : t("noPrompts")}</p>
                  {isOwner && (
                    <Button asChild className="mt-4" size="sm">
                      <Link href="/prompts/new">{t("createFirstPrompt")}</Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : prompts.length > 0 ? (
            <>
              {pinnedPrompts.length > 0 && (
                <h3 className="text-sm font-medium mb-3">{t("allPrompts")}</h3>
              )}
              <PromptList
                prompts={prompts}
                currentPage={page}
                totalPages={totalPages}
                pinnedIds={pinnedIds}
                showPinButton={isOwner}
              />
            </>
          ) : null}
        </div>}

        {defaultTab === "contributions" && <div>
          {contributions.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{isOwner ? t("noContributionsOwner") : t("noContributions")}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {contributions.map((prompt: PromptCardProps["prompt"]) => (
                <PromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>
          )}
        </div>}

        {defaultTab === "likes" && <div>
          {likedPrompts.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{isOwner ? t("noLikesOwner") : t("noLikes")}</p>
            </div>
          ) : (
            <Masonry columnCount={{ default: 1, md: 2, lg: 3 }} gap={16}>
              {likedPrompts.map((prompt: PromptCardProps["prompt"]) => (
                <PromptCard key={prompt.id} prompt={prompt} />
              ))}
            </Masonry>
          )}
        </div>}

        {defaultTab === "examples" && <div>
          {userExamples.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{isOwner ? t("noExamplesOwner") : t("noExamples")}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {userExamples.map((prompt: PromptCardProps["prompt"]) => (
                <PromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>
          )}
        </div>}

        {defaultTab === "changes" && <div>
          {allChangeRequests.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              <GitPullRequest className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{tChanges("noRequests")}</p>
            </div>
          ) : (
            <div className="divide-y border rounded-lg">
              {allChangeRequests.map((cr) => {
                const StatusIcon = statusIcons[cr.status as keyof typeof statusIcons];
                return (
                  <Link 
                    key={cr.id} 
                    href={`${getPromptUrl(cr.prompt.id, cr.prompt.slug)}/changes/${cr.id}`}
                    className="flex items-center justify-between px-3 py-2 hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{cr.prompt.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {cr.type === "submitted" 
                          ? tChanges("submittedTo", { author: getPublicDisplayName(cr.prompt.author) })
                          : tChanges("receivedFrom", { author: getPublicDisplayName(cr.author) })
                        }
                        {" · "}
                        {formatDistanceToNow(cr.createdAt, locale)}
                      </p>
                    </div>
                    <Badge className={`ml-2 shrink-0 ${statusColors[cr.status as keyof typeof statusColors]}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {tChanges(cr.status.toLowerCase())}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </div>}
      </div>
    </div>
  );
}


