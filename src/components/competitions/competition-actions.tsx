"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Team = { id: string; name: string; slug: string; role: string };
type Project = { id: string; title: string; teamId: string | null; artifacts: Array<{ title: string; versions: Array<{ id: string; version: number; markdown: string }> }> };

async function requestJson(url: string, body?: unknown) {
  const response = await fetch(url, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? {} : { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "操作失败，请稍后重试。");
  return result.data;
}

export function CompetitionActions({ competitionId, teams: initialTeams, entryStatus, registeredTeamId }: { competitionId: string; teams: Team[]; entryStatus: string | null; registeredTeamId: string | null }) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamId, setTeamId] = useState(registeredTeamId ?? "");
  const [projectId, setProjectId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [summary, setSummary] = useState("");
  const [publicConsent, setPublicConsent] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([requestJson("/api/teams"), requestJson("/api/projects")]).then(([teamResult, projectResult]) => {
      if (!active) return;
      const available = (teamResult.teams ?? []).map((item: { team: Team; role: string }) => ({ ...item.team, role: item.role }));
      setTeams(available.filter((item: Team) => ["OWNER", "ADMIN"].includes(item.role)));
      setProjects(projectResult.projects ?? []);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "数据加载失败，请刷新重试。"); });
    return () => { active = false; };
  }, []);

  const selectedProject = projects.find((project) => project.id === projectId);
  const versions = useMemo(() => selectedProject?.artifacts.flatMap((artifact) => artifact.versions.map((version) => ({ ...version, title: artifact.title }))) ?? [], [selectedProject]);

  async function perform(label: string, action: () => Promise<unknown>) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(label); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "操作失败，请稍后重试。"); }
    finally { setBusy(false); }
  }

  const canRegister = !entryStatus;
  const canSubmit = entryStatus && !["SUBMITTED", "APPROVED"].includes(entryStatus);

  return <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
    <div><h2 className="text-lg font-semibold">完成这场赛事</h2><p className="mt-1 text-sm text-muted-foreground">每次操作都会更新你的唯一下一步。报名由队长或队伍管理员发起，提交会锁定具体作品版本。</p></div>
    {canRegister ? <><label className="block space-y-1.5 text-sm"><span>参赛队伍</span><select className="h-10 w-full rounded-md border bg-background px-3" value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">选择队伍</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name} · {team.role === "OWNER" ? "队长" : "管理员"}</option>)}</select></label>{teamId ? <Button disabled={busy} variant="secondary" className="w-full" onClick={() => perform("报名成功，下一步是创建项目。", () => requestJson(`/api/competitions/${competitionId}/register`, { teamId }))}>立即报名</Button> : null}{teams.length === 0 ? <p className="text-sm text-muted-foreground">还没有可报名的队伍。先去<Link className="underline underline-offset-4" href="/teams">创建或加入队伍</Link>，再回来报名。</p> : null}</> : null}
    {canSubmit ? <div className="space-y-3 border-t pt-4"><h3 className="font-medium">提交指定作品版本</h3><label className="block space-y-1.5 text-sm"><span>团队项目</span><select className="h-10 w-full rounded-md border bg-background px-3" value={projectId} onChange={(event) => { setProjectId(event.target.value); setVersionId(""); setPublicConsent(false); }}><option value="">选择团队项目</option>{projects.filter((project) => project.teamId === teamId && project.artifacts.some((artifact) => artifact.versions.length > 0)).map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label className="block space-y-1.5 text-sm"><span>指定作品版本</span><select className="h-10 w-full rounded-md border bg-background px-3" value={versionId} onChange={(event) => { setVersionId(event.target.value); setPublicConsent(false); }}><option value="">选择版本</option>{versions.map((version) => <option key={version.id} value={version.id}>{version.title} · v{version.version}</option>)}</select></label><label className="block space-y-1.5 text-sm"><span>作品说明（至少 20 字）</span><Textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={3000} rows={4} placeholder="介绍团队做了什么、如何完成、作品有什么价值。" /></label><label className="flex items-start gap-3 rounded-lg border p-3 text-sm leading-6"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" checked={publicConsent} onChange={(event) => setPublicConsent(event.target.checked)} /><span>公开展示授权（可选）：我同意将所选的 <strong>{versions.find((version) => version.id === versionId)?.title ?? "作品"} v{versions.find((version) => version.id === versionId)?.version ?? "—"}</strong> 版本在审核通过后展示在作品广场；之后可以撤回授权。</span></label><Button disabled={busy || !teamId || !projectId || !versionId || summary.trim().length < 20} className="w-full" onClick={() => perform("作品已提交，等待审核。", () => requestJson(`/api/competitions/${competitionId}/submission`, { teamId, projectId, artifactVersionId: versionId, summary, publicConsent }))}>{entryStatus === "REJECTED" ? "修改后重新提交" : "提交并申请展示"}</Button></div> : null}
    {entryStatus === "SUBMITTED" ? <p className="rounded-xl bg-muted/50 p-4 text-sm leading-6">作品已提交，正在等待审核。审核完成前不能重复提交。</p> : null}
    {entryStatus === "APPROVED" ? <p className="rounded-xl bg-muted/50 p-4 text-sm leading-6">作品已通过审核。页面会根据具体版本的公开授权显示展示状态。</p> : null}
    {notice ? <p role="status" className="text-sm text-emerald-700">{notice}</p> : null}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  </section>;
}
