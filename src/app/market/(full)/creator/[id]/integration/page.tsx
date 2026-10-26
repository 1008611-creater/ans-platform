import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { marketPageUser } from "@/server/marketplace/access";
import { getOwnedMarketListing } from "@/server/marketplace/listings";
import { getMarketIntegration } from "@/server/marketplace/integration";
import { MarketRuleError } from "@/domain/marketplace/order";
import { MarketFrame } from "@/components/marketplace/frame";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { IntegrationSettings } from "@/components/marketplace/integration-settings";
export const dynamic = "force-dynamic";
export default async function IntegrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const user = await marketPageUser("/market/creator/" + id + "/integration"); const t = await getTranslations("product.marketIntegration");
  const offer = await getOwnedMarketListing(id,user).catch(e => { if (e instanceof MarketRuleError && e.status === 404) notFound(); throw e; });
  const data = await getMarketIntegration(id,user);
  return <MarketFrame title={t("title")} description={offer.listing.title}><MarketAccountBoundary actorId={user}><IntegrationSettings listingId={id} initial={data ? { keyPrefix: data.keyPrefix, returnOrigins: data.returnOrigins, revokedAt: data.revokedAt?.toISOString() ?? null } : null}/></MarketAccountBoundary></MarketFrame>;
}
