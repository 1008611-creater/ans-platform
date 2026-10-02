"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Overview = {
  rules: { id: string; key: string; title: string; description: string | null; amount: number; dailyLimit: number; active: boolean }[];
  grants: { id: string; ledgerId: string; amount: number; sourceType: string; sourceId: string; createdAt: Date; rule: { title: string }; user: { id: string; username: string; name: string | null } }[];
  appeals: { id: string; message: string; user: { id: string; username: string }; ledger: { id: string; amount: number; reason: string; note: string | null } }[];
  reviewCases: { id: string; reason: string; openedBy: { username: string }; ledger: { id: string; amount: number; reason: string; user: { id: string; username: string } } }[];
};

export function RewardGovernancePanel({ initial }: { initial: Overview }) {
  const [data, setData] = useState(initial);
  const [rule, setRule] = useState({ key: "", title: "", description: "", amount: "10", dailyLimit: "1" });
  const [grant, setGrant] = useState({ ruleId: "", userId: "", sourceType: "community_contribution", sourceId: "", note: "" });
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const [caseReasons, setCaseReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function send(url: string, body: unknown) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "操作失败。");
    return result.data;
  }
  async function refresh() {
    const response = await fetch("/api/admin/rewards", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "读取奖励数据失败。");
    setData(result.data);
  }
  async function act(key: string, operation: () => Promise<void>) {
    setBusy(key); setMessage(""); setError("");
    try { await operation(); setMessage("已保存。"); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "操作失败。"); }
    finally { setBusy(""); }
  }

  return <div className="space-y-8">
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-3"><header><h2 className="text-xl font-semibold">可配置奖励规则</h2><p className="text-sm text-muted-foreground">规则带每日上限；每次发奖都关联可追溯的贡献来源，重复来源会被拒绝。</p></header>
        {data.rules.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><div><h3 className="font-medium">{item.title} <span className="text-xs text-muted-foreground">{item.key}</span></h3><p className="text-sm text-muted-foreground">{item.amount} XP · 每人每日 {item.dailyLimit} 次 · {item.active ? "启用" : "停用"}</p><p className="text-xs text-muted-foreground">{item.description}</p></div><Button size="sm" variant="outline" disabled={busy === item.id} onClick={() => void act(item.id, async () => { await send("/api/admin/rewards", { ...item, active: !item.active }); })}>{item.active ? "停用" : "启用"}</Button></article>)}
      </div>
      <form className="h-fit space-y-3 rounded-2xl border bg-card p-5" onSubmit={(event) => { event.preventDefault(); void act("rule", async () => { await send("/api/admin/rewards", { ...rule, amount: Number(rule.amount), dailyLimit: Number(rule.dailyLimit), active: true }); setRule({ key: "", title: "", description: "", amount: "10", dailyLimit: "1" }); }); }}>
        <h2 className="text-lg font-semibold">新增或更新规则</h2><Input required placeholder="唯一键，例如 helpful_review" value={rule.key} onChange={(event) => setRule({ ...rule, key: event.target.value })}/><Input required placeholder="规则名称" value={rule.title} onChange={(event) => setRule({ ...rule, title: event.target.value })}/><Textarea placeholder="奖励触发说明" value={rule.description} onChange={(event) => setRule({ ...rule, description: event.target.value })}/><div className="grid grid-cols-2 gap-3"><Input required type="number" min={1} max={10000} aria-label="奖励 XP" value={rule.amount} onChange={(event) => setRule({ ...rule, amount: event.target.value })}/><Input required type="number" min={1} max={100} aria-label="每日次数上限" value={rule.dailyLimit} onChange={(event) => setRule({ ...rule, dailyLimit: event.target.value })}/></div><Button className="w-full" disabled={busy === "rule"}>保存规则</Button></form>
    </section>

    <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <form className="h-fit space-y-3 rounded-2xl border bg-card p-5" onSubmit={(event) => { event.preventDefault(); void act("grant", async () => { await send("/api/admin/rewards/grants", grant); setGrant({ ...grant, userId: "", sourceId: "", note: "" }); }); }}>
        <h2 className="text-lg font-semibold">发放社区贡献奖励</h2><select required aria-label="奖励规则" className="h-10 w-full rounded-md border bg-background px-3" value={grant.ruleId} onChange={(event) => setGrant({ ...grant, ruleId: event.target.value })}><option value="">选择规则</option>{data.rules.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.title} · {item.amount} XP</option>)}</select><Input required placeholder="用户 ID" value={grant.userId} onChange={(event) => setGrant({ ...grant, userId: event.target.value })}/><Input required placeholder="来源类型" value={grant.sourceType} onChange={(event) => setGrant({ ...grant, sourceType: event.target.value })}/><Input required placeholder="贡献记录 ID" value={grant.sourceId} onChange={(event) => setGrant({ ...grant, sourceId: event.target.value })}/><Input placeholder="发放说明" value={grant.note} onChange={(event) => setGrant({ ...grant, note: event.target.value })}/><Button className="w-full" disabled={busy === "grant" || !data.rules.some((item) => item.id === grant.ruleId && item.active)}>记账并发放</Button>
      </form>
      <div className="space-y-3"><header><h2 className="text-xl font-semibold">最近发放 · {data.grants.length}</h2><p className="text-sm text-muted-foreground">流水 ID 可用于风险复核；来源、规则和获奖用户都保留在账目中。</p></header>{data.grants.map((item) => <article key={item.id} className="space-y-2 rounded-xl border bg-card p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{item.rule.title} · {item.user.name || item.user.username} · +{item.amount} XP</p><time className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("zh-CN")}</time></div><p className="break-all text-xs text-muted-foreground">来源 {item.sourceType}/{item.sourceId} · 流水 {item.ledgerId}</p><div className="flex flex-wrap gap-2"><Input className="max-w-lg" placeholder="风险原因（至少 10 字）" value={caseReasons[item.ledgerId] ?? ""} onChange={(event) => setCaseReasons({ ...caseReasons, [item.ledgerId]: event.target.value })}/><Button size="sm" variant="outline" disabled={busy === item.ledgerId || (caseReasons[item.ledgerId] ?? "").trim().length < 10} onClick={() => void act(item.ledgerId, async () => { await send("/api/admin/rewards/reviews", { ledgerId: item.ledgerId, reason: caseReasons[item.ledgerId] }); })}>标记复核</Button></div></article>)}</div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2"><div className="space-y-3"><header><h2 className="text-xl font-semibold">待处理申诉 · {data.appeals.length}</h2></header>{data.appeals.map((item) => <article key={item.id} className="space-y-3 rounded-xl border bg-card p-4"><p className="text-sm">{item.user.username} · {item.ledger.reason} · {item.ledger.amount} XP</p><p className="whitespace-pre-wrap text-sm">{item.message}</p><Input type="number" min={-10000} max={10000} aria-label="申诉调整 XP" placeholder="调整 XP，默认 0" value={adjustments[item.id] ?? "0"} onChange={(event) => setAdjustments({ ...adjustments, [item.id]: event.target.value })}/><div className="flex gap-2"><Button disabled={busy === item.id} onClick={() => void act(item.id, async () => { await send(`/api/admin/rewards/appeals/${item.id}`, { decision: "approve", adjustment: Number(adjustments[item.id] ?? 0), resolution: "已复核原始贡献与发放账目。" }); })}>通过</Button><Button variant="outline" disabled={busy === item.id} onClick={() => void act(item.id, async () => { await send(`/api/admin/rewards/appeals/${item.id}`, { decision: "reject", resolution: "复核后原奖励记录符合当前规则。" }); })}>驳回</Button></div></article>)}{data.appeals.length === 0 && <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">没有待处理申诉。</p>}</div>
      <div className="space-y-3"><header><h2 className="text-xl font-semibold">反作弊复核 · {data.reviewCases.length}</h2><p className="text-sm text-muted-foreground">扣回操作会创建负向账本，并检查当前 XP 余额。</p></header>{data.reviewCases.map((item) => <article key={item.id} className="space-y-3 rounded-xl border bg-card p-4"><p className="text-sm">{item.ledger.user.username} · +{item.ledger.amount} XP · {item.openedBy.username} 提交</p><p className="text-sm">{item.reason}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy === item.id} onClick={() => void act(item.id, async () => { await send(`/api/admin/rewards/reviews/${item.id}`, { decision: "clear", resolution: "复核未发现违规，保留奖励。" }); })}>确认正常</Button><Button size="sm" variant="destructive" disabled={busy === item.id} onClick={() => void act(item.id, async () => { await send(`/api/admin/rewards/reviews/${item.id}`, { decision: "reverse", resolution: "复核确认重复或违规奖励，按账本扣回。" }); })}>确认违规并扣回</Button></div></article>)}{data.reviewCases.length === 0 && <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">没有待复核案件。</p>}</div></section>
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
