import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, MessageCircle, Rocket, UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGrowthProfile } from "@/server/growth/service";
import { CommunityPanel } from "@/components/community/community-panel";
import { ProfileGrowthPanel } from "@/components/growth/profile-growth-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("product.communityPage");
  return { title: `${t("title")} · ANS`, description: t("description") };
}

export default async function CommunityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/community");
  const [growth, t] = await Promise.all([
    getGrowthProfile(session.user.id),
    getTranslations("product.communityPage"),
  ]);
  if (!growth) notFound();
  const links = [
    { href: "/showcase", title: t("works"), icon: MessageCircle },
    { href: `/@${encodeURIComponent(session.user.username)}`, title: t("profile"), icon: UserRound },
    { href: "/explore/submit", title: t("publish"), icon: Rocket },
  ];

  return (
    <div className="ans-product-container ans-page-content ans-community-page space-y-8">
      <PageHeading title={t("title")}
        actions={<Button asChild variant="outline"><Link href="/workspace">{t("workspace")}</Link></Button>} />
      <AccountContentBoundary actorId={session.user.id}>
        <section className="grid gap-2 sm:grid-cols-3" aria-label={t("participate")}>
          {links.map(({ href, title, icon: Icon }) => <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:transition-none">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="flex flex-1 items-center justify-between gap-2 font-semibold">{title}<ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></h2>
          </Link>)}
        </section>
        <ProfileGrowthPanel key={session.user.id} actorId={session.user.id} editable showActivity={false} avatarFallback={(session.user.username ?? "A").charAt(0)} user={{ ...growth, checkedInToday: growth.checkIns.some(record => record.day === growth.growthDay) }} />
        <CommunityPanel key={`${session.user.id}:${growth.xp}:${growth.checkIns[0]?.id ?? "none"}`} actorId={session.user.id} showGrowth={false} />
      </AccountContentBoundary>
    </div>
  );
}
