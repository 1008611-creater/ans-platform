import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { CatalogError, findCatalogDraft } from "@/server/catalog/service";
import { catalogText, catalogSourceLabel } from "@/domain/catalog/content";
import { ProjectPreview } from "@/components/catalog/project-preview";
export const dynamic = "force-dynamic";
export default async function CatalogDraftPreview({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ revision?: string }> }) {
  const { slug } = await params; const { revision: rawRevision } = await searchParams;
  const revision = rawRevision && /^[1-9][0-9]*$/.test(rawRevision) ? Number(rawRevision) : 0;
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=" + encodeURIComponent("/admin/catalog/" + slug + "/preview?revision=" + revision));
  const [t, locale] = await Promise.all([getTranslations("product"), getLocale()]); let project;
  try { project = await findCatalogDraft(session.user.id, slug, revision); }
  catch (error) { if (error instanceof CatalogError && ["FORBIDDEN", "NOT_FOUND"].includes(error.code)) notFound(); throw error; }
  return <div className="ans-product-shell"><div className="ans-product-container py-12">
    <p role="status" className="mb-8 rounded-2xl border bg-muted p-5 text-sm leading-7">{t("catalogAdmin.privatePreview", { revision })}</p><Link href="/admin/catalog" className="ans-text-link mb-8">{t("catalogAdmin.backEditor")}</Link>
    <section className="grid items-center gap-8 lg:grid-cols-2"><ProjectPreview project={project} large /><div><p className="ans-eyebrow">{t("categories." + project.category)} / {t("children." + project.subcategory)}</p><h1 className="mt-4 text-3xl font-semibold">{catalogText(project, t, "title", locale)}</h1><p className="mt-5 leading-8 text-muted-foreground">{catalogText(project, t, "summary", locale)}</p><p className="mt-5 text-sm">{t(catalogSourceLabel(project.source))} · {t(project.workflowId ? "ready" : "reference")}</p></div></section>
    <section className="mt-10 grid gap-5 md:grid-cols-3">{(["output", "inputs", "decisions"] as const).map(field => <article key={field} className="ans-detail-block"><h2 className="font-semibold">{t(field + "Title")}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{catalogText(project, t, field, locale)}</p></article>)}</section>
    <section className="mt-10 max-w-4xl space-y-5">{(["model", "prompt", "skill", "sourceNote"] as const).map(field => <article key={field} className="ans-detail-block"><h2 className="font-semibold">{t(field === "sourceNote" ? field : field + "Title")}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{catalogText(project, t, field, locale)}</p></article>)}<p className="text-sm leading-7 text-muted-foreground">{t("catalogAdmin.promptHint")}</p>{project.sourceUrl && <a href={project.sourceUrl} rel="noopener noreferrer" target="_blank" className="ans-text-link">{t("source")}</a>}</section>
  </div></div>;
}