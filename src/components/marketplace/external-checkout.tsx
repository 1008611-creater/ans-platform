"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMarketRequest } from "./account-boundary";
import type { AwaitedReceipt } from "@/contracts/market-integration-view";
export function ExternalCheckout({ id, initial, returnUrl, self }: { id: string; initial: AwaitedReceipt; returnUrl: string; self: boolean }) {
  const t = useTranslations("product.marketIntegration"); const request = useMarketRequest(); const router = useRouter();
  const [receipt,setReceipt] = useState(initial); const [busy,setBusy] = useState(false); const [error,setError] = useState(""); const flight = useRef(false);
  const paid = receipt.entitlementActive;
  return <div className="space-y-4"><p className="text-3xl font-semibold tabular-nums">{t("points", { amount: receipt.pricePoints })}</p><p className="text-sm leading-7 text-muted-foreground">{t("payNotice")}</p>
    <p className="text-sm">{t("status." + receipt.status)}</p>
    {paid ? <><Button asChild className="w-full"><a href={returnUrl} rel="noreferrer">{t("returnProject")}</a></Button>{receipt.orderId && <Link className="block text-sm underline" href={"/market/orders/" + receipt.orderId}>{t("viewOrder")}</Link>}</> : <Button className="w-full" disabled={busy || self || receipt.status !== "pending"} onClick={async () => {
      if (flight.current) return; flight.current = true; setBusy(true); setError("");
      try { const value = await request<AwaitedReceipt>("/api/market/checkouts/" + id + "/confirm", "POST", {}); setReceipt(value); router.refresh(); }
      catch (e) { const code = e instanceof Error ? e.message : "INTERNAL_ERROR"; setError(t.has("errors." + code) ? t("errors." + code) : t("errors.INTERNAL_ERROR")); }
      finally { flight.current = false; setBusy(false); }
    }}>{t(busy ? "processing" : self ? "selfPurchase" : "confirmPay")}</Button>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<p className="text-xs leading-6 text-muted-foreground">{t("reference", { reference: receipt.reference })}</p>
  </div>;
}
