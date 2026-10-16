"use client";

import { useRef, useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useMarketRequest } from "./account-boundary";

interface StarState { starCount: number; starred: boolean; eventVote?: { open: boolean; eligible: boolean; voted: boolean } }
export function MarketStar({ listingId, initialCount, initialStarred, initialEventVote }: { listingId: string; initialCount: number; initialStarred: boolean; initialEventVote?: StarState["eventVote"] }) {
  const request = useMarketRequest();
  const t = useTranslations("product.marketProject");
  const agri = useTranslations("agriWall");
  const [state, setState] = useState<StarState>({ starCount: initialCount, starred: initialStarred, eventVote: initialEventVote });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const flight = useRef(false);
  const pending = useRef<boolean | null>(null);
  async function toggle() {
    if (flight.current) return;
    flight.current = true; setBusy(true); setError("");
    try {
      if (pending.current === null) {
        // A previous Star may predate voting. Resolve current server state before
        // choosing the desired state; the visitor still performs just one action.
        const current = state.starred ? await request<StarState>(`/api/market/listings/${listingId}/star`, "GET", undefined) : state;
        pending.current = current.eventVote?.open && current.eventVote.eligible && !current.eventVote.voted ? true : !current.starred;
      }
      const result = await request<StarState>(`/api/market/listings/${listingId}/star`, "PUT", { starred: pending.current });
      setState(result); pending.current = null;
      window.dispatchEvent(new CustomEvent("ans:market-star-changed", { detail: { listingId } }));
    } catch { setError(t("starFailed")); }
    finally { flight.current = false; setBusy(false); }
  }
  return <div className="space-y-2"><Button type="button" variant="outline" aria-pressed={state.starred} disabled={busy} onClick={toggle} className="h-auto min-h-11 w-full whitespace-normal py-2.5"><Star aria-hidden="true" className={state.starred ? "fill-primary text-primary" : ""}/>{state.eventVote?.open && state.eventVote.eligible && !state.eventVote.voted ? agri(busy ? "confirmingVote" : "confirmVote") : t(busy ? "starring" : state.starred ? "starred" : "star")}<span className="shrink-0 tabular-nums">{state.starCount}</span></Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
