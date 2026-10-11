import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { getTranslations } from "next-intl/server";
import { marketPageUser } from "@/server/marketplace/access";
import { listPendingMarketListings } from "@/server/marketplace/listings";
import { MarketRuleError } from "@/domain/marketplace/order";
import { MarketFrame } from "@/components/marketplace/frame";
import { MarketModeration } from "@/components/marketplace/moderation";
export const dynamic = "force-dynamic";
export default async function MarketAdminPage() { const user = await marketPageUser("/admin/market"); const t = await getTranslations("product.market"); const cash = await getTranslations("marketCash.operations"); const disputes = await getTranslations("marketCash.disputes"); let offers; try { offers = await listPendingMarketListings(user); } catch (error) { if (error instanceof MarketRuleError && ["FORBIDDEN","ACCOUNT_UNAVAILABLE"].includes(error.code)) return <MarketFrame title={t("moderation")}><p role="alert">{t("errors.FORBIDDEN")}</p></MarketFrame>; throw error; } return <MarketFrame title={t("moderation")} description={t("moderationBody")}><MarketAccountBoundary actorId={user}><Button asChild variant="outline" className="mb-6"><Link href="/admin/market/payments">{cash("title")}</Link></Button><Button asChild variant="outline" className="mb-6 ml-3"><Link href="/admin/market/disputes">{disputes("title")}</Link></Button><MarketModeration offers={offers}/></MarketAccountBoundary></MarketFrame>; }
