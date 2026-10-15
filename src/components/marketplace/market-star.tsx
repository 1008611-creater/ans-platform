"use client";

import { useRef, useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useMarketRequest } from "./account-boundary";

export function MarketStar({ listingId, initialCount, initialStarred }: { listingId: string; initialCount: number; initialStarred: boolean }) {
  const request = useMarketRequest();
  const t = useTranslations("product.marketProject");
  const [state, setState] = useState({ starCount: initialCount, starred: initialStarred });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const flight = useRef(false);
  const pending = useRef<boolean | null>(null);
  async function toggle() {
    if (flight.current) return;
    flight.current = true; setBusy(true); setError("");
    pending.current ??= !state.starred;
    try {
      const result = await request<{ starCount: number; starred: boolean }>(`/api/market/listings/${listingId}/star`, "PUT", { starred: pending.current });
      setState(result); pending.current = null;
      window.dispatchEvent(new CustomEvent("ans:market-star-changed", { detail: { listingId } }));
    } catch { setError(t("starFailed")); }
    finally { flight.current = false; setBusy(false); }
  }
  return <div className="space-y-2"><Button type="button" variant="outline" aria-pressed={state.starred} disabled={busy} onClick={toggle} className="w-full"><Star aria-hidden="true" className={state.starred ? "fill-primary text-primary" : ""}/>{t(busy ? "starring" : state.starred ? "starred" : "star")}<span className="tabular-nums">{state.starCount}</span></Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
