import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { marketPageUser } from "@/server/marketplace/access";
import { getMarketOrder } from "@/server/marketplace/orders";
import { MarketRuleError } from "@/domain/marketplace/order";
import { MarketFrame } from "@/components/marketplace/frame";
import { OrderStudio } from "@/components/marketplace/order-studio";
export const dynamic = "force-dynamic";
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const user = await marketPageUser("/market/orders/" + id); const t = await getTranslations("product.market"); const order = await getMarketOrder(id,user).catch((error) => { if (error instanceof MarketRuleError && error.code === "NOT_FOUND") notFound(); throw error; }); return <MarketFrame title={t("orderTitle")} description={t("ordersBody")}><OrderStudio order={order} userId={user}/></MarketFrame>; }
