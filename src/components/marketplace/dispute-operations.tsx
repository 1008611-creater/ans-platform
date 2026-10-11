"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMarketRequest } from "./account-boundary";
export type MarketDisputeOperation = { id: string; title: string; amountMinor: number; currency: string; paymentMethod: string; updatedAt: string; reason: string };
export function DisputeOperations({ items, nextCursor }: { items: MarketDisputeOperation[]; nextCursor: string | null }) {
  const t = useTranslations("marketCash.disputes"); return <div className="space-y-5">{items.length === 0 && <p className="ans-empty">{t("empty")}</p>}{items.map(item => <Dispute key={item.id} item={item}/>)}{nextCursor && <Button asChild variant="outline"><Link href={"/admin/market/disputes?cursor=" + encodeURIComponent(nextCursor)}>{t("older")}</Link></Button>}</div>;
}
function Dispute({ item }: { item: MarketDisputeOperation }) {
  const t = useTranslations("marketCash.disputes"); const request = useMarketRequest(); const router = useRouter(); const flight = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <article className="ans-detail-block space-y-4"><h2 className="text-xl font-semibold">{item.title}</h2><p className="text-sm">{item.paymentMethod === "POINTS" ? t("pointsAmount", { amount: item.amountMinor / 100 }) : item.currency + " " + (item.amountMinor / 100).toFixed(2)}</p><p className="break-all text-xs text-muted-foreground">{item.id}</p><div><h3 className="text-sm font-medium">{t("submittedReason")}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.reason || t("noReason")}</p></div><form className="space-y-3" onSubmit={async event => {
    event.preventDefault(); if (flight.current) return; flight.current = true; setBusy(true); setError(""); const form = new FormData(event.currentTarget);
    try { await request(`/api/admin/market/orders/${item.id}/refund`, "POST", { action: "approve", reason: String(form.get("reason") ?? "") }); router.refresh(); }
    catch { setError(t("failed")); } finally { flight.current = false; setBusy(false); }
  }}><label className="grid gap-2 text-sm"><span>{t("reviewReason")}</span><Textarea name="reason" required minLength={1} maxLength={2000} disabled={busy}/></label><label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" required disabled={busy} className="mt-1.5"/>{t(item.paymentMethod === "POINTS" ? "confirmPoints" : "confirmCash")}</label><Button disabled={busy}>{t("approve")}</Button></form>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</article>;
}
