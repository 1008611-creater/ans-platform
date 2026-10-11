import Link from "next/link";
import { getTranslations } from "next-intl/server";
export async function MarketFrame({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  const t = await getTranslations("product.market");
  return <div className="ans-product-shell"><div className="ans-product-container py-10 sm:py-16"><nav aria-label={t("navigation")} className="mb-10 flex flex-wrap gap-2 text-sm">
    <Link className="ans-subcategory" href="/market">{t("browse")}</Link><Link className="ans-subcategory" href="/market/creator">{t("creator")}</Link><Link className="ans-subcategory" href="/market/orders">{t("orders")}</Link><Link className="ans-subcategory" href="/workspace">{t("workspace")}</Link>
  </nav><header className="mb-10 max-w-3xl"><p className="ans-eyebrow">{t("eyebrow")}</p><h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h1>{description && <p className="mt-5 leading-8 text-muted-foreground">{description}</p>}</header>{children}</div></div>;
}
