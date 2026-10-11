"use client";
import { useId, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { AgriCompetitionPhaseView } from "@/contracts/agri-phase-view";

export function AgriCompetitionRegistration({ competitionId, actorId, teams }: {
  competitionId: string; actorId: string; teams: NonNullable<AgriCompetitionPhaseView["viewer"]>["teams"];
}) {
  const t = useTranslations("product.agriPhases"); const router = useRouter(); const { data, status } = useSession(); const selectId = useId();
  const [teamId, setTeamId] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const accountChanged = status === "authenticated" && data?.user?.id !== actorId;
  async function register() {
    if (busy || status !== "authenticated" || accountChanged || !teams.some(team => team.id === teamId)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/competitions/${encodeURIComponent(competitionId)}/register`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actorId }, body: JSON.stringify({ teamId }),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) { setError(result.error?.code ?? "INTERNAL_ERROR"); return; }
      router.refresh();
    } catch { setError("INTERNAL_ERROR"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3">
    <label htmlFor={selectId} className="block text-sm font-medium">{t("registrationTeam")}</label>
    <div className="flex flex-col gap-3 sm:flex-row">
      <select id={selectId} className="min-h-11 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm" value={teamId} disabled={busy || accountChanged} onChange={event => setTeamId(event.target.value)}>
        <option value="">{t("selectTeam")}</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
      </select>
      <Button className="min-h-11" disabled={busy || status !== "authenticated" || accountChanged || !teamId} onClick={() => void register()}>{t(busy ? "registering" : "register")}</Button>
    </div>
    {(accountChanged || error) && <p role="alert" className="text-sm text-destructive">{t(accountChanged ? "errors.ACCOUNT_CHANGED" : t.has("errors." + error) ? "errors." + error : "errors.INTERNAL_ERROR")}</p>}
  </div>;
}