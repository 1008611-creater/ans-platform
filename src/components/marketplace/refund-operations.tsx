"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useMarketRequest } from "./account-boundary";

export type MarketRefundOperation = { id: string; orderId: string; provider: string; status: "PENDING_DISPATCH" | "AWAITING_CONFIRMATION" | "CONFIRMED"; amountMinor: number; currency: string; reason: "UNALLOCATED_PAYMENT" | "APPROVED_DISPUTE"; providerSupported: boolean; requestedAt: string; completedAt: string | null };
export function RefundOperations({ items, nextCursor, view }: { items: MarketRefundOperation[]; nextCursor: string | null; view: "pending" | "confirmed" | "all" }) {
  const t = useTranslations("marketCash.operations");
  return <div className="space-y-5"><nav className="flex flex-wrap gap-3" aria-label={t("title")}>{(["pending", "confirmed", "all"] as const).map(value => <Button asChild key={value} variant={view === value ? "default" : "outline"}><Link href={"/admin/market/payments?view=" + value} aria-current={view === value ? "page" : undefined}>{t(value)}</Link></Button>)}</nav>{items.length === 0 && <p className="ans-empty">{t("empty")}</p>}{items.map(item => <RefundOperation key={item.id} item={item}/>)}{nextCursor && <Button asChild variant="outline"><Link href={"/admin/market/payments?cursor=" + encodeURIComponent(nextCursor) + "&view=" + view}>{t("older")}</Link></Button>}</div>;
}
function RefundOperation({ item }: { item: MarketRefundOperation }) {
  const cash = useTranslations("marketCash"); const request = useMarketRequest(); const router = useRouter(); const t = useTranslations("marketCash.operations");
  const flight = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [note, setNote] = useState("");
  async function run(action: "dispatch" | "reconcile") {
    if (flight.current) return; flight.current = true; setBusy(true); setError(""); setNote("");
    try {
      const result = await request<{ completed?: boolean; refunded?: boolean }>(`/api/admin/market/orders/${item.orderId}/refund`, "POST", { action, refundId: item.id });
      setNote(t(result.completed === true || result.refunded === true ? "completed" : "awaitingConfirmation")); router.refresh();
    } catch { setError(t("failed")); } finally { flight.current = false; setBusy(false); }
  }
  return <article className="ans-detail-block space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{item.currency} {(item.amountMinor / 100).toFixed(2)}</h2><p className="text-sm">{item.provider === "wechat" || item.provider === "alipay" ? cash(item.provider) : item.provider} · {t("status." + item.status)}</p></div><dl className="grid gap-2 text-sm"><div><dt className="text-muted-foreground">{t("order")}</dt><dd className="break-all">{item.orderId}</dd></div><div><dt className="text-muted-foreground">{t("refund")}</dt><dd className="break-all">{item.id}</dd></div><div><dt className="text-muted-foreground">{t("reason")}</dt><dd className="whitespace-pre-wrap break-words">{t("reasonText." + item.reason)}</dd></div><div><dt className="text-muted-foreground">{t("requested")}</dt><dd>{new Date(item.requestedAt).toLocaleString()}</dd></div></dl>
    {item.completedAt ? <p role="status">{t("completed")} · {new Date(item.completedAt).toLocaleString()}</p> : <><form className="space-y-3" onSubmit={event => { event.preventDefault(); void run("dispatch"); }}><label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" required disabled={busy || !item.providerSupported} className="mt-1.5"/>{t("confirmDispatch", { amount: (item.amountMinor / 100).toFixed(2) })}</label><Button disabled={busy || !item.providerSupported}>{t("dispatch")}</Button></form><Button type="button" variant="outline" disabled={busy} onClick={() => void run("reconcile")}>{t("reconcile")}</Button></>}
    {!item.providerSupported && <p className="text-sm">{t("unsupported")}</p>}
    {note && <p role="status" className="text-sm">{note}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </article>;
}
