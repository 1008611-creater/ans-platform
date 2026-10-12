"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function QuotaClaimButton({ points, actorId }: { points: number; actorId: string }) {
  const t = useTranslations("homepageNext");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    if (inFlight.current || !actorId) return;
    inFlight.current = true; setRequesting(true);
    setError(null);
    try {
      const res = await fetch("/api/quota/claim", { method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actorId }, body: "{}" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? t("computeClaimError"));
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError(t("computeClaimNetworkError"));
    } finally { inFlight.current = false; setRequesting(false); }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button size="lg" onClick={claim} disabled={pending || requesting || !actorId}>
        {pending || requesting ? (
          <Loader2 className="me-2 h-4 w-4 animate-spin" />
        ) : (
          <Zap className="me-2 h-4 w-4" />
        )}
        {t("computeClaimAction", { points: points.toLocaleString(locale) })}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
