"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Check, Coins, Loader2, QrCode, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Billing = { rechargeYuanPerPoint: number; usdQuotaPerPoint: number; gptConsumptionMultiplier: number; deepseekConsumptionMultiplier: number; rechargeEnabled: boolean };
type Order = { id: string; tradeNo: string; amountCents: number; points: number; payUrl: string | null; status: string; paidAt?: string | null };

export function CreditsCenter({ billing, availablePoints }: { billing: Billing; availablePoints: number }) {
  const t = useTranslations("product.quotaHistory");
  const [amount, setAmount] = useState("10");
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => stopPolling, []);
  async function createOrder() {
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(cents) || cents < 100 || cents > 100000000) { setMessage(t("rechargeUnavailable")); return; }
    setBusy(true); setMessage(""); stopPolling();
    try {
      const requestKey = crypto.randomUUID();
      const response = await fetch("/api/quota/recharge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents: cents, requestKey }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "RECHARGE_UNAVAILABLE");
      const next = data as Order; setOrder(next); if (next.payUrl) window.open(next.payUrl, "_blank", "noopener,noreferrer");
      pollRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/quota/recharge/${encodeURIComponent(next.id)}`, { cache: "no-store" });
          const status = await statusResponse.json(); if (!statusResponse.ok) throw new Error(status.error || "RECHARGE_STATUS_UNAVAILABLE");
          setOrder(status);
          if (["PAID", "EXPIRED", "FAILED"].includes(status.status)) { stopPolling(); setBusy(false); if (status.status === "PAID") { setMessage(t("rechargePaid")); window.location.reload(); } }
        } catch (error) { setMessage(error instanceof Error ? error.message : "RECHARGE_STATUS_UNAVAILABLE"); }
      }, 4000);
    } catch (error) { setMessage(error instanceof Error ? error.message : "RECHARGE_UNAVAILABLE"); }
    finally { setBusy(false); }
  }
  const orderMessage = order?.status === "PAID" ? t("rechargePaid") : order?.status === "EXPIRED" ? t("rechargeExpired") : order?.status === "FAILED" ? t("rechargeFailed") : order ? t("rechargePending") : "";
  return <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
    <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-card p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-sm font-medium text-primary"><Coins className="size-4" />{t("available")}</p><p className="mt-4 text-5xl font-semibold tracking-tight tabular-nums">{availablePoints.toLocaleString()}</p><p className="mt-2 text-sm text-muted-foreground">{t("billingBody")}</p></div><Sparkles className="size-7 text-primary/70" /></div>
      <div className="mt-8 flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded-full border bg-background/70 px-3 py-1">1 CNY = 1 point</span><span className="rounded-full border bg-background/70 px-3 py-1">GPT × {billing.gptConsumptionMultiplier}</span><span className="rounded-full border bg-background/70 px-3 py-1">DeepSeek × {billing.deepseekConsumptionMultiplier}</span></div>
    </section>
    <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><WalletCards className="size-5 text-primary" /><div><h2 className="font-semibold">{t("quotaRecharge")}</h2><p className="mt-1 text-sm text-muted-foreground">{billing.rechargeEnabled ? t("rechargeDescription") : t("rechargeUnavailable")}</p></div></div><div className="mt-6 space-y-3"><label className="grid gap-2 text-sm"><span>{t("rechargeAmount")}</span><Input value={amount} onChange={event => setAmount(event.target.value)} type="number" min="1" max="1000000" step="1" inputMode="decimal" /></label><Button className="w-full" onClick={() => void createOrder()} disabled={busy || !billing.rechargeEnabled}>{busy ? <Loader2 className="animate-spin" /> : <QrCode />}{busy ? t("rechargeChecking") : t("rechargeAction")}</Button></div>{order && <div className="mt-5 rounded-2xl border bg-muted/30 p-4"><p className="flex items-center gap-2 text-sm font-medium">{order.status === "PAID" ? <Check className="size-4 text-emerald-500" /> : <QrCode className="size-4" />}{orderMessage}</p><p className="mt-2 text-xs text-muted-foreground">{order.tradeNo} · ¥{(order.amountCents / 100).toFixed(2)} · {order.points} points</p>{order.payUrl && order.status === "PENDING" && <Button variant="link" className="mt-1 h-auto px-0" onClick={() => window.open(order.payUrl!, "_blank", "noopener,noreferrer")}>{t("rechargeOpen")} <ArrowUpRight /></Button>}</div>}{message && <p role="alert" className="mt-4 text-sm text-destructive">{message}</p>}</section>
  </div>;
}
