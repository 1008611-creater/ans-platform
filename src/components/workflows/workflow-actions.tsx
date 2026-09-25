"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * 工作流状态流转按钮。
 *
 * - `submit`：作者提交审核（DRAFT / REJECTED → PENDING）
 * - `publish`：作者直接发布自己的版本
 * - `review`：管理员复核，发布或驳回，理由必填；可重新发起 AI 初审
 */
export function WorkflowActions({
  slug,
  mode,
  selfReview = false,
  canPublish = false,
  version,
}: {
  slug: string;
  mode: "submit" | "publish" | "review";
  selfReview?: boolean;
  /** 管理员复核时是否已满足 AI 初审要求，未满足则禁用发布。 */
  canPublish?: boolean;
  version?: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");

  async function act(action: "submit" | "publish" | "reject" | "recheck") {
    setBusy(true);
    setMessage("");
    try {
      const isReview = action === "publish" || action === "reject";
      const url =
        mode === "review"
          ? `/api/admin/workflows/${slug}/${isReview ? "review" : "recheck"}`
          : `/api/workflows/${slug}/${action}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isReview ? { action, note } : version === undefined ? {} : { version },
        ),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "操作失败，请稍后重试。");
      if (action === "submit") {
        setMessage("已提交审核并完成 AI 初审，管理员复核通过后会出现在工作流广场。");
      } else if (action === "recheck") {
        const review = body?.data?.review;
        setMessage(`已重新完成 AI 初审：${review?.verdict ?? "未知"}。${review?.reason ?? ""}`);
      } else if (action === "publish") {
        setMessage("已发布，学生现在可以运行这个工作流。");
      } else {
        setMessage("已驳回，作者可以修改后重新提交。");
      }
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "操作失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  if (selfReview) {
    return <p className="text-sm text-muted-foreground">这是你创建的工作流，不能自审，请其他管理员处理。</p>;
  }

  return (
    <div className="space-y-3">
      {mode === "review" && (
        <label className="block space-y-2 text-sm">
          复核理由（必填）
          <Textarea maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {mode === "submit" && (
          <Button disabled={busy} onClick={() => act("submit")}>
            {busy ? "正在提交…" : "提交审核"}
          </Button>
        )}
        {mode === "publish" && (
          <Button disabled={busy} onClick={() => act("publish")}>
            {busy ? "正在发布…" : "直接发布"}
          </Button>
        )}
        {mode === "review" && (
          <>
            <Button disabled={busy || !canPublish || !note.trim()} onClick={() => act("publish")}>
              复核通过并发布
            </Button>
            <Button variant="destructive" disabled={busy || !note.trim()} onClick={() => act("reject")}>
              驳回
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => act("recheck")}>
              {busy ? "处理中…" : "重新 AI 初审"}
            </Button>
          </>
        )}
      </div>
      {mode === "review" && !canPublish && (
        <p className="text-xs text-muted-foreground">
          尚未获得 AI 初审 PASS，发布已禁用。可点击「重新 AI 初审」重试，系统不会自动重试。
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
