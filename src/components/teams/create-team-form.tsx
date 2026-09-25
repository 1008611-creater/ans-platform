"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const NAME_MAX = 40;
const DESCRIPTION_MAX = 500;

export function CreateTeamForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.message || "创建失败，请稍后重试");
        return;
      }
      setName("");
      setDescription("");
      setOpen(false);
      router.push("/teams/" + payload.team.slug);
      router.refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        创建团队
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full space-y-3 rounded-lg border p-4 text-start">
      <div className="space-y-1.5">
        <Label htmlFor="team-name">团队名称</Label>
        <Input
          id="team-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={NAME_MAX}
          required
          placeholder="例如：北京高校 AIGC 小队"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="team-description">团队简介（选填）</Label>
        <Textarea
          id="team-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={DESCRIPTION_MAX}
          rows={3}
          placeholder="一句话说明团队方向、参赛目标"
        />
      </div>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "创建中…" : "确认创建"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          取消
        </Button>
      </div>
    </form>
  );
}
