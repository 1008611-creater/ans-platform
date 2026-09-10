import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTemplateAuthor, TemplateError } from "@/lib/template-access";
import { templateCategories } from "@/lib/template-service";
import { TemplateForm } from "@/components/templates/template-form";
import { TemplateReviewStatus } from "@/components/templates/template-review-status";
import { TemplateActions } from "@/components/templates/template-actions";

export const dynamic = "force-dynamic";
export default async function OwnTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireTemplateAuthor(); } catch (error) {
    if (!(error instanceof TemplateError)) throw error;
    return <div className="container py-10"><p>{error.message}</p><Link href="/login" className="text-primary underline">前往登录</Link></div>;
  }
  const { id } = await params;
  const template = await db.template.findFirst({ where: { id, authorId: user.id } });
  if (!template) notFound();
  const verdict = template.reviewScore && typeof template.reviewScore === "object" && !Array.isArray(template.reviewScore) ? (template.reviewScore as { verdict?: string }).verdict : undefined;
  const canEdit = template.status === "DRAFT" || template.status === "REJECTED" || (template.status === "PENDING" && verdict === "BLOCKED");
  return <div className="container space-y-6 py-10"><Link href="/templates/mine" className="text-sm text-primary">返回我的模板</Link>
    <h1 className="text-3xl font-bold">{template.title}</h1>
    <TemplateReviewStatus status={template.status} reviewScore={template.reviewScore} reviewNote={template.reviewNote} />
    {canEdit ? <TemplateForm template={template} categories={await templateCategories()} /> : <>
      <pre className="whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-5 text-sm">{template.promptBody}</pre>
      {template.status === "PUBLISHED" && <TemplateActions id={id} mode="revise" />}
    </>}
  </div>;
}
