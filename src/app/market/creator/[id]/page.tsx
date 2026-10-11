import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { marketPageUser } from "@/server/marketplace/access";
import { getOwnedMarketListing } from "@/server/marketplace/listings";
import { MarketRuleError } from "@/domain/marketplace/order";
import { MarketFrame } from "@/components/marketplace/frame";
import { ListingEditor } from "@/components/marketplace/listing-editor";
export const dynamic = "force-dynamic";
export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const user = await marketPageUser("/market/creator/" + id); const t = await getTranslations("product.market"); const offer = await getOwnedMarketListing(id,user).catch((error) => { if (error instanceof MarketRuleError && error.code === "NOT_FOUND") notFound(); throw error; }); return <MarketFrame title={t("edit")} description={t("creatorBody")}><MarketAccountBoundary actorId={user}><ListingEditor key={offer.version} offer={offer}/></MarketAccountBoundary></MarketFrame>; }
