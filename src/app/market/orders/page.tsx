import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { marketPageUser } from "@/server/marketplace/access";
import { listMarketOrders } from "@/server/marketplace/orders";
import { marketPrice } from "@/domain/marketplace/presentation";
import { MarketFrame } from "@/components/marketplace/frame";
export const dynamic = "force-dynamic";
export default async function OrdersPage() { const user = await marketPageUser("/market/orders"); const [orders,t] = await Promise.all([listMarketOrders(user),getTranslations("product.market")]); return <MarketFrame title={t("orders")} description={t("ordersBody")}><div className="space-y-4">{orders.length === 0 && <div className="ans-empty"><h2 className="text-xl font-semibold">{t("noOrders")}</h2><Link href="/market" className="mt-4 inline-block text-primary underline">{t("browse")}</Link></div>}{orders.map((order) => <Link href={"/market/orders/" + order.id} key={order.id} className="ans-project-card block p-6"><div className="flex flex-wrap justify-between gap-4"><div><h2 className="break-words text-lg font-semibold">{order.quote.title}</h2><p className="mt-2 text-sm text-muted-foreground">{t(order.buyerId === user ? "buyer" : "seller")} · {t("orderStatus." + order.status)}</p></div><p className="text-2xl font-semibold">{order.paymentMethod === "POINTS" ? t("pointsUnit", { amount: order.quote.priceMinor / 100 }) : marketPrice(order.quote.priceMinor)}</p></div></Link>)}</div></MarketFrame>; }
