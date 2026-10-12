"use client";

import { useMarketRequest } from "./account-boundary";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MarketListingInput } from "@/contracts/marketplace";
import { MarketRequestRejection } from "./request";
import { Button } from "@/components/ui/button";

export function CreatePointsOrder({ listingId, version, available, tiers = [], priceMinor, isOwner = false }: { listingId: string; version: number; available: boolean; tiers?: MarketListingInput["pricingTiers"]; priceMinor?: number; isOwner?: boolean }) {
  const marketRequest = useMarketRequest(); const t = useTranslations("product.market"); const tp = useTranslations("product.marketProject"); const router = useRouter();
  const [tierId, setTierId] = useState(tiers[0]?.id ?? "");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const command = useRef<{ listingId: string; expectedVersion: number; idempotencyKey: string; requirements: string; tierId?: string } | null>(null); const flight = useRef(false);
  const pending = command.current !== null;
  const selected = tiers.find(tier => tier.id === tierId);
  async function create() {
    if (flight.current || isOwner) return;
    flight.current = true; setBusy(true); setError("");
    command.current ??= { listingId, expectedVersion: version, idempotencyKey: crypto.randomUUID(), requirements: "", ...(tierId ? { tierId } : {}) };
    try { const result = await marketRequest<{ order: { id: string } }>("/api/market/orders", "POST", command.current); router.push(`/market/orders/${result.order.id}`); }
    catch (caught) {
      const code = caught instanceof Error ? caught.message : "INTERNAL_ERROR";
      if (caught instanceof MarketRequestRejection) command.current = null;
      setError(tp.has(`errors.${code}`) ? tp(`errors.${code}`) : t(t.has(`errors.${code}`) ? `errors.${code}` : "errors.INTERNAL_ERROR"));
    } finally { flight.current = false; setBusy(false); }
  }
  return <div className="space-y-4">{tiers.length > 0 && <fieldset disabled={busy || pending} className="space-y-3"><legend className="mb-3 text-sm font-semibold">{tp("chooseTier")}</legend>{tiers.map(tier => <label key={tier.id} className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-4 ${tierId === tier.id ? "border-primary bg-primary/5" : "bg-background"}`}><input type="radio" name="market-tier" value={tier.id} checked={tierId === tier.id} onChange={() => setTierId(tier.id)} className="mt-1 accent-primary"/><span className="min-w-0 flex-1"><span className="flex flex-wrap justify-between gap-2"><strong className="break-words">{tier.title}</strong><span className="text-sm font-semibold tabular-nums">{t("pointsUnit", { amount: tier.priceMinor / 100 })}</span></span>{tier.description && <span className="mt-2 block break-words text-sm leading-6 text-muted-foreground">{tier.description}</span>}<span className="mt-2 block space-y-1 text-xs leading-6">{tier.deliverables.map((item, index) => <span className="block break-words" key={index}>· {item}</span>)}</span></span></label>)}</fieldset>}
    <p className="flex flex-wrap justify-between gap-2 border-t pt-4 text-sm"><span>{tp("orderTotal")}</span><strong className="tabular-nums">{t("pointsUnit", { amount: (selected?.priceMinor ?? priceMinor ?? 0) / 100 })}</strong></p>
    <Button className="w-full" disabled={!available || busy || isOwner} onClick={create}>{isOwner ? tp("ownProject") : t(busy ? "saving" : available ? "createPointsOrder" : "paymentUnavailable")}</Button><p className="text-xs leading-6 text-muted-foreground">{t("pointsOrderNote")}</p>{pending && !busy && error && <p className="text-xs leading-6 text-muted-foreground">{tp("orderRetry")}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
