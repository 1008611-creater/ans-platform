import { Badge } from "@/components/ui/badge";

const statusLabels: Record<string, string> = {
  DRAFT: "草稿",
  PENDING: "待审",
  PUBLISHED: "已发布",
  REJECTED: "已驳回",
  ARCHIVED: "已归档",
};

const verdictLabels: Record<string, string> = {
  PASS: "初审通过",
  BLOCKED: "初审未通过",
  UNAVAILABLE: "初审未产出结论",
};

const unavailableLabels: Record<string, string> = {
  NOT_CONFIGURED: "服务端未配置 AI 初审",
  REQUEST_FAILED: "初审服务请求失败",
  INVALID_RESPONSE: "初审返回格式异常",
  TIMEOUT: "初审超时",
};

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readScores(value: unknown) {
  const scores = readRecord(value);
  if (!scores) return null;
  const entries = ["compliance", "quality", "intent"]
    .map((key) => (typeof scores[key] === "number" ? `${key} ${scores[key] as number}` : null))
    .filter((item): item is string => item !== null);
  return entries.length > 0 ? entries.join(" · ") : null;
}

/**
 * 工作流审核状态展示。
 *
 * 同时呈现 AI 初审结论与人工复核理由：审核者需要看到「AI 说了什么」
 * 和「上一位管理员怎么判的」，作者也需要知道自己卡在哪一步。
 */
export function WorkflowReviewStatus({
  status,
  reviewScore,
  reviewNote,
}: {
  status: string;
  reviewScore: unknown;
  reviewNote: string | null;
}) {
  const score = readRecord(reviewScore);
  const verdict = typeof score?.verdict === "string" ? score.verdict : "";
  const reason = typeof score?.reason === "string" ? score.reason : "";
  const model = typeof score?.model === "string" ? score.model : "";
  const checkedAt = typeof score?.checkedAt === "string" ? score.checkedAt : "";
  const unavailable =
    typeof score?.unavailableReason === "string"
      ? (unavailableLabels[score.unavailableReason] ?? score.unavailableReason)
      : "";
  const scores = readScores(score?.scores);

  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{statusLabels[status] ?? status}</Badge>
        {verdict && <Badge variant="outline">AI {verdictLabels[verdict] ?? verdict}</Badge>}
        {unavailable && <Badge variant="outline">{unavailable}</Badge>}
      </div>
      {scores && <p className="text-muted-foreground">初审评分：{scores}</p>}
      {reason && (
        <p className="whitespace-pre-wrap break-words text-muted-foreground">初审说明：{reason}</p>
      )}
      {(model || checkedAt) && (
        <p className="text-xs text-muted-foreground">
          {model && <>初审模型 {model}</>}
          {model && checkedAt && " · "}
          {checkedAt && <>初审时间 {checkedAt}</>}
        </p>
      )}
      {status === "PENDING" && !verdict && (
        <p className="text-muted-foreground">
          定义已冻结；AI 初审尚未完成，请等待或由管理员重新发起初审。
        </p>
      )}
      {reviewNote && (
        <p className="whitespace-pre-wrap break-words">
          {status === "REJECTED" ? "驳回理由" : "复核说明"}：{reviewNote}
        </p>
      )}
    </div>
  );
}
