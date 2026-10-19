"use client";
import { useEffect, useState } from "react";
import type { VoiceOffer } from "@/contracts/voice";

export function useVoiceOffer(actor: string | null, enabled: boolean) {
  const [result, setResult] = useState<{ actor: string; offer: VoiceOffer } | null>(null);
  useEffect(() => {
    if (!actor || !enabled) return;
    const controller = new AbortController();
    let live = true;
    let expiration: ReturnType<typeof setTimeout> | undefined;
    void fetch("/api/mascot/tts", { headers: { "x-ans-actor": actor }, cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) return null; const value: unknown = await response.json();
        const offer = value as Partial<VoiceOffer> | null;
        return offer?.available === true && (offer.mode === "free" || offer.mode === "paid") && typeof offer.points === "number" && offer.points >= 0 && typeof offer.policyVersion === "string"
          && typeof offer.reviewBy === "string" && Date.parse(offer.reviewBy) > Date.now() ? offer as VoiceOffer : null;
      }).then(offer => { if (live) { setResult(offer ? { actor, offer } : null);
        if (offer) expiration = setTimeout(() => { if (live) setResult(null); }, Math.min(2_147_483_647, Math.max(0, Date.parse(offer.reviewBy) - Date.now())));
      } }).catch(() => { if (live) setResult(null); });
    return () => { live = false; controller.abort(); clearTimeout(expiration); };
  }, [actor, enabled]);
  return enabled && result?.actor === actor ? result.offer : null;
}
