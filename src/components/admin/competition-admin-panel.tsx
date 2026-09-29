"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Competition = {
  id: string;
  title: string;
  organizer: string | null;
  url: string | null;
  description: string | null;
  rules: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxTeams: number | null;
  rewardXp: number;
  status: "UPCOMING" | "ONGOING" | "ENDED";
  _count: { teams: number };
};

type ReviewEntry = {
  id: string;
  competition: { id: string; title: string; rewardXp: number };
  team: { name: string };
  submissionVersion: { id: string; version: number; contentMarkdown: string; artifact: { title: string } } | null;
};

export function CompetitionAdminPanel({ initial, reviewQueue: initialQueue }: { initial: Competition[]; reviewQueue: ReviewEntry[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [queue, setQueue] = useState(initialQueue);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [awards, setAwards] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ title: "", organizer: "", description: "", rules: "", maxTeams: "", rewardXp: "0", status: "UPCOMING" as Competition["status"] });

  async function send(url: string, method: "POST" | "PATCH", body: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "保存失败。");
    return result.data;
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy("new"); setError(""); setMessage("");
    try {
      await send("/api/admin/competitions", "POST", { ...draft, maxTeams: draft.maxTeams ? Number(draft.maxTeams) : null, rewardXp: Number(draft.rewardXp) });
      setMessage("赛事已创建。");
      setDraft({ title: "", organizer: "", description: "", rules: "", maxTeams: "", rewardXp: "0", status: "UPCOMING" });
      router.refresh();
      const response = await fetch("/api/admin/competitions");
      const result = await response.json();
      if (result.ok) setItems(result.data.competitions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败。");
    } finally {
      setBusy("");
    }
  }

  async function setStatus(item: Competition, status: Competition["status"]) {
    setBusy(item.id); setError(""); setMessage("");
    try {
      const result = await send(`/api/admin/competitions/${item.id}`, "PATCH", { status });
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, ...result.competition } : row));
      setMessage("赛事状态已更新。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败。");
    } finally {
      setBusy("");
    }
  }

  async function review(entry: ReviewEntry, decision: "approve" | "reject") {
    setBusy(entry.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/competitions/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamCompetitionId: entry.id,
          decision,
          note: notes[entry.id] || (decision === "approve" ? "符合赛事提交要求" : "请根据评审意见修改后重新提交"),
          awardedXp: decision === "approve" ? Number(awards[entry.id] || 0) : 0,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "评审未完成。");
      setQueue((current) => current.filter((item) => item.id !== entry.id));
      setMessage("评审结果与奖励账目已保存。");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "评审未完成。");
    } finally {
      setBusy("");
    }
  }

  const set = (key: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setDraft((value) => ({ ...value, [key]: event.target.value }));

  return <div className="space-y-10">
    <section className="space-y-4">
      <div><h2 className="text-xl font-semibold">待评审作品 · {queue.length}</h2><p className="text-sm text-muted-foreground">评审会锁定提交版本，并将结果、贡献快照与 XP 发放记入账本。</p></div>
      {queue.map((entry) => <article key={entry.id} className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-primary">{entry.competition.title} · {entry.team.name}</p><h3 className="mt-1 font-semibold">{entry.submissionVersion?.artifact.title} · v{entry.submissionVersion?.version}</h3></div><span className="text-sm text-muted-foreground">赛事预算 {entry.competition.rewardXp} XP</span></div>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-4 text-xs leading-5">{entry.submissionVersion?.contentMarkdown}</pre>
        <Textarea rows={2} maxLength={2000} placeholder="评审意见" value={notes[entry.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [entry.id]: event.target.value }))}/>
        <div className="flex flex-wrap items-center gap-3"><Input aria-label="发放 XP" type="number" min={0} max={entry.competition.rewardXp} className="w-36" placeholder="奖励 XP" value={awards[entry.id] ?? "0"} onChange={(event) => setAwards((current) => ({ ...current, [entry.id]: event.target.value }))}/><Button disabled={busy === entry.id} onClick={() => review(entry, "approve")}>通过并发奖</Button><Button disabled={busy === entry.id} variant="outline" onClick={() => review(entry, "reject")}>退回修改</Button></div>
      </article>)}
      {queue.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">当前没有待评审作品。</div> : null}
      {message ? <p role="status" className="text-sm text-emerald-700">{message}</p> : null}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </section>

    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-4"><div><h2 className="text-xl font-semibold">赛事管理</h2><p className="text-sm text-muted-foreground">配置规则、名额和 XP 总预算；状态切换决定赛事是否接收报名。</p></div>
        {items.map((item) => <article key={item.id} className="space-y-3 rounded-2xl border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm text-muted-foreground">{item._count.teams} 支队伍 · {item.rewardXp} XP 总预算 · {item.maxTeams ?? "不限"} 个名额</p></div><select aria-label={`${item.title} 状态`} disabled={busy === item.id} className="h-9 rounded-md border bg-background px-2 text-sm" value={item.status} onChange={(event) => setStatus(item, event.target.value as Competition["status"])}><option value="UPCOMING">即将开始</option><option value="ONGOING">进行中</option><option value="ENDED">已结束</option></select></div><p className="line-clamp-2 text-sm text-muted-foreground">{item.description || "暂无赛事说明"}</p></article>)}
      </section>
      <form onSubmit={create} className="h-fit space-y-4 rounded-2xl border bg-card p-5"><div><h2 className="text-lg font-semibold">创建样板赛事</h2><p className="mt-1 text-sm text-muted-foreground">配置首条完整参赛链路。</p></div><Input required minLength={3} maxLength={120} placeholder="赛事名称" value={draft.title} onChange={set("title")}/><Input maxLength={120} placeholder="主办方" value={draft.organizer} onChange={set("organizer")}/><Textarea maxLength={2000} placeholder="赛事介绍" rows={3} value={draft.description} onChange={set("description")}/><Textarea maxLength={12000} placeholder="规则与提交要求" rows={5} value={draft.rules} onChange={set("rules")}/><div className="grid grid-cols-2 gap-3"><Input type="number" min={1} max={10000} placeholder="队伍名额" value={draft.maxTeams} onChange={set("maxTeams")}/><Input type="number" min={0} max={1000000} placeholder="XP 总预算" value={draft.rewardXp} onChange={set("rewardXp")}/></div><select aria-label="初始赛事状态" className="h-10 w-full rounded-md border bg-background px-3" value={draft.status} onChange={set("status")}><option value="UPCOMING">即将开始</option><option value="ONGOING">进行中</option></select><Button className="w-full" disabled={busy === "new"}>{busy === "new" ? "保存中…" : "创建赛事"}</Button>{message ? <p role="status" className="text-sm text-emerald-700">{message}</p> : null}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</form>
    </div>
  </div>;
}
