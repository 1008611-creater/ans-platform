import { cache } from "react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { isFavorited } from "@/server/favorites/service";
import { listPublishedCatalog } from "@/server/catalog/service";
import { getProjectConnections } from "@/server/catalog/connections";
import { catalogText } from "@/domain/catalog/content";
import { CATALOG_PROJECTS, type CatalogProject } from "@/domain/catalog/projects";
import { getProjectGuide, relatedCatalogProjects } from "@/domain/catalog/project-detail";
import { CatalogProjectDetail } from "@/components/catalog/project-detail";

export const dynamic = "force-dynamic";

const getRequestCatalog = cache(() => listPublishedCatalog());
const getRequestConnections = cache((project: CatalogProject) => getProjectConnections(project));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const builtin = CATALOG_PROJECTS.find(item => item.slug === slug);
  if (builtin) {
    void getRequestConnections(builtin).catch(() => null);
  }
  const [catalog, t, locale] = await Promise.all([getRequestCatalog(), getTranslations("product"), getLocale()]);
  const project = catalog.find(item => item.slug === slug);
  if (!project) notFound();
  void getRequestConnections(project).catch(() => null);
  return { title: catalogText(project, t, "title", locale), description: catalogText(project, t, "summary", locale) };
}

export default async function CatalogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [catalog, session] = await Promise.all([getRequestCatalog(), auth()]);
  const project = catalog.find(item => item.slug === slug);
  if (!project) notFound();
  const accountId = session?.user?.id ?? null;
  const connectionsKey =
    builtinMatchesConnections(project, CATALOG_PROJECTS.find(item => item.slug === slug))
      ? CATALOG_PROJECTS.find(item => item.slug === slug)!
      : project;
  const [saved, connections] = await Promise.all([
    accountId ? isFavorited(accountId, "PROJECT", project.slug) : Promise.resolve(false),
    getRequestConnections(connectionsKey),
  ]);
  return <CatalogProjectDetail project={project} guide={getProjectGuide(project)} related={relatedCatalogProjects(project, catalog)} connections={connections} accountId={accountId} favorited={saved} />;
}

function builtinMatchesConnections(project: CatalogProject, builtin: CatalogProject | undefined) {
  if (!builtin) return false;
  return (
    project.memberHref === builtin.memberHref &&
    JSON.stringify(project.workflowSlugs ?? []) === JSON.stringify(builtin.workflowSlugs ?? []) &&
    JSON.stringify(project.marketSlugs ?? []) === JSON.stringify(builtin.marketSlugs ?? [])
  );
}
