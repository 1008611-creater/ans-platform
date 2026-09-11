import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TemplateActions } from "@/components/templates/template-actions";
import { TemplateReviewStatus } from "@/components/templates/template-review-status";
import { requireTemplateAuthor, TemplateError } from "@/lib/template-access";
import { canEditTemplate, listOwnTemplates } from "@/lib/template-service";

export const dynamic = "force-dynamic";
export const metadata = { title: "我的模板 · ANS" };
export default async function MyTemplatesPage() {
  let user;
  try { user = await requireTemplateAuthor(); } catch (error) {
    if (!(error instanceof TemplateError)) throw error;
    return <div className="container py-10"><h1 className="text-2xl font-bold">我的模板</h1><p className="my-4">{error.message}</p><Link href="/login" className="text-primary underline">前往登录</Link></div>;
  }
  const templates = await listOwnTemplates(user.id);
  return <div className="container space-y-6 py-10">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/templates" className="text-sm text-primary">返回模板广场</Link><h1 className="mt-2 text-3xl font-bold">我的模板</h1></div><Button asChild><Link href="/templates/new">创建草稿</Link></Button></header>
    <p className="text-sm text-muted-foreground">展示最近 100 个模板。草稿和驳回可编辑；待审正文冻结；已发布模板可另建修订草稿。AI 通过不代表已经上架。</p>
    {!templates.length && <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">还没有模板，先创建你的第一个草稿。</p>}
    <div className="grid gap-5 lg:grid-cols-2">{templates.map((template) => <Card key={template.id}>
      <CardHeader><CardTitle className="text-lg"><Link href={`/templates/mine/${template.id}`}>{template.title}</Link></CardTitle></CardHeader>
      <CardContent className="space-y-4"><TemplateReviewStatus status={template.status} reviewScore={template.reviewScore} reviewNote={template.reviewNote} />
        {canEditTemplate(template) && <><Button asChild variant="outline"><Link href={`/templates/mine/${template.id}`}>编辑草稿</Link></Button><TemplateActions id={template.id} mode="submit" /></>}
        {template.status === "PUBLISHED" && <><Link href={`/templates/${template.slug}`} className="block text-sm text-primary">查看公开详情</Link><TemplateActions id={template.id} mode="revise" /></>}
      </CardContent>
    </Card>)}</div>
  </div>;
}
