import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { PageHeading } from "@/components/layout/page-heading";
export async function MarketFrame({ title, description, children, tools, actions }: { title: string; description?: string; children: ReactNode; tools?: ReactNode; actions?: ReactNode }) {
  const t = await getTranslations("product.market");
  return <div className="ans-product-shell"><div className="ans-product-container ans-page-content ans-market-page"><nav aria-label={t("navigation")} className="ans-market-nav">
    <Link className="ans-subcategory" href="/market">{t("browse")}</Link><Link className="ans-subcategory" href="/market/creator">{t("creator")}</Link><Link className="ans-subcategory" href="/market/orders">{t("orders")}</Link><Link className="ans-subcategory" href="/workspace">{t("workspace")}</Link>
  </nav><PageHeading eyebrow={t("eyebrow")} title={title} description={description} tools={tools} actions={actions} />{children}</div></div>;
}
