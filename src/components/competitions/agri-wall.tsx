"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ArrowUpRight, CheckCircle2, Clock3, Cpu, ExternalLink, RefreshCw, Share2, Sprout, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MarketAccountBoundary, useMarketRequest } from "@/components/marketplace/account-boundary";
import { MarketStar } from "@/components/marketplace/market-star";
import { agriWallCommandSchema, type AgriPopularityView, type AgriWallMine, type AgriWallView } from "@/contracts/agri-wall";

const API = "/api/competitions/agrihackathon/wall";
const WALL = "/explore?category=competition&subcategory=agri-wall";
const SUBMIT = "/explore/agrihackathon/submit";
const selectClass = "min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
function formatTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short", hourCycle: "h23" }).format(new Date(value));
}

/** datetime-local deliberately represents Beijing time, independent of the browser timezone. */
export function beijingDateTimeToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const parsed = new Date(value + ":00+08:00");
  if (!Number.isFinite(parsed.getTime())) return null;
  const local = new Date(parsed.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);
  return local === value ? value + ":00+08:00" : null;
}
function beijingLocal(value: string) { return new Date(Date.parse(value) + 8 * 60 * 60 * 1000).toISOString().slice(0, 16); }
function ErrorNotice({ code }: { code: string }) {
  const t = useTranslations("agriWall");
  return <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6 text-destructive">{t.has("errors." + code) ? t("errors." + code) : t("errors.INTERNAL_ERROR")}</p>;
}
function RoundNotice({ round }: { round: AgriPopularityView | null }) {
  const t = useTranslations("agriWall"); const locale = useLocale();
  return <section aria-label={t("popularity")} className="grid gap-5 rounded-2xl border bg-muted/30 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
    <div>
      <div className="flex flex-wrap items-center gap-3"><Star className="size-5 text-primary" aria-hidden="true" /><h2 className="text-lg font-semibold">{t("popularity")}</h2><Badge variant="secondary">{t(round ? "states." + round.state : "states.UNCONFIGURED")}</Badge></div>
      <p className="mt-2.5 max-w-2xl text-sm leading-6 text-muted-foreground">{t(round ? "roundCopy." + round.state : "roundCopy.UNCONFIGURED")}</p>
      {round && <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"><Clock3 className="size-4 shrink-0" aria-hidden="true" /><time dateTime={round.opensAt}>{formatTime(round.opensAt, locale)}</time><span aria-hidden="true">—</span><time dateTime={round.closesAt}>{formatTime(round.closesAt, locale)}</time><span className="text-muted-foreground">{t("beijing")}</span></p>}
      <details className="mt-3.5 text-sm"><summary className="w-fit cursor-pointer rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("rulesTitle")}</summary><ul className="mt-2.5 list-disc space-y-1.5 ps-5 text-xs leading-5 text-muted-foreground">{["window", "account", "team", "total", "tie", "frozen"].map(rule => <li key={rule}>{t("rules." + rule)}</li>)}</ul></details>
    </div>
    <figure className="overflow-hidden rounded-xl border bg-slate-950/90 shadow-sm">
      <Image src="/competitions/agrihackathon/gitglow-wall.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" />
    </figure>
  </section>;
}

function ShareVoteButton({ slug, title, teamName, validStars }: { slug: string; title: string; teamName: string; validStars: number }) {
  const t = useTranslations("agriWall");
  const [state, setState] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  const [manualText, setManualText] = useState("");
  async function handleShare() {
    const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
    const url = `${origin}/competitions/agrihackathon/wall/${encodeURIComponent(slug)}`;
    const text = t("shareText", { title, team: teamName, stars: validStars, url });
    setState("copying");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("CLIPBOARD_UNAVAILABLE");
      await navigator.clipboard.writeText(text);
      setState("copied"); setManualText("");
    } catch {
      setState("failed"); setManualText(text);
    }
  }
  return <div className="space-y-2">
    <Button type="button" variant="secondary" size="sm" disabled={state === "copying"} onClick={() => void handleShare()} className="h-auto min-h-11 w-full whitespace-normal">
      <Share2 className="size-3.5 shrink-0" aria-hidden="true" />
      {t(state === "copied" ? "shareCopied" : "shareVote")}
    </Button>
    {state === "copied" && <span role="status" className="sr-only">{t("shareCopied")}</span>}
    {state === "failed" && <><p role="alert" className="text-sm text-destructive">{t("shareFailed")}</p><textarea aria-label={t("shareVote")} readOnly value={manualText} onFocus={event => event.currentTarget.select()} className="min-h-24 w-full rounded-md border bg-background p-3 text-sm [overflow-wrap:anywhere]" /></>}
  </div>;
}

