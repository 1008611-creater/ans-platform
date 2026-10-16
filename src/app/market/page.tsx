import { auth } from "@/lib/auth";
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
  const session = await auth();
  const [query, offers, t, tp, p] = await Promise.all([searchParams, listMarketListings(undefined, session?.user?.id), getTranslations("product.market"), getTranslations("product.marketProject"), getTranslations("product")]);
  const w = await getTranslations("marketWorkflow");
  const category = PROJECT_CATEGORIES.find((item) => item.id === query.category); const subcategory = category?.children.find((item) => item === query.subcategory);
  const q = typeof query.q === "string" ? query.q.slice(0, 200) : ""; const kind = query.fulfillment === "service" || query.fulfillment === "resource" || query.fulfillment === "workflow" ? query.fulfillment : undefined;
  const matches = offers.filter(({ listing }) => (!category || listing.category === category.id) && (!subcategory || listing.subcategory === subcategory) && (!kind || (kind === "workflow" ? Boolean(listing.execution) : !listing.execution && listing.fulfillment === kind)) && (!q || [listing.title, listing.summary, listing.githubUrl ?? "", ...listing.deliverables].join(" ").toLocaleLowerCase().includes(q.toLocaleLowerCase())));
  const hasFilters = Boolean(category || kind || q);
  const href = (updates: Record<string, string | undefined>) => { const values = { category: category?.id, subcategory, q, fulfillment: kind, ...updates }; const next = new URLSearchParams(); for (const [key,value] of Object.entries(values)) if (value) next.set(key,value); return "/market" + (next.size ? "?" + next : ""); };
  return <MarketFrame title={t("title")} description={t("body")}
    tools={<form action="/market" className="ans-search-form"><label className="ans-search-label" htmlFor="market-search">{t("search")}</label><Input id="market-search" name="q" type="search" maxLength={200} defaultValue={q} placeholder={t("searchPlaceholder")}/>{Object.entries({ category: category?.id, subcategory, fulfillment: kind }).map(([name,value]) => value && <input key={name} type="hidden" name={name} value={value}/>)}<Button>{t("search")}</Button></form>}
    actions={<Button asChild><Link href="/market/creator/new">{t("create")}</Link></Button>}>
    <div className="ans-market-notice"><p>{tp("marketNotice")}</p><details className="mt-2 text-sm"><summary className="cursor-pointer py-1 font-medium">{t("whichType")}</summary><p className="mt-2 max-w-2xl leading-7 text-muted-foreground">{t("typeGuide")}</p><Link href="/docs/points-integration" className="mt-2 inline-block py-1 text-primary underline underline-offset-4">{tp("integrationGuide")}</Link></details></div>
    <nav className="ans-category-row mt-6" aria-label={p("categoriesLabel")}><Link className="ans-category-pill" aria-current={!category ? "page" : undefined} href={href({ category: undefined, subcategory: undefined })}>{p("all")}</Link>{PROJECT_CATEGORIES.map((item) => <Link key={item.id} className="ans-category-pill" aria-current={category?.id === item.id ? "page" : undefined} href={href({ category: item.id, subcategory: undefined })}>{p("categories." + item.id)}</Link>)}</nav>
    {category && <nav className="mb-5 flex flex-wrap gap-2 text-sm" aria-label={p("subcategoriesLabel")}><Link className="ans-subcategory" aria-current={!subcategory ? "page" : undefined} href={href({ subcategory: undefined })}>{p("allChildren")}</Link>{category.children.map((item) => <Link className="ans-subcategory" key={item} aria-current={subcategory === item ? "page" : undefined} href={href({ subcategory: item })}>{p("children." + item)}</Link>)}</nav>}
    <nav className="mb-8 flex flex-wrap gap-2 border-y py-4 text-sm" aria-label={t("fields.fulfillment")}>{[undefined,"workflow","service","resource"].map((value) => <Link className="ans-subcategory" key={value ?? "all"} aria-current={kind === value ? "page" : undefined} href={href({ fulfillment: value })}>{value === "workflow" ? w("runnable") : t(value ?? "allTypes")}</Link>)}</nav>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">{t("count", { count: matches.length })}</p>{hasFilters && <Link href="/market" className="py-2 text-sm text-primary underline underline-offset-4">{t("clearFilters")}</Link>}</div>{matches.length ? <div className="ans-catalog-grid">{matches.map((offer) => <MarketOfferCard key={offer.id} offer={offer}/>)}</div> : <div className="ans-empty"><h2 className="text-xl font-semibold">{t(hasFilters ? "noMatches" : "empty")}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{t(hasFilters ? "noMatchesBody" : "emptyBody")}</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Button asChild><Link href={hasFilters ? "/market" : "/explore"}>{t(hasFilters ? "clearFilters" : "exploreProjects")}</Link></Button><Button asChild variant="outline"><Link href="/market/creator/new">{tp("uploadFirst")}</Link></Button></div></div>}
  </MarketFrame>;
}
