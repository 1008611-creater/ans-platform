import { readHubMemberWorkflows } from "@/server/hubs/workflows";
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
export async function generateMetadata() { const t = await getTranslations("hubs"); return { title: t("title"), description: t("description") }; }
export default async function HubsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [t, params] = await Promise.all([getTranslations("hubs"), searchParams]);
  const query = typeof params.q === "string" ? params.q.trim().slice(0,120) : "";
  const normalized = query.normalize("NFKC").toLocaleLowerCase();
  const hubs = HUBS.filter(hub => !normalized || `${t(`items.${hub.slug}.name`)} ${t(`items.${hub.slug}.description`)} ${hub.slug}`.normalize("NFKC").toLocaleLowerCase().includes(normalized));
  let published: Awaited<ReturnType<typeof listPublishedCatalog>> | null = null;
  try { published = await listPublishedCatalog(); } catch { /* Unknown counts stay unknown; do not resurrect withdrawn projects. */ }
  let publishedRecipeIds: readonly CatalogWorkflowId[] | null = [];
  if (hubs.some(hub => hub.workflowRecipeIds.length)) {
    try {
      const platform = await findPublishedPlatformRecipe();
      publishedRecipeIds = platform ? [platform.recipe.catalogRecipeId] : [];
    } catch { publishedRecipeIds = null; }
  }
  const memberCounts=Object.fromEntries(await Promise.all(hubs.map(async hub=>[hub.slug,await readHubMemberWorkflows(hub.slug).then(page=>page.total).catch(()=>null)])));
  return <div className="ans-product-shell"><div className={`ans-product-container ${styles.container}`}><header className="ans-page-heading"><RevealDetails id="hub-directory-guide" kind="heading" label={t("guideLabel")} className="ans-page-heading-copy pe-12" details={<><p>{t("description")}</p><p>{t("directoryNote")}</p></>}><h1 className="ans-page-title">{t("title")}</h1></RevealDetails><div className="ans-page-actions"><Button asChild variant="outline"><Link href="/market">{t("allWorkflows")}</Link></Button></div></header><form action="/hubs" role="search" className={styles.search}><label htmlFor="hub-search">{t("searchLabel")}<Input id="hub-search" name="q" type="search" defaultValue={query} placeholder={t("searchPlaceholder")} /></label><Button type="submit" variant="outline">{t("search")}</Button></form>{hubs.length ? <HubDirectory hubs={hubs} published={published} publishedRecipeIds={publishedRecipeIds} memberCounts={memberCounts} /> : <div className={styles.empty}>{t("emptySearch")} <Link href="/hubs" className="underline">{t("clear")}</Link></div>}{publishedRecipeIds === null && <p className={styles.note} role="status">{t("workflowsUnavailable")}</p>}{published === null && <p className={styles.note} role="status">{t("catalogUnavailable")}</p>}</div></div>;
}
