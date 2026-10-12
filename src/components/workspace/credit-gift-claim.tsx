"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { CreditGiftOffer } from "@/contracts/credit-gift";
export function CreditGiftClaim({ actorId, offer }: { actorId: string; offer: CreditGiftOffer }) {
  const t = useTranslations("product.creditGift"), locale = useLocale(), router = useRouter(), flight = useRef(false);
  const [busy, setBusy] = useState(false), [claimed, setClaimed] = useState(false), [error, setError] = useState("");
  const state = claimed ? "claimed" : offer.state;
  async function claim() {
    if (flight.current || state !== "available") return;
    flight.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/quota/claim", { method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actorId }, body: "{}" });
      const result = await response.json();
      if (!response.ok) { setError(t(result.error === "ACCOUNT_CHANGED" ? "accountChanged" : "failed")); router.refresh(); return; }
      setClaimed(true); router.refresh();
    } catch { setError(t("failed")); }
    finally { flight.current = false; setBusy(false); }
  }
  return <section className="flex flex-wrap items-center justify-between gap-4 border-y py-5" aria-labelledby="credit-gift-title">
    <div className="space-y-1"><h2 id="credit-gift-title" className="font-semibold">{t("title")}</h2><p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t(state === "available" ? "description" : state === "claimed" ? "claimed" : "unavailable")}</p></div>
    {state === "available" && offer.state === "available" && <Button onClick={() => void claim()} disabled={busy}>{t(busy ? "busy" : "claim", { points: new Intl.NumberFormat(locale).format(offer.points) })}</Button>}
    {error && <p role="alert" className="w-full text-sm text-destructive">{error}</p>}
  </section>;
}
