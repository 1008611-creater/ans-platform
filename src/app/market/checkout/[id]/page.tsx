import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { marketPageUser } from "@/server/marketplace/access";
import { getExternalCheckoutForBuyer } from "@/server/marketplace/integration";
import { MarketRuleError } from "@/domain/marketplace/order";
import { MarketFrame } from "@/components/marketplace/frame";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { ExternalCheckout } from "@/components/marketplace/external-checkout";
export const dynamic = "force-dynamic";
export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const user = await marketPageUser("/market/checkout/" + id); const t = await getTranslations("product.marketIntegration");
  const checkout = await getExternalCheckoutForBuyer(id,user).catch(e => { if (e instanceof MarketRuleError && [401,403,404].includes(e.status)) notFound(); throw e; });
  return <MarketFrame title={t("checkoutTitle")} description={t("checkoutBody")}><div className="grid min-w-0 gap-8 lg:grid-cols-[1fr_0.65fr]"><section className="ans-detail-block"><h2 className="text-2xl font-semibold">{checkout.title}</h2>{checkout.tierTitle && <p className="mt-3 font-medium text-primary">{checkout.tierTitle}</p>}<ul className="mt-6 space-y-3 text-sm leading-7">{checkout.deliverables.map((value,index) => <li key={index}>{value}</li>)}</ul><p className="mt-6 text-sm text-muted-foreground">{t("expiry", { time: checkout.expiresAt })}</p><p className="mt-2 break-all text-xs text-muted-foreground">{t("returnOrigin", { origin: new URL(checkout.returnUrl).origin })}</p></section><aside className="ans-detail-block"><MarketAccountBoundary actorId={user}><ExternalCheckout id={id} initial={checkout.receipt} returnUrl={checkout.returnUrl} self={checkout.sellerId === user}/></MarketAccountBoundary></aside></div></MarketFrame>;
}
