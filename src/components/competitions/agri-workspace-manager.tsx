"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useWorkspaceNavigation, WorkspaceLink } from "@/components/providers/workspace-navigation";
import { agriRulesDraftSchema, agriWorkspaceCommandSchema, agriGrantCommandSchema, type AgriRulesDraft, type AgriWorkspaceRulesView, type AgriGrantManagementView, type AgriWorkspaceCommand, type AgriGrantCommand } from "@/contracts/agri-workspace";
import { agriDecisionQuerySchema, agriDecisionCommandSchema, type AgriDecisionCommand, type AgriDecisionManagementView } from "@/contracts/agri-decisions";
import { agriCorrectableFieldSchema, type AgriCorrectableField } from "@/contracts/agri-submissions";
import { agriWorkspaceScopeSchema, type AgriWorkspaceScope } from "@/contracts/agrihackathon";

const api = "/api/competitions/agrihackathon/manage";
type Command = AgriWorkspaceCommand | AgriGrantCommand | AgriDecisionCommand;
// Unknown responses retain the original command/key within this tab, never localStorage.
const recoveries = new Map<string, Command>();
let recoveryActor: string | null = null;
const selectClass = "w-full min-w-0 rounded-md border bg-background p-2 text-sm";
class ManagerError extends Error {
  constructor(public code: string, public uncertain = false) { super(code); }
}
async function request<T>(url: string, actorId: string, command?: Command): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { cache: "no-store", headers: { "x-ans-submission-actor": actorId, ...(command ? { "Content-Type": "application/json" } : {}) }, ...(command ? { method: "POST", body: JSON.stringify(command) } : {}) }); }
  catch { throw new ManagerError("INTERNAL_ERROR", !!command); }
  let body;
  try { body = await response.json(); } catch { throw new ManagerError("INTERNAL_ERROR", !!command); }
  if (!response.ok || body.ok !== true) throw new ManagerError(body.error?.code ?? "INTERNAL_ERROR", !!command && response.status >= 500);
  return body.data as T;
}
function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId(); return <div className="min-w-0 space-y-2"><label className="text-sm font-medium" htmlFor={id}>{label}</label>{children(id)}</div>;
}
function Tick({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} /><span>{label}</span></label>;
}
function useGuard(dirty: boolean, pending: boolean) {
  const t = useTranslations("product.agriWorkspace"); const navigation = useWorkspaceNavigation();
  useEffect(() => {
    if (!dirty && !pending) return;
    return navigation.register((proceed, cancel) => {
      if (pending) { window.alert(t("pendingLeave")); cancel(); }
      else if (window.confirm(t("discardUnsaved"))) proceed(); else cancel();
    });
  }, [dirty, pending, navigation, t]);
  useEffect(() => {
    if (!dirty && !pending) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, pending]);
}
function useCommand(actorId: string, endpoint: string) {
  const key = actorId + ":" + endpoint;
  const [pending, setPending] = useState<Command | null>(() => recoveries.get(key) ?? null);
  const pendingRef = useRef(pending), alive = useRef(true), flight = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const execute = async (next?: Command) => {
    if (flight.current) return false;
    const wasPending = !!pendingRef.current, command = pendingRef.current ?? next;
    if (!command) return false;
    flight.current = true; pendingRef.current = command; recoveries.set(key, command);
    setPending(command); setBusy(true); setError(""); setSaved(false);
    try {
      await request(endpoint, actorId, command);
      recoveries.delete(key); pendingRef.current = null;
      if (alive.current) { setPending(null); setSaved(true); }
      return true;
    } catch (cause) {
      const failure = cause instanceof ManagerError ? cause : new ManagerError("INTERNAL_ERROR", true);
      // A rate limit or revoked permission before receipt lookup cannot settle an older unknown write.
      if (!failure.uncertain && (!wasPending || ["AGRI_REVISION_CONFLICT", "AGRI_IDEMPOTENCY_CONFLICT"].includes(failure.code))) {
        recoveries.delete(key); pendingRef.current = null; if (alive.current) setPending(null);
      }
      if (alive.current) setError(failure.code);
      return false;
    } finally { flight.current = false; if (alive.current) setBusy(false); }
  };
  return { pending, busy, error, saved, execute, setError };
}
function Notice({ error, saved, pending, busy, retry }: { error: string; saved: boolean; pending: boolean; busy: boolean; retry: () => void }) {
  const t = useTranslations("product.agriWorkspace");
  return <>{error && <p role="alert" className="break-words">{t.has("errors." + error) ? t("errors." + error) : t("errors.INTERNAL_ERROR")}</p>}{saved && <p role="status">{t("saved")}</p>}{pending && <div className="space-y-2"><p role="status">{t("pending")}</p><Button disabled={busy} variant="outline" onClick={retry}>{t("retry")}</Button></div>}</>;
}
function Confirmation({ open, title, description, children, onCancel, onConfirm }: { open: boolean; title: string; description: string; children?: ReactNode; onCancel: () => void; onConfirm: () => void }) {
  const t = useTranslations("product.agriWorkspace");
  return <AlertDialog open={open} onOpenChange={value => { if (!value) onCancel(); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>{children}<AlertDialogFooter><AlertDialogCancel onClick={onCancel}>{t("cancel")}</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>{t("proceed")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
type DecisionTarget = { teamCompetitionId: string; entryStageId?: string };
export function AgriWorkspaceManager({ preselection, invalidPreselection = false }: { preselection?: DecisionTarget; invalidPreselection?: boolean }) {
  const t = useTranslations("product.agriWorkspace"); const { data, status } = useSession();
  const actorId = data?.user?.id ?? null;
  useEffect(() => {
    if (status === "loading") return;
    if (recoveryActor !== actorId) recoveries.clear();
    recoveryActor = actorId;
  }, [actorId, status]);
  if (status === "loading") return <p role="status">{t("loading")}</p>;
  const checkedPreselection = agriDecisionQuerySchema.safeParse(preselection);
  const callbackUrl = "/competitions/agrihackathon/manage" + (checkedPreselection.success && !invalidPreselection ? "?" + new URLSearchParams(checkedPreselection.data) + "#agri-decisions" : "");
  if (!actorId) return <Button asChild><WorkspaceLink href={"/login?" + new URLSearchParams({ callbackUrl })}>{t("login")}</WorkspaceLink></Button>;
  const decisions = <DecisionManager key={JSON.stringify([actorId, preselection?.teamCompetitionId, preselection?.entryStageId, invalidPreselection])} actorId={actorId} preselection={preselection} invalidPreselection={invalidPreselection} />;
  return <div key={actorId} className="space-y-6">{preselection || invalidPreselection ? <>{decisions}<RulesManager actorId={actorId} /></> : <><RulesManager actorId={actorId} />{decisions}</>}<GrantsManager actorId={actorId} /></div>;
}
const stages = ["REGISTRATION", "PRELIMINARY", "FINAL"] as const;
interface RuleForm {
  guidanceMarkdown: string; requirements: AgriRulesDraft["requirements"];
  windows: Array<{ stage: typeof stages[number]; state: "PENDING" | "READY"; opensAt: string; closesAt: string; includesDeadline: boolean }>;
}
function localTime(value: string | null) { return value ? new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 23) : ""; }
function instant(value: string) { return value ? new Date(value + "+08:00").toISOString() : null; }
function toForm(draft: AgriRulesDraft | null): RuleForm {
  return { guidanceMarkdown: draft?.guidanceMarkdown ?? "", requirements: draft?.requirements ?? { schemaVersion: 1, repositoryRequired: false, repositoryRefRequired: false, demoRequired: false, materials: [] },
    windows: stages.map(stage => { const source = draft?.windows.find(row => row.stage === stage); return { stage, state: source?.state ?? "PENDING", opensAt: localTime(source?.opensAt ?? null), closesAt: localTime(source?.closesAt ?? null), includesDeadline: source?.state === "READY" ? source.includesDeadline : false }; }) };
}
function RulesManager({ actorId }: { actorId: string }) {
  const t = useTranslations("product.agriWorkspace"); const command = useCommand(actorId, api);
  const [data, setData] = useState<AgriWorkspaceRulesView | null>(null), [form, setForm] = useState<RuleForm>(() => toForm(null)), [baseline, setBaseline] = useState(JSON.stringify(toForm(null)));
  const [loading, setLoading] = useState(true), [stale, setStale] = useState(false), [readError, setReadError] = useState("");
  const [proposed, setProposed] = useState<AgriWorkspaceCommand | null>(null); const alive = useRef(true);
  const dirty = JSON.stringify(form) !== baseline; useGuard(dirty, !!command.pending);
  const load = useCallback(async () => {
    setLoading(true); setReadError("");
    try { const result = await request<AgriWorkspaceRulesView>(api, actorId); if (alive.current) { const next = toForm(result.draft); setData(result); setForm(next); setBaseline(JSON.stringify(next)); setStale(false); } }
    catch (error) { if (alive.current) { setReadError(error instanceof ManagerError ? error.code : "INTERNAL_ERROR"); setStale(true); } }
    finally { if (alive.current) setLoading(false); }
  }, [actorId]);
  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, [load]);
  const locked = loading || command.busy || !!command.pending || stale;
  async function execute(next?: AgriWorkspaceCommand) { if (await command.execute(next) && alive.current) await load(); }
  function action(action: AgriWorkspaceCommand["action"]) {
    if (!data || locked) return;
    const base = { idempotencyKey: crypto.randomUUID(), expectedRevision: data.revision };
    try {
      let next: AgriWorkspaceCommand;
      if (action === "saveRulesDraft") {
        const draft = agriRulesDraftSchema.parse({ schemaVersion: 1, guidanceMarkdown: form.guidanceMarkdown, requirements: form.requirements,
          windows: form.windows.map(row => row.state === "READY" ? { stage: row.stage, state: row.state, opensAt: instant(row.opensAt), closesAt: instant(row.closesAt), includesDeadline: row.includesDeadline } : { stage: row.stage, state: row.state, opensAt: instant(row.opensAt), closesAt: instant(row.closesAt) }) });
        next = { ...base, action, draft };
      } else if (action === "publishRules") { if (!data.confirmedRule) return; next = { ...base, action, ruleVersionId: data.confirmedRule.id }; }
      else if (action === "setEnabled") next = { ...base, action, enabled: !data.enabled };
      else next = { ...base, action };
      agriWorkspaceCommandSchema.parse(next);
      if (action === "saveRulesDraft") void execute(next); else setProposed(next);
    } catch { command.setError("INVALID_INPUT"); }
  }
  function requirement(key: "repositoryRequired" | "repositoryRefRequired" | "demoRequired", value: boolean) { setForm(old => ({ ...old, requirements: { ...old.requirements, [key]: value } })); }
  function windowChange(index: number, patch: Partial<RuleForm["windows"][number]>) { setForm(old => ({ ...old, windows: old.windows.map((row, at) => at === index ? { ...row, ...patch } : row) })); }
  return <Card><CardHeader><CardTitle>{t("rulesTitle")}</CardTitle></CardHeader><CardContent className="space-y-5">
    <p className="text-sm leading-6 text-muted-foreground">{t("rulesHelp")}</p>
    {loading && <p role="status">{t("loading")}</p>}<Notice error={readError || command.error} saved={command.saved} pending={!!command.pending} busy={command.busy} retry={() => void execute()} />
    {data && <><dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt>{t("draftRevision")}</dt><dd>{data.revision}</dd></div><div><dt>{t("confirmedVersion")}</dt><dd>{data.confirmedRule?.version ?? t("none")}</dd></div><div><dt>{t("publishedVersion")}</dt><dd>{data.publishedRule?.version ?? t("none")}</dd></div></dl><p>{data.enabled ? t("enabled") : t("disabled")}</p>
      <fieldset disabled={locked} className="min-w-0 space-y-5"><Field label={t("guidance")}>{id => <Textarea id={id} rows={8} maxLength={20000} value={form.guidanceMarkdown} onChange={e => setForm(old => ({ ...old, guidanceMarkdown: e.target.value }))} />}</Field>
      <div className="grid gap-3 sm:grid-cols-3">{(["repositoryRequired", "repositoryRefRequired", "demoRequired"] as const).map(key => <Tick key={key} label={t(key)} checked={form.requirements[key]} onChange={value => requirement(key, value)} />)}</div>
      <div className="space-y-3"><h3 className="font-medium">{t("materials")}</h3><p className="text-sm text-muted-foreground">{t("materialsHelp")}</p>{form.requirements.materials.map((row, index) => <div key={index} className="grid min-w-0 gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto_auto]"><Field label={t("materialKey")}>{id => <Input id={id} maxLength={64} value={row.key} onChange={e => setForm(old => ({ ...old, requirements: { ...old.requirements, materials: old.requirements.materials.map((item, at) => at === index ? { ...item, key: e.target.value } : item) } }))} />}</Field><Field label={t("materialKind")}>{id => <select id={id} className={selectClass} value={row.kind} onChange={e => setForm(old => ({ ...old, requirements: { ...old.requirements, materials: old.requirements.materials.map((item, at) => at === index ? { ...item, kind: e.target.value as typeof row.kind } : item) } }))}>{(["TEXT", "LINK", "ARTIFACT"] as const).map(kind => <option key={kind} value={kind}>{t("kind." + kind)}</option>)}</select>}</Field><Tick label={t("required")} checked={row.required} onChange={value => setForm(old => ({ ...old, requirements: { ...old.requirements, materials: old.requirements.materials.map((item, at) => at === index ? { ...item, required: value } : item) } }))} /><Button type="button" variant="outline" onClick={() => setForm(old => ({ ...old, requirements: { ...old.requirements, materials: old.requirements.materials.filter((_, at) => at !== index) } }))}>{t("remove")}</Button></div>)}<Button variant="outline" disabled={form.requirements.materials.length >= 20} onClick={() => setForm(old => ({ ...old, requirements: { ...old.requirements, materials: [...old.requirements.materials, { key: "", kind: "TEXT", required: false }] } }))}>{t("addMaterial")}</Button></div>
      <div className="space-y-4"><h3 className="font-medium">{t("windows")}</h3><p className="text-sm leading-6 text-muted-foreground">{t("windowsHelp")}</p>{form.windows.map((row, index) => <fieldset key={row.stage} className="min-w-0 space-y-3 rounded-md border p-4"><legend className="px-1 font-medium">{t("stage." + row.stage)}</legend><Field label={t("windowState")}>{id => <select id={id} className={selectClass} value={row.state} onChange={e => windowChange(index, { state: e.target.value as typeof row.state })}><option value="PENDING">{t("windowPending")}</option><option value="READY">{t("windowReady")}</option></select>}</Field><div className="grid gap-3 sm:grid-cols-2"><Field label={t("opensAt")}>{id => <Input id={id} type="datetime-local" step="0.001" value={row.opensAt} onChange={e => windowChange(index, { opensAt: e.target.value })} />}</Field><Field label={t("closesAt")}>{id => <Input id={id} type="datetime-local" step="0.001" value={row.closesAt} onChange={e => windowChange(index, { closesAt: e.target.value })} />}</Field></div>{row.state === "READY" && <Tick label={t("includesDeadline")} checked={row.includesDeadline} onChange={value => windowChange(index, { includesDeadline: value })} />}</fieldset>)}</div>
      </fieldset><div className="flex flex-wrap gap-2"><Button disabled={locked} onClick={() => action("saveRulesDraft")}>{t("saveDraft")}</Button><Button variant="outline" disabled={locked || dirty || !data.draft} onClick={() => action("confirmRules")}>{t("confirmRules")}</Button><Button variant="outline" disabled={locked || dirty || !data.confirmedRule || data.confirmedRule.id === data.publishedRule?.id} onClick={() => action("publishRules")}>{t("publishRules")}</Button><Button variant="outline" disabled={locked || dirty} onClick={() => action("setEnabled")}>{data.enabled ? t("disable") : t("enable")}</Button></div></>}
    <Button variant="ghost" disabled={loading || command.busy} onClick={() => { if (!dirty || window.confirm(t("discardUnsaved"))) void load(); }}>{t("refresh")}</Button>
    <Confirmation open={!!proposed} title={t("confirmAction")} description={proposed?.action === "confirmRules" ? t("confirmHelp") : proposed?.action === "publishRules" ? t("publishHelp") : proposed?.action === "setEnabled" && proposed.enabled ? t("enableHelp") : t("disableHelp")} onCancel={() => setProposed(null)} onConfirm={() => { const next = proposed; setProposed(null); if (next) void execute(next); }} />
  </CardContent></Card>;
}
function GrantsManager({ actorId }: { actorId: string }) {
  const t = useTranslations("product.agriWorkspace"); const command = useCommand(actorId, api + "/grants");
  const [data, setData] = useState<AgriGrantManagementView | null>(null), [recipient, setRecipient] = useState(""), [scope, setScope] = useState<AgriWorkspaceScope>("WORKS_READ"), [expiry, setExpiry] = useState(""), [delegable, setDelegable] = useState(false);
  const [loading, setLoading] = useState(true), [readError, setReadError] = useState(""), [proposed, setProposed] = useState<AgriGrantCommand | null>(null); const alive = useRef(true);
  useGuard(false, !!command.pending);
  const load = useCallback(async (target?: string) => {
    setLoading(true); setReadError("");
    try { const result = await request<AgriGrantManagementView>(api + "/grants" + (target ? "?recipientId=" + encodeURIComponent(target) : ""), actorId); if (alive.current) { setData(result); setScope(old => result.delegableScopes.includes(old) ? old : result.delegableScopes[0] ?? "WORKS_READ"); } }
    catch (error) { if (alive.current) { setData(null); setReadError(error instanceof ManagerError ? error.code : "INTERNAL_ERROR"); } }
    finally { if (alive.current) setLoading(false); }
  }, [actorId]);
  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, [load]);
  const locked = loading || command.busy || !!command.pending;
  async function execute(next?: AgriGrantCommand) {
    const applied = next ?? command.pending;
    if (await command.execute(next) && alive.current) await load(applied && "recipientId" in applied ? applied.recipientId : undefined);
  }
  function propose(action: "delegateScope" | "revokeScope", chosen: AgriWorkspaceScope) {
    if (!data?.recipientId || data.recipientId !== recipient.trim() || locked || chosen === "ACCESS_MANAGE") return;
    const old = data.grants.find(row => row.scope === chosen), base = { action, idempotencyKey: crypto.randomUUID(), recipientId: data.recipientId, scope: chosen, expectedRevision: old?.revision ?? 0 };
    try { setProposed(agriGrantCommandSchema.parse(action === "delegateScope" ? { ...base, expiresAt: instant(expiry), delegable } : base)); }
    catch { command.setError("INVALID_INPUT"); }
  }
  return <Card><CardHeader><CardTitle>{t("grantsTitle")}</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-sm leading-6 text-muted-foreground">{t("grantsHelp")}</p>{loading && <p role="status">{t("loading")}</p>}<Notice error={readError || command.error} saved={command.saved} pending={!!command.pending} busy={command.busy} retry={() => void execute()} />
    {data && <><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="min-w-0 flex-1"><Field label={t("recipientId")}>{id => <Input id={id} maxLength={80} autoComplete="off" value={recipient} disabled={locked} onChange={e => setRecipient(e.target.value)} />}</Field></div><Button variant="outline" disabled={locked || !recipient.trim()} onClick={() => void load(recipient.trim())}>{t("lookup")}</Button></div>
    {data.recipientId && data.recipientId === recipient.trim() && <><p className="break-all text-sm">{t("inspectedRecipient", { id: data.recipientId })}</p><div className="space-y-3">{data.grants.length === 0 && <p>{t("noGrants")}</p>}{data.grants.map(row => <div key={row.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 space-y-1"><p className="font-medium">{t("scope." + row.scope)}</p><p className="text-sm">{row.revokedAt ? t("revoked") : t("recorded")}{" ? "}{t("revision", { revision: row.revision })}</p><p className="break-words text-sm">{t("expiry")}: {row.expiresAt ? localTime(row.expiresAt).replace("T", " ") + " UTC+08:00" : t("noExpiry")}</p><p className="text-xs text-muted-foreground">{t("grantStateHelp")}</p></div>{row.scope !== "ACCESS_MANAGE" && <Button variant="outline" disabled={locked || !!row.revokedAt} onClick={() => propose("revokeScope", row.scope)}>{t("revoke")}</Button>}</div>)}</div>
    <fieldset disabled={locked} className="grid min-w-0 gap-4 sm:grid-cols-2"><Field label={t("scopeLabel")}>{id => <select id={id} className={selectClass} value={scope} onChange={e => setScope(e.target.value as AgriWorkspaceScope)}>{agriWorkspaceScopeSchema.options.filter(value => value !== "ACCESS_MANAGE" && data.delegableScopes.includes(value)).map(value => <option key={value} value={value}>{t("scope." + value)}</option>)}</select>}</Field><Field label={t("expiry")}>{id => <Input id={id} type="datetime-local" step="0.001" value={expiry} onChange={e => setExpiry(e.target.value)} />}</Field><Tick label={t("delegable")} checked={delegable} onChange={setDelegable} /></fieldset><p className="text-sm text-muted-foreground">{t("expiryHelp")}</p><Button disabled={locked || !data.delegableScopes.includes(scope)} onClick={() => propose("delegateScope", scope)}>{t("delegate")}</Button>{!data.delegableScopes.length && <p>{t("noDelegableScopes")}</p>}</>}
    </>}
    <Button variant="ghost" disabled={loading || command.busy} onClick={() => void load(data?.recipientId ?? undefined)}>{t("refresh")}</Button><Confirmation open={!!proposed} title={t("confirmAction")} description={proposed?.action === "revokeScope" ? t("revokeHelp") : t("delegateHelp")} onCancel={() => setProposed(null)} onConfirm={() => { const next = proposed; setProposed(null); if (next) void execute(next); }}><p className="break-all text-sm">{proposed?.recipientId}</p><p className="text-sm">{proposed ? t("scope." + proposed.scope) : ""}</p></Confirmation>
  </CardContent></Card>;
}

function DecisionManager({ actorId, preselection, invalidPreselection }: { actorId: string; preselection?: DecisionTarget; invalidPreselection: boolean }) {
  const t = useTranslations("product.agriWorkspace"); const command = useCommand(actorId, api + "/decisions");
  const [entryId, setEntryId] = useState(preselection?.teamCompetitionId ?? ""), [stageId, setStageId] = useState(preselection?.entryStageId ?? "");
  const [data, setData] = useState<AgriDecisionManagementView | null>(null), [loading, setLoading] = useState(false), [readError, setReadError] = useState("");
  const [state, setState] = useState<"ELIGIBLE" | "INELIGIBLE">("INELIGIBLE"), [reason, setReason] = useState(""), [source, setSource] = useState(""), [expiry, setExpiry] = useState("");
  const [fields, setFields] = useState<AgriCorrectableField[]>([]), [proposed, setProposed] = useState<AgriDecisionCommand | null>(null); const alive = useRef(true), generation = useRef(0);
  const selection = useRef({ teamCompetitionId: entryId, entryStageId: stageId });
  const contextHeading = useRef<HTMLHeadingElement>(null);
  const load = useCallback(async (target: DecisionTarget) => {
    const checked = agriDecisionQuerySchema.safeParse(target);
    if (!checked.success) { setData(null); setReadError("INVALID_INPUT"); return; }
    const requestId = ++generation.current; setLoading(true); setData(null); setReadError("");
    const query = new URLSearchParams(checked.data);
    try {
      const result = await request<AgriDecisionManagementView>(api + "/decisions?" + query, actorId);
      if (!alive.current || requestId !== generation.current) return;
      if (result.teamCompetitionId !== checked.data.teamCompetitionId || result.entryStageId !== (checked.data.entryStageId ?? null)) throw new ManagerError("INVALID_INPUT");
      if (selection.current.teamCompetitionId.trim() !== checked.data.teamCompetitionId || (selection.current.entryStageId.trim() || null) !== (checked.data.entryStageId ?? null)) return;
      setData(result);
    } catch (error) { if (alive.current && requestId === generation.current) { setData(null); setReadError(error instanceof ManagerError ? error.code : "INTERNAL_ERROR"); } }
    finally { if (alive.current && requestId === generation.current) setLoading(false); }
  }, [actorId]);
  const selectedEntryId = preselection?.teamCompetitionId, selectedStageId = preselection?.entryStageId;
  useEffect(() => { alive.current = true; if (selectedEntryId && !invalidPreselection) void load({ teamCompetitionId: selectedEntryId, ...(selectedStageId ? { entryStageId: selectedStageId } : {}) }); return () => { alive.current = false; }; }, [selectedEntryId, selectedStageId, invalidPreselection, load]);
  useEffect(() => { if (data && preselection) contextHeading.current?.focus(); }, [data, preselection]);
  useGuard(!!reason.trim() || !!source.trim() || !!expiry || fields.length > 0, !!command.pending);
  const locked = loading || command.busy || !!command.pending;
  const matches = !!data && data.teamCompetitionId === entryId.trim() && data.entryStageId === (stageId.trim() || null);
  async function execute(next?: AgriDecisionCommand) { if (await command.execute(next) && alive.current) { setReason(""); setSource(""); setExpiry(""); setFields([]); await load({ teamCompetitionId: entryId.trim(), ...(stageId.trim() ? { entryStageId: stageId.trim() } : {}) }); } }
  function propose(action: AgriDecisionCommand["action"], permitId?: string) {
    if (!data || !matches || locked) return;
    const base = { action, idempotencyKey: crypto.randomUUID(), reason };
    try { setProposed(agriDecisionCommandSchema.parse(action === "recordFinalEligibility" ? { ...base, teamCompetitionId: data.teamCompetitionId, expectedSequence: data.eligibility[0]?.sequence ?? 0, state, sourceReference: source } : action === "issueCorrectionPermit" ? { ...base, entryStageId: data.entryStageId, expectedRevision: data.stageRevision, previousSubmissionId: data.currentSubmissionId, allowedFields: fields, expiresAt: instant(expiry) } : { ...base, permitId })); }
    catch { command.setError("INVALID_INPUT"); }
  }
  return <Card id="agri-decisions"><CardHeader><CardTitle><h2 ref={contextHeading} tabIndex={-1}>{t("decisionsTitle")}</h2></CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-sm leading-6 text-muted-foreground">{t("decisionsHelp")}</p><Notice error={readError || command.error} saved={command.saved} pending={!!command.pending} busy={command.busy} retry={() => void execute()} />
    {invalidPreselection && <p role="alert">{t("invalidDecisionTarget")}</p>}
    {matches && data && <section aria-label={t("decisionContextTitle")} className="space-y-2 rounded-lg bg-muted/40 p-4">
      {data.context ? <><p className="break-words text-lg font-semibold">{data.context.teamName}</p>{data.context.stage && <p className="text-sm">{t("stage." + data.context.stage)}</p>}</> : <p className="break-all text-sm">{t("verifiedDecisionTarget", { id: data.teamCompetitionId })}</p>}
      <p className="text-sm text-muted-foreground">{t("decisionContextHint")}</p>
      <Button asChild variant="ghost" size="sm"><WorkspaceLink href="/competitions/agrihackathon/works">{t("backToWorks")}</WorkspaceLink></Button>
    </section>}
    <details open={!preselection || invalidPreselection} className="space-y-3 rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">{t("manualDecisionTarget")}</summary>
      <p className="text-sm text-muted-foreground">{t("manualDecisionTargetHint")}</p>
      <fieldset disabled={locked} className="grid min-w-0 gap-4 sm:grid-cols-2"><Field label={t("entryId")}>{id => <Input id={id} value={entryId} maxLength={80} onChange={e => { const value = e.target.value; setEntryId(value); selection.current.teamCompetitionId = value; ++generation.current; setData(null); }} />}</Field><Field label={t("stageId")}>{id => <Input id={id} value={stageId} maxLength={80} onChange={e => { const value = e.target.value; setStageId(value); selection.current.entryStageId = value; ++generation.current; setData(null); }} />}</Field></fieldset>
      <Button variant="outline" disabled={locked || !entryId.trim()} onClick={() => void load({ teamCompetitionId: entryId.trim(), ...(stageId.trim() ? { entryStageId: stageId.trim() } : {}) })}>{t("lookupDecisions")}</Button>
    </details>{loading && <p role="status">{t("loading")}</p>}
    {matches && data && <><div className="space-y-2"><h3 className="font-medium">{t("eligibilityTitle")}</h3><p>{t("eligibility." + (data.eligibility[0]?.state ?? "UNKNOWN"))}</p><Field label={t("eligibilityState")}>{id => <select id={id} className={selectClass} disabled={locked} value={state} onChange={e => setState(e.target.value as typeof state)}><option value="INELIGIBLE">{t("eligibility.INELIGIBLE")}</option><option value="ELIGIBLE">{t("eligibility.ELIGIBLE")}</option></select>}</Field><Field label={t("sourceReference")}>{id => <Textarea id={id} maxLength={2000} disabled={locked} value={source} onChange={e => setSource(e.target.value)} />}</Field></div>
    <Field label={t("decisionReason")}>{id => <Textarea id={id} maxLength={2000} disabled={locked} value={reason} onChange={e => setReason(e.target.value)} />}</Field><Button disabled={locked || !reason.trim() || !source.trim()} onClick={() => propose("recordFinalEligibility")}>{t("recordEligibility")}</Button>
    <div className="space-y-3">{data.eligibility.map(row => <div key={row.id} className="space-y-1 rounded-md border p-3 text-sm"><p>{t("eligibility." + row.state)} · {t("revision", { revision: row.sequence })}</p><p className="whitespace-pre-wrap break-words">{row.reason}</p><p className="whitespace-pre-wrap break-words">{row.sourceReference}</p><p className="break-all">{row.actorId} · {row.decidedAt}</p></div>)}</div>
    {data.entryStageId && <div className="space-y-4 rounded-md border p-4"><h3 className="font-medium">{t("correctionTitle")}</h3><p className="text-sm leading-6 text-muted-foreground">{t("correctionHelp")}</p><p className="break-all text-sm">{t("currentSubmission", { id: data.currentSubmissionId ?? t("none") })}</p><fieldset disabled={locked || !data.currentSubmissionId} className="space-y-3"><div className="grid gap-2 sm:grid-cols-2">{agriCorrectableFieldSchema.options.map(field => <Tick key={field} label={t("field." + field)} checked={fields.includes(field)} onChange={value => setFields(old => value ? [...old, field] : old.filter(item => item !== field))} />)}</div><Field label={t("expiry")}>{id => <Input id={id} type="datetime-local" step="0.001" value={expiry} onChange={e => setExpiry(e.target.value)} />}</Field><Button disabled={!reason.trim() || !fields.length || !expiry} onClick={() => propose("issueCorrectionPermit")}>{t("issuePermit")}</Button></fieldset>
    {data.permits.map(row => <div key={row.id} className="space-y-2 rounded-md border p-3 text-sm"><p className="break-all">{row.id}</p><p className="whitespace-pre-wrap break-words">{row.reason}</p><p>{row.allowedFields.map(field => t("field." + field)).join(" · ")}</p><p>{t("expiry")}: {localTime(row.expiresAt).replace("T", " ")} UTC+08:00</p><p>{row.revokedAt ? t("revoked") : row.usedBySubmissionId ? t("permitUsed") : t("recorded")}</p>{!row.revokedAt && !row.usedBySubmissionId && <Button variant="outline" disabled={locked || !reason.trim()} onClick={() => propose("revokeCorrectionPermit", row.id)}>{t("revokePermit")}</Button>}</div>)}</div>}
    <p className="text-xs text-muted-foreground">{t("decisionHistoryLimit")}</p></>}
    <Confirmation open={!!proposed} title={t("confirmAction")} description={t(proposed?.action === "recordFinalEligibility" ? "eligibilityConfirm" : proposed?.action === "issueCorrectionPermit" ? "permitConfirm" : "permitRevokeConfirm")} onCancel={() => setProposed(null)} onConfirm={() => { const next = proposed; setProposed(null); if (next) void execute(next); }}><p className="break-all text-sm">{data?.teamCompetitionId}</p><p className="whitespace-pre-wrap break-words text-sm">{proposed?.reason}</p></Confirmation>
  </CardContent></Card>;
}
