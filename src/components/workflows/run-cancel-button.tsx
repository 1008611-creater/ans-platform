"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 取消一次排队中或执行中的运行。
 *
 * 服务端只允许从 QUEUED / RUNNING 转 CANCELLED，并会把已扣的算力退回，
 * 因此这里在成功后刷新页面即可看到最新状态。
 */
export function RunCancelButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function cancel() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/workflows/runs/${runId}/cancel`, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "取消失败，请稍后重试。");
      setMessage("已取消，额度已退回。");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "取消失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={cancel}>
        {busy ? <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" /> : <XCircle className="me-1.5 h-3.5 w-3.5" />}
        {busy ? "正在取消…" : "取消运行"}
      </Button>
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
