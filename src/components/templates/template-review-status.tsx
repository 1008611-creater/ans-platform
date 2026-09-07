import { Badge } from "@/components/ui/badge";

const labels: Record<string, string> = { DRAFT: "草稿", PENDING: "待审", PUBLISHED: "已发布", REJECTED: "已驳回", ARCHIVED: "已归档" };
const verdicts: Record<string, string> = { PASS: "初审通过", BLOCKED: "未通过", UNAVAILABLE: "不可用" };
export function TemplateReviewStatus({ status, reviewScore, reviewNote }: { status: string; reviewScore: unknown; reviewNote: string | null }) {
  const score = reviewScore && typeof reviewScore === "object" && !Array.isArray(reviewScore) ? reviewScore as Record<string, unknown> : null;
  const verdict = typeof score?.verdict === "string" ? score.verdict : "";
  return <div className="space-y-2 text-sm">
    <div className="flex flex-wrap gap-2"><Badge variant="secondary">{labels[status] ?? status}</Badge>
      {verdict && <Badge variant="outline">AI {verdicts[verdict] ?? verdict}</Badge>}
    </div>
    {typeof score?.reason === "string" && <p className="whitespace-pre-wrap break-words text-muted-foreground">初审说明：{score.reason}</p>}
    {status === "PENDING" && !verdict && <p className="text-muted-foreground">正文已冻结；AI 初审尚未完成，请等待或由管理员复查。</p>}
    {reviewNote && <p className="whitespace-pre-wrap break-words">{status === "REJECTED" ? "驳回理由" : "复核说明"}：{reviewNote}</p>}
  </div>;
}
