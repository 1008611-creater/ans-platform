import { getTranslations } from "next-intl/server";
import { marketPageUser } from "@/server/marketplace/access";
import { listPendingMarketListings } from "@/server/marketplace/listings";
import { MarketRuleError } from "@/domain/marketplace/order";
import { MarketFrame } from "@/components/marketplace/frame";
import { MarketModeration } from "@/components/marketplace/moderation";
export const dynamic = "force-dynamic";
export default async function MarketAdminPage() { const user = await marketPageUser("/admin/market"); const t = await getTranslations("product.market"); let offers; try { offers = await listPendingMarketListings(user); } catch (error) { if (error instanceof MarketRuleError && ["FORBIDDEN","ACCOUNT_UNAVAILABLE"].includes(error.code)) return <MarketFrame title={t("moderation")}><p role="alert">{t("errors.FORBIDDEN")}</p></MarketFrame>; throw error; } return <MarketFrame title={t("moderation")} description={t("moderationBody")}><MarketModeration offers={offers}/></MarketFrame>; }
