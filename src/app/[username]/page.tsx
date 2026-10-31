import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, BadgeCheck, Settings } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublicDisplayName } from "@/lib/public-identity";
import { activeCheckInStreak, getCommunityDay } from "@/domain/growth/check-in";
import { getLevelProgress } from "@/lib/level";
import { getGrowthProfile } from "@/server/growth/service";
import { listPublishedMarketListingsBySeller } from "@/server/marketplace/listings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarFrame } from "@/components/growth/avatar-frame";
import { ProfileGrowthPanel } from "@/components/growth/profile-growth-panel";
import UserProfileLoading from "@/components/profile/profile-loading";
import { MarketOfferCard } from "@/components/marketplace/offer-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/community/follow-button";
import { getFollowCounts, getFollowRelation, listFollowPeople } from "@/server/community/follows";

export const dynamic = "force-dynamic";
type ProfileProps = { params: Promise<{ username: string }>; searchParams?: Promise<{ page?: string; tab?: string; date?: string; people?: string }> };
const getProfileUser = cache((username: string) => db.user.findFirst({
  where: { username: { equals: username, mode: "insensitive" }, deletedAt: null, flagged: false },
  orderBy: { createdAt: "asc" },
  select: { id: true, nickname: true, username: true, avatar: true, verified: true, xp: true, communityPoints: true, checkInStreak: true, lastCheckInAt: true, avatarFrameKey: true, chatBubbleKey: true, createdAt: true },
}));
function profileName(raw: string) { try { const value = decodeURIComponent(raw); return value.startsWith("@") && value.length > 1 ? value.slice(1) : null; } catch { return null; } }
export async function generateMetadata({ params }: ProfileProps): Promise<Metadata> {
  const tErrors = await getTranslations("errors"), tUser = await getTranslations("user");
  const username = profileName((await params).username); if (!username) return { title: tErrors("notFound") };
  const user = await getProfileUser(username); if (!user) return { title: tErrors("notFound") };
  return { title: `${getPublicDisplayName(user)} (@${user.username})`, description: `${tUser("profile")} · ${getPublicDisplayName(user)}` };
}
export default async function UserProfilePage({ params, searchParams }: ProfileProps) {
  const username = profileName((await params).username); if (!username) notFound();
  const user = await getProfileUser(username); if (!user) notFound();
  const people = (await searchParams)?.people === "following" ? "following" : "followers";
  // Resolve profile existence before streaming a loading response so missing
  // profiles keep an HTTP 404 status. Valid profiles still show the skeleton.
  return <Suspense fallback={<UserProfileLoading />}><UserProfileContent user={user} people={people} /></Suspense>;
}
async function UserProfileContent({ user, people }: { user: NonNullable<Awaited<ReturnType<typeof getProfileUser>>>; people: "followers" | "following" }) {
  const session = await auth(), t = await getTranslations("retirement"), p = await getTranslations("product.profile"), g = await getTranslations("product.growth"), f = await getTranslations("product.communityFollow");
  const isOwner = session?.user?.id === user.id;
  const viewerId = session?.user?.id ?? null;
  const [publications, offers, growth, counts, relation, connections] = await Promise.all([
    db.artifactPublication.findMany({
      where: { status: "APPROVED", withdrawnAt: null, artifactVersion: { createdById: user.id, createdBy: { deletedAt: null, flagged: false } } },
      orderBy: { reviewedAt: "desc" }, take: 24,
      select: { artifactVersion: { select: { id: true, version: true, artifact: { select: { title: true } } } } },
    }),
    listPublishedMarketListingsBySeller(user.id),
    isOwner ? getGrowthProfile(user.id) : Promise.resolve(null),
    getFollowCounts(user.id),
    viewerId && !isOwner ? getFollowRelation(viewerId, user.id) : Promise.resolve(null),
    listFollowPeople(user.id, people, viewerId),
  ]);
  const peopleHref = (list: "followers" | "following") => `/@${user.username}${list === "following" ? "?people=following" : ""}#people`;
  const name = getPublicDisplayName(user), progress = getLevelProgress(user.xp);
  const now = new Date(), growthDay = getCommunityDay(now);
  const checkedInToday = Boolean(user.lastCheckInAt && getCommunityDay(user.lastCheckInAt) === growthDay);
  return <div className="ans-product-shell"><div className="ans-product-container max-w-6xl space-y-9 py-10 sm:py-14">
    <header className="flex flex-wrap items-center gap-5 rounded-3xl border bg-card p-6 sm:p-8"><AvatarFrame frameKey={user.avatarFrameKey} className="h-20 w-20 shrink-0"><Avatar className="h-full w-full"><AvatarImage src={user.avatar || undefined} alt={name} /><AvatarFallback className="text-2xl">{name.charAt(0)}</AvatarFallback></Avatar></AvatarFrame><div className="min-w-0 flex-1"><p className="ans-eyebrow">ANS / CREATOR</p><h1 className="mt-2 flex flex-wrap items-center gap-2 text-3xl font-semibold"><span className="min-w-0 max-w-full [overflow-wrap:anywhere]">{name}</span>{user.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-primary" aria-label={t("verified")} />}</h1><p className="mt-2 break-all text-sm text-muted-foreground">@{user.username}</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant="secondary">Lv.{progress.level.index + 1} · {g(`levels.${progress.level.key}.name`)}</Badge><Badge variant="outline">{t("publicWorksCount", { count: publications.length })}</Badge><Badge variant="outline">{t("publicOffersCount", { count: offers.length })}</Badge></div><div className="mt-3 flex flex-wrap gap-5 text-sm text-muted-foreground" data-testid="profile-follow-counts"><Link href={peopleHref("followers")} className="hover:text-foreground"><strong className="ans-num font-semibold text-foreground">{counts.followers}</strong> {f("followers")}</Link><Link href={peopleHref("following")} className="hover:text-foreground"><strong className="ans-num font-semibold text-foreground">{counts.following}</strong> {f("followingCount")}</Link><span><strong className="ans-num font-semibold text-foreground">{counts.relays}</strong> {f("relays")}</span></div></div>{isOwner && <Button asChild variant="outline" className="rounded-full"><Link href="/settings"><Settings className="me-2 h-4 w-4" />{t("editProfile")}</Link></Button>}{relation && <FollowButton userId={user.id} relation={relation} size="lg" primary />}{!viewerId && <Button asChild className="rounded-full"><Link href={`/login?callbackUrl=${encodeURIComponent(`/@${user.username}`)}`}>{f("follow")}</Link></Button>}</header>
    <section id="people" aria-label={f("peopleLabel")} className="scroll-mt-24 space-y-3 rounded-2xl bg-card p-5 shadow-[inset_0_0_0_0.5px_var(--hairline)] sm:p-6" data-testid="profile-people"><nav className="flex gap-6 shadow-[inset_0_-0.5px_0_var(--hairline)] text-sm">{(["followers", "following"] as const).map(list => <Link key={list} href={peopleHref(list)} aria-current={people === list ? "page" : undefined} className={`pb-2 ans-num ${people === list ? "font-semibold text-foreground shadow-[inset_0_-2px_0_var(--foreground)]" : "text-muted-foreground hover:text-foreground"}`}>{f(list === "followers" ? "followersTab" : "followingTab", { count: list === "followers" ? counts.followers : counts.following })}</Link>)}</nav>{connections.length ? <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{connections.map(person => <li key={person.id} className="flex items-center gap-2.5 rounded-xl bg-muted/60 p-2.5"><Avatar className="h-9 w-9"><AvatarImage src={person.avatar || undefined} alt="" /><AvatarFallback>{(person.nickname || person.username).charAt(0)}</AvatarFallback></Avatar><Link href={`/@${person.username}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">{person.nickname || person.username}</Link>{viewerId && viewerId !== person.id && <FollowButton userId={person.id} relation={person.relation} size="sm" />}</li>)}</ul> : <p className="text-sm text-muted-foreground">{f(people === "followers" ? "noFollowers" : "noFollowing")}</p>}</section>
    <ProfileGrowthPanel actorId={isOwner ? user.id : undefined} key={`${user.id}:${session?.user?.id ?? "public"}`} user={{ xp: user.xp, communityPoints: user.communityPoints, checkInStreak: activeCheckInStreak(user.checkInStreak, user.lastCheckInAt, now), growthDay, avatarFrameKey: user.avatarFrameKey, chatBubbleKey: user.chatBubbleKey, checkedInToday, recentEvents: growth?.recentEvents ?? [], checkIns: growth?.checkIns ?? [] }} avatarFallback={name.charAt(0)} editable={isOwner} />
    <section aria-labelledby="profile-works-heading"><div className="mb-5 flex items-center justify-between gap-3"><h2 id="profile-works-heading" className="text-2xl font-semibold">{p("works")}</h2><Link href="/showcase" className="ans-text-link">{p("browseWorks")}<ArrowUpRight className="h-4 w-4" /></Link></div>{publications.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{publications.map(({ artifactVersion: version }) => <Link key={version.id} href={`/showcase/${version.id}`} className="rounded-2xl border bg-card p-5 transition-colors hover:border-primary/50 motion-reduce:transition-none"><Badge variant="secondary">{p("workVersion", { version: version.version })}</Badge><h3 className="mt-4 line-clamp-2 text-lg font-semibold">{version.artifact.title}</h3><p className="mt-4 text-sm text-primary">{t("viewWork")} →</p></Link>)}</div> : <p className="rounded-2xl border border-dashed p-8 text-sm text-muted-foreground">{t("noPublicWorks")}</p>}</section>
    <section aria-labelledby="profile-market-heading"><div className="mb-5 flex items-center justify-between gap-3"><h2 id="profile-market-heading" className="text-2xl font-semibold">{p("services")}</h2><Link href="/market" className="ans-text-link">{p("browseMarket")}<ArrowUpRight className="h-4 w-4" /></Link></div>{offers.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{offers.map(offer => <MarketOfferCard key={offer.id} offer={offer} headingLevel={3} />)}</div> : <p className="rounded-2xl border border-dashed p-8 text-sm text-muted-foreground">{t("noPublicOffers")}</p>}</section>
  </div></div>;
}
