import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Blocks, Search, Sparkles } from "lucide-react";
import { countPublishedTemplates, listPublishedTemplates, templateCategories } from "@/lib/template-service";
import { TemplateFilters } from "@/components/templates/template-filters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("templates");
  return { title: t("metadataTitle"), description: t("metadataDescription") };
}

export const dynamic = "force-dynamic";
const PAGE_SIZE = 24;
type SearchParams = Promise<{ domain?: string; scene?: string; page?: string; q?: string }>;

function getFieldLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((field) => {
    if (typeof field !== "object" || field === null || !("label" in field)) return [];
    const label = field.label;
    return typeof label === "string" && label.trim() ? [label] : [];
  });
}

export default async function TemplatesPage({ searchParams }: { searchParams: SearchParams }) {
  const [filters, t, locale] = await Promise.all([searchParams, getTranslations("templates"), getLocale()]);
  const domain = typeof filters.domain === "string" ? filters.domain : undefined;
  const scene = typeof filters.scene === "string" ? filters.scene : undefined;
  const query = typeof filters.q === "string" ? filters.q.trim().slice(0, 120) : undefined;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(filters.page) || 1)));
  const filterState = { domain, scene, query };
  let domains: Awaited<ReturnType<typeof templateCategories>> = [];
  let templates: Awaited<ReturnType<typeof listPublishedTemplates>> = [];
  let total = 0;
  let loadFailed = false;
  try {
    [domains, templates, total] = await Promise.all([
      templateCategories(), listPublishedTemplates({ ...filterState, page }), countPublishedTemplates(filterState),
    ]);
  } catch {
    loadFailed = true;
  }
  const pageHref = (next: number) => {
    const params = new URLSearchParams();
    if (domain) params.set("domain", domain);
    if (scene) params.set("scene", scene);
    if (query) params.set("q", query);
    params.set("page", String(next));
    return `/templates?${params.toString()}`;
  };
  const formatNumber = new Intl.NumberFormat(locale);
  const hasNext = page * PAGE_SIZE < total;

  return (
    <div className="min-h-screen overflow-x-clip bg-stone-50 text-foreground dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-8 sm:px-6 lg:px-10 lg:pt-12">
        <section aria-labelledby="templates-title" className="relative overflow-hidden rounded-[2rem] border border-stone-200 bg-[#f0f0df] px-6 py-8 dark:border-zinc-800 dark:bg-zinc-900 sm:px-10 sm:py-10 lg:px-14 lg:py-14">
          <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-20 z-0 h-64 w-64 rounded-full border-[36px] border-lime-300/50 dark:border-lime-300/15 sm:right-8 sm:top-[-7rem] sm:h-[26rem] sm:w-[26rem] sm:border-[64px]" />
          <div className="relative z-10 grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white/70 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-zinc-800 dark:border-white/10 dark:bg-zinc-950/50 dark:text-zinc-100">
                <Blocks aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{t("eyebrow")}</span>
              </div>
              <h1 id="templates-title" className="max-w-3xl text-balance text-4xl font-black leading-[1.04] tracking-[-0.045em] text-zinc-950 dark:text-white sm:text-5xl lg:text-6xl">{t("title")}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-700 dark:text-zinc-300 sm:text-lg">{t("description")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full bg-zinc-950 px-6 text-white hover:bg-zinc-800 dark:bg-lime-300 dark:text-zinc-950 dark:hover:bg-lime-200">
                  <a href="#template-list">{t("preview")} <ArrowDownRight aria-hidden="true" className="ms-2 h-4 w-4" /></a>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full border-zinc-900/20 bg-white/60 px-6 text-zinc-950 hover:bg-white dark:border-white/20 dark:bg-zinc-950/40 dark:text-white dark:hover:bg-zinc-900">
                  <Link href="/templates/new">{t("create")} <ArrowUpRight aria-hidden="true" className="ms-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </div>

            <ol aria-label={t("eyebrow")} className="relative grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {["stepDiscover", "stepInputs", "stepCreate"].map((key, index) => (
                <li key={key} className="flex min-h-20 items-center gap-4 rounded-2xl border border-zinc-900/10 bg-white/75 p-4 dark:border-white/10 dark:bg-zinc-950/50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-300 text-sm font-black text-zinc-950">0{index + 1}</span>
                  <span className="text-sm font-semibold leading-5 text-zinc-900 dark:text-zinc-100">{t(key)}</span>
                  {index < 2 && <ArrowRight aria-hidden="true" className="ms-auto hidden h-4 w-4 text-zinc-400 lg:block" />}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="template-list" aria-labelledby="template-list-title" className="scroll-mt-8 pt-10 sm:pt-14">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("eyebrow")}</p>
              <h2 id="template-list-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{t("preview")}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full"><Link href="/templates/mine">{t("mine")}</Link></Button>
              <Button asChild size="sm" className="rounded-full"><Link href="/templates/new"><Sparkles aria-hidden="true" className="me-2 h-3.5 w-3.5" />{t("create")}</Link></Button>
            </div>
          </div>

          {!loadFailed && <TemplateFilters key={`${domain ?? ""}/${scene ?? ""}/${query ?? ""}`} domains={domains} initialDomain={domain} initialScene={scene} initialQuery={query} />}
          {!loadFailed && <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 text-sm text-muted-foreground">
            <p aria-live="polite"><span className="font-semibold tabular-nums text-foreground">{formatNumber.format(total)}</span> {t("results")}</p>
            <p>{t("newest")}</p>
          </div>}

          {loadFailed ? (
            <Card role="alert" className="rounded-3xl border-dashed bg-card/70">
              <CardContent className="flex flex-col items-center px-6 py-14 text-center">
                <h3 className="text-lg font-semibold">{t("loadErrorTitle")}</h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{t("loadErrorDescription")}</p>
                <Button asChild variant="outline" className="mt-5 rounded-full"><Link href="/templates">{t("retry")}</Link></Button>
              </CardContent>
            </Card>
          ) : templates.length === 0 ? (
            <Card className="rounded-3xl border-dashed bg-card/70">
              <CardContent className="flex flex-col items-center px-6 py-14 text-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted"><Search aria-hidden="true" className="h-6 w-6 text-muted-foreground" /></span>
                <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{t("emptyDescription")}</p>
                <Button asChild variant="outline" className="mt-5 rounded-full"><Link href="/templates">{t("clear")}</Link></Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map((template, index) => {
                const labels = getFieldLabels(template.formSchema);
                const shownLabels = labels.slice(0, 3);
                const outputKey = { TEXT: "outputText", IMAGE: "outputImage", VIDEO: "outputVideo", AUDIO: "outputAudio" }[template.outputType] as "outputText" | "outputImage" | "outputVideo" | "outputAudio";
                return (
                  <article key={template.id} className="group min-w-0">
                    <Link href={`/templates/${template.slug}`} className="flex h-full flex-col rounded-3xl border border-border bg-card p-5 shadow-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-lime-500/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-6">
                      <div className={`mb-5 flex min-h-36 flex-col justify-between overflow-hidden rounded-2xl border border-border/70 p-4 ${index % 3 === 1 ? "bg-violet-50 dark:bg-violet-950/30" : index % 3 === 2 ? "bg-sky-50 dark:bg-sky-950/30" : "bg-lime-50 dark:bg-lime-950/25"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <Badge variant="secondary" className="max-w-[75%] truncate bg-background/80">{template.category?.name ?? t("unknownCategory")}</Badge>
                          <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs font-medium">{t(outputKey)}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2" aria-label={t("inputs")}>
                          {shownLabels.length > 0 ? shownLabels.map((label, fieldIndex) => (
                            <span key={`${label}-${fieldIndex}`} className="max-w-full truncate rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-xs text-foreground">{label}</span>
                          )) : <span className="rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-xs text-muted-foreground">{t("noInputs")}</span>}
                          {labels.length > shownLabels.length && <span className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-semibold text-white dark:bg-lime-300 dark:text-zinc-950">+{formatNumber.format(labels.length - shownLabels.length)}</span>}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col">
                        <h3 className="line-clamp-2 text-lg font-bold leading-6 tracking-tight group-hover:text-primary">{template.title}</h3>
                        <p className="mt-2 line-clamp-3 min-h-[4.5rem] break-words text-sm leading-6 text-muted-foreground">{template.summary || t("description")}</p>
                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                          <span className="text-xs text-muted-foreground">{t("inputs")}: {formatNumber.format(labels.length)}</span>
                          <span className="inline-flex items-center gap-1 text-sm font-semibold">{t("details")} <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}

          {(page > 1 || hasNext) && <nav aria-label={t("preview")} className="mt-8 flex items-center justify-between gap-4">
            {page > 1 ? <Button asChild variant="outline" className="rounded-full"><Link href={pageHref(page - 1)}><ArrowLeft aria-hidden="true" className="me-2 h-4 w-4" />{t("previous")}</Link></Button> : <span />}
            <span aria-live="polite" className="text-sm text-muted-foreground">{t("page", { page: formatNumber.format(page) })}</span>
            {hasNext ? <Button asChild variant="outline" className="rounded-full"><Link href={pageHref(page + 1)}>{t("next")}<ArrowRight aria-hidden="true" className="ms-2 h-4 w-4" /></Link></Button> : <span />}
          </nav>}
        </section>
      </div>
    </div>
  );
}
