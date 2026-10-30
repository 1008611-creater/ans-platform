import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Compass, MessageCircle, Rocket, Sparkles, UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGrowthProfile } from "@/server/growth/service";
import { CommunityPanel } from "@/components/community/community-panel";
import { ProfileGrowthPanel } from "@/components/growth/profile-growth-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { RouteMessages } from "@/components/providers/route-messages";
import { PUBLIC_PAGE_MESSAGE_PATHS } from "@/i18n/client-messages";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("product.communityPage");
  return { title: `${t("title")} · ANS`, description: t("description") };
}

async function communityContent() {
  const session = await auth();
  if (!session?.user?.id) {
    const t = await getTranslations("product.communityPage");
    const isEn = /^community/i.test(t("title"));
    const guestLinks = [
      { href: "/showcase", title: t("works"), icon: MessageCircle },
      { href: "/explore", title: isEn ? "Public Project Directory" : "公开项目库", icon: Compass },
      { href: "/explore/submit", title: t("publish"), icon: Rocket },
    ];
    return (
      <div className="ans-product-container ans-page-content ans-community-page space-y-8">
        <PageHeading
          title={t("title")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline"><Link href="/showcase">{t("works")}</Link></Button>
              <Button asChild><Link href="/login?callbackUrl=/community">{isEn ? "Sign in to join community" : "登录参与社区互动"}</Link></Button>
            </div>
          }
        />
        <section className="grid gap-2 sm:grid-cols-3" aria-label={t("participate")}>
          {guestLinks.map(({ href, title, icon: Icon }) => (
            <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:transition-none">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="flex flex-1 items-center justify-between gap-2 font-semibold">{title}<ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></h2>
            </Link>
          ))}
        </section>
        <section className="rounded-2xl border bg-card/70 p-6 space-y-4" data-testid="community-guest-preview">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold">{isEn ? "Welcome to the ANS Creator Community" : "欢迎来到 ANS 创作者社区"}</h2>
              <p className="text-sm text-muted-foreground">
                {isEn
                  ? "Browse the public showcase, curated project directory, and topic hubs without signing in. Sign in to unlock daily check-ins, personal XP growth profiles, avatar frames, and community publishing."
                  : "无需登录即可浏览社区公开作品展、精选项目库与专题 Hub。登录后可解锁每日签到、个人 XP 成长档案、专属头像框装扮与作品发布互动。"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button asChild size="sm"><Link href="/login?callbackUrl=/community">{isEn ? "Sign in to unlock growth profile" : "立即登录解锁成长档案"}</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/register?callbackUrl=/community">{isEn ? "Create free account" : "免费注册账号"}</Link></Button>
            <Button asChild size="sm" variant="ghost"><Link href="/hubs">{isEn ? "Explore topic hubs" : "浏览专题 Hub"}</Link></Button>
          </div>
        </section>
      </div>
    );
  }
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

export default async function CommunityPage() {
  return <RouteMessages paths={PUBLIC_PAGE_MESSAGE_PATHS.community}>{await communityContent()}</RouteMessages>;
}
