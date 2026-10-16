import { cache } from "react";
import { readHubMemberWorkflowCounts } from "@/server/hubs/workflows";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { CatalogWorkflowId } from "@/contracts/catalog";
import { findPublishedPlatformRecipe } from "@/server/workflows/platform-recipes";
import { HUBS } from "@/domain/hubs/registry";
import { listPublishedCatalog } from "@/server/catalog/service";
import { HubDirectory } from "@/components/hubs/hub-directory";
import { RevealDetails } from "@/components/catalog/reveal-details";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import styles from "@/components/hubs/hubs.module.css";

export const dynamic = "force-dynamic";
const getHubCatalog = cache(() => listPublishedCatalog().catch(() => null));
const getHubRecipeIds = cache(() =>
  findPublishedPlatformRecipe()
    .then(platform => (platform ? ([platform.recipe.catalogRecipeId] as readonly CatalogWorkflowId[]) : ([] as readonly CatalogWorkflowId[])))
    .catch(() => null),
);
const getHubCounts = cache((key: string) => {
  const slugs = key ? (key.split(",") as typeof HUBS[number]["slug"][]) : [];
  return readHubMemberWorkflowCounts(slugs).catch(() =>
    Object.fromEntries(slugs.map(slug => [slug, null] as const)),
  );
});

export async function generateMetadata() {
  void getHubCatalog();
  void getHubRecipeIds();
  void getHubCounts(HUBS.map(hub => hub.slug).join(","));
  const t = await getTranslations("hubs");
  return { title: t("title"), description: t("description") };
}
export default async function HubsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [t, params] = await Promise.all([getTranslations("hubs"), searchParams]);
  const query = typeof params.q === "string" ? params.q.trim().slice(0,120) : "";
  const normalized = query.normalize("NFKC").toLocaleLowerCase();
  const hubs = HUBS.filter(hub => !normalized || `${t(`items.${hub.slug}.name`)} ${t(`items.${hub.slug}.description`)} ${hub.slug}`.normalize("NFKC").toLocaleLowerCase().includes(normalized));
  const [published, publishedRecipeIds, memberCounts] = await Promise.all([
    getHubCatalog(),
    hubs.some(hub => hub.workflowRecipeIds.length)
      ? getHubRecipeIds()
      : Promise.resolve([] as readonly CatalogWorkflowId[]),
    getHubCounts(hubs.map(hub => hub.slug).join(",")),
  ]);
  return <div className="ans-product-shell"><div className={`ans-product-container ${styles.container}`}><header className="ans-page-heading"><RevealDetails id="hub-directory-guide" kind="heading" label={t("guideLabel")} className="ans-page-heading-copy pe-12" details={<><p>{t("description")}</p><p>{t("directoryNote")}</p></>}><h1 className="ans-page-title">{t("title")}</h1></RevealDetails><div className="ans-page-actions"><Button asChild variant="outline"><Link href="/market">{t("allWorkflows")}</Link></Button></div></header><form action="/hubs" role="search" className={styles.search}><label htmlFor="hub-search">{t("searchLabel")}<Input id="hub-search" name="q" type="search" defaultValue={query} placeholder={t("searchPlaceholder")} /></label><Button type="submit" variant="outline">{t("search")}</Button></form>{hubs.length ? <HubDirectory hubs={hubs} published={published} publishedRecipeIds={publishedRecipeIds} memberCounts={memberCounts} /> : <div className={styles.empty}>{t("emptySearch")} <Link href="/hubs" className="underline">{t("clear")}</Link></div>}{publishedRecipeIds === null && <p className={styles.note} role="status">{t("workflowsUnavailable")}</p>}{published === null && <p className={styles.note} role="status">{t("catalogUnavailable")}</p>}</div></div>;
}
