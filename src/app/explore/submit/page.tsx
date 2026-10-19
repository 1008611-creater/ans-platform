import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { ListingEditor } from "@/components/marketplace/listing-editor";
export default async function SubmitProjectPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const agri = (await searchParams).event === "agrihackathon";
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const actorId = userId ?? "guest-preview";
  const callbackPath = agri ? "/explore/submit?event=agrihackathon" : "/explore/submit";
  const t = await getTranslations("product.realProject");
  const guestBanner = !userId ? (
    <div
      data-testid="submit-guest-banner"
      className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 sm:flex-row sm:items-center"
    >
      <div className="space-y-1">
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-500">
          项目上墙与投稿工坊 · 免登录一键模板体验
        </Badge>
        <p className="text-sm text-muted-foreground">
          支持免登录预览标准投稿结构；登录后即可发布至项目广场或农客松作品墙并获取 +50 XP 激励。
        </p>
      </div>
      <Button asChild size="sm" className="shrink-0 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500">
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackPath)}`}>登录并正式发布作品 →</Link>
      </Button>
    </div>
  ) : null;
  if (agri) {
    const w = await getTranslations("agriWall");
    return <div className="ans-product-shell"><div className="ans-product-container ans-page-content max-w-6xl space-y-6"><Button asChild variant="ghost"><Link href="/explore/agrihackathon/submit">{w("continueEntry")}</Link></Button>{guestBanner}<header><p className="mb-3 text-sm font-medium text-primary">{w("eyebrow")}</p><h1 className="ans-page-title">{w("publish")}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{w("reviewHint")}</p></header><MarketAccountBoundary actorId={actorId}><ListingEditor share agri /></MarketAccountBoundary></div></div>;
  }
  return (
    <div className="ans-product-shell">
      <div className="ans-product-container ans-page-content max-w-6xl space-y-6">
        {guestBanner}
        <header>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">ANS PROJECT PLAZA · 项目广场投稿</p>
          <h1 className="ans-page-title">{t("submit")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("submitBody")}</p>
        </header>
        <MarketAccountBoundary actorId={actorId}>
          <ListingEditor share agri={agri} />
        </MarketAccountBoundary>
      </div>
    </div>
  );
}
