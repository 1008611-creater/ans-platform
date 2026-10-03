import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { CopyTemplatePrompt } from "@/components/templates/template-actions";
import { TemplateRunForm } from "@/components/templates/template-run-form";
import { auth } from "@/lib/auth";
import { isFavorited } from "@/server/favorites/service";
import { getPublishedTemplate } from "@/lib/template-service";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, t] = await Promise.all([params, getTranslations("templates")]);
  const template = await getPublishedTemplate(slug, true);
  if (!template) notFound();
  const session = await auth();
  const favorited = session?.user?.id
    ? await isFavorited(session.user.id, "TEMPLATE", template.id)
    : false;
  return <article className="container max-w-4xl space-y-7 py-8 sm:py-12">
    <Link href="/templates" className="inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{t("detailsBack")}</Link>
    <header className="space-y-4 rounded-3xl border border-border bg-card p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2"><Badge variant="secondary">{t("published")}</Badge><Badge variant="outline">{t(({ TEXT: "outputText", IMAGE: "outputImage", VIDEO: "outputVideo", AUDIO: "outputAudio" } as const)[template.outputType])}</Badge></div>
      </div>
      <h1 className="break-words text-3xl font-bold tracking-tight sm:text-4xl">{template.title}</h1>
      {template.category && <p className="text-sm text-muted-foreground">{template.category.parent?.name ? `${template.category.parent.name} / ` : ""}{template.category.name}</p>}
      {template.summary && <p className="max-w-3xl text-base leading-7 text-muted-foreground">{template.summary}</p>}
      <FavoriteButton targetType="TEMPLATE" targetId={template.id} initialFavorited={favorited} />
    </header>
    {template.description && <section className="rounded-3xl border border-border bg-card p-5 sm:p-7"><h2 className="mb-3 text-lg font-semibold">{t("usage")}</h2><p className="whitespace-pre-wrap break-words leading-7 text-muted-foreground">{template.description}</p></section>}
    <section className="space-y-4 rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t("prompt")}</h2><CopyTemplatePrompt prompt={template.promptBody} /></div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border bg-muted/30 p-4 text-sm leading-7 sm:p-5">{template.promptBody}</pre>
    </section>
    {template.outputType === "TEXT" && <TemplateRunForm slug={template.slug} formSchema={template.formSchema as unknown as import("@/components/templates/template-run-form").RunFormField[]} estimatedCost={Math.max(1, template.estimatedCost)} />}
    <details className="rounded-2xl border border-border bg-card p-4"><summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("schema")}</summary><pre className="mt-4 overflow-x-auto text-xs">{JSON.stringify(template.formSchema, null, 2)}</pre></details>
  </article>;
}
