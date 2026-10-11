import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { marketPageUser } from "@/server/marketplace/access";
import { listMarketListings } from "@/server/marketplace/listings";
import { MarketFrame } from "@/components/marketplace/frame";
import { MarketOfferCard } from "@/components/marketplace/offer-card";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export default async function CreatorPage() {
  const user = await marketPageUser("/market/creator"); const [offers,t] = await Promise.all([listMarketListings(user),getTranslations("product.market")]);
  return <MarketFrame title={t("creator")} description={t("creatorBody")}><MarketAccountBoundary actorId={user}><Button asChild className="mb-8"><Link href="/market/creator/new">{t("create")}</Link></Button>{offers.length ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{offers.map((offer) => <MarketOfferCard key={offer.id} offer={offer} owner/>)}</div> : <div className="ans-empty"><h2 className="text-xl font-semibold">{t("noOwnOffers")}</h2><p className="mt-3 text-sm text-muted-foreground">{t("creatorBody")}</p></div>}</MarketAccountBoundary></MarketFrame>;
}
