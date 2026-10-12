import { auth } from "@/lib/auth";
import { isFavorited } from "@/server/favorites/service";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { catalogText, catalogSourceLabel } from "@/domain/catalog/content";
import Link from "next/link";
import { findPublishedCatalog } from "@/server/catalog/service";
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, Check, ExternalLink } from "lucide-react";
import { projectStartHref } from "@/domain/catalog/projects";
import { PROJECT_WORKFLOW_COST_POINTS } from "@/contracts/projects";
import { buildArtifactGenerationPrompt, FACT_FIELDS } from "@/domain/projects/pack";
import { ProjectPreview } from "@/components/catalog/project-preview";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const project = await findPublishedCatalog((await params).slug);
  if (!project) notFound();
  const [t, locale] = await Promise.all([getTranslations("product"), getLocale()]);
  return { title: catalogText(project, t, "title", locale), description: catalogText(project, t, "summary", locale) };
}

export default async function CatalogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = await findPublishedCatalog((await params).slug);
  if (!project) notFound();
  const [t, locale] = await Promise.all([getTranslations("product"), getLocale()]);
  const session = await auth();
  const accountId = session?.user?.id ?? null;
  const saved = accountId ? await isFavorited(accountId, "PROJECT", project.slug) : false;
  const startHref = projectStartHref(project);
  const promptTemplate = project.workflowId && project.workflowId !== "resume-website" ? buildArtifactGenerationPrompt(
    project.workflowId,
    t("promptProjectPlaceholder"),
    FACT_FIELDS.map(({ key }) => ({
      key,
      value: t("promptFactPlaceholder", { field: t(`promptFields.${key}`) }),
      confirmation: "unconfirmed",
    })),
  ) : undefined;
  return <div className="ans-product-shell"><div className="ans-product-container py-10 sm:py-14">
    <Link href={`/explore?category=${project.category}`} className="ans-text-link mb-8 w-fit"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("back")}</Link>
    <section className="grid items-center gap-10 lg:grid-cols-2"><ProjectPreview project={project} large /><div><p className="ans-eyebrow">{t(`categories.${project.category}`)} / {t(`children.${project.subcategory}`)}</p><h1 className="mt-4 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{catalogText(project, t, "title", locale)}</h1><p className="mt-5 leading-8 text-muted-foreground">{catalogText(project, t, "summary", locale)}</p><div className="mt-6 flex gap-3 text-xs"><span className="ans-status">{t(project.workflowId ? "ready" : project.memberHref ? "realProject.member" : project.source === "official" ? "realProject.externalProduct" : "reference")}</span><span className="self-center text-muted-foreground">{t(catalogSourceLabel(project.source))}</span></div>{project.creator && <p className="mt-4 text-sm text-muted-foreground">{project.creator}</p>}<div className="mt-7 flex flex-wrap items-center gap-3"><FavoriteButton accountId={accountId} targetType="PROJECT" targetId={project.slug} initialFavorited={saved} />{startHref ? <Button asChild size="lg" className="rounded-full"><Link href={startHref}>{t("start")}<ArrowRight className="ms-2 h-4 w-4" aria-hidden="true" /></Link></Button> : project.sourceUrl ? <Button asChild variant="outline" size="lg"><a href={project.sourceUrl} target="_blank" rel="noopener noreferrer">{t(project.source === "official" ? "realProject.visitProduct" : "source")}<ExternalLink className="ms-2 h-4 w-4" aria-hidden="true" /></a></Button> : <p className="text-sm text-muted-foreground">{t("referenceRecipe")}</p>}</div>{startHref && <p className="mt-4 text-xs leading-6 text-muted-foreground">{t("cost", { points: PROJECT_WORKFLOW_COST_POINTS })} · {t("costNote")}</p>}</div></section>
    <section className="mt-12 grid gap-5 md:grid-cols-3">{(["output", "inputs", "decisions"] as const).map((part) => <div key={part} className="ans-detail-block"><Check className="h-5 w-5 text-primary" aria-hidden="true" /><h2 className="mt-4 text-lg font-semibold">{t(`${part}Title`)}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{catalogText(project, t, part, locale)}</p></div>)}</section>
    <section className="mt-12 max-w-4xl">
      <h2 className="text-2xl font-semibold">{t("recipeTitle")}</h2>
      
      <div className="mt-6 space-y-3">
        {(["model", "prompt", "skill"] as const).map((part) => (
          <details key={part} className="ans-recipe" open={part === "prompt"}>
            <summary className="cursor-pointer p-5 font-medium">{t(`${part}Title`)}</summary>
            <p className="px-5 pb-5 text-sm leading-7 text-muted-foreground">
              {project.content || part === "prompt" || project.source !== "official" ? catalogText(project, t, part, locale) : t(`${part}Body`)}
            </p>
          </details>
        ))}
        {promptTemplate && (
          <details className="ans-recipe" data-testid="generation-template">
            <summary className="cursor-pointer p-5 font-medium">{t("promptTemplateTitle")}</summary>
            <p className="px-5 pb-4 text-sm leading-7 text-muted-foreground">{t("promptTemplateNote")}</p>
            <pre className="mx-5 mb-5 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted p-4 text-xs leading-6" tabIndex={0}>{promptTemplate}</pre>
          </details>
        )}
      </div>
      {project.sourceUrl && (
        <div className="ans-detail-block mt-6">
          <h3 className="font-semibold">{t("sourceNote")}</h3>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{catalogText(project, t, "sourceNote", locale)}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
            <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer" className="ans-text-link">{t("source")}<ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
            {project.discoveryUrl && <a href={project.discoveryUrl} target="_blank" rel="noopener noreferrer" className="ans-text-link">{t("realProject.discovery")}<ExternalLink className="h-4 w-4" aria-hidden="true" /></a>}
            {project.licenseUrl && <a href={project.licenseUrl} target="_blank" rel="noopener noreferrer" className="ans-text-link">{t("license")}<ExternalLink className="h-4 w-4" aria-hidden="true" /></a>}
          </div>
        </div>
      )}
      {project.workflowId && <ol className="mt-8 grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((step) => <li key={step} className="border-t pt-4"><p className="text-sm font-semibold">{step}. {t(`steps.${step}.title`)}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{t(`steps.${step}.body`)}</p></li>)}</ol>}
    </section>
  </div></div>;
}
