"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Archive, Download, FileCheck2, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EvidenceList, EvidenceKind, EvidenceRequestView, EvidenceCreate } from "@/contracts/agri-evidence";
const api = "/api/competitions/agrihackathon/evidence";
interface Props {
    actorId: string;
    submissionId?: string;
    entryStageId?: string;
    projectId?: string;
    artifactVersionId?: string;
    repository?: { url: string; ref: NonNullable<EvidenceCreate["originalRef"]> | null } | null;
    invalidate: () => void;
    onPrepared?: (ids: string[]) => void;
}
export function AgriEvidence(props: Props) { return <EvidencePanel key={[props.actorId, props.submissionId ?? props.entryStageId, props.projectId, props.artifactVersionId, JSON.stringify(props.repository)].join(":")} {...props}/>; }
function EvidencePanel({ actorId, submissionId, entryStageId, projectId, artifactVersionId, repository, invalidate, onPrepared }: Props) {
    const t = useTranslations("product.agriEvidence"), locale = useLocale(), id = useId(), [open, setOpen] = useState(false), [data, setData] = useState<EvidenceList | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [kind, setKind] = useState<EvidenceKind>("DEMO_VIDEO"), [file, setFile] = useState<File | null>(null), [selected, setSelected] = useState<string[]>([]), [reason, setReason] = useState(""), [lastArchive, setLastArchive] = useState<string | null>(null);
    const alive = useRef(true), sequence = useRef(0), controller = useRef<AbortController | null>(null), writing = useRef(false), input = useRef<HTMLInputElement | null>(null), invalidateRef = useRef(invalidate), preparedRef = useRef(onPrepared);
    invalidateRef.current = invalidate;
    preparedRef.current = onPrepared;
    const headers = { "x-ans-submission-actor": actorId };
    const key = "ans-agri-evidence-pending:" + actorId + ":" + (submissionId ?? entryStageId) + ":" + (artifactVersionId ?? "");
    const at = (value: string) => new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    const errorText = (code: string) => t.has("errors." + code) ? t("errors." + code) : t("errors.OTHER", { code });
    const request = useCallback(async (url: string, init: RequestInit = {}) => {
        const response = await fetch(url, { ...init, cache: "no-store", signal: controller.current?.signal, headers: { ...init.headers, "x-ans-submission-actor": actorId } });
        const value = await response.json();
        if (!response.ok || value.ok !== true) {
            const code = value.error?.code ?? "INTERNAL_ERROR";
            if (["ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE", "UNAUTHORIZED"].includes(code)) {
                setData(null);
                invalidateRef.current();
            }
            throw new Error(code);
        }
        return value.data;
    }, [actorId]);
    const load = useCallback(async (cursor?: string) => { const epoch = sequence.current; const q = new URLSearchParams(submissionId ? { submissionId } : { entryStageId: entryStageId! }); if (!submissionId && artifactVersionId)
        q.set("artifactVersionId", artifactVersionId); if (cursor)
        q.set("cursor", cursor); try {
        const next: EvidenceList = await request(api + "?" + q);
        if (!alive.current || epoch !== sequence.current)
            return;
        if (next.submissionId !== (submissionId ?? null) || entryStageId && next.entryStageId !== entryStageId)
            throw new Error("ACCOUNT_CHANGED");
        setData(old => ({ ...next, requests: cursor && old ? [...old.requests, ...next.requests.filter(r => !old.requests.some(p => p.id === r.id))] : next.requests }));
        preparedRef.current?.(next.requests.filter(r => (r.state === "UPLOADED" || r.state === "RESOLVED" && r.resolution?.repositoryUrl === repository?.url && JSON.stringify(r.resolution?.originalRef) === JSON.stringify(repository?.ref)) && (!r.expiresAt || new Date(r.expiresAt).getTime() > Date.now())).map(r => r.id));
    }
    catch (e) {
        if (alive.current && epoch === sequence.current)
            setError(e instanceof Error ? e.message : "INTERNAL_ERROR");
    } }, [request, submissionId, entryStageId, artifactVersionId, repository]);
    useEffect(() => { preparedRef.current?.([]); alive.current = true; const epoch = sequence; return () => { alive.current = false; ++epoch.current; controller.current?.abort(); }; }, []);
    useEffect(() => { if (!open)
        return; void load(); const timer = setInterval(() => { if (!writing.current)
        void load(); }, 5000); return () => clearInterval(timer); }, [open, load]);
    async function write(run: () => Promise<void>) { if (writing.current)
        return; writing.current = true; setBusy(true); setError(""); const epoch = sequence.current; controller.current = new AbortController(); try {
        await run();
        if (alive.current && epoch === sequence.current) {
            setFile(null);
            if (input.current)
                input.current.value = "";
            await load();
        }
    }
    catch (e) {
        if (alive.current && epoch === sequence.current)
            setError(e instanceof Error ? e.message : "INTERNAL_ERROR");
    }
    finally {
        writing.current = false;
        if (alive.current && epoch === sequence.current)
            setBusy(false);
    } }
    async function durableCommand(url: string, body: Record<string, unknown>) {
        const storageKey = key + ":command:" + String(body.action), fingerprint = JSON.stringify({ ...body, idempotencyKey: null });
        let pending: {
            fingerprint: string;
            body: Record<string, unknown>;
        } | null = null;
        try {
            pending = JSON.parse(sessionStorage.getItem(storageKey) || "null");
        }
        catch { }
        const command = pending?.fingerprint === fingerprint ? pending.body : body;
        try {
            sessionStorage.setItem(storageKey, JSON.stringify({ fingerprint, body: command }));
        }
        catch { }
        const result = await request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(command) });
        try {
            sessionStorage.removeItem(storageKey);
        }
        catch { }
        return result;
    }
    async function create(command: EvidenceCreate) { const commandKey = JSON.stringify({ ...command, idempotencyKey: null }); let saved: {
        command: string;
        idempotencyKey: string;
    } | null = null; try {
        saved = JSON.parse(sessionStorage.getItem(key) || "null");
    }
    catch { } const idempotencyKey = saved?.command === commandKey ? saved.idempotencyKey : command.idempotencyKey; try {
        sessionStorage.setItem(key, JSON.stringify({ command: commandKey, idempotencyKey }));
    }
    catch { } const result = await request(api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...command, idempotencyKey }) }); try {
        sessionStorage.removeItem(key);
    }
    catch { } return result.requestId as string; }
    async function upload(existing?: EvidenceRequestView) { if (!file)
        return; await write(async () => { let requestId = existing?.id; if (!requestId) {
        const target = data?.target;
        requestId = await create({ action: "create", idempotencyKey: crypto.randomUUID(), entryStageId: data!.entryStageId, submissionId: submissionId ?? null, projectId: target?.projectId ?? projectId!, artifactVersionId: target?.artifactVersionId ?? artifactVersionId!, mode: "UPLOAD", kind, fileName: file.name, sourceUrl: null, originalRef: null });
    } await request(api + "/uploads/" + requestId + "/body", { method: "PUT", headers: { "content-type": "application/octet-stream" }, body: file }); }); }
    async function captureRepository() { const selectedRepository = data?.target?.repository ?? repository; if (!data || !selectedRepository?.ref)
        return; const target = data.target; await write(async () => { await create({ action: "create", idempotencyKey: crypto.randomUUID(), entryStageId: data.entryStageId, submissionId: submissionId ?? null, projectId: target?.projectId ?? projectId!, artifactVersionId: target?.artifactVersionId ?? artifactVersionId!, mode: "GITHUB_ARCHIVE", kind: "REPOSITORY", fileName: "repository.tar.gz", sourceUrl: selectedRepository.url, originalRef: selectedRepository.ref }); }); }
    async function captureDemo() { if (!data?.target?.demoUrl)
        return; const target = data.target; await write(async () => { await create({ action: "create", idempotencyKey: crypto.randomUUID(), entryStageId: data.entryStageId, submissionId: submissionId!, projectId: target.projectId, artifactVersionId: target.artifactVersionId, mode: "ALLOWED_HTTP_CAPTURE", kind: "DEMO_DOCUMENT", fileName: "demo-main-response.bin", sourceUrl: target.demoUrl, originalRef: null }); }); }
    async function command(action: "retry" | "cancel", requestId: string) { await write(async () => { await durableCommand(api, { action, requestId, idempotencyKey: crypto.randomUUID() }); }); }
    async function freezeArchive() {
        await write(async () => {
            const freezeKey = key + ":freeze", selection = JSON.stringify([...selected].sort());
            let saved: {
                selection: string;
                manifestId: string;
            } | null = null;
            try {
                saved = JSON.parse(sessionStorage.getItem(freezeKey) || "null");
            }
            catch { }
            const manifest = saved?.selection === selection ? saved : await durableCommand(api, { action: "manifest", submissionId, objectIds: selected, idempotencyKey: crypto.randomUUID() });
            try {
                sessionStorage.setItem(freezeKey, JSON.stringify({ selection, manifestId: manifest.manifestId }));
            }
            catch { }
            const archive = await durableCommand("/api/competitions/agrihackathon/records/" + encodeURIComponent(submissionId!) + "/archives", { action: "createArchive", submissionId, selection: { includePrivate: true, includeInternal: false }, evidenceManifestId: manifest.manifestId, idempotencyKey: crypto.randomUUID() });
            try {
                sessionStorage.removeItem(freezeKey);
            }
            catch { }
            setLastArchive(archive.archiveId);
        });
    }
    async function verify(r: EvidenceRequestView) { if (!r.object)
        return; await write(async () => { await durableCommand(api, { action: "verifyCutoff", requestId: r.id, objectId: r.object!.id, reason, idempotencyKey: crypto.randomUUID() }); setReason(""); }); }
    async function download(r: EvidenceRequestView) {
        if (!r.object)
            return;
        await write(async () => {
            const picker = (window as unknown as {
                showSaveFilePicker?: (options: {
                    suggestedName: string;
                }) => Promise<{
                    createWritable: () => Promise<WritableStream<Uint8Array>>;
                }>;
            }).showSaveFilePicker;
            const handle = picker ? await picker.call(window, { suggestedName: r.object!.fileName }) : null;
            const response = await fetch(api + "/objects/" + r.object!.id, { cache: "no-store", headers, signal: controller.current?.signal });
            if (!response.ok) {
                const body = await response.json();
                throw new Error(body.error?.code ?? "INTERNAL_ERROR");
            }
            if (response.headers.get("x-ans-evidence-sha256") !== r.object!.sha256)
                throw new Error("AGRI_EVIDENCE_INTEGRITY_FAILED");
            if (handle) {
                if (!response.body)
                    throw new Error("AGRI_EVIDENCE_EMPTY");
                await response.body.pipeTo(await handle.createWritable(), { signal: controller.current?.signal });
                return;
            }
            const bytes = await response.blob();
            if (!alive.current)
                return;
            const url = URL.createObjectURL(bytes), link = document.createElement("a");
            link.href = url;
            link.download = r.object!.fileName;
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
    }
    return <section className="min-w-0 rounded-xl border" aria-labelledby={id + "-title"}><div className="flex flex-wrap items-start justify-between gap-4 p-5"><div className="space-y-2"><h2 id={id + "-title"} className="flex items-center gap-2 font-semibold"><Archive className="h-5 w-5" aria-hidden="true"/>{t("title")}</h2><p className="max-w-3xl text-sm leading-6 text-muted-foreground">{t("intro")}</p></div><Button variant="outline" disabled={busy} aria-expanded={open} aria-controls={id + "-body"} onClick={() => { setOpen(!open); setError(""); }}>{t(open ? "close" : "open")}</Button></div>{open && <div id={id + "-body"} className="min-w-0 space-y-5 border-t p-5">
 {!data && !error && <p role="status">{t("loading")}</p>}{error && <p role="alert" className="break-words rounded-lg border p-3 text-sm">{errorText(error)}</p>}{busy && <p role="status" className="flex gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>{t("working")}</p>}
 {data && <><p className="text-sm text-muted-foreground">{t("privacy")}</p>{!data.enabled && <p role="status" className="rounded-lg bg-muted p-3 text-sm">{t("disabled")}</p>}
 {data.enabled && data.canWrite && <div className="space-y-4 rounded-lg bg-muted/30 p-4"><h3 className="flex items-center gap-2 font-medium"><UploadCloud className="h-4 w-4" aria-hidden="true"/>{t("upload")}</h3><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-2 text-sm" htmlFor={id + "-kind"}><span>{t("kindLabel")}</span><select id={id + "-kind"} disabled={busy} value={kind} className="w-full min-w-0 rounded-md border bg-background p-2" onChange={e => setKind(e.target.value as EvidenceKind)}>{(["DEMO_VIDEO", "REPOSITORY", "DEMO_DOCUMENT", "SUPPORTING_FILE"] as const).map(k => <option key={k} value={k}>{t("kind." + k)}</option>)}</select></label><label className="space-y-2 text-sm" htmlFor={id + "-file"}><span>{t("fileLabel")}</span><input ref={input} id={id + "-file"} className="block w-full min-w-0 rounded-md border p-2" type="file" disabled={busy} onChange={e => setFile(e.target.files?.[0] ?? null)}/></label></div><p className="text-xs leading-6 text-muted-foreground">{t(submissionId ? "supplementHint" : "intentHint")}</p><div className="flex flex-wrap gap-3"><Button disabled={busy || !file || (!data.target && (!projectId || !artifactVersionId))} onClick={() => void upload()}>{t("upload")}</Button>{(data.target?.repository?.ref || repository?.ref) && <Button variant="outline" disabled={busy} onClick={() => void captureRepository()}>{t(submissionId ? "github" : "resolveRef")}</Button>}{data.target?.demoUrl && <Button variant="outline" disabled={busy} onClick={() => void captureDemo()}>{t("captureDemo")}</Button>}</div></div>}
 <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy} onClick={() => { setError(""); void load(); }}><RefreshCw className="h-4 w-4" aria-hidden="true"/>{t("refresh")}</Button></div>
 {!data.requests.length && <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{t("empty")}</p>}<ol className="space-y-3">{data.requests.map(r => <li key={r.id} className="min-w-0 space-y-3 rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="break-words font-medium">{r.fileName}</p><Badge variant="secondary">{t("state." + r.state)}</Badge></div><p className="text-xs text-muted-foreground">{t("kind." + r.kind)}{"\u00b7"}{at(r.createdAt)}{"\u00b7"}{t("attempt", { attempt: r.attempt, max: r.maxAttempts })}</p>{r.resolution && <div className="space-y-1 rounded-md bg-muted p-3 text-xs"><p>{t("resolution", { ref: r.resolution.originalRef.value, at: at(r.resolution.resolvedAt) })}</p><p className="break-all font-mono">{r.resolution.sha}</p></div>}{r.errorCode && <p className="text-sm">{errorText(r.errorCode)}</p>}{r.object && <><p className="text-sm">{t("captured", { at: at(r.object.capturedAt), bytes: r.object.byteLength })}</p><p className="text-xs leading-6 text-muted-foreground">{t("temporal." + r.object.temporalStatus)}{"\u00b7"}{t("sourceTiming." + r.object.sourceTiming)}{"\u00b7"}{t("coverage." + r.object.coverage)}</p><p className="break-all font-mono text-xs text-muted-foreground">SHA-256 {r.object.sha256}</p>{r.object.resolvedSha && <p className="break-all font-mono text-xs">{r.object.resolvedSha}</p>}{r.cutoffVerification && <p className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-sm">{t("verifiedCutoff", { at: at(r.cutoffVerification.at) })}{"\u00b7"}{r.cutoffVerification.reason}</p>}<div className="flex flex-wrap gap-3"><Button variant="outline" size="sm" disabled={busy} onClick={() => void download(r)}><Download className="h-4 w-4" aria-hidden="true"/>{t("download")}</Button>{data.canArchive && submissionId && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(r.object.id)} onChange={e => setSelected(old => e.target.checked ? [...old, r.object!.id] : old.filter(id => id !== r.object!.id))}/>{t("select")}</label>}</div></>}
 {r.canManage && data.enabled && <div className="flex flex-wrap gap-3">{r.canUpload && r.mode === "UPLOAD" && ["PREPARED", "FAILED", "RUNNING", "NEEDS_REVIEW"].includes(r.state) && <Button variant="outline" size="sm" disabled={busy || !file} onClick={() => void upload(r)}>{t("continueUpload")}</Button>}{["FAILED", "RETRY_WAIT", "NEEDS_REVIEW"].includes(r.state) && r.attempt < r.maxAttempts && <Button variant="outline" size="sm" disabled={busy} onClick={() => void command("retry", r.id)}>{t("retry")}</Button>}{["PREPARED", "QUEUED", "RUNNING", "RETRY_WAIT", "RESOLVED"].includes(r.state) && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void command("cancel", r.id)}>{t("cancel")}</Button>}</div>}
 {submissionId && r.object?.deadlineAt && data.canVerify && <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm">{t("verify")}</summary><label htmlFor={id + "-reason-" + r.id} className="mt-3 block space-y-2 text-sm"><span>{t("reason")}</span><textarea id={id + "-reason-" + r.id} className="min-h-20 w-full rounded-md border bg-background p-2" value={reason} onChange={e => setReason(e.target.value)}/></label><Button className="mt-3" variant="outline" disabled={busy || reason.trim().length < 10} onClick={() => void verify(r)}>{t("verify")}</Button></details>}
 </li>)}</ol>{data.nextCursor && <Button variant="outline" disabled={busy} onClick={() => void load(data.nextCursor!)}>{t("more")}</Button>}
 {submissionId && data.canArchive && data.enabled && <div className="space-y-3 rounded-lg border p-4"><h3 className="flex items-center gap-2 font-medium"><FileCheck2 className="h-4 w-4" aria-hidden="true"/>{t("manifest")}</h3><p className="text-sm leading-6 text-muted-foreground">{t("manifestHint")}</p><Button disabled={busy || !selected.length} onClick={() => void freezeArchive()}>{t("archive")}</Button>{data.manifest && <p className="break-all text-xs text-muted-foreground">{t("manifestVersion", { sequence: data.manifest.value.sequence })}{"\u00b7"} SHA-256 {data.manifest.sha256}</p>}{lastArchive && <p role="status" className="break-all text-sm">{t("archiveSaved", { id: lastArchive })}</p>}</div>}
 </>}
 </div>}</section>;
}
