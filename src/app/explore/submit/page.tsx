import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { getTranslations } from "next-intl/server";
import { marketPageUser } from "@/server/marketplace/access";
import { MarketFrame } from "@/components/marketplace/frame";
import { ListingEditor } from "@/components/marketplace/listing-editor";
export default async function SubmitProjectPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const agri = (await searchParams).event === "agrihackathon";
  const user = await marketPageUser(agri ? "/explore/submit?event=agrihackathon" : "/explore/submit");
  const t = await getTranslations("product.realProject");
  if (agri) {
    const w = await getTranslations("agriWall");
    return <div className="ans-product-shell"><div className="ans-product-container ans-page-content max-w-6xl space-y-6"><Button asChild variant="ghost"><Link href="/explore/agrihackathon/submit">{w("continueEntry")}</Link></Button><header><p className="mb-3 text-sm font-medium text-primary">{w("eyebrow")}</p><h1 className="ans-page-title">{w("publish")}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{w("reviewHint")}</p></header><MarketAccountBoundary actorId={user}><ListingEditor share agri /></MarketAccountBoundary></div></div>;
  }
  return (
    <div className="ans-product-shell">
      <div className="ans-product-container ans-page-content max-w-6xl space-y-6">
        <header>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">ANS PROJECT PLAZA · 项目广场投稿</p>
          <h1 className="ans-page-title">{t("submit")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("submitBody")}</p>
        </header>
        <MarketAccountBoundary actorId={user}>
          <ListingEditor share agri={agri} />
        </MarketAccountBoundary>
      </div>
    </div>
  );
}
