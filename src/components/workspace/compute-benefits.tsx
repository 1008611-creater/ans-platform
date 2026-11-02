"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Gift, KeyRound, Clock3 } from "lucide-react";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AGENT_VALUES, EXPERIENCE_VALUES, ROLE_VALUES,
  onboardingQuestionnaireSchema, agriApplicationSchema,
  type ComputeBenefitsSummary, type BenefitGrant,
} from "@/contracts/compute-benefits";

/** Exact decimal formatting: gifted dollars never pass through a floating point balance. */
export function formatBenefitUsd(micros: string) {
  const value = BigInt(micros);
  const whole = value / BigInt(1_000_000);
  const fraction = (value % BigInt(1_000_000)).toString().padStart(6, "0").replace(/0+$/, "");
  return `$${whole}${fraction ? `.${fraction}` : ""}`;
}

type Props = { actorId: string; compact?: boolean; initialData?: ComputeBenefitsSummary | null };
export function ComputeBenefits(props: Props) {
  return <AccountContentBoundary actorId={props.actorId}><BenefitsSession key={props.actorId} {...props} /></AccountContentBoundary>;
}
function BenefitsSession({ actorId, compact = false, initialData }: Props) {
  const t = useTranslations("product.computeBenefits"), locale = useLocale(), router = useRouter();
  const [data, setData] = useState<ComputeBenefitsSummary | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData === undefined), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false), [accountChanged, setAccountChanged] = useState(false), [reload, setReload] = useState(0);
  const alive = useRef(true), flight = useRef<AbortController | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; flight.current?.abort(); }; }, []);
  useEffect(() => {
    if ((initialData !== undefined || actorId === "guest" || actorId === "guest-preview") && reload === 0) return;
    let active = true; const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15_000);
    setLoading(true); setFailed(false);
    void (async () => { try {
      const response = await fetch("/api/compute-benefits", { signal: controller.signal, headers: { "x-ans-actor": actorId }, cache: "no-store" });
      const result = await response.json();
      if (!active || !alive.current || controller.signal.aborted) return;
      if (!response.ok) { if (result.error === "ACCOUNT_CHANGED") { setAccountChanged(true); setData(null); router.refresh(); } throw new Error("LOAD_FAILED"); }
      setData(result);
    } catch { if (active && alive.current) setFailed(true); }
    finally { clearTimeout(timer); if (active && alive.current) setLoading(false); }
    })();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [actorId, initialData, reload, router]);
  async function submit(path: string, body: unknown, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (flight.current || accountChanged) return;
    if (actorId === "guest" || actorId === "guest-preview") {
      setMessage("🔓 当前为访客免登试玩模式，正在跳转登录页，登录后即可一键提交并领取真实算力积分！");
      router.push("/login?callbackUrl=%2Fworkspace%2Fbenefits");
      return;
    }
    const controller = new AbortController(); flight.current = controller; setBusy(true); setMessage("");
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(path, { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", "x-ans-actor": actorId }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!alive.current || flight.current !== controller || controller.signal.aborted) return;
      if (!response.ok) {
        if (result.error === "ACCOUNT_CHANGED") { setAccountChanged(true); setData(null); router.refresh(); }
        throw new Error(result.error === "ACCOUNT_CHANGED" ? "accountChanged" : "writeFailed");
      }
      setMessage(t("saved")); setReload(value => value + 1); router.refresh();
    } catch (error) {
      if (alive.current && flight.current === controller) setMessage(t(controller.signal.aborted ? "unconfirmed" : error instanceof Error && error.message === "accountChanged" ? "accountChanged" : "writeFailed"));
    } finally {
      clearTimeout(timer); if (flight.current === controller) { flight.current = null; if (alive.current) setBusy(false); }
    }
  }
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" });
  if (accountChanged) return <p role="alert">{t("accountChanged")}</p>;
  if (loading && !data) return <p role="status" className="rounded-3xl border p-6">{t("loading")}</p>;
  if (failed && !data) return <div className="space-y-3 rounded-3xl border p-6"><p role="alert">{t("loadFailed")}</p><Button variant="outline" onClick={() => setReload(value => value + 1)}>{t("retry")}</Button></div>;
  if (!data?.enabled) return null;
  return <div className="space-y-6">
    <section aria-labelledby="benefits-title" className="rounded-3xl border bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Gift className="size-4" aria-hidden="true" />{t("eyebrow")}</p><h2 id="benefits-title" className="text-xl font-semibold tracking-tight">{t("title")}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("separation")}</p></div><Button asChild variant="outline"><Link href={compact ? "/workspace/benefits" : "/workspace/credits"}>{t(compact ? "manage" : "back")}<ArrowUpRight className="size-4" aria-hidden="true" /></Link></Button></div>
      {failed && <p role="alert" className="mt-4 text-sm text-destructive">{t("stale")}</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{data.grants.map(grant => <GrantCard key={grant.id} grant={grant} dates={dates} />)}</div>
      {data.grants.length === 0 && <div className="mt-5 border-t border-dashed border-border pt-4"><p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{t("empty")}</p></div>}
      <p className="mt-4 flex max-w-xl items-start gap-2 text-[13px] leading-relaxed text-muted-foreground"><Clock3 className="mt-1 size-4 shrink-0" aria-hidden="true" />{t("expiryRule")}</p>
    </section>
    {!compact && <>
      <section aria-labelledby="benefits-onboarding" className="rounded-3xl border p-5 sm:p-7"><h2 id="benefits-onboarding" className="text-lg font-semibold">{t("onboardingTitle")}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("onboardingDescription")}</p>
        {data.onboarding ? <p role="status" className="mt-4 text-sm">{t("onboardingComplete", { date: dates.format(new Date(data.onboarding.submittedAt)) })}</p> : <form className="mt-5 space-y-4" onSubmit={event => {
          const form = new FormData(event.currentTarget); const parsed = onboardingQuestionnaireSchema.safeParse({ version: "onboarding-v1", role: form.get("role"), experience: form.get("experience"), agent: form.get("agent"), useCase: form.get("useCase"), acceptedRules: form.get("acceptedRules") === "on" });
          if (!parsed.success) { event.preventDefault(); setMessage(t("invalid")); return; } void submit("/api/compute-benefits/questionnaire", parsed.data, event);
        }}><fieldset disabled={busy || loading} className="space-y-4"><div className="grid gap-4 sm:grid-cols-3"><Choice name="role" values={ROLE_VALUES} /><Choice name="experience" values={EXPERIENCE_VALUES} /><Choice name="agent" values={AGENT_VALUES} /></div><label className="grid gap-2 text-sm">{t("useCase")}<Textarea name="useCase" required minLength={10} maxLength={1000} rows={3} placeholder={t("useCasePlaceholder")} /></label><Rules /><Button type="submit">{t(busy ? "saving" : "submitQuestionnaire")}</Button></fieldset></form>}
      </section>
      <section id="benefits-agri" aria-labelledby="benefits-agri-heading" className="rounded-3xl border p-5 sm:p-7"><h2 id="benefits-agri-heading" className="text-lg font-semibold">{t("agriTitle")}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("agriDescription")}</p>
        {data.application && <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm"><p className="font-medium">{t(`applicationStates.${data.application.status}`)}</p><p>{t("submitted", { date: dates.format(new Date(data.application.submittedAt)) })}</p>{data.application.reviewNote && <p className="max-w-xl whitespace-pre-wrap break-words">{t("reviewNote")}: {data.application.reviewNote}</p>}</div>}
        {(!data.application || data.application.status === "REJECTED") && <form className="mt-5 space-y-4" onSubmit={event => {
          const form = new FormData(event.currentTarget); const parsed = agriApplicationSchema.safeParse({ version: "agri-v1", teamName: form.get("teamName"), projectTitle: form.get("projectTitle"), role: form.get("role"), problem: form.get("problem"), plan: form.get("plan"), acceptedRules: form.get("acceptedRules") === "on" });
          if (!parsed.success) { event.preventDefault(); setMessage(t("invalid")); return; } void submit("/api/compute-benefits/applications", parsed.data, event);
        }}><fieldset disabled={busy || loading} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm">{t("teamName")}<Input name="teamName" required maxLength={80} defaultValue={data.application?.answers.teamName ?? ""} /></label><label className="grid gap-2 text-sm">{t("projectTitle")}<Input name="projectTitle" required minLength={2} maxLength={120} defaultValue={data.application?.answers.projectTitle ?? ""} /></label></div><Choice name="role" values={ROLE_VALUES} defaultValue={data.application?.answers.role} /><label className="grid gap-2 text-sm">{t("problem")}<Textarea name="problem" required minLength={20} maxLength={1500} rows={3} defaultValue={data.application?.answers.problem ?? ""} /></label><label className="grid gap-2 text-sm">{t("plan")}<Textarea name="plan" required minLength={20} maxLength={2000} rows={3} defaultValue={data.application?.answers.plan ?? ""} /></label><Rules /><Button type="submit">{t(busy ? "saving" : "submitApplication")}</Button></fieldset></form>}
      </section>
      <section aria-labelledby="benefits-api" className="rounded-3xl border p-5 sm:p-7"><h2 id="benefits-api" className="flex items-center gap-2 text-lg font-semibold"><KeyRound className="size-5" aria-hidden="true" />{t("apiTitle")}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("apiDescription")}</p><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-muted-foreground">{t("openaiEndpoint")}</dt><dd className="mt-1 overflow-x-auto rounded-lg bg-muted p-3 font-mono">https://ans.cauai.fun/api/codex/v1</dd></div><div><dt className="text-muted-foreground">{t("claudeEndpoint")}</dt><dd className="mt-1 overflow-x-auto rounded-lg bg-muted p-3 font-mono">https://ans.cauai.fun/api/claude/v1</dd></div></dl><p className="mt-4 max-w-xl text-sm leading-relaxed">{t("funding")}</p><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("fundingPaid")}</p><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("channelNotice")}</p><div className="mt-4 flex flex-wrap gap-3"><Button asChild><Link href="/settings#api-key">{t("keys")}</Link></Button><Button asChild variant="outline"><Link href="/workspace/models">{t("models")}</Link></Button></div></section>
      <section aria-labelledby="benefits-activity" className="rounded-3xl border p-5 sm:p-7"><h2 id="benefits-activity" className="text-lg font-semibold">{t("activity")}</h2>{data.activity.length === 0 ? <p className="mt-3 max-w-xl text-sm text-muted-foreground">{t("activityEmpty")}</p> : <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label={t("activity")}><table className="w-full text-sm"><thead><tr className="border-b text-start">{["date", "model", "state", "reserved", "charged"].map(key => <th key={key} scope="col" className="whitespace-nowrap p-3 text-start font-medium">{t(key)}</th>)}</tr></thead><tbody>{data.activity.map(item => <tr key={item.requestId} className="border-b"><td className="whitespace-nowrap p-3"><time dateTime={item.createdAt}>{dates.format(new Date(item.createdAt))}</time></td><td className="p-3 font-mono text-xs">{item.modelId}</td><td className="whitespace-nowrap p-3">{t(`activityStates.${item.state}`)}</td><td className="p-3 tabular-nums">{formatBenefitUsd(item.reservedUsdMicros)}</td><td className="p-3 tabular-nums">{item.chargedUsdMicros === null ? t("pending") : formatBenefitUsd(item.chargedUsdMicros)}</td></tr>)}</tbody></table></div>}</section>
    </>}
    {message && <p role="status" className="rounded-xl border p-4 text-sm">{message}</p>}
  </div>;
}
function Choice({ name, values, defaultValue = "" }: { name: string; values: readonly string[]; defaultValue?: string }) {
  const t = useTranslations("product.computeBenefits");
  return <label className="grid gap-2 text-sm">{t(name)}<select name={name} required defaultValue={defaultValue} className="h-10 min-w-0 rounded-md border bg-background px-3"><option value="" disabled>{t("choose")}</option>{values.map(value => <option key={value} value={value}>{t(`options.${value}`)}</option>)}</select></label>;
}
function Rules() { const t = useTranslations("product.computeBenefits"); return <label className="flex items-start gap-3 text-sm leading-6"><input name="acceptedRules" type="checkbox" required className="mt-1 size-4 shrink-0" />{t("rules")}</label>; }
function GrantCard({ grant, dates }: { grant: BenefitGrant; dates: Intl.DateTimeFormat }) {
  const t = useTranslations("product.computeBenefits");
  const total = BigInt(grant.totalUsdMicros), used = BigInt(grant.usedUsdMicros), reserved = BigInt(grant.reservedUsdMicros);
  const basisPoints = total > BigInt(0) ? Number(((used + reserved) * BigInt(10000)) / total) : 0;
  return <article className="min-w-0 rounded-2xl border p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium">{t(`kinds.${grant.kind}`)}</h3><span className="text-xs text-muted-foreground">{t(`grantStates.${grant.status}`)}</span></div><p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{formatBenefitUsd(grant.availableUsdMicros)}<span className="ms-2 text-xs font-normal text-muted-foreground">{t("available")}</span></p><div role="progressbar" aria-label={t("consumed", { name: t(`kinds.${grant.kind}`) })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, basisPoints / 100)} className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, basisPoints / 100)}%` }} /></div><dl className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><dt className="text-muted-foreground">{t("granted")}</dt><dd className="mt-1 tabular-nums">{formatBenefitUsd(grant.totalUsdMicros)}</dd></div><div><dt className="text-muted-foreground">{t("used")}</dt><dd className="mt-1 tabular-nums">{formatBenefitUsd(grant.usedUsdMicros)}</dd></div><div><dt className="text-muted-foreground">{t("reserved")}</dt><dd className="mt-1 tabular-nums">{formatBenefitUsd(grant.reservedUsdMicros)}</dd></div></dl><p className="mt-4 break-words font-mono text-xs text-muted-foreground">{grant.modelIds.join(" · ")}</p><p className="mt-2 text-xs text-muted-foreground">{t("source")}: {t(grant.kind === "DEEPSEEK_ONBOARDING" ? "onboardingSource" : "agriSource")}</p><p className="mt-2 text-xs text-muted-foreground">{t("expires")}: <time dateTime={grant.expiresAt}>{dates.format(new Date(grant.expiresAt))}</time></p>{grant.status === "EXPIRED" && <p className="mt-2 text-xs">{t("expiredAmount", { amount: formatBenefitUsd(grant.expiredUsdMicros) })}</p>}{(grant.kind === "TERRA_AGRI" || grant.kind === "OPUS_AGRI") && <p className="mt-3 rounded-lg bg-muted p-2 text-xs leading-5">{t(grant.kind === "TERRA_AGRI" ? "terraPending" : "opusPending")}</p>}</article>;
}
