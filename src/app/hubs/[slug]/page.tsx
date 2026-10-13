import { readHubMemberWorkflows } from "@/server/hubs/workflows";
import { HubMemberWorkflowList } from "@/components/hubs/hub-member-workflows";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getHub, hubProjects, hubWorkflowRecipes } from "@/domain/hubs/registry";
import { listPublishedCatalog } from "@/server/catalog/service";
import { catalogText } from "@/domain/catalog/content";
import { findPublishedPlatformRecipe } from "@/server/workflows/platform-recipes";
import { publishedRecipeMarketPath } from "@/server/marketplace/workflows";
import { unifiedModelBilling } from "@/server/integrations/metered-cost";
import { RESUME_WEBSITE_COST_POINTS } from "@/contracts/resume-website";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import styles from "@/components/hubs/hubs.module.css";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params, hub = getHub(slug); if (!hub) notFound();
  const t = await getTranslations("hubs"); return { title: t(`items.${hub.slug}.name`), description: t(`items.${hub.slug}.description`) };
}
export default async function HubDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{cursor?:string}> }) {
  const { slug } = await params, hub = getHub(slug); if (!hub) notFound();
  const [t, product, locale] = await Promise.all([getTranslations("hubs"), getTranslations("product"), getLocale()]);
  let published: Awaited<ReturnType<typeof listPublishedCatalog>> | null = null;
  try { published = await listPublishedCatalog(); } catch { /* Publication status is unknown, so omit project cards. */ }
  const query=await searchParams;const cursor=typeof query?.cursor==="string"&&query.cursor.length<=80?query.cursor:undefined;
  const members=await readHubMemberWorkflows(hub.slug,cursor).catch(()=>null);
  const projects = published ? hubProjects(hub, published) : [];
  let platform: Awaited<ReturnType<typeof findPublishedPlatformRecipe>> = null;
  let workflowsUnavailable = false;
  if (hub.workflowRecipeIds.includes("resume-website")) {
    try { platform = await findPublishedPlatformRecipe(); }
    catch { workflowsUnavailable = true; }
  }
  const recipes = hubWorkflowRecipes(hub, workflowsUnavailable ? null : platform ? [platform.recipe.catalogRecipeId] : []);
  let marketPath: string | null = null;
  let marketUnavailable = false;
  if (platform) {
    try { marketPath = await publishedRecipeMarketPath(platform.workflow, platform.version, platform.recipe.definitionHash); }
    catch { marketUnavailable = true; }
  }
  return <div className="ans-product-shell"><div className={`ans-product-container ${styles.container}`}>
    <Link href="/hubs" className={styles.back}><ArrowLeft className="size-4" aria-hidden="true" />{t("back")}</Link>
    <PageHeading eyebrow={t(`types.${hub.organization.type}`)} title={t(`items.${hub.slug}.name`)} description={t(`items.${hub.slug}.description`)} />
    {hub.organization.university && <p className={styles.note}>{t("universityNote", { university: t(hub.organization.university.nameKey) })}</p>}
    <section className={styles.section} aria-labelledby="hub-workflows"><h2 id="hub-workflows">{t("runnableTitle")}</h2><p>{t("runnableNote")}</p>{recipes === null ? <div className={styles.empty} role="status">{t("workflowsUnavailable")}</div> : recipes.length ? <div className={styles.entries}>{recipes.map(id => <article key={id} className={styles.entry}><span className={styles.kind}>{t("kinds.runnable")}</span><h3>{t(`recipes.${id}.title`)}</h3><p>{t(`recipes.${id}.description`)}</p><p>{t(unifiedModelBilling() ? "recipeMeteredCost" : "recipeCost", { points: RESUME_WEBSITE_COST_POINTS })}</p><Button asChild variant="outline" className="mt-4"><Link href={`/workflows/${platform!.workflow.slug}`}>{t("openWorkflow")}<ArrowUpRight className="size-4" aria-hidden="true" /></Link></Button>{marketUnavailable && <p role="status">{t("marketUnavailable")}</p>}{marketPath && <Button asChild variant="ghost" className="mt-4"><Link href={marketPath}>{t("viewMarketCard")}<ArrowUpRight className="size-4" aria-hidden="true" /></Link></Button>}</article>)}</div> : <div className={styles.empty}>{t("noRunnable")}</div>}</section>
    <HubMemberWorkflowList page={members} slug={hub.slug} />
    {hub.resources.length > 0 && <section className={styles.section} aria-labelledby="hub-resources"><h2 id="hub-resources">{t("resourcesTitle")}</h2><div className={styles.entries}>{hub.resources.map(resource => <article key={resource.id} className={styles.entry}><span className={styles.kind}>{t(`kinds.${resource.kind}`)}</span><h3><Link href={resource.href}>{t(resource.titleKey)}<ArrowUpRight className="size-4" aria-hidden="true" /></Link></h3><p>{t(resource.descriptionKey)}</p></article>)}</div></section>}
    <section className={styles.section} aria-labelledby="hub-projects"><h2 id="hub-projects">{t("projectsTitle")}</h2><p>{t("projectsNote")}</p>{published === null ? <p className={styles.empty} role="status">{t("catalogUnavailable")}</p> : projects.length ? <div className={styles.entries}>{projects.map(project => <article key={project.slug} className={styles.entry}>{project.coverUrl && <Image className={styles.cover} src={project.coverUrl} width={640} height={360} alt="" sizes="(max-width:767px) 100vw, 50vw" />}<span className={styles.kind}>{t(project.source === "github" || project.source === "bilibili" || project.source === "web" ? "kinds.reference" : "kinds.external")}</span><h3><Link href={`/explore/${project.slug}`}>{catalogText(project, product, "title", locale)}<ArrowUpRight className="size-4" aria-hidden="true" /></Link></h3><p>{catalogText(project, product, "summary", locale)}</p></article>)}</div> : <div className={styles.empty}>{t("noProjects")}</div>}</section>
  </div></div>;
}
