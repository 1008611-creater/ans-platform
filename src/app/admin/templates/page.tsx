import Link from "next/link";
import { requireTemplateAdmin, TemplateError } from "@/lib/template-access";
import { listTemplateQueue } from "@/lib/template-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateActions } from "@/components/templates/template-actions";
import { TemplateReviewStatus } from "@/components/templates/template-review-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "模板审核队列 · ANS" };
export default async function TemplateQueuePage() {
  let admin;
  try { admin = await requireTemplateAdmin(); } catch (error) {
    if (!(error instanceof TemplateError)) throw error;
    return <div className="container py-10"><h1 className="text-2xl font-bold">模板审核队列</h1><p className="mt-4">{error.message}</p></div>;
  }
  const templates = await listTemplateQueue();
  return <div className="container max-w-5xl space-y-6 py-10">
    <Link href="/admin" className="text-sm text-primary">返回管理后台</Link><h1 className="text-3xl font-bold">模板审核队列</h1>
    <p className="text-sm text-muted-foreground">按待审更新时间展示前 100 项。先 AI 初审、后人工复核，不得自审。AI 不可用或未通过时不能发布；当前发布不发放经验奖励。</p>
    {!templates.length && <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">暂无待审模板。</p>}
    {templates.map((template) => {
      const score = template.reviewScore;
      const canPublish = Boolean(score && typeof score === "object" && !Array.isArray(score) && score.verdict === "PASS" && score.source === "AI" && score.pass === true);
      return <Card key={template.id}><CardHeader><CardTitle>{template.title}</CardTitle><p className="text-sm text-muted-foreground">作者：{template.author.username} · 分类：{template.category?.name ?? "未分类"}</p></CardHeader>
        <CardContent className="space-y-5"><TemplateReviewStatus status={template.status} reviewScore={score} reviewNote={template.reviewNote} />
          {template.summary && <p className="whitespace-pre-wrap break-words text-sm">摘要：{template.summary}</p>}
          {template.description && <p className="whitespace-pre-wrap break-words text-sm">说明：{template.description}</p>}
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-4 text-sm">{template.promptBody}</pre>
          <details><summary className="cursor-pointer text-sm">输入字段和 AI 审核记录</summary><pre className="mt-3 overflow-x-auto text-xs">{JSON.stringify({ outputType: template.outputType, formSchema: template.formSchema, reviewScore: score }, null, 2)}</pre></details>
          <TemplateActions id={template.id} mode="review" canPublish={canPublish} selfReview={admin.userId === template.authorId} />
        </CardContent></Card>;
    })}
  </div>;
}