function EventVoteStatus({ eligible, voted, open }: { eligible: boolean | null; voted: boolean; open: boolean }) {
  const t = useTranslations("agriWall");
  if (!open) return null;
  if (eligible === false) return <p className="text-xs leading-6 text-muted-foreground">{t("ownTeamVote")}</p>;
  return voted ? <p role="status" className="flex items-center gap-2 text-xs leading-6 text-primary"><CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />{t("voted")}</p> : null;
}

export function AgriWall({ initialView }: { initialView?: AgriWallView } = {}) {
  const { data: session, status } = useSession(); const actorId = session?.user?.id ?? null;
  const t = useTranslations("agriWall");
  const [loaded, setLoaded] = useState<{ actor: string | null; view: AgriWallView } | null>(initialView ? { actor: null, view: initialView } : null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(!initialView); const [refresh, setRefresh] = useState(0); const [query, setQuery] = useState("");
  useEffect(() => {
    if (status === "loading") return;
    const controller = new AbortController();
    void fetch(API, { cache: "no-store", credentials: "same-origin", signal: controller.signal, headers: actorId ? { "x-ans-actor": actorId } : {} })
      .then(async response => { const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error?.code ?? "INTERNAL_ERROR"); return result.data as AgriWallView; })
      .then(view => { if (!controller.signal.aborted) { setLoaded({ actor: actorId, view }); setError(""); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "INTERNAL_ERROR"); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [actorId, status, refresh]);
  useEffect(() => {
    const update = () => { setBusy(true); setRefresh(value => value + 1); };
    window.addEventListener("ans:market-star-changed", update);
    const timer = window.setInterval(update, 60_000);
    return () => { window.removeEventListener("ans:market-star-changed", update); window.clearInterval(timer); };
  }, []);
  const view = loaded?.actor === actorId ? loaded.view : null;
  const loading = busy || status === "loading" || (!view && !error);
  function refreshView() { setBusy(true); setError(""); setRefresh(value => value + 1); }
  const searchId = useId();
  const entries = view?.entries.filter(entry => (entry.offer.listing.title + " " + entry.offer.listing.summary + " " + entry.teamName).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) ?? [];
  const sorted = [...entries].sort((a, b) => b.validStars - a.validStars || a.offer.listing.title.localeCompare(b.offer.listing.title));
  const frozen = view?.round?.state === "CLOSED" && !!view.round.frozenAt;
  const results = view?.round?.results ?? [];
  const ranks = new Map(results.map(row => [row.entryId, row]));
  return <div className="space-y-7">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><p className="mb-3 text-sm font-medium text-primary">{t("eyebrow")}</p><h1 className="ans-page-title">{t("title")}</h1><p className="mt-4 text-base leading-7 text-muted-foreground">{t("description")}</p></div><div className="flex shrink-0 flex-wrap gap-2"><Button asChild><Link href={SUBMIT}>{t("join")}<ArrowRight aria-hidden="true" /></Link></Button><Button asChild variant="secondary"><Link href="/workspace/credits"><Cpu className="size-4" aria-hidden="true" />{t("claimCompute")}</Link></Button><Button asChild variant="outline"><Link href="/competitions/agrihackathon/showcase"><Trophy className="size-4" aria-hidden="true" />{t("viewShowcase")}</Link></Button><Button asChild variant="outline"><Link href="/competitions/agrihackathon">{t("eventGuide")}</Link></Button></div></header>
    {error && <ErrorNotice code={error} />}
    {!view && loading && <p role="status" className="py-12 text-center text-sm text-muted-foreground">{t("loading")}</p>}
    {!view && !loading && error && <Button variant="outline" onClick={refreshView}><RefreshCw aria-hidden="true" />{t("retry")}</Button>}
    {view && <>
      {!view.configured && <div role="status" className="rounded-xl border p-5 text-sm leading-7 text-muted-foreground">{t("eventUnconfigured")}</div>}
      <RoundNotice round={view.round} />
      {frozen && <section className="rounded-2xl border border-primary/30 p-5 sm:p-6">
        <div className="flex items-center gap-3"><Trophy className="size-5 text-primary" aria-hidden="true" /><h2 className="text-lg font-semibold">{t("finalResults")}</h2></div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("finalResultsHint")}</p>
        {!results.some(row => row.winner) && <p className="mt-4 text-sm">{t("noWinner")}</p>}
        {results.length > 0 && <ol aria-label={t("rankingListTitle")} className="mt-5 divide-y">{[...results].sort((a, b) => a.rank - b.rank || a.entryId.localeCompare(b.entryId)).map(row => <li key={row.entryId} className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="[overflow-wrap:anywhere] font-medium">{row.title}</p><p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{row.teamName}</p></div><div className="flex shrink-0 flex-wrap items-center gap-2"><span className="text-sm">{t("rankLabel", { rank: row.rank })}</span><Badge variant={row.winner ? "default" : "secondary"}>{t(row.winner ? "winnerVotes" : "rankVotes", { count: row.votes })}</Badge></div></li>)}</ol>}
      </section>}
      <section aria-labelledby="agri-wall-projects"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 id="agri-wall-projects" className="text-lg font-semibold">{t("works", { count: view.entries.length })}</h2><div className="flex gap-2"><label className="sr-only" htmlFor={searchId}>{t("search")}</label><Input id={searchId} type="search" maxLength={200} value={query} onChange={event => setQuery(event.target.value)} placeholder={t("search")} className="min-h-11 sm:w-64" /><Button variant="outline" size="icon" aria-label={t("refresh")} disabled={busy} onClick={refreshView} className="size-11 shrink-0"><RefreshCw className={busy ? "animate-spin" : ""} aria-hidden="true" /></Button></div></div>
        {sorted.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{sorted.map(entry => {
          const result = ranks.get(entry.id);
          const rank = result?.rank;
          const higherStars = result ? results.filter(row => row.votes > result.votes).reduce<number | undefined>((nearest, row) => nearest === undefined ? row.votes : Math.min(nearest, row.votes), undefined) : undefined;
          const rankBadge = rank ? t(rank <= 3 ? "rankTop" : "rankLabel", { rank }) : null;
          const rankHint = frozen ? null : higherStars !== undefined && result ? t("gapHint", { gap: higherStars - result.votes }) : (rank === 1 && result && result.votes > 0 ? t("leaderHint") : null);
          return <article key={entry.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary/40">{entry.offer.listing.coverUrl && <Link href={`/explore/member-${entry.offer.slug}`} tabIndex={-1} aria-hidden="true"><Image src={entry.offer.listing.coverUrl} alt="" width={720} height={450} unoptimized className="aspect-[8/5] w-full border-b object-cover" /></Link>}<div className="flex flex-1 flex-col p-5 sm:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><span className="min-w-0 break-words text-sm text-muted-foreground">{entry.teamName}</span><div className="flex flex-wrap items-center gap-1.5">{rankBadge && <Badge variant={rank! <= 3 ? "default" : "secondary"}>{rankBadge}</Badge>}{entry.eligible ? <Badge variant="outline">{t("entry")}</Badge> : <Badge variant="secondary">{t("ineligible")}</Badge>}</div></div><h3 className="break-words text-xl font-semibold leading-snug"><Link className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`/explore/member-${entry.offer.slug}`}>{entry.offer.listing.title}</Link></h3><p className="mt-3 break-words text-sm leading-7 text-muted-foreground">{entry.offer.listing.summary}</p><div className="mt-5 flex flex-wrap gap-4 text-sm">{entry.offer.listing.githubUrl && <a href={entry.offer.listing.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">GitHub<ExternalLink className="size-3.5" aria-hidden="true" /></a>}{(entry.offer.listing.previewUrl || entry.offer.listing.usageUrl) && <a href={entry.offer.listing.previewUrl || entry.offer.listing.usageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">{t("demo")}<ExternalLink className="size-3.5" aria-hidden="true" /></a>}<Link className="ms-auto inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline" href={`/explore/member-${entry.offer.slug}`}>{t("details")}<ArrowUpRight className="size-4" aria-hidden="true" /></Link></div></div><div className="space-y-3 border-t bg-muted/20 p-5 sm:px-6"><div className="flex flex-wrap items-baseline justify-between gap-2"><div className="space-y-0.5"><span className="text-sm text-muted-foreground">{t(frozen ? "frozenStars" : "validStars")}</span>{rankHint && <p className="text-xs text-primary">{rankHint}</p>}</div><span className="text-xl font-semibold tabular-nums">{entry.validStars}</span></div>{actorId ? <MarketAccountBoundary actorId={actorId}><MarketStar key={`${actorId}:${entry.offer.id}:${entry.offer.starCount}:${entry.offer.starred}`} listingId={entry.offer.id} initialCount={entry.offer.starCount ?? 0} initialStarred={entry.offer.starred ?? false} initialEventVote={{ open: view.round?.state === "OPEN", eligible: entry.viewerEligible === true, voted: entry.viewerVoted }} /><EventVoteStatus eligible={entry.viewerEligible} voted={entry.viewerVoted} open={view.round?.state === "OPEN"} /></MarketAccountBoundary> : <Button asChild variant="outline" className="w-full"><Link href={`/login?callbackUrl=${encodeURIComponent(WALL)}`}><Star aria-hidden="true" />{t("loginStar")}</Link></Button>}<ShareVoteButton slug={entry.offer.slug} title={entry.offer.listing.title} teamName={entry.teamName} validStars={entry.validStars} /></div></article>;
        })}</div> : <div className="rounded-2xl border border-dashed px-6 py-14 text-center"><Sprout className="mx-auto mb-4 size-8 text-primary" aria-hidden="true" /><h3 className="text-lg font-semibold">{t(query ? "noSearch" : "emptyTitle")}</h3><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">{t(query ? "noSearchHint" : "emptyBody")}</p><Button className="mt-6" variant="outline" onClick={query ? () => setQuery("") : undefined} asChild={!query}>{query ? t("clearSearch") : <Link href={SUBMIT}>{t("join")}</Link>}</Button></div>}
      </section>
    </>}
  </div>;
}

export function AgriWallSubmit() { return <AccountGate mode="submit" />; }
export function AgriPopularityManager() { return <AccountGate mode="manage" />; }
function AccountGate({ mode }: { mode: "submit" | "manage" }) {
  const { data, status } = useSession(); const t = useTranslations("agriWall");
  if (status === "loading") return <p role="status">{t("loading")}</p>;
  if (!data?.user?.id) return <div className="rounded-2xl border p-6"><p className="mb-4 text-sm leading-7 text-muted-foreground">{t(mode === "submit" ? "loginSubmitHint" : "loginManageHint")}</p><Button asChild><Link href={`/login?callbackUrl=${encodeURIComponent(mode === "submit" ? SUBMIT : "/competitions/agrihackathon/popularity")}`}>{t("login")}</Link></Button></div>;
  return <MarketAccountBoundary key={data.user.id} actorId={data.user.id}><MineContent mode={mode} /></MarketAccountBoundary>;
}
function MineContent({ mode }: { mode: "submit" | "manage" }) {
  const t = useTranslations("agriWall"); const request = useMarketRequest();
  const [loadRequest] = useState(() => request);
  const [mine, setMine] = useState<AgriWallMine | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(true); const [revision, setRevision] = useState(0); const [notice, setNotice] = useState("");
  function reload(message?: string) { setMine(null); setBusy(true); setError(""); setNotice(message ?? ""); setRevision(value => value + 1); }
  useEffect(() => {
    let active = true;
    void loadRequest<AgriWallMine>(API + "/mine", "GET", undefined).then(data => { if (active) { setMine(data); setError(""); } }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "INTERNAL_ERROR"); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [revision, loadRequest]);
  return <div className="space-y-5">{notice && <p role="status" className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm text-primary">{t(notice)}</p>}{error && <ErrorNotice code={error} />}{busy && <p role="status" className="text-sm text-muted-foreground">{t("loading")}</p>}{!busy && !mine && <Button variant="outline" onClick={() => reload()}>{t("retry")}</Button>}{mine && (mode === "submit" ? <BindForm key={revision} mine={mine} reload={reload} /> : mine.canConfigure ? <ConfigureForm key={revision} mine={mine} reload={reload} /> : <div className="rounded-xl border p-6"><p role="alert">{t("staffOnly")}</p><Button asChild variant="outline" className="mt-4"><Link href={WALL}>{t("backWall")}</Link></Button></div>)}</div>;
}
function BindForm({ mine, reload }: { mine: AgriWallMine; reload: (message?: string) => void }) {
  const t = useTranslations("agriWall"); const request = useMarketRequest(); const alive = useRef(true); const flight = useRef(false);
  const [teamId, setTeamId] = useState(mine.entries[0]?.id ?? ""); const [listingId, setListingId] = useState(""); const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [uncertain, setUncertain] = useState(false);
  const teamSelect = useId(); const listingSelect = useId(); const consentId = useId();
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const team = mine.entries.find(entry => entry.id === teamId);
  const bindingClosed = !!mine.round && mine.round.state !== "NOT_OPEN";
  const listing = mine.listings.find(offer => offer.id === listingId);
  const boundOffer = mine.listings.find(offer => offer.id === team?.wall?.listingId);
  const offers = mine.listings.filter(offer => offer.status === "PUBLISHED" && offer.listing.priceMinor === 0 && offer.listing.category === "competition" && offer.listing.subcategory === "agri-wall");
  async function bind(event: React.FormEvent) {
    event.preventDefault();
    const chosen = team?.wall ? boundOffer : listing;
    if (flight.current || (!consent && !team?.wall) || !chosen || !team || (!team.wall && bindingClosed) || uncertain) return;
    const parsed = agriWallCommandSchema.safeParse({ action: "bind", teamCompetitionId: teamId, listingId: chosen.id, expectedVersion: chosen.version });
    if (!parsed.success) { setError("INVALID_INPUT"); return; }
    flight.current = true; setBusy(true); setError("");
    try { await request(API, "POST", parsed.data); if (alive.current) reload(team.wall ? "syncDone" : "bindingDone"); }
    catch (reason) { if (alive.current) { const code = reason instanceof Error ? reason.message : "INTERNAL_ERROR"; setError(code); if (!code.startsWith("AGRI_") && !["INVALID_INPUT", "VERSION_CONFLICT", "ACCOUNT_CHANGED", "UNAUTHORIZED", "FORBIDDEN"].includes(code)) setUncertain(true); } }
    finally { flight.current = false; if (alive.current) setBusy(false); }
  }
  return <div className="space-y-6"><ol className="grid gap-4 sm:grid-cols-2"><li className="overflow-hidden rounded-2xl border bg-card"><Image src="/competitions/agrihackathon/gitglow-workflow.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full border-b bg-slate-950/90 object-cover" /><div className="p-5"><p className="text-xs font-semibold text-primary">{t("stepOne")}</p><h2 className="mt-1.5 font-semibold">{t("publishTitle")}</h2><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t("publishBody")}</p><Button asChild variant="outline" className="mt-4 h-auto min-h-11 max-w-full whitespace-normal"><Link href="/explore/submit?event=agrihackathon">{t("publish")}<ArrowUpRight aria-hidden="true" /></Link></Button><p className="mt-2.5 text-xs leading-5 text-muted-foreground">{t("reviewHint")}</p></div></li><li className="overflow-hidden rounded-2xl border bg-card"><Image src="/competitions/agrihackathon/gitglow-wall.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full border-b bg-slate-950/90 object-cover" /><div className="p-5"><p className="text-xs font-semibold text-primary">{t("stepTwo")}</p><h2 className="mt-1.5 font-semibold">{t("bindTitle")}</h2><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t("bindBody")}</p><Button asChild variant="ghost" className="mt-4"><Link href="/competitions/agrihackathon">{t("registration")}</Link></Button></div></li></ol>
    {bindingClosed && <p role="status" className="rounded-xl border bg-muted/30 p-4 text-sm leading-7">{t("bindingClosed")}</p>}
    {!mine.entries.length ? <div className="rounded-2xl border p-6"><h2 className="font-semibold">{t("noTeamTitle")}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{t("noTeamBody")}</p><div className="mt-4 flex flex-wrap gap-2"><Button asChild><Link href="/competitions/agrihackathon">{t("registration")}</Link></Button><Button asChild variant="outline"><Link href="/teams">{t("openTeams")}</Link></Button></div></div> : <form onSubmit={event => void bind(event)} className="space-y-5 rounded-2xl border p-5 sm:p-6"><div className="space-y-2"><label htmlFor={teamSelect} className="text-sm font-medium">{t("team")}</label><select id={teamSelect} className={selectClass} value={teamId} disabled={busy} onChange={event => { setTeamId(event.target.value); setListingId(""); setConsent(false); setError(""); }}>{mine.entries.map(entry => <option key={entry.id} value={entry.id}>{entry.teamName}</option>)}</select></div>
      {team?.wall ? <div role="status" className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-5"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><h2 className="font-semibold">{t("boundTitle")}</h2><p className="mt-2 break-words text-sm">{team.wall.title}</p><p className="mt-2 text-sm leading-7 text-muted-foreground">{t(team.wall.published ? "boundBody" : "boundUnpublished")}</p></div></div><div className="flex flex-wrap gap-2"><Button asChild><Link href={`/competitions/agrihackathon/submissions?teamCompetitionId=${encodeURIComponent(team.id)}`}>{t("continueSubmission")}<ArrowRight aria-hidden="true" /></Link></Button><Button asChild variant="outline"><Link href={boundOffer ? `/explore/member-${boundOffer.slug}` : WALL}>{t(boundOffer ? "details" : "backWall")}</Link></Button></div>{boundOffer && <div className="border-t pt-4"><p className="mb-3 text-sm leading-7 text-muted-foreground">{t("submissionWallSync")}</p><Button type="submit" variant="outline" disabled={busy || uncertain}>{t(busy ? "syncingProject" : "syncProject")}</Button></div>}</div> : <>
        {!offers.length ? <div className="rounded-xl bg-muted/40 p-4"><p className="text-sm leading-7">{t("noOffer")}</p><Button asChild variant="outline" className="mt-3 h-auto min-h-11 max-w-full whitespace-normal"><Link href="/explore/submit?event=agrihackathon">{t("publish")}</Link></Button></div> : <><div className="space-y-2"><label htmlFor={listingSelect} className="text-sm font-medium">{t("chooseProject")}</label><select id={listingSelect} required className={selectClass} value={listingId} disabled={busy || uncertain} onChange={event => { setListingId(event.target.value); setConsent(false); }}><option value="">{t("chooseProjectPlaceholder")}</option>{offers.map(offer => <option key={offer.id} value={offer.id}>{offer.listing.title}</option>)}</select><p className="text-xs leading-6 text-muted-foreground">{t("offerHint")}</p></div>{listing && <Link href={`/market/${listing.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4">{t("previewProject")}<ExternalLink className="size-3.5" aria-hidden="true" /></Link>}<label htmlFor={consentId} className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-7"><input id={consentId} type="checkbox" required checked={consent} disabled={busy || uncertain} onChange={event => setConsent(event.target.checked)} className="mt-1.5 size-4 shrink-0 accent-primary" /><span>{t("consent")}</span></label><Button type="submit" disabled={!listing || !consent || busy || uncertain || bindingClosed}>{t(busy ? "binding" : "bind")}</Button></>}
      </>}
      {error && <ErrorNotice code={error} />}{uncertain && <p role="status" className="text-sm leading-7">{t("uncertain")}</p>}<Button type="button" variant="ghost" disabled={busy} onClick={() => reload()}><RefreshCw aria-hidden="true" />{t("refresh")}</Button>
    </form>}
  </div>;
}
function ConfigureForm({ mine, reload }: { mine: AgriWallMine; reload: (message?: string) => void }) {
  const t = useTranslations("agriWall"); const request = useMarketRequest(); const alive = useRef(true); const flight = useRef(false);
  const [opensAt, setOpensAt] = useState(mine.round ? beijingLocal(mine.round.opensAt) : ""); const [closesAt, setClosesAt] = useState(mine.round ? beijingLocal(mine.round.closesAt) : ""); const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const openId = useId(); const closeId = useId(); const consentId = useId(); const locked = !!mine.round && mine.round.state !== "NOT_OPEN";
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (flight.current || locked || !consent) return;
    const start = beijingDateTimeToIso(opensAt); const end = beijingDateTimeToIso(closesAt);
    const parsed = agriWallCommandSchema.safeParse({ action: "configurePopularity", expectedRevision: mine.round?.revision ?? 0, opensAt: start, closesAt: end });
    if (!parsed.success || !start || !end) { setError("INVALID_WINDOW"); return; }
    flight.current = true; setBusy(true); setError("");
    try { await request(API, "POST", parsed.data); if (alive.current) reload("saved"); }
    catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : "INTERNAL_ERROR"); }
    finally { flight.current = false; if (alive.current) setBusy(false); }
  }
  return <div className="space-y-6"><RoundNotice round={mine.round} /><form onSubmit={event => void save(event)} className="space-y-5 rounded-2xl border p-5 sm:p-6"><h2 className="text-lg font-semibold">{t("configureTitle")}</h2><p className="text-sm leading-7 text-muted-foreground">{t("configureHint")}</p>{locked && <p role="status" className="rounded-lg bg-muted p-4 text-sm leading-7">{t("locked")}</p>}<div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label htmlFor={openId} className="text-sm font-medium">{t("opensAt")}</label><Input id={openId} type="datetime-local" required value={opensAt} onChange={event => setOpensAt(event.target.value)} disabled={locked || busy} className="min-h-11" /></div><div className="space-y-2"><label htmlFor={closeId} className="text-sm font-medium">{t("closesAt")}</label><Input id={closeId} type="datetime-local" required value={closesAt} onChange={event => setClosesAt(event.target.value)} disabled={locked || busy} className="min-h-11" /></div></div>{!locked && <><label htmlFor={consentId} className="flex items-start gap-3 rounded-xl border p-4 text-sm leading-7"><input id={consentId} required type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} className="mt-1.5 size-4 shrink-0 accent-primary" /><span>{t("configureConsent")}</span></label><Button type="submit" disabled={busy || !consent}>{t(busy ? "saving" : "saveWindow")}</Button></>}{error && <ErrorNotice code={error} />}<Button type="button" variant="outline" onClick={() => reload()} disabled={busy}><RefreshCw aria-hidden="true" />{t("refresh")}</Button></form></div>;
}
