"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function TeamInviteActions({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "accept" | "decline") {
    setPending(action);
    setError(null);
    try {
      const response = await fetch("/api/teams/" + slug + "/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.message || "操作失败，请稍后重试");
        return;
      }
      router.refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => respond("accept")} disabled={pending !== null}>
          {pending === "accept" ? "加入中…" : "接受邀请"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => respond("decline")} disabled={pending !== null}>
          {pending === "decline" ? "处理中…" : "拒绝"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
