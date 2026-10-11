"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { marketRequest } from "./request";
export function PointsPayment({ orderId, revision, amount }: { orderId: string; revision: number; amount: number }) {
 const t = useTranslations("product.market"); const router = useRouter();
 const key = useRef<string | null>(null); const inFlight = useRef(false);
 const [busy, setBusy] = useState(false); const [error, setError] = useState("");
 return <form className="space-y-4 rounded-[var(--radius)] border p-5" onSubmit={async event => {
   event.preventDefault(); if (inFlight.current) return; inFlight.current = true; setBusy(true); setError(""); key.current ??= crypto.randomUUID();
   try { await marketRequest(`/api/market/orders/${orderId}/pay`, "POST", { expectedRevision: revision, operationKey: key.current }); router.refresh(); }
   catch (caught) { const code = caught instanceof Error ? caught.message : "INTERNAL_ERROR"; setError(t(t.has(`errors.${code}`) ? `errors.${code}` : "errors.INTERNAL_ERROR")); }
   finally { inFlight.current = false; setBusy(false); }
 }}><label className="flex gap-3 text-sm leading-6"><input type="checkbox" required disabled={busy}/>{t("pointsConfirm")}</label><Button disabled={busy}>{t("pointsPay", { amount })}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form>;
}
