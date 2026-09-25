import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { CopyTemplatePrompt } from "@/components/templates/template-actions";
import { TemplateRunForm } from "@/components/templates/template-run-form";
import { auth } from "@/lib/auth";
import { isFavorited } from "@/server/favorites/service";
import { getPublishedTemplate } from "@/lib/template-service";

export const dynamic = "force-dynamic";
export default async function TemplateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = await getPublishedTemplate(slug, true);
  if (!template) notFound();
  const session = await auth();
  const favorited = session?.user?.id
    ? await isFavorited(session.user.id, "TEMPLATE", template.id)
    : false;
  return <article className="container max-w-4xl space-y-6 py-10">
    <Link href="/templates" className="text-sm text-primary">返回模板广场</Link>
    <header className="space-y-3"><div className="flex gap-2"><Badge variant="secondary">已发布</Badge><Badge variant="outline">{template.outputType}</Badge></div>
      <h1 className="text-3xl font-bold tracking-tight">{template.title}</h1>
      {template.category && <p className="text-sm text-muted-foreground">{template.category.parent?.name ? `${template.category.parent.name} / ` : ""}{template.category.name}</p>}
      {template.summary && <p className="text-muted-foreground">{template.summary}</p>}
      <FavoriteButton targetType="TEMPLATE" targetId={template.id} initialFavorited={favorited} />
    </header>
    {template.description && <section><h2 className="mb-3 text-lg font-semibold">使用说明</h2><p className="whitespace-pre-wrap break-words">{template.description}</p></section>}
    <section className="space-y-4"><h2 className="text-lg font-semibold">提示词正文</h2><CopyTemplatePrompt prompt={template.promptBody} />
      <pre className="whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-5 text-sm leading-7">{template.promptBody}</pre>
    </section>
    {template.outputType === "TEXT" && <TemplateRunForm slug={template.slug} formSchema={template.formSchema as unknown as import("@/components/templates/template-run-form").RunFormField[]} estimatedCost={Math.max(1, template.estimatedCost)} />}
    <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">查看输入字段定义</summary><pre className="mt-4 overflow-x-auto text-xs">{JSON.stringify(template.formSchema, null, 2)}</pre></details>
  </article>;
}
