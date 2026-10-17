import { readHubMemberWorkflows } from "@/server/hubs/workflows";
import { HubMemberWorkflowList } from "@/components/hubs/hub-member-workflows";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getHub, hubProjects, hubWorkflowRecipes } from "@/domain/hubs/registry";
import { listPublishedCatalog } from "@/server/catalog/service";
import { catalogText } from "@/domain/catalog/content";
import { findPublishedPlatformRecipe } from "@/server/workflows/platform-recipes";
import { publishedRecipeMarketPath } from "@/server/marketplace/workflows";
import { unifiedModelBilling } from "@/server/integrations/metered-cost";
import { RESUME_WEBSITE_COST_POINTS } from "@/contracts/resume-website";
import { RevealDetails } from "@/components/catalog/reveal-details";
import { Button } from "@/components/ui/button";
import styles from "@/components/hubs/hubs.module.css";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params, hub = getHub(slug); if (!hub) notFound();
  const t = await getTranslations("hubs"); return { title: t(`items.${hub.slug}.name`), description: t(`items.${hub.slug}.description`) };
}
const resourceCovers: Record<string, string> = {
  agrihackathon: "/catalog/agrihackathon-v1/gitglow-hub.webp",
  "vibehub-knowledge": "/catalog/gitglow-v1/cauai-one.webp",
  "aigc-workbench": "/catalog/gitglow-v1/niannian-drama.webp",
  hypit: "/catalog/gitglow-v1/niannian-edit.webp",
};
export default async function HubDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{cursor?:string}> }) {
  const { slug } = await params, hub = getHub(slug); if (!hub) notFound();
  if (hub.slug === "vibehub") redirect("/vibe-hub");
  if (hub.slug === "cauhub") redirect("/competitions/agrihackathon");
  const [t, product, locale] = await Promise.all([getTranslations("hubs"), getTranslations("product"), getLocale()]);
  const query = await searchParams;
  const cursor = typeof query?.cursor === "string" && query.cursor.length <= 80 ? query.cursor : undefined;
  // Independent public reads must not serialize database network round trips.
  // Each service retains its own publication, ownership and snapshot checks.
  const platformRead = async () => {
    if (!hub.workflowRecipeIds.includes("resume-website")) return { platform: null, workflowsUnavailable: false, marketPath: null, marketUnavailable: false };
    let platform: Awaited<ReturnType<typeof findPublishedPlatformRecipe>>;
    try { platform = await findPublishedPlatformRecipe(); }
    catch { return { platform: null, workflowsUnavailable: true, marketPath: null, marketUnavailable: false }; }
    if (!platform) return { platform, workflowsUnavailable: false, marketPath: null, marketUnavailable: false };
    try {
      const marketPath = await publishedRecipeMarketPath(platform.workflow, platform.version, platform.recipe.definitionHash);
      return { platform, workflowsUnavailable: false, marketPath, marketUnavailable: false };
    } catch { return { platform, workflowsUnavailable: false, marketPath: null, marketUnavailable: true }; }
  };
  const [published, members, { platform, workflowsUnavailable, marketPath, marketUnavailable }] = await Promise.all([
    listPublishedCatalog().catch(() => null),
    readHubMemberWorkflows(hub.slug, cursor).catch(() => null),
    platformRead(),
  ]);
  const projects = published ? hubProjects(hub, published) : [];
  const recipes = hubWorkflowRecipes(hub, workflowsUnavailable ? null : platform ? [platform.recipe.catalogRecipeId] : []);
  const hasOfficial = recipes === null || recipes.length > 0;
  const hasMembers = Boolean(members && Array.isArray(members.items) && members.items.length > 0);
  return <div className="ans-product-shell"><div className={`ans-product-container ${styles.container}`}>
    <Link href="/hubs" className={styles.back}><ArrowLeft className="size-4" aria-hidden="true" />{t("back")}</Link>
    <header className="ans-page-heading"><RevealDetails id="hub-description" kind="heading" label={t("guideLabel")} className="ans-page-heading-copy pe-12" details={<><p>{t(`items.${hub.slug}.description`)}</p>{hub.organization.university && <p>{t("universityNote", { university: t(hub.organization.university.nameKey) })}</p>}</>}><p className="ans-eyebrow">{t(`types.${hub.organization.type}`)}</p><h1 className="ans-page-title">{t(`items.${hub.slug}.name`)}</h1></RevealDetails></header>
    {hub.resources.length > 0 && <section className={styles.section} aria-labelledby="hub-resources"><h2 id="hub-resources">{t("resourcesTitle")}</h2><div className={styles.entries}>{hub.resources.map(resource => <article key={resource.id} className={styles.entry}><Link href={resource.href} className="block overflow-hidden rounded-xl" tabIndex={-1} aria-hidden="true"><img className={`${styles.cover} transition-transform duration-300 hover:scale-[1.02]`} src={resourceCovers[resource.id] ?? "/catalog/gitglow-v1/aigc-workspace.webp"} alt="" loading="lazy" /></Link><span className={styles.kind}>{t(`kinds.${resource.kind}`)}</span><h3><Link href={resource.href}>{t(resource.titleKey)}<ArrowUpRight className="size-4" aria-hidden="true" /></Link></h3><p>{t(resource.descriptionKey)}</p><Link href={resource.href} className="mt-auto inline-flex items-center gap-1.5 pt-2 text-xs font-semibold text-primary hover:underline">立即进入工作台<ArrowUpRight className="size-3.5" aria-hidden="true" /></Link></article>)}</div></section>}
    <section className={styles.section} aria-labelledby="hub-projects"><RevealDetails id="hub-project-guide" kind="heading" className="pe-12" label={t("projectGuideLabel")} details={<p>{t("projectsNote")}</p>}><h2 id="hub-projects">{t("projectsTitle")}</h2></RevealDetails>{published === null ? <p className={styles.empty} role="status">{t("catalogUnavailable")}</p> : projects.length ? <div className={styles.entries}>{projects.map(project => <article key={project.slug} className={styles.entry}>{project.coverUrl && <Link href={`/explore/${project.slug}`} className="block overflow-hidden rounded-xl" tabIndex={-1} aria-hidden="true"><Image className={`${styles.cover} transition-transform duration-300 hover:scale-[1.02]`} src={project.coverUrl} width={640} height={360} alt="" sizes="(max-width:767px) 100vw, 50vw" /></Link>}<span className={styles.kind}>{t(project.source === "github" || project.source === "bilibili" || project.source === "web" ? "kinds.reference" : "kinds.external")}</span><h3><Link href={`/explore/${project.slug}`}>{catalogText(project, product, "title", locale)}<ArrowUpRight className="size-4" aria-hidden="true" /></Link></h3><p>{catalogText(project, product, "summary", locale)}</p></article>)}</div> : <div className={styles.empty}>{t("noProjects")}</div>}</section>
    {hasOfficial && <section className={styles.section} aria-labelledby="hub-workflows"><RevealDetails id="hub-workflow-guide" kind="heading" className="pe-12" label={t("workflowGuideLabel")} details={<p>{t("runnableNote")}</p>}><h2 id="hub-workflows">{t("officialWorkflowsTitle")}</h2></RevealDetails>{recipes === null ? <div className={styles.empty} role="status">{t("workflowsUnavailable")}</div> : <div className={styles.entries}>{recipes.map(id => <article key={id} className={styles.entry}><img className={styles.cover} src="/catalog/gitglow-v1/magic-resume.webp" alt="" loading="lazy" /><span className={styles.kind}>{t("kinds.runnable")}</span><h3>{t(`recipes.${id}.title`)}</h3><p>{t(`recipes.${id}.description`)}</p><p>{t(unifiedModelBilling() ? "recipeMeteredCost" : "recipeCost", { points: RESUME_WEBSITE_COST_POINTS })}</p>{marketUnavailable && <p role="status">{t("marketUnavailable")}</p>}{marketPath && <Button asChild variant="ghost" className="mt-4"><Link href={marketPath}>{t("viewMarketCard")}<ArrowUpRight className="size-4" aria-hidden="true" /></Link></Button>}</article>)}</div>}</section>}
    {hasMembers && <HubMemberWorkflowList page={members} slug={hub.slug} />}
  </div></div>;
}
