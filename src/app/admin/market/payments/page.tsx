import { getTranslations } from "next-intl/server";
import { marketPageUser } from "@/server/marketplace/access";
import { listMarketRefundOperations } from "@/server/marketplace/refund-operations";
import { MarketRuleError } from "@/domain/marketplace/order";
import { MarketFrame } from "@/components/marketplace/frame";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { RefundOperations } from "@/components/marketplace/refund-operations";
export const dynamic = "force-dynamic";
export default async function MarketPaymentsPage({ searchParams }: { searchParams: Promise<{ cursor?: string; view?: string }> }) {
  const actorId = await marketPageUser("/admin/market/payments"); const t = await getTranslations("marketCash.operations"); const query = await searchParams;
  const view = ["pending", "confirmed", "all"].includes(query.view ?? "") ? query.view : "pending";
  let result; try { result = await listMarketRefundOperations(actorId, { cursor: query.cursor, view }); }
  catch (error) { if (error instanceof MarketRuleError && ["FORBIDDEN", "ACCOUNT_UNAVAILABLE"].includes(error.code)) return <MarketFrame title={t("title")}><p role="alert">{t("forbidden")}</p></MarketFrame>; throw error; }
  return <MarketFrame title={t("title")} description={t("description")}><MarketAccountBoundary actorId={actorId}><RefundOperations items={result.items} nextCursor={result.nextCursor} view={result.view}/></MarketAccountBoundary></MarketFrame>;
}
