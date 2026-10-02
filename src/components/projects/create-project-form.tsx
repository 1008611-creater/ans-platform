"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GOALS = [
  ["career", "求职项目"],
  ["contest", "比赛项目"],
  ["portfolio", "作品展示"],
] as const;

type ProjectGoal = (typeof GOALS)[number][0];
type TeamOption = { id: string; name: string; role: string };

export function CreateProjectForm({ initialGoal = "career" }: { initialGoal?: ProjectGoal }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState<ProjectGoal>(initialGoal);
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/teams").then((response) => response.json()).then((result) => {
      setTeams((result.teams ?? []).map((item: { team: TeamOption; role: string }) => ({ ...item.team, role: item.role })));
    }).catch(() => undefined);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, goal, ...(teamId ? { teamId } : {}) }),
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
        {GOALS.map(([value, label]) => <Button key={value} type="button" aria-pressed={goal === value} variant={goal === value ? "default" : "outline"} onClick={() => setGoal(value)}>{label}</Button>)}
      </div>
      {teams.length > 0 ? <label className="block space-y-2"><span className="text-sm font-medium">关联团队（可选）</span><select value={teamId} onChange={(event) => setTeamId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">仅自己</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><span className="text-xs text-muted-foreground">选择团队后，该团队的有效成员都可以协作此项目。</span></label> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "正在创建" : "创建项目"}</Button>
    </form>
  );
}
