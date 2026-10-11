"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function TemplateActions({ id, mode, canPublish = false, selfReview = false }: { id: string; mode: "submit" | "revise" | "review"; canPublish?: boolean; selfReview?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  async function act(action: "submit" | "revise" | "publish" | "reject" | "recheck") {
    setBusy(true); setMessage("");
    try {
      const isReview = action === "publish" || action === "reject";
      const url = mode === "review" ? `/api/admin/templates/${id}/${isReview ? "review" : "recheck"}` : `/api/templates/${id}/${action}`;
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isReview ? { action, note } : {}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "操作失败");
      if (action === "revise") router.push(`/templates/mine/${data.template.id}`);
      else if (action === "submit" || action === "recheck") setMessage(`已保持待审。${data.template.reviewScore?.reason ?? "等待 AI 初审"}`);
      else setMessage(action === "publish" ? "已完成复核并发布" : "已驳回，作者可修改后重新提交");
      router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "操作失败，请稍后重试"); }
    finally { setBusy(false); }
  }
  if (selfReview) return <p className="text-sm text-muted-foreground">这是你创建的模板，不能自审，请其他管理员处理。</p>;
  return <div className="space-y-3">
    {mode === "review" && <label className="block space-y-2 text-sm">人工复核理由（必填）<Textarea maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>}
    <div className="flex flex-wrap gap-2">
      {mode === "submit" && <Button disabled={busy} onClick={() => act("submit")}>{busy ? "正在提交与初审…" : "提交审核"}</Button>}
      {mode === "revise" && <Button variant="outline" disabled={busy} onClick={() => act("revise")}>另建修订草稿</Button>}
      {mode === "review" && <>
        <Button disabled={busy || !canPublish || !note.trim()} onClick={() => act("publish")}>复核通过并发布</Button>
        <Button variant="destructive" disabled={busy || !note.trim()} onClick={() => act("reject")}>驳回</Button>
        <Button variant="outline" disabled={busy} onClick={() => act("recheck")}>{busy ? "处理中…" : "重新 AI 初审"}</Button>
      </>}
    </div>
    {mode === "review" && !canPublish && <p className="text-xs text-muted-foreground">尚未获得 AI PASS，发布已禁用。初审失败可人工点击复查，不会自动重试。</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}

export function CopyTemplatePrompt({ prompt }: { prompt: string }) {
  const t = useTranslations("templates");
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setMessage(t("promptCopied"));
    } catch {
      setMessage(t("copyFailed"));
    }
  }
  return <div className="flex flex-wrap items-center gap-3"><Button onClick={copy}>{t("copyPrompt")}</Button><span role="status" className="text-sm text-muted-foreground">{message}</span></div>;
}
