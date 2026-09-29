"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Buttons for submitting, reviewing, publishing, and rejecting workflow versions. */
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
  /** Whether the AI review currently allows an admin to publish. */
  canPublish?: boolean;
  version?: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [submitUncertain, setSubmitUncertain] = useState(false);
  const [submissionAccepted, setSubmissionAccepted] = useState(false);

  async function reconcileSubmission() {
    try {
      const response = await fetch("/api/workflows/" + encodeURIComponent(slug) + "?scope=mine", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error("status lookup failed");
      const status = body?.data?.workflow?.status ?? body?.workflow?.status;
      if (status === "PENDING" || status === "PUBLISHED") {
        setSubmitUncertain(false);
        setSubmissionAccepted(true);
        setMessage("已确认提交成功，工作流状态：" + status + "。管理员复核通过后才能运行。");
        router.refresh();
        return;
      }
      if (status === "DRAFT" || status === "REJECTED") {
        setSubmitUncertain(false);
        setMessage("服务端显示尚未提交（" + status + "），现在可以安全重试。");
        return;
      }
      setSubmitUncertain(true);
      setMessage("无法确认提交状态。为避免重复提交，请先点击“重新查询状态”或刷新页面核对。");
    } catch {
      setSubmitUncertain(true);
      setMessage("提交结果和当前状态都无法确认。为避免重复提交，请先点击“重新查询状态”或刷新页面核对。");
    }
  }

  async function act(action: "submit" | "publish" | "reject" | "recheck") {
    setBusy(true);
    setMessage("");
    try {
      const isReview = action === "publish" || action === "reject";
      const url = mode === "review"
        ? "/api/admin/workflows/" + encodeURIComponent(slug) + "/" + (isReview ? "review" : "recheck")
        : "/api/workflows/" + encodeURIComponent(slug) + "/" + action;
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isReview ? { action, note } : version === undefined ? {} : { version }),
        });
      } catch (error) {
        if (action !== "submit") throw error;
        await reconcileSubmission();
        return;
      }
      const body = await response.json().catch(() => null);
      if (!response.ok && action === "submit" && response.status >= 500) {
        await reconcileSubmission();
        return;
      }
      if (!response.ok) throw new Error(body?.error?.message ?? "操作失败，请稍后重试。");
      if (action === "submit") {
        setSubmitUncertain(false);
        setSubmissionAccepted(true);
        setMessage("已提交审核，管理员复核通过后才能运行。");
      } else if (action === "recheck") {
        const review = body?.data?.review;
        setMessage("已重新完成 AI 初审：" + (review?.verdict ?? "未知") + "。" + (review?.reason ?? ""));
      } else if (action === "publish") {
        setMessage("已发布，现在可以运行这个工作流。");
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
    return <p className="text-sm text-muted-foreground">{"这是你创建的工作流，不能自审，请其他管理员处理。"}</p>;
  }

  return (
    <div className="space-y-3">
      {mode === "review" && (
        <label className="block space-y-2 text-sm">
          {"复核理由（必填）"}
          <Textarea maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {mode === "submit" && (
          <>
            <Button disabled={busy || submitUncertain || submissionAccepted} onClick={() => act("submit")}>
              {busy ? "正在提交…" : "提交审核"}
            </Button>
            {submitUncertain && (
              <Button variant="outline" disabled={busy} onClick={() => { setBusy(true); void reconcileSubmission().finally(() => setBusy(false)); }}>
                {"重新查询状态"}
              </Button>
            )}
          </>
        )}
        {mode === "publish" && <Button disabled={busy} onClick={() => act("publish")}>{busy ? "正在发布…" : "直接发布"}</Button>}
        {mode === "review" && (
          <>
            <Button disabled={busy || !canPublish || !note.trim()} onClick={() => act("publish")}>
              {"复核通过并发布"}
            </Button>
            <Button variant="destructive" disabled={busy || !note.trim()} onClick={() => act("reject")}>
              {"驳回"}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => act("recheck")}>
              {busy ? "处理中…" : "重新 AI 初审"}
            </Button>
          </>
        )}
      </div>
      {mode === "review" && !canPublish && (
        <p className="text-xs text-muted-foreground">
          {"尚未获得 AI 初审 PASS，发布已禁用。可点击“重新 AI 初审”重试，系统不会自动重试。"}
        </p>
      )}
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
