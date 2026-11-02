import { readHubMemberWorkflows } from "@/server/hubs/workflows";
import { HubMemberWorkflowList } from "@/components/hubs/hub-member-workflows";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getHub, hubProjects, hubShortcut, hubWorkflowRecipes } from "@/domain/hubs/registry";
import { catalogText } from "@/domain/catalog/content";
import { readHubCatalog, readHubPlatform } from "@/server/hubs/public-reads";
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
export default async function HubDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{cursor?:string}> }) {
  const { slug } = await params, hub = getHub(slug); if (!hub) notFound();
  const query = await searchParams;
  const cursor = typeof query?.cursor === "string" && query.cursor.length <= 80 ? query.cursor : undefined;
  // Independent public reads must not serialize database network round trips.
  // Each service retains its own publication, ownership and snapshot checks.
  const memberRead = readHubMemberWorkflows(hub.slug, cursor).catch(() => null);
  const canShortcut = !cursor && hubShortcut(hub, 0) !== null;
  const otherReads = canShortcut ? null : Promise.all([
    readHubCatalog().catch(() => null),
    hub.workflowRecipeIds.includes("resume-website") ? readHubPlatform() : Promise.resolve({ platform: null, workflowsUnavailable: false, marketPath: null, marketUnavailable: false }),
  ]);
  const members = await memberRead;
  // A Hub with nothing but one entry sends visitors straight there.
  const shortcut = canShortcut ? hubShortcut(hub, members?.items.length ?? 0) : null;
  if (shortcut) redirect(shortcut);
  const [[t, product, locale], [published, { platform, workflowsUnavailable, marketPath, marketUnavailable }]] = await Promise.all([
    Promise.all([getTranslations("hubs"), getTranslations("product"), getLocale()]),
    otherReads ?? Promise.all([readHubCatalog().catch(() => null), Promise.resolve({ platform: null, workflowsUnavailable: false, marketPath: null, marketUnavailable: false })]),
  ]);
  const projects = published ? hubProjects(hub, published) : [];
  const recipes = hubWorkflowRecipes(hub, workflowsUnavailable ? null : platform ? [platform.recipe.catalogRecipeId] : []);
  const showRecipes = recipes === null || recipes.length > 0;
  const showMembers = members === null || members.items.length > 0;
  const showProjects = published === null || projects.length > 0;
  // Sections with nothing in them are left out, so real content reaches the first screen.
  const empty = !showRecipes && !showMembers && !hub.resources.length && !showProjects;
  return <div className="ans-product-shell"><div className={`ans-product-container ${styles.container}`}>
    <Link href="/hubs" className={styles.back}><ArrowLeft className="size-4" aria-hidden="true" />{t("back")}</Link>
    <header className="ans-page-heading"><div className="ans-page-heading-copy"><p className="ans-eyebrow">{t(`types.${hub.organization.type}`)}</p><h1 className="ans-page-title">{t(`items.${hub.slug}.name`)}</h1><p className={styles.lede}>{t(`items.${hub.slug}.description`)}</p>{hub.organization.university && <p className={styles.note}>{t("universityNote", { university: t(hub.organization.university.nameKey) })}</p>}</div></header>
    {showRecipes && <section className={styles.section} aria-labelledby="hub-workflows"><RevealDetails id="hub-workflow-guide" kind="heading" className="pe-12" label={t("workflowGuideLabel")} details={<p>{t("runnableNote")}</p>}><h2 id="hub-workflows">{t("officialWorkflowsTitle")}</h2></RevealDetails>{recipes === null ? <div className={styles.empty} role="status">{t("workflowsUnavailable")}</div> : <div className={styles.entries}>{recipes.map(id => <article key={id} className={styles.entry}><span className={styles.kind}>{t("kinds.runnable")}</span><h3>{t(`recipes.${id}.title`)}</h3><p>{t(`recipes.${id}.description`)}</p><p>{t(unifiedModelBilling() ? "recipeMeteredCost" : "recipeCost", { points: RESUME_WEBSITE_COST_POINTS })}</p>{marketUnavailable && <p role="status">{t("marketUnavailable")}</p>}{marketPath && <Button asChild variant="ghost" className="mt-4"><Link href={marketPath}>{t("viewMarketCard")}<ArrowUpRight className="size-4" aria-hidden="true" /></Link></Button>}</article>)}</div>}</section>}
    {showMembers && <HubMemberWorkflowList page={members} slug={hub.slug} />}
    {hub.resources.length > 0 && <section className={styles.section} aria-labelledby="hub-resources"><h2 id="hub-resources">{t("resourcesTitle")}</h2><div className={styles.entries}>{hub.resources.map(resource => <article key={resource.id} className={styles.entry}><span className={styles.kind}>{t(`kinds.${resource.kind}`)}</span><h3><Link href={resource.href}>{t(resource.titleKey)}<ArrowUpRight className="size-4" aria-hidden="true" /></Link></h3><p>{t(resource.descriptionKey)}</p></article>)}</div></section>}
    {showProjects && <section className={styles.section} aria-labelledby="hub-projects"><RevealDetails id="hub-project-guide" kind="heading" className="pe-12" label={t("projectGuideLabel")} details={<p>{t("projectsNote")}</p>}><h2 id="hub-projects">{t("projectsTitle")}</h2></RevealDetails>{published === null ? <p className={styles.empty} role="status">{t("catalogUnavailable")}</p> : <div className={styles.entries}>{projects.map(project => <article key={project.slug} className={styles.entry}>{project.coverUrl && <Image className={styles.cover} src={project.coverUrl} width={640} height={360} alt="" sizes="(max-width:767px) 100vw, 50vw" />}<span className={styles.kind}>{t(project.source === "github" || project.source === "bilibili" || project.source === "web" ? "kinds.reference" : "kinds.external")}</span><h3><Link href={`/explore/${project.slug}`}>{catalogText(project, product, "title", locale)}<ArrowUpRight className="size-4" aria-hidden="true" /></Link></h3><p>{catalogText(project, product, "summary", locale)}</p></article>)}</div>}</section>}
    {empty && <div className={styles.empty}>{t("emptyHub")} <Link href="/hubs" className="underline">{t("back")}</Link></div>}
  </div></div>;
}
