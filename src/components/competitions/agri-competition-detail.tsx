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
  return <main className="container max-w-6xl space-y-9 py-7 sm:py-11">
    <Link href="/competitions/agrihackathon" className="text-sm text-muted-foreground underline-offset-4 hover:underline">{t("back")}</Link>
    <header className="grid gap-6 border-b pb-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{t("eyebrow")}</Badge><Badge variant="outline">{t("configuration." + view.configuration)}</Badge></div>
        <h1 className="max-w-4xl break-words text-3xl font-semibold tracking-tight sm:text-4xl">{view.title}</h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{t("intro")}</p>
        <p className="text-sm text-muted-foreground">{t("organizer", { name: view.organizer || "CAUHub" })}</p>
        <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link href="/competitions/agrihackathon#agri-rules-pending">{t("guide")}<ArrowRight className="size-4" /></Link></Button><Button asChild variant="ghost"><Link href="/teams"><UsersRound className="size-4" />{t("teams")}</Link></Button></div>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-slate-950/90 shadow-sm"><img src="/competitions/agrihackathon/gitglow-workflow.webp" alt={view.title} width={1440} height={900} className="h-auto w-full object-cover" loading="lazy" /></div>
    </header>

    <section aria-labelledby="agri-phase-title" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="agri-phase-title" className="text-2xl font-semibold">{t("windows")}</h2><p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-3.5" />{t("serverTime", { time: date(view.serverNow) })}</p></div>
      <ol className="divide-y rounded-2xl border bg-card px-5 sm:px-6">{view.windows.map((window, index) => <li key={window.stage} className="grid gap-3 py-5 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <div className="flex items-start gap-3"><span className="mt-0.5 font-mono text-xs text-muted-foreground">0{index + 1}</span><div className="space-y-2"><h3 className="font-semibold">{t("stage." + window.stage)}</h3><Badge variant={ready && window.state === "OPEN" ? "default" : "outline"}>{t(ready ? "window." + window.state : "configuration." + view.configuration)}</Badge></div></div>
        <div className="space-y-1.5 text-sm leading-6"><p className="text-muted-foreground">{t("stageDescription." + window.stage)}</p>{window.opensAt && window.closesAt ? <><p>{t("dateRange", { opens: date(window.opensAt), closes: date(window.closesAt) })}</p><p className="text-xs text-muted-foreground">{t(window.includesDeadline ? "deadlineInclusive" : "deadlineExclusive")}</p></> : <p>{t("datesPending")}</p>}</div>
      </li>)}</ol>
      {!ready && <p role="status" className="rounded-xl border bg-muted/30 p-4 text-sm leading-6">{t("configurationBody." + view.configuration)}</p>}
    </section>

    <section id="actions" aria-labelledby="agri-my-team-title" className="space-y-4">
      <h2 id="agri-my-team-title" className="text-2xl font-semibold">{t("myTeams")}</h2>
      {!view.viewer ? <div className="space-y-3 rounded-xl border border-dashed p-5"><p className="text-sm text-muted-foreground">{t("loginBody")}</p><Button asChild><Link href={`/login?callbackUrl=${encodeURIComponent(`/competitions/${view.competitionId}`)}`}>{t("login")}</Link></Button></div>
        : !view.viewer.available ? <p role="alert" className="text-sm text-destructive">{t("errors.ACCOUNT_CHANGED")}</p>
        : <AccountContentBoundary actorId={actorId ?? ""}><>
          {entries.length === 0 && <p className="text-sm leading-6 text-muted-foreground">{t("noRegistration")}</p>}
          {entries.map(entry => <article key={entry.id} className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="break-words text-lg font-semibold">{entry.teamName}</h3><Badge variant="secondary">{t("finalist." + entry.finalist)}</Badge></div>
            <p className="text-sm leading-6 text-muted-foreground">{t("finalistBody." + entry.finalist)}</p>
            <div className="grid gap-5 sm:grid-cols-2">{(["PRELIMINARY", "FINAL"] as const).map(stage => {
              const snapshot = entry.stages.find(item => item.stage === stage);
              const window = view.windows.find(item => item.stage === stage);
              const preparationOpen = window?.state === "OPEN" || window?.state === "NOT_OPEN";
              const allowed = !!snapshot || (ready && preparationOpen && (stage === "PRELIMINARY" || entry.finalist === "ELIGIBLE"));
              return <div key={stage} className="space-y-3 border-t pt-4"><h4 className="flex items-center gap-2 text-sm font-semibold"><FileCheck2 className="size-4" />{t("stage." + stage)}</h4>
                <p className="text-sm text-muted-foreground">{snapshot?.sequence ? t("submittedVersion", { sequence: snapshot.sequence }) : t("notSubmitted")}{snapshot?.frozen && <span className="ml-2 inline-flex items-center gap-1"><LockKeyhole className="size-3" />{t("frozen")}</span>}</p>
                {snapshot?.acceptedAt && <p className="text-xs text-muted-foreground">{t("acceptedAt", { time: date(snapshot.acceptedAt) })}</p>}
                {allowed ? <Button asChild size="sm" variant="outline"><Link href={stageHref(entry.id, stage)}>{t(snapshot ? "viewStage" : "prepareStage")}<ArrowRight className="size-4" /></Link></Button> : <p className="text-xs leading-5 text-muted-foreground">{t(stage === "FINAL" && entry.finalist !== "ELIGIBLE" ? "finalistRequired" : "preparationClosed")}</p>}
              </div>;
            })}</div>
          </article>)}
          {ready && registration?.state === "OPEN" && registerTeams.length > 0 && actorId && <div className="space-y-3 rounded-xl border p-5"><h3 className="font-semibold">{t("registerAnother")}</h3><AgriCompetitionRegistration competitionId={view.competitionId} actorId={actorId} teams={registerTeams} /></div>}
          {ready && registration?.state === "OPEN" && !registerTeams.length && !entries.length && <Button asChild variant="outline"><Link href="/teams">{t("createTeam")}</Link></Button>}
        </></AccountContentBoundary>}
    </section>

    <aside className="space-y-2 rounded-xl bg-muted/40 p-5 text-sm leading-7"><p className="font-semibold">{t("technicalBoundaryTitle")}</p><p className="max-w-4xl text-muted-foreground">{t("technicalBoundary")}</p><p className="max-w-4xl text-muted-foreground">{t("frozenBoundary")}</p></aside>
    {view.rule && <section aria-labelledby="agri-confirmed-guide" className="space-y-3"><h2 id="agri-confirmed-guide" className="text-xl font-semibold">{t("publishedGuide", { version: view.rule.version })}</h2><p className="max-w-4xl whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{view.rule.guidanceMarkdown}</p></section>}
  </main>;
}