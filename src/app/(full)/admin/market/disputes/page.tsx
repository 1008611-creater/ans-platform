import { getTranslations } from "next-intl/server";
import { marketPageUser } from "@/server/marketplace/access";
import { listMarketDisputeOperations } from "@/server/marketplace/refund-operations";
import { MarketRuleError } from "@/domain/marketplace/order";
import { MarketFrame } from "@/components/marketplace/frame";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { DisputeOperations } from "@/components/marketplace/dispute-operations";
export const dynamic = "force-dynamic";
export default async function MarketDisputesPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const actorId = await marketPageUser("/admin/market/disputes"); const t = await getTranslations("marketCash.disputes"); const query = await searchParams;
  let result; try { result = await listMarketDisputeOperations(actorId, { cursor: query.cursor }); }
  catch (error) { if (error instanceof MarketRuleError && ["FORBIDDEN", "ACCOUNT_UNAVAILABLE"].includes(error.code)) return <MarketFrame title={t("title")}><p role="alert">{t("forbidden")}</p></MarketFrame>; throw error; }
  return <MarketFrame title={t("title")} description={t("description")}><MarketAccountBoundary actorId={actorId}><DisputeOperations items={result.items} nextCursor={result.nextCursor}/></MarketAccountBoundary></MarketFrame>;
}
