"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Coins, KeyRound, Loader2, ArrowUpRight, ArrowRight, Ticket, Clock3, Cpu, TerminalSquare, FolderOpen, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevealDetails } from "@/components/catalog/reveal-details";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { Input } from "@/components/ui/input";
import { getCreditProducts, LEGACY_CREDIT_PRODUCT, type CreditProduct } from "@/lib/credits-catalog";
import { RUN_MODEL_OPTIONS } from "@/lib/run-models";
import { usePausedRunModels, useRunModelMultipliers } from "@/components/providers/run-model-pricing";
import type { PersonalApiHistory } from "@/contracts/compute-benefits";
import { Badge } from "@/components/ui/badge";

type Billing = { rechargeYuanPerPoint: number; usdQuotaPerPoint?: number | null; rechargeEnabled: boolean };
type CreditsProps = { actorId: string; billing: Billing; availablePoints: number; reservedPoints?: number; pendingCount?: number; apiHistory?: PersonalApiHistory | null; products?: readonly CreditProduct[] };

export function CreditsCenter(props: CreditsProps) {
  return <AccountContentBoundary actorId={props.actorId}><CreditsCenterSession key={props.actorId} {...props} /></AccountContentBoundary>;
}

function CreditsCenterSession({ actorId, availablePoints, reservedPoints = 0, pendingCount = 0, apiHistory, products = getCreditProducts({}) }: CreditsProps) {
  const t = useTranslations("product.vouchers");
  const historyText = useTranslations("product.quotaHistory");
  const multipliers = useRunModelMultipliers();
  const paused = usePausedRunModels();
  const locale = useLocale();
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" });
  const router = useRouter();
  const flight = useRef<{ controller: AbortController; timer: ReturnType<typeof setTimeout> } | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => {
    alive.current = false;
    if (flight.current) { clearTimeout(flight.current.timer); flight.current.controller.abort(); flight.current = null; }
  }; }, []);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState(100);
  const selected = products.find(product => product.points === selectedPoints) ?? products[0];

  async function redeem() {
    if (flight.current) return;
    if (actorId === "guest" || actorId === "guest-preview") {
      setOk(false);
      setMessage("🔓 当前为访客透明预览模式，请先登录账号后再兑换算力卡密。");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (flight.current?.controller !== controller) return;
      controller.abort(); flight.current = null;
      if (alive.current) { setBusy(false); setOk(false); setMessage(t("unconfirmed")); }
    }, 20_000);
    flight.current = { controller, timer }; setBusy(true); setMessage(""); setOk(false);
    try {
      const response = await fetch("/api/quota/redeem", {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", "x-ans-actor": actorId }, body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!alive.current || controller.signal.aborted || flight.current?.controller !== controller) return;
      if (!response.ok) throw new Error(data.error);
      setOk(true); setMessage(t(data.duplicate ? "duplicate" : "success", { points: data.points }));
      setCode(""); router.refresh();
    } catch (error) {
      if (!alive.current || controller.signal.aborted || flight.current?.controller !== controller) return;
      const key = error instanceof Error ? error.message : "";
      setMessage(t(["VOUCHER_INVALID", "VOUCHER_USED", "RATE_LIMITED"].includes(key) ? key : "failed"));
    } finally {
      clearTimeout(timer);
      if (flight.current?.controller === controller) { flight.current = null; if (alive.current) setBusy(false); }
    }
  }

  return <div className="space-y-5">
    <section aria-labelledby="credits-balance-heading" className="rounded-3xl border bg-card p-6 sm:p-8">
      <h2 id="credits-balance-heading" className="text-sm font-medium text-muted-foreground">{t("balanceHeading")}</h2>
      <dl className="mt-5 grid gap-6 sm:grid-cols-2">
        <div className="min-w-0"><dt className="flex items-center gap-2 text-sm text-muted-foreground"><Coins className="size-4 text-primary" aria-hidden="true" />{t("balance")}</dt><dd className="mt-3 break-words text-4xl font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-5xl">{numbers.format(availablePoints)}<span className="ms-2 text-base font-normal text-muted-foreground">{t("pointsUnit")}</span></dd></div>
        <div className="min-w-0"><dt className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" aria-hidden="true" />{t("reserved")}</dt><dd className="mt-3 break-words text-3xl font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-4xl">{numbers.format(reservedPoints)}<span className="ms-2 text-base font-normal text-muted-foreground">{t("pointsUnit")}</span></dd><p className="mt-2 text-xs leading-6 text-muted-foreground">{t("reservationExplanation")}</p></div>
      </dl>
      <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">{t("rules")}</p>
      {pendingCount > 0 && <aside className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4"><h3 className="text-sm font-medium">{t("pendingTitle", { count: pendingCount })}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t("pendingExplanation")}</p><span className="sr-only">{historyText("pending", { count: pendingCount })}</span><span className="sr-only">{historyText("hold")}</span></aside>}
    </section>
    <section aria-labelledby="credits-models-heading" className="rounded-3xl border bg-card p-6 sm:p-8">
      <div className="flex items-center gap-2"><Cpu className="size-5 text-primary" aria-hidden="true" /><h2 id="credits-models-heading" className="font-semibold">{t("modelsTitle")}</h2></div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t("modelsDescription")}</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">{RUN_MODEL_OPTIONS.map(model => <li key={model.key} className="min-w-0">
        <Link href={`/models?model=${encodeURIComponent(model.key)}`} className="group flex h-full flex-col justify-between rounded-xl border p-4 transition-all hover:border-primary/50 hover:bg-primary/5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-foreground group-hover:text-primary">{model.label}</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">⚡ 试玩 →</span>
            </div>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{model.key}</p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              {model.key === "deepseek-v4.1-flash" ? "🟢 双活在线" : "🟢 在线"}
            </p>
          </div>
          <p className="mt-4 text-sm font-medium">{paused.includes(model.key) ? t("modelPaused") : multipliers[model.key] === undefined ? t("modelUnpriced") : t("modelMultiplier", { multiplier: multipliers[model.key]! })}</p>
        </Link>
      </li>)}</ul>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">{t("modelRatesNote")}</p>
      <nav aria-label={t("entryPoints")} className="mt-4 flex flex-wrap gap-2 border-t pt-4">
        {([
          { href: "/models", title: "plazaTitle", body: "plazaBody", icon: Cpu },
          { href: "/settings", title: "connectionTitle", body: "connectionBody", icon: TerminalSquare },
          { href: "/projects", title: "projectsTitle", body: "projectsBody", icon: FolderOpen },
          { href: "/workflows/runs", title: "runsTitle", body: "runsBody", icon: ReceiptText },
          { href: "/workspace/compute", title: "aigcTitle", body: "aigcBody", icon: ReceiptText },
        ] as const).map(({ href, title, body, icon: Icon }) => <Link key={title} href={href} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"><Icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" /><span>{t(title)}</span><span className="sr-only">{t(body)}</span><ArrowRight className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>)}
      </nav>
    </section>
    {apiHistory !== undefined && <section aria-labelledby="credits-api-history-heading" className="rounded-3xl border bg-card p-6 sm:p-8">
      <h2 id="credits-api-history-heading" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-5 text-primary" aria-hidden="true" />{t("apiHistoryTitle")}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t("apiHistoryScope")}</p>
      <p className="mt-2 text-xs text-muted-foreground">{t("apiHistoryTimezone")}</p>
      {apiHistory === null ? <p role="alert" className="mt-4 text-sm text-destructive">{t("apiHistoryUnavailable")}</p>
        : apiHistory.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{t("apiHistoryEmpty")}</p>
        : <ol className="mt-5 space-y-3">{apiHistory.map(request => {
          const pending = request.state === "AUTHORIZED" || request.state === "RUNNING" || request.state === "UNCERTAIN";
          return <li key={request.id} className="min-w-0 rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><p className="min-w-0 break-all text-sm font-medium">{request.modelId}</p><Badge variant={pending ? "outline" : "secondary"}>{t(`apiStates.${request.state}`)}</Badge></div>
            {request.funding === "gift" && <p className="mt-3 text-sm text-muted-foreground">{t("apiGiftFunding")}</p>}
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div className="min-w-0 sm:col-span-2"><dt className="text-xs text-muted-foreground">{t("apiRequestId")}</dt><dd className="mt-1 break-all font-mono text-xs">{request.id}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{t("apiAuthorized")}</dt><dd className="mt-1 tabular-nums">{t("apiPoints", { points: numbers.format(request.authorizedPoints) })}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{t("apiSettled")}</dt><dd className="mt-1 tabular-nums">{pending || request.settledPoints === null ? t("apiUnconfirmed") : t("apiPoints", { points: numbers.format(request.settledPoints) })}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{t("apiCreatedAt")}</dt><dd className="mt-1"><time dateTime={request.createdAt}>{dates.format(new Date(request.createdAt))}</time></dd></div>
              {request.startedAt && <div><dt className="text-xs text-muted-foreground">{t("apiStartedAt")}</dt><dd className="mt-1"><time dateTime={request.startedAt}>{dates.format(new Date(request.startedAt))}</time></dd></div>}
              {!pending && request.finishedAt && <div><dt className="text-xs text-muted-foreground">{t("apiFinishedAt")}</dt><dd className="mt-1"><time dateTime={request.finishedAt}>{dates.format(new Date(request.finishedAt))}</time></dd></div>}
            </dl>
            {request.state === "UNCERTAIN" && <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("apiUncertainBody")}</p>}
          </li>;
        })}</ol>}
    </section>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="rounded-3xl border bg-card p-6 sm:p-8" aria-labelledby="credits-purchase-heading">
        <div>
          <RevealDetails id="credits-purchase-guide" kind="heading" label={t("purchaseGuide")} className="pe-12" details={<p>{t("catalogDescription")}</p>}><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="credits-purchase-heading" className="font-semibold">{t("catalogTitle")}</h2><span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{t("oneTime")}</span></div></RevealDetails>
          <fieldset className="mt-4"><legend className="sr-only">{t("chooseAmount")}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{products.map(product => <label key={product.points} className="relative cursor-pointer">
              <input className="peer sr-only" type="radio" name="credit-denomination" value={product.points} checked={selectedPoints === product.points} onChange={() => setSelectedPoints(product.points)} />
              <span className="flex min-h-24 flex-col justify-between gap-3 rounded-xl border p-3 transition-colors peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring hover:bg-muted/60">
                <span className="font-semibold tabular-nums">{numbers.format(product.points)} <span className="text-xs font-normal text-muted-foreground">{t("pointsUnit")}</span></span>
                <span className="text-sm text-muted-foreground">¥{product.faceValueYuan}</span>
              </span>
            </label>)}</div>
          </fieldset>
          {selected && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-4" aria-live="polite">
            <div><p className="text-sm font-medium">{t("selectedProduct", { points: selected.points, yuan: selected.faceValueYuan })}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{t(selected.purchaseUrl ? "purchaseReady" : "awaitingListing")}</p></div>
            {selected.purchaseUrl ? <Button asChild><a href={selected.purchaseUrl} target="_blank" rel="noopener noreferrer">{t("purchase")}<ArrowUpRight className="size-4" aria-hidden="true" /></a></Button> : <Button disabled variant="outline">{t("notListed")}</Button>}
          </div>}
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("checkoutFees")}</p>
          <a className="mt-4 inline-flex min-h-10 items-center gap-1 text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" href={LEGACY_CREDIT_PRODUCT.purchaseUrl} target="_blank" rel="noopener noreferrer">{t("legacyProduct")}<ArrowUpRight className="size-4" aria-hidden="true" /></a>
          <p className="text-xs leading-5 text-muted-foreground">{t("shopNote")}</p>
        </div>
      </section>
      <section className="rounded-3xl border bg-card p-6 sm:p-8" aria-labelledby="credits-redeem-heading">
        <RevealDetails id="credits-redemption-guide" kind="heading" label={t("redemptionGuide")} className="pe-12" details={<ol className="grid gap-3 text-sm">{["buyStep", "receiveStep", "redeemStep"].map((key, index) => <li key={key} className="flex items-start gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium" aria-hidden="true">{index + 1}</span><span>{t(key)}</span></li>)}</ol>}><h2 id="credits-redeem-heading" className="flex items-center gap-2 font-semibold"><KeyRound className="size-5 shrink-0 text-primary" aria-hidden="true" />{t("title")}</h2></RevealDetails>
        <form className="mt-6 space-y-3" onSubmit={event => { event.preventDefault(); void redeem(); }}>
          <label className="grid gap-2 text-sm">{t("code")}<Input value={code} onChange={event => setCode(event.target.value)} autoComplete="off" spellCheck={false} maxLength={100} placeholder="ANS-…" required disabled={busy} /></label>
          <Button className="w-full" disabled={busy || !code.trim()}>{busy && <Loader2 className="animate-spin" aria-hidden="true" />}{t(busy ? "busy" : "redeem")}</Button>
        </form>
        {message && <p role={ok ? "status" : "alert"} className={ok ? "mt-3 text-sm text-emerald-600 dark:text-emerald-400" : "mt-3 text-sm text-destructive"}>{message}</p>}
        <div className="mt-7 border-t pt-5"><p className="text-xs leading-5 text-muted-foreground">{t("accountNote")}</p></div>
      </section>
    </div>
    <Link href="/vibeplan" className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-primary/5 p-5 transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:p-6">
      <div className="flex min-w-0 flex-1 items-center gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-primary"><Ticket className="size-5" aria-hidden="true" /></span><div className="min-w-0"><p className="font-semibold">VibePlan <span className="ml-2 text-xs font-normal text-muted-foreground">{t("planStatus")}</span></p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t("planDescription")}</p></div></div><span className="inline-flex items-center gap-2 text-sm font-medium text-primary">{t("planExplore")}<ArrowRight className="size-4" aria-hidden="true" /></span>
    </Link>
  </div>;
}
