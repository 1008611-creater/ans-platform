import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, BadgeCheck, Settings } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublicDisplayName } from "@/lib/public-identity";
import { getCommunityDay } from "@/lib/community";
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

export const dynamic = "force-dynamic";
type ProfileProps = { params: Promise<{ username: string }>; searchParams?: Promise<{ page?: string; tab?: string; date?: string }> };
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
export default async function UserProfilePage({ params }: ProfileProps) {
  const username = profileName((await params).username); if (!username) notFound();
  const user = await getProfileUser(username); if (!user) notFound();
  // Resolve profile existence before streaming a loading response so missing
  // profiles keep an HTTP 404 status. Valid profiles still show the skeleton.
  return <Suspense fallback={<UserProfileLoading />}><UserProfileContent user={user} /></Suspense>;
}
async function UserProfileContent({ user }: { user: NonNullable<Awaited<ReturnType<typeof getProfileUser>>> }) {
  const session = await auth(), t = await getTranslations("retirement"), p = await getTranslations("product.profile"), g = await getTranslations("product.growth");
  const isOwner = session?.user?.id === user.id;
  const [publications, offers, growth] = await Promise.all([
    db.artifactPublication.findMany({
      where: { status: "APPROVED", withdrawnAt: null, artifactVersion: { createdById: user.id, createdBy: { deletedAt: null, flagged: false } } },
      orderBy: { reviewedAt: "desc" }, take: 24,
      select: { artifactVersion: { select: { id: true, version: true, artifact: { select: { title: true } } } } },
    }),
    listPublishedMarketListingsBySeller(user.id),
    isOwner ? getGrowthProfile(user.id) : Promise.resolve(null),
  ]);
  const name = getPublicDisplayName(user), progress = getLevelProgress(user.xp);
  const checkedInToday = Boolean(user.lastCheckInAt && getCommunityDay(user.lastCheckInAt) === getCommunityDay(new Date()));
  return <div className="ans-product-shell"><div className="ans-product-container max-w-6xl space-y-9 py-10 sm:py-14">
    <header className="flex flex-wrap items-center gap-5 rounded-3xl border bg-card p-6 sm:p-8"><AvatarFrame frameKey={user.avatarFrameKey} className="h-20 w-20 shrink-0"><Avatar className="h-full w-full"><AvatarImage src={user.avatar || undefined} alt={name} /><AvatarFallback className="text-2xl">{name.charAt(0)}</AvatarFallback></Avatar></AvatarFrame><div className="min-w-0 flex-1"><p className="ans-eyebrow">ANS / CREATOR</p><h1 className="mt-2 flex flex-wrap items-center gap-2 break-words text-3xl font-semibold">{name}{user.verified && <BadgeCheck className="h-5 w-5 text-primary" aria-label={t("verified")} />}</h1><p className="mt-2 break-all text-sm text-muted-foreground">@{user.username}</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant="secondary">Lv.{progress.level.index + 1} · {g(`levels.${progress.level.key}.name`)}</Badge><Badge variant="outline">{t("publicWorksCount", { count: publications.length })}</Badge><Badge variant="outline">{t("publicOffersCount", { count: offers.length })}</Badge></div></div>{isOwner && <Button asChild variant="outline" className="rounded-full"><Link href="/settings"><Settings className="me-2 h-4 w-4" />{t("editProfile")}</Link></Button>}</header>
    <ProfileGrowthPanel actorId={isOwner ? user.id : undefined} key={`${user.id}:${session?.user?.id ?? "public"}`} user={{ xp: user.xp, communityPoints: user.communityPoints, checkInStreak: user.checkInStreak, avatarFrameKey: user.avatarFrameKey, chatBubbleKey: user.chatBubbleKey, checkedInToday, recentEvents: growth?.recentEvents ?? [], checkIns: growth?.checkIns ?? [] }} avatarFallback={name.charAt(0)} editable={isOwner} />
    <section aria-labelledby="profile-works-heading"><div className="mb-5 flex items-center justify-between gap-3"><h2 id="profile-works-heading" className="text-2xl font-semibold">{p("works")}</h2><Link href="/showcase" className="ans-text-link">{p("browseWorks")}<ArrowUpRight className="h-4 w-4" /></Link></div>{publications.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{publications.map(({ artifactVersion: version }) => <Link key={version.id} href={`/showcase/${version.id}`} className="rounded-2xl border bg-card p-5 transition-colors hover:border-primary/50 motion-reduce:transition-none"><Badge variant="secondary">{p("workVersion", { version: version.version })}</Badge><h3 className="mt-4 line-clamp-2 text-lg font-semibold">{version.artifact.title}</h3><p className="mt-4 text-sm text-primary">{t("viewWork")} →</p></Link>)}</div> : <p className="rounded-2xl border border-dashed p-8 text-sm text-muted-foreground">{t("noPublicWorks")}</p>}</section>
    <section aria-labelledby="profile-market-heading"><div className="mb-5 flex items-center justify-between gap-3"><h2 id="profile-market-heading" className="text-2xl font-semibold">{p("services")}</h2><Link href="/market" className="ans-text-link">{p("browseMarket")}<ArrowUpRight className="h-4 w-4" /></Link></div>{offers.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{offers.map(offer => <MarketOfferCard key={offer.id} offer={offer} headingLevel={3} />)}</div> : <p className="rounded-2xl border border-dashed p-8 text-sm text-muted-foreground">{t("noPublicOffers")}</p>}</section>
  </div></div>;
}
