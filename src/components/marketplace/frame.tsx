import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { PageHeading } from "@/components/layout/page-heading";
export async function MarketFrame({ title, description, children, tools, actions }: { title: string; description?: string; children: ReactNode; tools?: ReactNode; actions?: ReactNode }) {
  const t = await getTranslations("product.market");
  return <div className="ans-product-shell"><div className="ans-product-container ans-page-content ans-market-page"><PageHeading eyebrow={t("eyebrow")} title={title} description={description} tools={tools} actions={actions} />{children}</div></div>;
}
