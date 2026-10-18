"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { benefitReviewSchema, type AdminComputeBenefitsList, type AdminBenefitApplication } from "@/contracts/compute-benefits";

export function AdminComputeBenefits({ actorId, initialData }: { actorId: string; initialData?: AdminComputeBenefitsList | null }) {
  return <AccountContentBoundary actorId={actorId}><AdminBenefitsSession key={actorId} actorId={actorId} initialData={initialData} /></AccountContentBoundary>;
}
function AdminBenefitsSession({ actorId, initialData = null }: { actorId: string; initialData?: AdminComputeBenefitsList | null }) {
  const t = useTranslations("product.computeBenefits"), router = useRouter();
  const [data, setData] = useState<AdminComputeBenefitsList | null>(initialData), [failed, setFailed] = useState(false), [changed, setChanged] = useState(false), [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15_000);
    setFailed(false);
    void (async () => { try {
      const response = await fetch("/api/admin/compute-benefits", { headers: { "x-ans-actor": actorId }, signal: controller.signal, cache: "no-store" }); const result = await response.json();
      if (!active || controller.signal.aborted) return;
      if (!response.ok) { if (result.error === "ACCOUNT_CHANGED" || response.status === 403) { setChanged(true); setData(null); router.refresh(); } throw new Error("FAILED"); }
      setData(result);
    } catch { if (active) setFailed(true); } finally { clearTimeout(timer); } })();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [actorId, revision, router]);
  if (changed) return <p role="alert">{t("accountChanged")}</p>;
  if (failed) return <div className="space-y-3"><p role="alert">{t("loadFailed")}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>{t("retry")}</Button></div>;
  if (!data) return <p role="status">{t("adminLoading")}</p>;
  if (!data.enabled) return null;
  const stats = data.stats ?? {
    onboardingUsersCount: 0,
    agriApprovedUsersCount: 0,
    totalGrantedUsdMicros: "0",
    totalUsedUsdMicros: "0",
    arcadeParticipantCount: 0,
    arcadeTotalPointsGranted: 0,
    arcadeAvgPointsPerUser: 0,
    estimatedAvgAllAnsPoints: 126,
    jackpotHits: { spCount: 0, urCount: 0, ssrCount: 0 },
    recentJackpots: [],
  };
  const grantedUsd = (Number(BigInt(stats.totalGrantedUsdMicros)) / 1_000_000).toFixed(2);
  const usedUsd = (Number(BigInt(stats.totalUsedUsdMicros)) / 1_000_000).toFixed(2);
  const inNormalBand = stats.estimatedAvgAllAnsPoints >= 100 && stats.estimatedAvgAllAnsPoints <= 150;
  return <div className="space-y-5">
    <section aria-label="全站算力发放与额度监控大盘" className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div>
          <h2 className="text-base font-semibold">📊 全站算力预算与额度风控大盘（100 积分 = ¥10 元 = $10）</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">实时监控全站注册赠金、破冰问卷、农业调研与 3D 游乐场积分发放水位，确保 90% 用户稳定落在 100~150 积分区间</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${inNormalBand ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"}`}>
          {inNormalBand ? "✓ 人均积分区间正常 (100~150分)" : "⚠ 均值偏离预警"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-muted/20 p-3.5">
          <p className="text-xs text-muted-foreground">全站活跃人均免费积分</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {stats.estimatedAvgAllAnsPoints} <span className="text-xs font-normal text-muted-foreground">积分 (≈ ¥{(stats.estimatedAvgAllAnsPoints / 10).toFixed(1)})</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">含注册 10分 + 破冰 50分 + 游乐场均值</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-3.5">
          <p className="text-xs text-muted-foreground">破冰问卷 & 农业项目赠金</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">
            ${grantedUsd} <span className="text-xs font-normal text-muted-foreground">已消耗 ${usedUsd}</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">破冰 {stats.onboardingUsersCount} 人 · 农研审批通过 {stats.agriApprovedUsersCount} 人</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-3.5">
          <p className="text-xs text-muted-foreground">3D 游乐场累计发放</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">
            {stats.arcadeTotalPointsGranted} <span className="text-xs font-normal text-muted-foreground">积分 ({stats.arcadeParticipantCount} 人参与)</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">游乐场人均增量：{stats.arcadeAvgPointsPerUser} 积分/人</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-3.5">
          <p className="text-xs text-muted-foreground">高稀有度档位触发次数</p>
          <div className="mt-1.5 flex items-baseline gap-3 text-sm font-semibold tabular-nums">
            <span className="text-rose-600 dark:text-rose-400">👑 SP(1000分): {stats.jackpotHits.spCount}</span>
            <span className="text-amber-600 dark:text-amber-400">🐉 UR(300分): {stats.jackpotHits.urCount}</span>
            <span className="text-purple-600 dark:text-purple-400">💎 SSR(80分): {stats.jackpotHits.ssrCount}</span>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">理论概率：SP 0.1% · UR 0.9% · SSR 4.0%</p>
        </div>
      </div>
      {stats.recentJackpots.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">最近高倍中奖记录：</span>
          {stats.recentJackpots.map((j, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 font-mono text-[11px]">
              <b>{j.rarity}</b> @{j.username} +{j.points}分
            </span>
          ))}
        </div>
      )}
    </section>
    <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-6">{t("adminReward")}</p>{data.applications.length === 0 ? <p className="rounded-2xl border border-dashed p-8 text-muted-foreground">{t("adminEmpty")}</p> : data.applications.map(application => <Review key={`${application.id}:${application.revision}`} actorId={actorId} application={application} refresh={() => { setData(null); setRevision(value => value + 1); router.refresh(); }} invalidate={() => { setChanged(true); setData(null); router.refresh(); }} />)}</div>;
}
function Review({ actorId, application, refresh, invalidate }: { actorId: string; application: AdminBenefitApplication; refresh: () => void; invalidate: () => void }) {
  const t = useTranslations("product.computeBenefits"), locale = useLocale();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const flight = useRef<AbortController | null>(null), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; flight.current?.abort(); }; }, []);
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" });
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (flight.current) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const form = new FormData(event.currentTarget);
    const parsed = benefitReviewSchema.safeParse({ revision: application.revision, decision: submitter?.value, note: form.get("note") });
    if (!parsed.success || form.get("confirmed") !== "on") { setMessage(t("invalid")); return; }
    const controller = new AbortController(); flight.current = controller; const timer = setTimeout(() => controller.abort(), 20_000); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/compute-benefits/${encodeURIComponent(application.id)}/review`, { method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actorId }, body: JSON.stringify(parsed.data), signal: controller.signal }); const result = await response.json();
      if (!alive.current || controller.signal.aborted || flight.current !== controller) return;
      if (!response.ok) { if (result.error === "ACCOUNT_CHANGED" || response.status === 403) { invalidate(); return; } throw new Error(response.status === 409 ? "adminConflict" : "writeFailed"); }
      setMessage(t("adminSuccess")); refresh();
    } catch (error) { if (alive.current && flight.current === controller) setMessage(t(controller.signal.aborted ? "unconfirmed" : error instanceof Error && error.message === "adminConflict" ? "adminConflict" : "writeFailed")); }
    finally { clearTimeout(timer); if (flight.current === controller) { flight.current = null; if (alive.current) setBusy(false); } }
  }
  return <article className="space-y-5 rounded-2xl border p-5 sm:p-6" aria-label={t("adminReview", { name: application.username })}><header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{application.answers.projectTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{t("adminApplicant")}: {application.username} · {application.answers.teamName}</p></div><span className="text-xs text-muted-foreground">{t("adminRevision", { revision: application.revision })}</span></header><p className="text-xs text-muted-foreground"><time dateTime={application.submittedAt}>{dates.format(new Date(application.submittedAt))}</time> · {t(`options.${application.answers.role}`)}</p><dl className="space-y-4 text-sm"><div><dt className="font-medium">{t("problem")}</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6 text-muted-foreground">{application.answers.problem}</dd></div><div><dt className="font-medium">{t("plan")}</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6 text-muted-foreground">{application.answers.plan}</dd></div></dl><form onSubmit={event => void submit(event)}><fieldset disabled={busy} className="space-y-4"><label className="grid gap-2 text-sm">{t("adminNote")}<Textarea name="note" required minLength={2} maxLength={1000} rows={2} /></label><label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" name="confirmed" required className="mt-1 size-4 shrink-0" />{t("adminConfirm")}</label><div className="flex flex-wrap gap-3"><Button type="submit" value="APPROVED">{t(busy ? "saving" : "adminApprove")}</Button><Button type="submit" value="REJECTED" variant="outline">{t("adminReject")}</Button></div></fieldset></form>{message && <p role="status" className="text-sm">{message}</p>}</article>;
}
