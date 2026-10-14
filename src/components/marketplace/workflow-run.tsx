"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMarketActorId, useMarketRequest } from "./account-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resumeWebsiteInputSchema, type ResumeWebsiteInput, type ResumeWebsiteCopy } from "@/contracts/resume-website";
import { stableWorkflowInput } from "@/domain/workflows/recipes";
import type { WorkflowInputVariable } from "@/domain/workflows/variables";

export type MarketRunDetails = { recipe: "resume-website-v1" | null; variables: WorkflowInputVariable[]; estimatedCost: number | null; version: number };
type Run = { inputFingerprint?: string | null; id: string; status: string; costPoints: number; output: unknown; error: string | null; createdAt: string };
const blankProfile: ResumeWebsiteInput = { fullName: "", headline: "", about: "", location: "", email: "", contactUrl: "", education: "", skills: [], projects: [{ name: "", role: "", description: "", url: "" }], style: "editorial", accent: "emerald", language: "zh" };
function htmlArtifact(value: unknown): { content: string; filename: string } | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.kind === "resume-website" && candidate.mediaType === "text/html" && typeof candidate.content === "string") return { content: candidate.content, filename: "my-portfolio.html" };
  for (const item of Object.values(candidate)) { if (item && typeof item === "object") { const found = htmlArtifact(item); if (found) return found; } }
  return null;
}
export function MarketWorkflowRun({ listingId, version, details, workflowSlug, profileInput, onUseCopy }: { listingId: string; version: number; details: MarketRunDetails; workflowSlug?: string; profileInput?: ResumeWebsiteInput; onUseCopy?: (copy: ResumeWebsiteCopy) => void }) {
  const endpoint = workflowSlug ? `/api/workflows/${workflowSlug}/recipe-run` : `/api/market/listings/${listingId}/run`;
  const t = useTranslations("marketWorkflow"), request = useMarketRequest(), actorId = useMarketActorId();
  const recoverySlot = `ans:workflow-confirmation:${actorId}:${endpoint}:${version}`;
  const requestRef = useRef(request); requestRef.current = request;
  const alive = useRef(true), lock = useRef(false), key = useRef<string | null>(null);
  const [localProfile, setProfile] = useState<ResumeWebsiteInput>(blankProfile), [values, setValues] = useState<Record<string, string>>({});
  const profile = profileInput ?? localProfile;
  const tv = useTranslations("visualWebsite");
  const [ack, setAck] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [runs, setRuns] = useState<Run[]>([]), [loading, setLoading] = useState(true);
  const inputFingerprint = useRef("");
  const [acknowledgedProfile, setAcknowledgedProfile] = useState("");
  const profileFingerprint = profileInput ? JSON.stringify(profileInput) : "";
  const latestProfile = useRef(profile); latestProfile.current = profile;
  const confirmed = ack && (!profileInput || acknowledgedProfile === profileFingerprint);
  async function refresh() {
    const result = await requestRef.current<{ runs: Run[] }>(endpoint, "GET", undefined);
    if (alive.current) { setRuns(result.runs); setLoading(false); }
  }
  useEffect(() => {
    alive.current = true; let timer: ReturnType<typeof setTimeout>;
    const tick = async () => { try { await refresh(); } catch { if (alive.current) { setLoading(false); setError(t("historyFailed")); } } finally { if (alive.current) timer = setTimeout(() => void tick(), 3000); } };
    void tick(); return () => { alive.current = false; clearTimeout(timer); };
    // The enclosing account boundary owns actor changes and aborts all requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);
  async function run(event: React.FormEvent) {
    event.preventDefault(); if (!confirmed || lock.current) return;
    let input: Record<string, unknown> = values;
    if (details.recipe) {
      const parsed = resumeWebsiteInputSchema.safeParse(profile);
      if (!parsed.success) { setError(t("inputInvalid")); return; }
      input = { profile: parsed.data };
    } else if (details.variables.some(variable => variable.required && !values[variable.key]?.trim())) { setError(t("inputInvalid")); return; }
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input)));
    if (!alive.current || lock.current) return;
    const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    // Only a key and an input digest are retained, scoped to this account and immutable version.
    if (!key.current) { try { const pending = JSON.parse(sessionStorage.getItem(recoverySlot) ?? "null"); if (pending?.fingerprint === fingerprint && /^[a-zA-Z0-9_-]{8,80}$/.test(pending.key)) { key.current = pending.key; inputFingerprint.current = fingerprint; } } catch { /* Storage may be disabled. */ } }
    if (!key.current || inputFingerprint.current !== fingerprint) { key.current = crypto.randomUUID(); inputFingerprint.current = fingerprint; }
    lock.current = true; setBusy(true); setError("");
    try { sessionStorage.setItem(recoverySlot, JSON.stringify({ key: key.current, fingerprint })); } catch { /* In-memory idempotency still applies. */ }
    try {
      await request<{ run: { id: string } }>(endpoint, "POST", { input, expectedVersion: version, acknowledged: true, idempotencyKey: key.current });
      if (!alive.current) return;
      try { sessionStorage.removeItem(recoverySlot); } catch { /* Optional recovery storage. */ }
      key.current = null; setAck(false); await refresh();
    } catch { if (alive.current) { setError(t("runFailed")); await refresh().catch(() => {}); } }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function applyCopy(run: Run) {
    const artifact = htmlArtifact(run.output); if (!artifact || !onUseCopy) return;
    const source = profile;
    const parsed = resumeWebsiteInputSchema.safeParse(source);
    if (!parsed.success || !run.inputFingerprint) { setError(tv("copyMismatch")); return; }
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableWorkflowInput({ profile: parsed.data })));
    if (!alive.current) return;
    const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    if (source !== latestProfile.current || fingerprint !== run.inputFingerprint) { setError(tv("copyMismatch")); return; }
    const doc = new DOMParser().parseFromString(artifact.content, "text/html");
    const entries = Array.from(doc.querySelectorAll(".project"));
    if (doc.querySelector("h1")?.textContent !== profile.fullName || entries.length !== profile.projects.length || entries.some((item, i) => item.querySelector("h3")?.textContent !== profile.projects[i].name)) { setError(tv("copyMismatch")); return; }
    const summary = doc.querySelector(".about")?.textContent;
    const descriptions = entries.map(item => item.querySelector(".description")?.textContent);
    if (summary && descriptions.every(Boolean)) onUseCopy({ summary, projects: descriptions.map(description => ({ description: description! })) });
  }
  function download(output: unknown) {
    const artifact = htmlArtifact(output), content = artifact?.content ?? (typeof output === "string" ? output : JSON.stringify(output, null, 2));
    const url = URL.createObjectURL(new Blob([content], { type: artifact ? "text/html;charset=utf-8" : "application/json;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = artifact?.filename ?? "workflow-output.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="space-y-5"><div><h2 className="text-xl font-semibold">{t("runTitle")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("runNotice", { version: details.version })}</p><p className="mt-2 text-sm">{details.estimatedCost === null ? t("meteredCost") : t("fixedCost", { points: details.estimatedCost })}</p></div>
    <form onSubmit={run} className="space-y-4"><fieldset disabled={busy} className="min-w-0 space-y-4">
      {details.recipe ? profileInput ? null : <><p className="text-sm text-muted-foreground">{t("resumeNotice")}</p>{(["fullName", "headline", "about", "location", "email", "contactUrl", "education"] as const).map(field => <label key={field} className="grid min-w-0 gap-2 text-sm">{t(`profile.${field}`)}{field === "about" || field === "education" ? <Textarea maxLength={field === "about" ? 3000 : 1500} required={field === "about"} value={profile[field]} onChange={e => setProfile({ ...profile, [field]: e.target.value })} /> : <Input type={field === "email" ? "email" : "text"} required={field === "fullName" || field === "headline"} maxLength={field === "fullName" ? 80 : field === "headline" ? 120 : field === "location" ? 100 : field === "email" ? 254 : 500} value={profile[field]} onChange={e => setProfile({ ...profile, [field]: e.target.value })} />}</label>)}
      <label className="grid gap-2 text-sm">{t("profile.skills")}<Input maxLength={1500} value={profile.skills.join(", ")} onChange={e => setProfile({ ...profile, skills: e.target.value.split(/[,，]/).map(v => v.trim()).filter(Boolean) })} /></label>
      {profile.projects.map((project, index) => <fieldset key={index} className="space-y-3 rounded-xl border p-3"><legend className="px-1 text-sm">{t("profile.project", { count: index + 1 })}</legend>{(["name", "role", "description", "url"] as const).map(field => <label key={field} className="grid gap-2 text-sm">{t(`project.${field}`)}{field === "description" ? <Textarea required maxLength={2000} value={project[field]} onChange={e => setProfile({ ...profile, projects: profile.projects.map((p, i) => i === index ? { ...p, [field]: e.target.value } : p) })} /> : <Input required={field === "name"} maxLength={field === "url" ? 500 : 100} value={project[field]} onChange={e => setProfile({ ...profile, projects: profile.projects.map((p, i) => i === index ? { ...p, [field]: e.target.value } : p) })} />}</label>)}{profile.projects.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setProfile({ ...profile, projects: profile.projects.filter((_, i) => i !== index) })}>{t("removeProject")}</Button>}</fieldset>)}
      {profile.projects.length < 6 && <Button type="button" variant="outline" size="sm" onClick={() => setProfile({ ...profile, projects: [...profile.projects, { name: "", role: "", description: "", url: "" }] })}>{t("addProject")}</Button>}
      <div className="grid grid-cols-2 gap-3">{(["style", "accent", "language"] as const).map(field => <label key={field} className="grid gap-2 text-sm">{t(`profile.${field}`)}<select className="h-10 min-w-0 rounded-md border bg-background px-2" value={profile[field]} onChange={e => setProfile({ ...profile, [field]: e.target.value })}>{(field === "style" ? ["editorial", "minimal"] : field === "accent" ? ["emerald", "violet", "orange"] : ["zh", "en"]).map(option => <option key={option} value={option}>{t(`options.${option}`)}</option>)}</select></label>)}</div></> : details.variables.map(variable => <label key={variable.key} className="grid gap-2 text-sm">{variable.label}{variable.required ? " *" : ""}{variable.hint && <span className="text-xs text-muted-foreground">{variable.hint}</span>}<Textarea required={variable.required} maxLength={10000} value={values[variable.key] ?? ""} onChange={e => setValues({ ...values, [variable.key]: e.target.value })} /></label>)}
      <label className="flex items-start gap-2 text-sm leading-6"><input className="mt-1" type="checkbox" checked={confirmed} onChange={e => { setAck(e.target.checked); setAcknowledgedProfile(profileFingerprint); }} />{t("acknowledge")}</label><Button type="submit" className="w-full" disabled={!confirmed || busy}>{t(busy ? "running" : "confirmRun")}</Button></fieldset></form>
      {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
      <div className="space-y-3 border-t pt-4"><h3 className="font-semibold">{t("historyTitle")}</h3>{loading ? <p role="status" className="text-sm">{t("loading")}</p> : runs.length === 0 ? <p className="text-sm text-muted-foreground">{t("noRuns")}</p> : runs.map(item => <article key={item.id} className="space-y-3 rounded-xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{t(`status.${item.status}`)}</span><time className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</time></div>{item.error && <p className="text-xs text-destructive">{t("executionFailed")}</p>}{item.status === "SUCCEEDED" && item.output !== null && <><Button type="button" variant="outline" size="sm" onClick={() => download(item.output)}>{onUseCopy ? tv("downloadCopy") : t("download")}</Button>{onUseCopy && htmlArtifact(item.output) && <Button type="button" variant="outline" size="sm" onClick={() => void applyCopy(item).catch(() => { if (alive.current) setError(tv("copyMismatch")); })}>{tv("applyCopy")}</Button>}<details><summary className="cursor-pointer text-sm">{onUseCopy ? tv("previewCopy") : t("viewOutput")}</summary>{htmlArtifact(item.output) ? <iframe className="mt-3 h-96 w-full rounded-lg border bg-white" sandbox="" title={t("previewTitle")} srcDoc={htmlArtifact(item.output)!.content} /> : <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs">{typeof item.output === "string" ? item.output : JSON.stringify(item.output, null, 2)}</pre>}</details></>}</article>)}<Link href="/workflows/runs" className="inline-block text-sm text-primary underline">{t("allRuns")}</Link></div>
  </section>;
}
