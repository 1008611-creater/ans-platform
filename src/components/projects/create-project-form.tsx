"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GOALS = [
  ["career", "求职项目"],
  ["contest", "比赛项目"],
  ["portfolio", "作品展示"],
] as const;

export function CreateProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState<(typeof GOALS)[number][0]>("career");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, goal }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? "创建失败。");
      router.push(`/projects/${payload.data.project.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "创建失败。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-2"><span className="text-sm font-medium">项目名称</span><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：校园二手教材流转" required /></label>
      <div className="flex flex-wrap gap-2">
        {GOALS.map(([value, label]) => <Button key={value} type="button" variant={goal === value ? "default" : "outline"} onClick={() => setGoal(value)}>{label}</Button>)}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "正在创建" : "创建项目"}</Button>
    </form>
  );
}
