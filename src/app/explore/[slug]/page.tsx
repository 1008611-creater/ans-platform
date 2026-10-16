import { cache } from "react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { isFavorited } from "@/server/favorites/service";
import { listPublishedCatalog } from "@/server/catalog/service";
import { getProjectConnections } from "@/server/catalog/connections";
import { catalogText } from "@/domain/catalog/content";
import { CATALOG_PROJECTS } from "@/domain/catalog/projects";
import { getProjectGuide, relatedCatalogProjects } from "@/domain/catalog/project-detail";
import { CatalogProjectDetail } from "@/components/catalog/project-detail";

export const dynamic = "force-dynamic";

const getRequestCatalog = cache(() => listPublishedCatalog());

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const builtin = CATALOG_PROJECTS.find(item => item.slug === slug);
  if (builtin) {
    void getProjectConnections(builtin).catch(() => null);
  }
  const [catalog, t, locale] = await Promise.all([getRequestCatalog(), getTranslations("product"), getLocale()]);
  const project = catalog.find(item => item.slug === slug);
  if (!project) notFound();
  void getProjectConnections(project).catch(() => null);
  return { title: catalogText(project, t, "title", locale), description: catalogText(project, t, "summary", locale) };
}

export default async function CatalogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [catalog, session] = await Promise.all([getRequestCatalog(), auth()]);
  const project = catalog.find(item => item.slug === slug);
  if (!project) notFound();
  const accountId = session?.user?.id ?? null;
  const [saved, connections] = await Promise.all([
    accountId ? isFavorited(accountId, "PROJECT", project.slug) : Promise.resolve(false),
    getProjectConnections(project),
  ]);
  return <CatalogProjectDetail project={project} guide={getProjectGuide(project)} related={relatedCatalogProjects(project, catalog)} connections={connections} accountId={accountId} favorited={saved} />;
}
