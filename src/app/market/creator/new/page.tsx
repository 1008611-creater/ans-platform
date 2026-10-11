import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { getTranslations } from "next-intl/server";
import { marketPageUser } from "@/server/marketplace/access";
import { MarketFrame } from "@/components/marketplace/frame";
import { ListingEditor } from "@/components/marketplace/listing-editor";
export default async function NewOfferPage() { const user = await marketPageUser("/market/creator/new"); const t = await getTranslations("product.market"); return <MarketFrame title={t("create")} description={t("creatorBody")}><MarketAccountBoundary actorId={user}><ListingEditor/></MarketAccountBoundary></MarketFrame>; }
