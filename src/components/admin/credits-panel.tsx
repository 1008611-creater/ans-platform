"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoucherPanel } from "./voucher-panel";
import type { QuotaAdminOverview as Overview } from "@/contracts/quota";
type Command = { userId: string; kind: string; amount: number; note: string; operationKey: string; evidenceRef?: string };
export function CreditsPanel({ overview, actorId }: { overview: Overview; actorId: string }) {
 const t = useTranslations("product.quotaAdmin"); const router = useRouter();
 const [kind, setKind] = useState("GRANT");
 const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
 const [pending, setPending] = useState<Command | null>(null); const inFlight = useRef(false);
 async function execute(command: Command) {
   if (inFlight.current) return; inFlight.current = true; setBusy(true); setMessage("");
   try {
     const response = await fetch("/api/admin/credits", { method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actorId }, body: JSON.stringify(command) });
     const result = await response.json(); if (!response.ok) throw new Error(result.error || "FAILED");
     setPending(null); setMessage(t("success")); router.refresh();
   } catch (error) { setMessage(t("error", { code: error instanceof Error ? error.message : "FAILED" })); }
   finally { inFlight.current = false; setBusy(false); }
 }
 return <div className="space-y-8"><p>{t("pending", { count: overview.pending })}</p><p role={overview.mismatchCount ? "alert" : undefined}>{t("mismatchCount", { count: overview.mismatchCount })}</p>{!overview.manualRechargeEnabled && <p className="text-sm text-muted-foreground">{t("disabled")}</p>}
 <form className="max-w-2xl space-y-4" onSubmit={event => { event.preventDefault(); if (busy || pending || !event.currentTarget.reportValidity()) return; const form = new FormData(event.currentTarget); const evidenceRef = String(form.get("receipt") || "").trim(); const command = { userId: String(form.get("userId")), kind: String(form.get("kind")), amount: Number(form.get("amount")), note: String(form.get("note")), operationKey: crypto.randomUUID(), ...(evidenceRef ? { evidenceRef } : {}) }; setPending(command); void execute(command); }}>
 <fieldset disabled={busy || !!pending} className="space-y-4"><label className="grid gap-2 text-sm">{t("user")}<select name="userId" defaultValue="" required className="h-10 rounded-md border bg-background px-3"><option value="" disabled>{t("selectUser")}</option>{overview.users.map(user => <option key={user.id} value={user.id}>{user.username} / {user.quotaPoints}{user.flagged ? ` (${t("restrictedAccount")})` : ""}</option>)}</select></label>
 <label className="grid gap-2 text-sm">{t("kind")}<select name="kind" value={kind} onChange={event => setKind(event.target.value)} className="h-10 rounded-md border bg-background px-3">{["GRANT","ADJUST",...(overview.manualRechargeEnabled ? ["TOP_UP"] : [])].map(kind => <option value={kind} key={kind}>{t(kind)}</option>)}</select></label>
 <label className="grid gap-2 text-sm">{t("amount")}<Input name="amount" type="number" step="0.000001" min="-1000000" max="1000000" required/></label>
 <label className="grid gap-2 text-sm">{t("note")}<Input name="note" required minLength={3} maxLength={1000}/></label>
 {kind === "TOP_UP" && <label className="grid gap-2 text-sm">{t("receipt")}<Input name="receipt" required minLength={3} maxLength={200}/></label>}
 <label className="flex gap-3 text-sm"><input type="checkbox" required/>{t(kind === "TOP_UP" ? "confirm" : "confirmAdjustment")}</label><Button disabled={busy || !!pending}>{t(busy ? "busy" : "submit")}</Button></fieldset></form>
 {message && <p role="status" className="text-sm">{message}</p>}{pending && !busy && <Button variant="outline" onClick={() => void execute(pending)}>{t("retry")}</Button>}
 <section className="space-y-4"><h2 className="font-semibold">{t("disputes")}</h2>{overview.disputes.map(order => <ReviewAction actorId={actorId} key={order.id} title={`${order.id} / ${order.totalMinor / 100}`} url={`/api/admin/credits/orders/${order.id}/refund`} kind="refund"/>)}</section>
 <section className="space-y-4"><h2 className="font-semibold">{t("uncertain")}</h2>{overview.uncertain.map(request => <ReviewAction actorId={actorId} key={request.id} title={`${request.id} / ${request.modelId} / ${request.authorizedPoints}`} url={`/api/admin/credits/requests/${request.id}/release`} kind="waive"/>)}</section>
 <section className="space-y-3" aria-labelledby="exam-reservation-heading"><h2 id="exam-reservation-heading" className="font-semibold">{t("examTitle")}</h2><p className="text-sm">{t("examPending", { count: overview.examPending?.pendingCount ?? 0, points: overview.examPending?.reservedPoints ?? 0 })}</p><p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t("examRecovery")}</p>{overview.examPending?.items.length ? <ul className="max-w-2xl divide-y rounded-md border px-4">{overview.examPending.items.map(item => <li key={item.id} className="space-y-1 py-3 text-sm"><p className="break-all">{overview.users.find(user => user.id === item.userId)?.username ?? item.userId} / {item.points}</p><p className="text-muted-foreground">{item.createdAt}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">{t("examEmpty")}</p>}</section>
 <section><h2 className="font-semibold">{t("recent")}</h2><ul className="mt-4 divide-y">{overview.operations.map(operation => <li key={operation.id} className="py-3 text-sm"><p>{operation.userId} / {t(operation.kind === "TOP_UP" && operation.evidenceRef?.startsWith("voucher:") ? "VOUCHER_REDEEM" : operation.kind)} / {operation.amount} / {operation.balanceAfter}</p><p className="mt-1 text-muted-foreground">{operation.note} / {operation.createdAt}</p></li>)}</ul></section>
 <VoucherPanel actorId={actorId} /></div>;
}

function ReviewAction({ title, url, kind, actorId }: { actorId: string; title: string; url: string; kind: "refund" | "waive" }) {
 const t = useTranslations("product.quotaAdmin"); const router = useRouter(); const flight = useRef(false);
 const [busy, setBusy] = useState(false); const [error, setError] = useState("");
 return <form className="max-w-2xl space-y-3 rounded-md border p-4" onSubmit={async event => {
   event.preventDefault(); if (flight.current) return; const form = new FormData(event.currentTarget); flight.current = true; setBusy(true); setError("");
   try { const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actorId }, body: JSON.stringify({ reason: String(form.get("reason")) }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "FAILED"); router.refresh(); }
   catch (caught) { setError(t("error", { code: caught instanceof Error ? caught.message : "FAILED" })); }
   finally { flight.current = false; setBusy(false); }
 }}><p className="break-all text-sm">{title}</p><label className="grid gap-2 text-sm">{t("note")}<Input name="reason" required minLength={3} maxLength={1000} disabled={busy}/></label><label className="flex gap-3 text-sm leading-6"><input type="checkbox" required disabled={busy}/>{t(kind === "waive" ? "waiverConfirm" : "refundConfirm")}</label><Button disabled={busy} variant="outline">{t(kind === "waive" ? "waive" : "refund")}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form>;
}
