"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { AgriTeamCredits } from "@/contracts/agri-credits";

interface Props { actorId: string; teamCompetitionId: string; onAccountChanged: () => void }
export function AgriCredits(props: Props) {
  return <AgriCreditsWallet key={props.actorId + ":" + props.teamCompetitionId} {...props} />;
}
function AgriCreditsWallet({ actorId, teamCompetitionId, onAccountChanged }: Props) {
  const t = useTranslations("product.agriCredits");
  const [data, setData] = useState<AgriTeamCredits | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const alive = useRef(true), flight = useRef(false);
  const load = useCallback(async (claim = false) => {
    if (flight.current) return;
    flight.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/competitions/agrihackathon/credits" + (claim ? "" : "?" + new URLSearchParams({ teamCompetitionId })), {
        cache: "no-store", headers: { "x-ans-submission-actor": actorId, ...(claim ? { "Content-Type": "application/json" } : {}) },
        ...(claim ? { method: "POST", body: JSON.stringify({ action: "claim", teamCompetitionId }) } : {}),
      });
      const body = await response.json();
      if (!alive.current) return;
      if (!response.ok || !body.ok) {
        const code = body.error?.code ?? "INTERNAL_ERROR";
        if (["ACCOUNT_CHANGED", "UNAUTHORIZED", "ACCOUNT_UNAVAILABLE"].includes(code)) { onAccountChanged(); return; }
        setError(code); return;
      }
      setData(body.data);
    } catch { if (alive.current) setError("INTERNAL_ERROR"); }
    finally { flight.current = false; if (alive.current) setBusy(false); }
  }, [actorId, teamCompetitionId, onAccountChanged]);
  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, [load]);
  return <section className="space-y-3 rounded-lg border p-4" aria-label={t("title")}>
    <h3 className="font-medium">{t("title")}</h3>
    {busy && <p role="status">{t("loading")}</p>}
    {error && <p role="alert">{t.has("errors." + error) ? t("errors." + error) : t("errors.INTERNAL_ERROR")}</p>}
    {data && <>{data.state === "UNCONFIGURED" ? <p className="text-sm text-muted-foreground">{t("unconfigured")}</p> : data.state === "AVAILABLE" ? <p className="text-sm">{t(data.canClaim ? "available" : "waiting")}</p> : <><dl className="grid grid-cols-3 gap-3 text-sm">{(["amount", "used", "remaining"] as const).map(field => <div key={field}><dt className="text-muted-foreground">{t(field)}</dt><dd className="mt-1 font-semibold tabular-nums">{data[field]}</dd></div>)}</dl><p className="text-sm text-muted-foreground">{t(data.spendingEnabled ? "usage" : "paused")}</p></>}
    {data.canClaim && <Button disabled={busy} onClick={() => void load(true)}>{t("claim")}</Button>}</>}
    <Button variant="ghost" size="sm" disabled={busy} onClick={() => void load()}>{t("refresh")}</Button>
  </section>;
}
