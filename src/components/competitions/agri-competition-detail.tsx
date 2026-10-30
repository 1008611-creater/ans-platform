import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Clock3, FileCheck2, LockKeyhole, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgriCompetitionPhaseView } from "@/contracts/agri-phase-view";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { AgriCompetitionRegistration } from "./agri-competition-registration";

export async function AgriCompetitionDetail({ view, actorId }: { view: AgriCompetitionPhaseView; actorId?: string }) {
  const t = await getTranslations("product.agriPhases"); const locale = await getLocale();
  const date = (value: string) => new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale, { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "medium", hour12: false }).format(new Date(value));
  const registration = view.windows.find(window => window.stage === "REGISTRATION");
  const ready = view.configuration === "READY";
  const entries = view.viewer?.entries ?? [];
  const registerTeams = view.viewer?.teams.filter(team => !entries.some(entry => entry.teamId === team.id)) ?? [];
  const stageHref = (entryId: string, stage: string) => `/competitions/agrihackathon/submissions?teamCompetitionId=${encodeURIComponent(entryId)}&stage=${stage}`;
  return <main className="container max-w-5xl space-y-6 py-6 sm:py-9">
    <Link href="/competitions/agrihackathon" className="text-sm text-muted-foreground underline-offset-4 hover:underline">{t("back")}</Link>
    <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{t("eyebrow")}</Badge><Badge variant="outline">{t("configuration." + view.configuration)}</Badge><span className="text-xs text-muted-foreground">{t("organizer", { name: view.organizer || "CAUHub" })}</span></div>
        <h1 className="max-w-4xl break-words text-2xl font-semibold tracking-tight sm:text-3xl">{view.title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><Link href="/competitions/agrihackathon#agri-rules-pending">{t("guide")}<ArrowRight className="size-4" aria-hidden="true" /></Link></Button><Button asChild variant="ghost" size="sm"><Link href="/teams"><UsersRound className="size-4" aria-hidden="true" />{t("teams")}</Link></Button></div>
    </header>

    <section id="actions" aria-labelledby="agri-my-team-title" className="space-y-4">
      <h2 id="agri-my-team-title" className="text-xl font-semibold">{t("myTeams")}</h2>
      {!view.viewer ? <div className="space-y-3 rounded-xl border border-dashed p-5"><p className="text-sm text-muted-foreground">{t("loginBody")}</p><Button asChild><Link href={`/login?callbackUrl=${encodeURIComponent(`/competitions/${view.competitionId}`)}`}>{t("login")}</Link></Button></div>
        : !view.viewer.available ? <p role="alert" className="text-sm text-destructive">{t("errors.ACCOUNT_CHANGED")}</p>
        : <AccountContentBoundary actorId={actorId ?? ""}><>
          {entries.length === 0 && <p className="text-sm leading-6 text-muted-foreground">{t("noRegistration")}</p>}
          {entries.map(entry => <article key={entry.id} className="space-y-4 rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="break-words text-lg font-semibold">{entry.teamName}</h3><Badge variant="secondary">{t("finalist." + entry.finalist)}</Badge></div>
            <p className="text-xs text-muted-foreground">{t("finalistBody." + entry.finalist)}</p>
            <div className="grid gap-4 sm:grid-cols-2">{(["PRELIMINARY", "FINAL"] as const).map(stage => {
              const snapshot = entry.stages.find(item => item.stage === stage);
              const window = view.windows.find(item => item.stage === stage);
              const preparationOpen = window?.state === "OPEN" || window?.state === "NOT_OPEN";
              const allowed = !!snapshot || (ready && preparationOpen && (stage === "PRELIMINARY" || entry.finalist === "ELIGIBLE"));
              return <div key={stage} className="space-y-2.5 border-t pt-3.5"><h4 className="flex items-center gap-2 text-sm font-semibold"><FileCheck2 className="size-4" aria-hidden="true" />{t("stage." + stage)}</h4>
                <p className="text-sm text-muted-foreground">{snapshot?.sequence ? t("submittedVersion", { sequence: snapshot.sequence }) : t("notSubmitted")}{snapshot?.frozen && <span className="ml-2 inline-flex items-center gap-1"><LockKeyhole className="size-3" aria-hidden="true" />{t("frozen")}</span>}</p>
                {snapshot?.acceptedAt && <p className="text-xs text-muted-foreground">{t("acceptedAt", { time: date(snapshot.acceptedAt) })}</p>}
                {allowed ? <Button asChild size="sm" variant="outline"><Link href={stageHref(entry.id, stage)}>{t(snapshot ? "viewStage" : "prepareStage")}<ArrowRight className="size-4" aria-hidden="true" /></Link></Button> : <p className="text-xs leading-5 text-muted-foreground">{t(stage === "FINAL" && entry.finalist !== "ELIGIBLE" ? "finalistRequired" : "preparationClosed")}</p>}
              </div>;
            })}</div>
          </article>)}
          {ready && registration?.state === "OPEN" && registerTeams.length > 0 && actorId && <div className="space-y-3 rounded-xl border p-5"><h3 className="font-semibold">{t("registerAnother")}</h3><AgriCompetitionRegistration competitionId={view.competitionId} actorId={actorId} teams={registerTeams} /></div>}
          {ready && registration?.state === "OPEN" && !registerTeams.length && !entries.length && <Button asChild variant="outline"><Link href="/teams">{t("createTeam")}</Link></Button>}
        </></AccountContentBoundary>}
    </section>

    <section aria-labelledby="agri-phase-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="agri-phase-title" className="text-xl font-semibold">{t("windows")}</h2><p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />{t("serverTime", { time: date(view.serverNow) })}</p></div>
      <ol className="grid gap-3 sm:grid-cols-3">{view.windows.map((window, index) => <li key={window.stage} className="space-y-2 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-muted-foreground">0{index + 1} · {t("stage." + window.stage)}</span><Badge variant={ready && window.state === "OPEN" ? "default" : "outline"}>{t(ready ? "window." + window.state : "configuration." + view.configuration)}</Badge></div>
        <div className="space-y-1 text-xs leading-5"><p className="text-muted-foreground">{t("stageDescription." + window.stage)}</p>{window.opensAt && window.closesAt ? <><p className="font-medium text-foreground">{t("dateRange", { opens: date(window.opensAt), closes: date(window.closesAt) })}</p><p className="text-muted-foreground">{t(window.includesDeadline ? "deadlineInclusive" : "deadlineExclusive")}</p></> : <p className="text-muted-foreground">{t("datesPending")}</p>}</div>
      </li>)}</ol>
      {!ready && <p role="status" className="rounded-xl border bg-muted/30 p-3.5 text-sm leading-6">{t("configurationBody." + view.configuration)}</p>}
    </section>

    <details className="rounded-xl border bg-muted/25 p-4 text-xs leading-6">
      <summary className="cursor-pointer font-semibold text-foreground">{t("technicalBoundaryTitle")}</summary>
      <div className="mt-2 space-y-1.5 text-muted-foreground">
        <p>{t("technicalBoundary")}</p>
        <p>{t("frozenBoundary")}</p>
      </div>
    </details>
    {view.rule && <details className="rounded-xl border bg-card p-4 text-xs leading-6"><summary id="agri-confirmed-guide" className="cursor-pointer font-semibold text-foreground">{t("publishedGuide", { version: view.rule.version })}</summary><p className="mt-2 max-w-4xl whitespace-pre-wrap break-words text-muted-foreground">{view.rule.guidanceMarkdown}</p></details>}
  </main>;
}