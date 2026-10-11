"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Coins, KeyRound, Loader2, ArrowUpRight, ArrowRight, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { Input } from "@/components/ui/input";
import { getCreditProducts, LEGACY_CREDIT_PRODUCT, type CreditProduct } from "@/lib/credits-catalog";

type Billing = { rechargeYuanPerPoint: number; usdQuotaPerPoint: number; gptConsumptionMultiplier: number; deepseekConsumptionMultiplier: number; rechargeEnabled: boolean };
type CreditsProps = { actorId: string; billing: Billing; availablePoints: number; products?: readonly CreditProduct[] };

export function CreditsCenter(props: CreditsProps) {
  return <AccountContentBoundary actorId={props.actorId}><CreditsCenterSession key={props.actorId} {...props} /></AccountContentBoundary>;
}

function CreditsCenterSession({ actorId, billing, availablePoints, products = getCreditProducts({}) }: CreditsProps) {
  const t = useTranslations("product.vouchers");
  const locale = useLocale();
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });
  const router = useRouter();
  const flight = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState(100);
  const selected = products.find(product => product.points === selectedPoints) ?? products[0];

  async function redeem() {
    if (flight.current) return;
    flight.current = true; setBusy(true); setMessage(""); setOk(false);
    try {
      const response = await fetch("/api/quota/redeem", {
        method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actorId }, body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!alive.current) return;
      if (!response.ok) throw new Error(data.error);
      setOk(true); setMessage(t(data.duplicate ? "duplicate" : "success", { points: data.points }));
      setCode(""); router.refresh();
    } catch (error) {
      if (!alive.current) return;
      const key = error instanceof Error ? error.message : "";
      setMessage(t(["VOUCHER_INVALID", "VOUCHER_USED", "RATE_LIMITED"].includes(key) ? key : "failed"));
    } finally { flight.current = false; if (alive.current) setBusy(false); }
  }

  return <div className="space-y-5">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="rounded-3xl border bg-card p-6 sm:p-8" aria-labelledby="credits-balance-heading">
        <p id="credits-balance-heading" className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Coins className="size-4 text-primary" aria-hidden="true" />{t("balance")}</p>
        <p className="mt-4 text-5xl font-semibold tracking-tight tabular-nums">{numbers.format(availablePoints)}</p>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{t("rules", { gpt: billing.gptConsumptionMultiplier, deepseek: billing.deepseekConsumptionMultiplier })}</p>
        <div className="mt-7 border-t pt-5">
          <div className="flex items-center justify-between gap-4"><h2 className="font-semibold">{t("catalogTitle")}</h2><span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{t("oneTime")}</span></div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("catalogDescription")}</p>
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
        <h2 id="credits-redeem-heading" className="flex items-center gap-2 font-semibold"><KeyRound className="size-5 text-primary" aria-hidden="true" />{t("title")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("description")}</p>
        <ol className="my-6 grid gap-3 text-sm">{["buyStep", "receiveStep", "redeemStep"].map((key, index) => <li key={key} className="flex items-start gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium" aria-hidden="true">{index + 1}</span><span className="pt-0.5 text-muted-foreground">{t(key)}</span></li>)}</ol>
        <form className="space-y-3" onSubmit={event => { event.preventDefault(); void redeem(); }}>
          <label className="grid gap-2 text-sm">{t("code")}<Input value={code} onChange={event => setCode(event.target.value)} autoComplete="off" spellCheck={false} maxLength={100} placeholder="ANS-…" required disabled={busy} /></label>
          <Button className="w-full" disabled={busy || !code.trim()}>{busy && <Loader2 className="animate-spin" aria-hidden="true" />}{t(busy ? "busy" : "redeem")}</Button>
        </form>
        {message && <p role={ok ? "status" : "alert"} className={ok ? "mt-3 text-sm text-emerald-600 dark:text-emerald-400" : "mt-3 text-sm text-destructive"}>{message}</p>}
        <div className="mt-7 border-t pt-5"><p className="text-xs leading-5 text-muted-foreground">{t("accountNote")}</p></div>
      </section>
    </div>
    <Link href="/vibeplan" className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-primary/5 p-5 transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:p-6">
      <div className="flex min-w-0 items-center gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-primary"><Ticket className="size-5" aria-hidden="true" /></span><div><p className="font-semibold">VibePlan <span className="ml-2 text-xs font-normal text-muted-foreground">{t("planStatus")}</span></p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t("planDescription")}</p></div></div><span className="inline-flex items-center gap-2 text-sm font-medium text-primary">{t("planExplore")}<ArrowRight className="size-4" aria-hidden="true" /></span>
    </Link>
  </div>;
}
