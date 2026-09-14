"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TeamDangerZone({
  slug,
  teamName,
  canDelete,
  canLeave,
}: {
  slug: string;
  teamName: string;
  canDelete: boolean;
  canLeave: boolean;
}) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    if (!window.confirm("确定退出该团队？退出后需要重新被邀请才能加入。")) return;
    setPending("leave");
    setError(null);
    try {
      const response = await fetch("/api/teams/" + slug + "/leave", { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.message || "退出失败");
        return;
      }
      router.push("/teams");
      router.refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    setPending("delete");
    setError(null);
    try {
      const response = await fetch("/api/teams/" + slug, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.message || "解散失败");
        return;
      }
      router.push("/teams");
      router.refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setPending(null);
    }
  }

  if (!canDelete && !canLeave) return null;

  return (
    <section className="space-y-3 rounded-lg border border-destructive/40 p-4">
      <h2 className="text-sm font-semibold text-destructive">危险操作</h2>
      {canLeave ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">退出后需重新被邀请才能加入。</span>
          <Button size="sm" variant="outline" onClick={leave} disabled={pending !== null}>
            {pending === "leave" ? "处理中…" : "退出团队"}
          </Button>
        </div>
      ) : null}
      {canDelete ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            解散会移除团队与成员关系，且不可恢复。请输入团队全名 <span className="font-medium text-foreground">{teamName}</span> 确认。
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="confirm-team-name">团队全名</Label>
              <Input
                id="confirm-team-name"
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                placeholder={teamName}
              />
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={remove}
              disabled={pending !== null || confirmName.trim() !== teamName}
            >
              {pending === "delete" ? "解散中…" : "解散团队"}
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    </section>
  );
}
