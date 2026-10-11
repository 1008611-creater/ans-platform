"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { marketRequest } from "./request";
export function CreatePointsOrder({ listingId, version, available }: { listingId: string; version: number; available: boolean }) {
 const t = useTranslations("product.market"); const router = useRouter(); const key = useRef<string | null>(null); const flight = useRef(false);
 const [busy, setBusy] = useState(false); const [error, setError] = useState("");
 return <div className="space-y-3"><Button className="w-full" disabled={!available || busy} onClick={async () => {
  if (flight.current) return; flight.current = true; setBusy(true); setError(""); key.current ??= crypto.randomUUID();
  try { const result = await marketRequest<{ order: { id: string } }>("/api/market/orders", "POST", { listingId, expectedVersion: version, idempotencyKey: key.current, requirements: "" }); router.push(`/market/orders/${result.order.id}`); }
  catch (caught) { const code = caught instanceof Error ? caught.message : "INTERNAL_ERROR"; setError(t(t.has(`errors.${code}`) ? `errors.${code}` : "errors.INTERNAL_ERROR")); }
  finally { flight.current = false; setBusy(false); }
 }}>{t(available ? "createPointsOrder" : "paymentUnavailable")}</Button><p className="text-xs leading-6 text-muted-foreground">{t("pointsOrderNote")}</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
