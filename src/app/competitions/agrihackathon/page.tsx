import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Sprout, Telescope, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/layout/page-heading";
import { CompetitionDetails } from "@/components/competitions/competition-details";
import { AGRI_AWARDS, AGRI_DELIVERABLES, AGRI_PHASES, AGRI_TRACKS } from "@/lib/agrihackathon/cluster";
import { readAgriPublicGuide } from "@/server/competitions/agrihackathon/workspace";
import { findAgriHackathonCompetition } from "@/server/competitions/service";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("agriHackathon");
  return { title: t("title"), description: t("description") };
}
const SCORING_KEYS = ["innovation", "technical", "completeness", "problem", "fit"] as const;
const trackStyles = { people: { icon: Sprout }, discovery: { icon: Telescope }, action: { icon: Compass } };
const linkClass = "inline-flex min-h-11 items-center gap-2 rounded-md py-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function AgriHackathonPage() {
  const t = await getTranslations("agriHackathon");
  const wall = await getTranslations("agriWall");
  const locale = await getLocale();
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
  const pending = await getTranslations("product.agrihackathon");
  const tasks = await getTranslations("product.agriTasks");
  const submissions = await getTranslations("product.agriSubmissions");
  const works = await getTranslations("product.agriWorks");
  const publications = await getTranslations("product.agriPublications");
  const onsite = await getTranslations("product.agriOnsite");
  const management = await getTranslations("product.agriWorkspace");
  const competition = await findAgriHackathonCompetition();
  const guide = await readAgriPublicGuide().catch(() => null);

  const tracks = AGRI_TRACKS.map((track) => {
    const copy = t.raw(`tracks.${track.id}`) as {
      name: string;
      code: string;
      role: string;
      description: string;
      status: string;
      detail: string;
    };
    return { ...track, ...copy, ...trackStyles[track.id] };
  });

  const phases = AGRI_PHASES.map((phase) => ({
    id: phase,
    ...(t.raw(`phases.${phase}`) as {
      label: string;
      description: string;
      state: string;
    }),
  }));

  const deliverables = AGRI_DELIVERABLES.map((deliverable) => ({
    id: deliverable,
    label: t(`deliverables.${deliverable}`),
  }));

  const scoring = SCORING_KEYS.map((key) => ({
    id: key,
    ...(t.raw(`scoring.${key}`) as {
      label: string;
      description: string;
    }),
  }));

  const awards = AGRI_AWARDS.map((award) => ({
    id: award,
    ...(t.raw(`awards.${award}`) as {
      label: string;
      amount: string;
      description: string;
    }),
  }));

  const rules = ["opensource", "data", "originality", "team", "demo", "conduct", "rights", "frozen"] as const;

  return <div className="ans-product-shell">
    <div className="ans-product-container ans-page-content space-y-9">
      <Link href="/competitions" className={linkClass}>{t("backToHub")}</Link>
      <PageHeading title={t("title")} description={t("intro")}
        actions={<Button asChild size="lg" className="h-auto min-h-11 w-full whitespace-normal sm:w-auto"><Link href="/explore/submit?event=agrihackathon">{wall("publish")}<ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Link></Button>} />
      <aside aria-labelledby="agri-rules-pending" className="min-w-0 rounded-xl border bg-muted/30 p-5">
        <h2 id="agri-rules-pending" className="font-semibold">{guide ? management("rulesTitle") : pending("rulesPendingTitle")}</h2>
        {guide ? <>
          <details className="mt-2"><summary className="min-h-11 w-fit cursor-pointer rounded py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("readPublishedRules")}</summary><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{guide.rule.guidanceMarkdown}</p></details>
          <p className="mt-3 text-sm text-muted-foreground">{management("publishedVersion")}: {guide.rule.version}</p>
          <ul className="mt-3 space-y-2 text-sm">{guide.rule.windows.map(window => <li key={window.stage}><span className="font-medium">{management("stage." + window.stage)}</span>{" · "}{window.state === "CONFIRMED" && window.opensAt && window.closesAt ? <>{submissions("dates", { opens: formatDate(window.opensAt), closes: formatDate(window.closesAt) })}{" · "}{submissions(window.includesDeadline ? "inclusive" : "exclusive")}</> : management("windowPending")}</li>)}</ul>
        </> : <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{pending("rulesPendingBody")}</p>}
      </aside>

      <nav aria-label={t("nextAction")} className="grid gap-x-8 gap-y-4 border-y py-5 sm:grid-cols-2">
        <div className="min-w-0"><h2 className="font-medium">{t("alreadyEntering")}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{t("entryHint")}</p><div className="flex flex-wrap gap-x-5">
          <Link href="/explore/agrihackathon/submit" className={linkClass}>{t("bindProject")}</Link>
          <Link href="/competitions/agrihackathon/submissions" className={linkClass}>{submissions("title")}</Link>
          <Link href="/competitions/agrihackathon/tasks" className={linkClass}>{tasks("title")}</Link>
          <Link href="/teams" className={linkClass}>{t("openTeams")}</Link>
          {competition && <Link href={`/competitions/${competition.id}`} className={linkClass}>{t("enterWorkbench")}</Link>}
        </div></div>
        <div className="min-w-0"><h2 className="font-medium">{t("justLooking")}</h2><div className="flex flex-wrap gap-x-5">
          <Link href="/explore?category=competition&subcategory=agri-wall" className={linkClass}>{wall("title")}</Link>
          <Link href="/competitions/agrihackathon/showcase" className={linkClass}>{publications("showcaseTitle")}</Link>
        </div></div>
      </nav>

      <section aria-labelledby="agri-tracks-title" className="space-y-4">
        <h2 id="agri-tracks-title" className="text-2xl font-semibold">{t("tracksTitle")}</h2>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{t("tracksDescription")}</p>
        <div className="divide-y">{tracks.map(track => { const Icon = track.icon; return <article key={track.id} id={`track-${track.id}`} className="grid min-w-0 gap-3 py-5 sm:grid-cols-[11rem_1fr]">
          <h3 className="flex items-start gap-2 font-semibold"><Icon className="mt-1 size-4 shrink-0" aria-hidden="true" />{track.name}</h3>
          <div className="min-w-0 space-y-2"><p className="text-sm leading-7">{track.description}</p><details><summary className="min-h-11 w-fit cursor-pointer rounded py-2 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("trackFocus")}</summary><p className="max-w-3xl text-sm leading-7 text-muted-foreground">{track.detail}</p></details></div>
        </article>; })}</div>
      </section>

      <section aria-labelledby="agri-guide-title">
        <h2 id="agri-guide-title" className="mb-4 text-2xl font-semibold">{t("guideTitle")}</h2>
        <CompetitionDetails title={t("phasesTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("phasesDescription")}</p>
          <p className="max-w-3xl text-muted-foreground">{t("description")}</p>
          <dl className="grid gap-4 sm:grid-cols-2">{(["tracks", "scale", "phases", "deliverables"] as const).map(key => <div key={key}><dt className="text-muted-foreground">{t(`stats.${key}`)}</dt><dd className="font-medium">{t(`stats.${key}Value`)}</dd></div>)}</dl>
          <ol className="space-y-4">{phases.map(phase => <li key={phase.id}><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{phase.label}</h3><Badge variant="secondary">{phase.state}</Badge></div><p className="mt-1 max-w-3xl text-muted-foreground">{phase.description}</p></li>)}</ol>
        </CompetitionDetails>
        <CompetitionDetails title={t("deliverablesTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("deliverablesDescription")}</p>
          <ul className="list-disc space-y-2 ps-5">{deliverables.map(item => <li key={item.id}>{item.label}</li>)}</ul>
        </CompetitionDetails>
        <CompetitionDetails title={t("scoringTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("scoringDescription")}</p>
          <dl className="space-y-4">{scoring.map(item => <div key={item.id}><dt className="font-medium">{item.label}</dt><dd className="max-w-3xl text-muted-foreground">{item.description}</dd></div>)}</dl>
          <h3 className="text-base font-semibold">{t("advanceTitle")}</h3>
          <p className="max-w-3xl">{t("advanceDescription")}</p>
          <ul className="list-disc space-y-2 ps-5">{(["professional", "pool", "panel", "review"] as const).map(item => <li key={item}>{t(`advanceItems.${item}`)}</li>)}</ul>
          <p className="max-w-3xl text-muted-foreground">{t("advanceNote")}</p>
        </CompetitionDetails>
        <CompetitionDetails title={t("awardsTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("awardsDescription")}</p>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{awards.map(award => <div key={award.id}><dt className="font-medium">{award.label}<span className="ms-2">{award.amount}</span></dt><dd className="max-w-3xl text-muted-foreground">{award.description}</dd></div>)}</dl>
        </CompetitionDetails>
        <CompetitionDetails title={t("rulesTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("rulesDescription")}</p>
          <ul className="list-disc space-y-3 ps-5">{rules.map(rule => <li key={rule} className="max-w-3xl">{t(`rules.${rule}`)}</li>)}</ul>
        </CompetitionDetails>
        <CompetitionDetails title={t("toolsTitle")}>
          <p className="max-w-3xl text-muted-foreground">{pending("workspaceLinksBody")}</p>
          <div className="flex flex-wrap gap-x-5"><Link href="/explore" className={linkClass}>{t("browseProjects")}</Link><Link href="/hubs" className={linkClass}>{pending("openHubs")}</Link><Link href="/workspace" className={linkClass}>{t("myWorkspace")}</Link></div>
          <p className="max-w-3xl text-muted-foreground">{competition ? t("boundaryDescriptionOpen") : t("boundaryDescription")}</p>
          <ul className="list-disc space-y-2 ps-5">{(["entry", "links", "ownership", "next"] as const).map(item => <li key={item}>{item === "next" && competition ? t("boundaryNextOpen") : t(`boundaryItems.${item}`)}</li>)}</ul>
        </CompetitionDetails>
        <CompetitionDetails title={pending("organizerTools")}>
          <p className="max-w-3xl text-muted-foreground">{pending("organizerToolsBody")}</p>
          <div className="flex flex-wrap gap-x-5">{[
            ["works", works("title")], ["onsite", onsite("title")], ["publication-review", publications("reviewTitle")], ["popularity", wall("managementTitle")], ["manage", management("title")],
          ].map(([path,label]) => <Link key={path} href={`/competitions/agrihackathon/${path}`} className={linkClass}>{label}</Link>)}</div>
        </CompetitionDetails>
      </section>
    </div>
  </div>;
}
