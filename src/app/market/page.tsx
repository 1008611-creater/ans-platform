import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PROJECT_CATEGORIES } from "@/domain/catalog/projects";
import { listMarketListings } from "@/server/marketplace/listings";
import { MarketFrame } from "@/components/marketplace/frame";
import { MarketOfferCard } from "@/components/marketplace/offer-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const t = await getTranslations("product.market"); return { title: t("title"), description: t("body") }; }
export default async function MarketPage({ searchParams }: { searchParams: Promise<{ category?: string; subcategory?: string; q?: string; fulfillment?: string }> }) {
  const [query, offers, t, p] = await Promise.all([searchParams, listMarketListings(), getTranslations("product.market"), getTranslations("product")]);
  const category = PROJECT_CATEGORIES.find((item) => item.id === query.category); const subcategory = category?.children.find((item) => item === query.subcategory);
  const q = typeof query.q === "string" ? query.q.slice(0, 200) : ""; const kind = query.fulfillment === "service" || query.fulfillment === "resource" ? query.fulfillment : undefined;
  const matches = offers.filter(({ listing }) => (!category || listing.category === category.id) && (!subcategory || listing.subcategory === subcategory) && (!kind || listing.fulfillment === kind) && (!q || [listing.title, listing.summary, ...listing.deliverables].join(" ").toLocaleLowerCase().includes(q.toLocaleLowerCase())));
  const href = (updates: Record<string, string | undefined>) => { const values = { category: category?.id, subcategory, q, fulfillment: kind, ...updates }; const next = new URLSearchParams(); for (const [key,value] of Object.entries(values)) if (value) next.set(key,value); return "/market" + (next.size ? "?" + next : ""); };
  return <MarketFrame title={t("title")} description={t("body")}><div className="mb-8 flex flex-wrap items-center justify-between gap-4"><p className="max-w-2xl text-sm leading-7 text-muted-foreground">{t("paymentNotice")}</p><Button asChild><Link href="/market/creator/new">{t("create")}</Link></Button></div>
    <form action="/market" className="flex max-w-xl gap-2"><label className="sr-only" htmlFor="market-search">{t("search")}</label><Input id="market-search" name="q" type="search" maxLength={200} defaultValue={q} placeholder={t("searchPlaceholder")}/>{Object.entries({ category: category?.id, subcategory, fulfillment: kind }).map(([name,value]) => value && <input key={name} type="hidden" name={name} value={value}/>)}<Button>{t("search")}</Button></form>
    <nav className="ans-category-row mt-8" aria-label={p("categoriesLabel")}><Link className="ans-category-pill" aria-current={!category ? "page" : undefined} href={href({ category: undefined, subcategory: undefined })}>{p("all")}</Link>{PROJECT_CATEGORIES.map((item) => <Link key={item.id} className="ans-category-pill" aria-current={category?.id === item.id ? "page" : undefined} href={href({ category: item.id, subcategory: undefined })}>{p("categories." + item.id)}</Link>)}</nav>
    {category && <nav className="mb-5 flex flex-wrap gap-2 text-sm" aria-label={p("subcategoriesLabel")}><Link className="ans-subcategory" aria-current={!subcategory ? "page" : undefined} href={href({ subcategory: undefined })}>{p("allChildren")}</Link>{category.children.map((item) => <Link className="ans-subcategory" key={item} aria-current={subcategory === item ? "page" : undefined} href={href({ subcategory: item })}>{p("children." + item)}</Link>)}</nav>}
    <nav className="mb-8 flex flex-wrap gap-2 border-y py-4 text-sm" aria-label={t("fields.fulfillment")}>{[undefined,"service","resource"].map((value) => <Link className="ans-subcategory" key={value ?? "all"} aria-current={kind === value ? "page" : undefined} href={href({ fulfillment: value })}>{t(value ?? "allTypes")}</Link>)}</nav>
    <p className="mb-5 text-sm text-muted-foreground">{t("count", { count: matches.length })}</p>{matches.length ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{matches.map((offer) => <MarketOfferCard key={offer.id} offer={offer}/>)}</div> : <div className="ans-empty"><h2 className="text-xl font-semibold">{t("empty")}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{t("emptyBody")}</p><Button asChild className="mt-5" variant="outline"><Link href="/explore">{p("nav.explore")}</Link></Button></div>}
  </MarketFrame>;
}
