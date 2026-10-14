import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { isFavorited } from "@/server/favorites/service";
import { listPublishedCatalog } from "@/server/catalog/service";
import { catalogText } from "@/domain/catalog/content";
import { getProjectGuide, relatedCatalogProjects } from "@/domain/catalog/project-detail";
import { CatalogProjectDetail } from "@/components/catalog/project-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [catalog, t, locale] = await Promise.all([listPublishedCatalog(), getTranslations("product"), getLocale()]);
  const project = catalog.find(item => item.slug === slug);
  if (!project) notFound();
  return { title: catalogText(project, t, "title", locale), description: catalogText(project, t, "summary", locale) };
}

export default async function CatalogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [catalog, session] = await Promise.all([listPublishedCatalog(), auth()]);
  const project = catalog.find(item => item.slug === slug);
  if (!project) notFound();
  const accountId = session?.user?.id ?? null;
  const saved = accountId ? await isFavorited(accountId, "PROJECT", project.slug) : false;
  return <CatalogProjectDetail project={project} guide={getProjectGuide(project)} related={relatedCatalogProjects(project, catalog)} accountId={accountId} favorited={saved} />;
}
