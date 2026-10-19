"use client";
import Link from "next/link";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PROJECT_WORKFLOW_COST_POINTS, projectPackWorkflowIds, type OfficialWorkflowId } from "@/contracts/projects";
import { OFFICIAL_WORKFLOWS } from "@/domain/projects/pack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Fact = {
  key: "problem" | "contribution" | "method" | "result" | "evidence";
  label: string;
  hint: string;
  value: string;
  evidenceUrl: string;
  confirmation: "missing" | "unconfirmed" | "confirmed";
};

type Artifact = {
  id: string;
  workflowId: string;
  title: string;
  currentVersion: number;
  versions: Array<{ id: string; version: number; markdown: string; createdAt: string }>;
};

export type ProjectView = {
  id: string;
  title: string;
  goal: "career" | "contest" | "portfolio";
  facts: Fact[];
  artifacts: Artifact[];
};

const FACT_KEYS = { problem: "Problem", contribution: "Contribution", method: "Method", result: "Result", evidence: "Evidence" } as const;

async function postJson(url: string, body: unknown, fallback: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? fallback);
  return payload.data;
}

export function ProjectStudio({ project, initialWorkflowId }: { project: ProjectView; initialWorkflowId?: OfficialWorkflowId }) {
  const router = useRouter();
  const t = useTranslations("learning");
  const product = useTranslations("product");
  const visual = useTranslations("visualWebsite");
  const locale = useLocale();
  const [facts, setFacts] = useState(project.facts);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [runs, setRuns] = useState<Array<{ id: string; workflowId: string; status: string; requestKey: string | null; error?: string | null }>>([]);
  const [runReadError, setRunReadError] = useState(false);
  const [runsLoaded, setRunsLoaded] = useState(false);
  const requestKeys = useRef(new Map<string, string>());
  const uiCallbacks = useRef({ router, t });
  useEffect(() => { uiCallbacks.current = { router, t }; }, [router, t]);
  const observedRuns = useRef(new Map<string, string>());
  // Preserve receipt evidence if GET resolves before the original POST returns.
  const verifiedReceipts = useRef(new Map<string, { status: string; id: string }>());
  const recoveringRequest = useRef<{ workflowId: string; key: string } | null>(null);
  const activeRuns = runs.filter(run => ["QUEUED", "RUNNING"].includes(run.status));
  const isZh = locale.startsWith("zh");
  const [publications, setPublications] = useState<Record<string, { status: string; reviewNote: string | null }>>({});
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({});
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ artifactId: string; baseVersionId: string; expectedVersion: number; markdown: string } | null>(null);
  const [savedVersions, setSavedVersions] = useState<Record<string, Artifact["versions"][number]>>({});
  const completed = projectPackWorkflowIds.filter((id) => project.artifacts.some((artifact) => artifact.workflowId === id && artifact.versions.length > 0)).length;
  const locked = Boolean(pending) || Boolean(editing) || activeRuns.length > 0;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const refreshRuns = async () => {
      try {
        const response = await fetch(`/api/projects/${project.id}/runs`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload.ok || !Array.isArray(payload.data?.runs)) throw new Error("RUN_STATUS_UNAVAILABLE");
        if (cancelled) return;
        const current = payload.data.runs as typeof runs;
        setRuns(current);
        setRunReadError(false);
        setRunsLoaded(true);
        for (const run of current) {
          if (run.requestKey) verifiedReceipts.current.set(run.requestKey, { status: run.status, id: run.id });
          const recovering = recoveringRequest.current?.workflowId === run.workflowId && recoveringRequest.current.key === run.requestKey;
          const previous = observedRuns.current.get(run.id);
          if (recovering && ["QUEUED", "RUNNING"].includes(run.status)) {
            setError("");
            setMessage(isZh ? "已查到任务，后台正在处理。请等待结果，无需再次生成。" : "Task located and processing in the background. Wait for the result; no new generation is needed.");
          }
          if ((recovering || (previous && ["QUEUED", "RUNNING"].includes(previous))) && !["QUEUED", "RUNNING"].includes(run.status)) {
            uiCallbacks.current.router.refresh();
            if (run.status === "SUCCEEDED") { setError(""); setSelectedVersions({}); setMessage(uiCallbacks.current.t("generated")); }
            else setError(isZh ? "\u4efb\u52a1\u672a\u5b8c\u6210\uff0c\u8bf7\u67e5\u770b\u8fd0\u884c\u8bb0\u5f55\u540e\u91cd\u8bd5\u3002\u5df2\u786e\u8ba4\u7684\u5b9e\u9645\u7b97\u529b\u6d88\u8017\u4ecd\u4f1a\u8bb0\u8d26\u3002" : "Task did not complete. Check the run history before retrying. Confirmed compute usage remains billed.");
          }
          if (recovering && !["QUEUED", "RUNNING"].includes(run.status)) recoveringRequest.current = null;
          observedRuns.current.set(run.id, run.status);
          if (!["QUEUED", "RUNNING"].includes(run.status)) {
            if (requestKeys.current.get(run.workflowId) === run.requestKey) requestKeys.current.delete(run.workflowId);
            try { const key = `ans:document:${project.id}:${run.workflowId}`; if (sessionStorage.getItem(key) === run.requestKey) sessionStorage.removeItem(key); } catch {}
          }
        }
      } catch { if (!cancelled) setRunReadError(true); }
      if (!cancelled) timer = setTimeout(() => void refreshRuns(), 3000);
    };
    void refreshRuns();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [project.id, isZh]);

  useEffect(() => {
    if (!editing) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing]);

  useEffect(() => {
    let active = true;
    fetch(`/api/projects/${project.id}/publication`).then((response) => response.json()).then((result) => {
      if (!active || !result.ok) return;
      setPublications(Object.fromEntries((result.data.publications ?? []).map((item: { artifactVersionId: string; status: string; reviewNote: string | null }) => [item.artifactVersionId, item])));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [project.id]);
  const selectedWorkflow = OFFICIAL_WORKFLOWS.find((workflow) => workflow.id === initialWorkflowId);
  const recommended = useMemo(
    () =>
      projectPackWorkflowIds
        .map((id) => OFFICIAL_WORKFLOWS.find((workflow) => workflow.id === id)!)
        .filter((workflow) => workflow.id !== selectedWorkflow?.id),
    [selectedWorkflow?.id],
  );
  const more = OFFICIAL_WORKFLOWS.filter(
    (workflow) => !projectPackWorkflowIds.includes(workflow.id as (typeof projectPackWorkflowIds)[number]) && workflow.id !== selectedWorkflow?.id,
  );

  function factPayload(confirm: boolean) {
    return facts.map((fact) => {
      const value = fact.value.trim();
      return {
        key: fact.key,
        value: fact.value,
        evidenceUrl: fact.evidenceUrl,
        confirmation: !value
          ? "missing"
          : value === "暂无" || confirm || fact.confirmation === "confirmed"
            ? "confirmed"
            : "unconfirmed",
      };
    });
  }

  function updateFact(key: Fact["key"], value: string) {
    setFacts((current) => current.map((fact) => fact.key === key ? { ...fact, value, confirmation: value.trim() ? "unconfirmed" : "missing" } : fact));
  }

  async function saveFacts(confirm = false) {
    setPending(confirm ? "confirm" : "save");
    setError("");
    setMessage("");
    try {
      await postJson(`/api/projects/${project.id}/facts`, { facts: factPayload(confirm) }, t("operationFailed"));
      if (confirm) {
        setFacts((current) => current.map((fact) => ({
          ...fact,
          confirmation: fact.value.trim() ? "confirmed" : "missing",
        })));
      }
      setMessage(t(confirm ? "factsConfirmed" : "factsSaved"));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("operationFailed"));
    } finally {
      setPending("");
    }
  }

  async function changePublication(artifactVersionId: string, status: string | undefined) {
    setPending(`publication:${artifactVersionId}`);
    setError("");
    setMessage("");
    try {
      const response = status === "APPROVED" || status === "PENDING"
        ? await fetch(`/api/projects/${project.id}/publication`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artifactVersionId }) })
        : await fetch(`/api/projects/${project.id}/publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artifactVersionId, acknowledged: true }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error?.message ?? t("operationFailed"));
      setPublications((current) => ({ ...current, [artifactVersionId]: { status: status === "APPROVED" || status === "PENDING" ? "WITHDRAWN" : "PENDING", reviewNote: null } }));
      setMessage(t(status === "APPROVED" || status === "PENDING" ? "shareWithdrawn" : "shareSubmitted"));
      setAcknowledged((current) => ({ ...current, [artifactVersionId]: false }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("operationFailed"));
    } finally {
      setPending("");
    }
  }

  async function runWorkflow(workflowId: string) {
    setPending(workflowId);
    setError("");
    setMessage("");
    let submittedKey: string | null = null;
    try {
      await postJson(`/api/projects/${project.id}/facts`, { facts: factPayload(false) }, t("operationFailed"));
      const requestStorageKey = `ans:document:${project.id}:${workflowId}`;
      let idempotencyKey: string;
      try {
        idempotencyKey = requestKeys.current.get(workflowId) ?? sessionStorage.getItem(requestStorageKey) ?? `${workflowId}-${crypto.randomUUID()}`;
        sessionStorage.setItem(requestStorageKey, idempotencyKey);
      } catch { idempotencyKey = requestKeys.current.get(workflowId) ?? `${workflowId}-${crypto.randomUUID()}`; }
      requestKeys.current.set(workflowId, idempotencyKey);
      submittedKey = idempotencyKey;
      const accepted = await postJson(`/api/projects/${project.id}/runs`, { workflowId, idempotencyKey }, t("operationFailed"));
      if (typeof accepted.workflowRunId !== "string" || typeof accepted.status !== "string") throw new Error(isZh ? "\u4efb\u52a1\u63d0\u4ea4\u7ed3\u679c\u672a\u786e\u8ba4\uff0c\u8bf7\u7a0d\u540e\u67e5\u770b\u8fd0\u884c\u8bb0\u5f55\u3002" : "Task receipt is unconfirmed. Check the run history shortly.");
      observedRuns.current.set(accepted.workflowRunId, accepted.status);
      setRuns(current => [{ id: accepted.workflowRunId, workflowId, status: accepted.status, requestKey: idempotencyKey }, ...current.filter(run => run.id !== accepted.workflowRunId)]);
      setMessage(isZh ? "\u4efb\u52a1\u5df2\u63d0\u4ea4\uff0c\u540e\u53f0\u4f1a\u7ee7\u7eed\u5904\u7406\u3002\u53ef\u4ee5\u79bb\u5f00\u9875\u9762\uff0c\u7a0d\u540e\u56de\u6765\u67e5\u770b\u6210\u679c\u3002" : "Task submitted. Processing continues in the background; return later to view the result.");
      router.refresh();
    } catch (cause) {
      if (submittedKey && cause instanceof TypeError) {
        const receipt = verifiedReceipts.current.get(submittedKey);
        if (receipt?.status === "SUCCEEDED") {
          setError("");
          setSelectedVersions({});
          setMessage(t("generated"));
          router.refresh();
        } else if (receipt && !["QUEUED", "RUNNING"].includes(receipt.status)) {
          setError(isZh ? "任务未完成，请查看运行记录。" : "Task did not complete. Check the run history.");
        } else {
          recoveringRequest.current = { workflowId, key: submittedKey };
          setError("");
          setMessage(isZh ? "连接暂时中断，正在核对本次任务。请等待运行记录更新；重新提交会沿用本次请求编号。" : "Connection interrupted. Checking this task's status. Wait for the run history to update; resubmission keeps the same request key.");
        }
      } else {
        setError(cause instanceof Error ? cause.message : t("operationFailed"));
      }
    } finally {
      setPending("");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setPending("edit");
    setMessage("");
    setError("");
    try {
      const version = await postJson(`/api/projects/${project.id}/artifacts`, {
        baseVersionId: editing.baseVersionId, expectedVersion: editing.expectedVersion, markdown: editing.markdown,
      }, t("operationFailed"));
      setSavedVersions((current) => ({ ...current, [editing.artifactId]: { id: version.id, version: version.version, markdown: editing.markdown.trim(), createdAt: new Date().toISOString() } }));
      setSelectedVersions((current) => ({ ...current, [editing.artifactId]: version.id }));
      setEditing(null);
      setMessage(t("editSaved"));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("operationFailed"));
    } finally { setPending(""); }
  }

  function WorkflowButton({ workflow }: { workflow: (typeof OFFICIAL_WORKFLOWS)[number] }) {
    const artifact = project.artifacts.find((item) => item.workflowId === workflow.id);
    return (
      <button className="rounded-lg border p-4 text-left transition hover:border-primary disabled:opacity-50" disabled={locked || !runsLoaded || runReadError} onClick={() => runWorkflow(workflow.id)}>
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">{workflow.title}</span>
          {artifact ? <Badge variant="secondary">v{artifact.currentVersion}</Badge> : <Badge variant="outline">{t("notGenerated")}</Badge>}
        </span>
        <span className="mt-2 block text-xs leading-5 text-muted-foreground">{workflow.summary}</span>
        <span className="mt-3 block text-xs text-muted-foreground">{t(pending === workflow.id ? "generating" : artifact ? "regenerate" : "generate")}</span>
      </button>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>{t("factsTitle")}</CardTitle>
          <CardDescription>{t("factsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {facts.map((fact) => (
            <label key={fact.key} className="block space-y-2">
              <span className="flex items-center justify-between gap-3 text-sm font-medium">{t(`fact${FACT_KEYS[fact.key]}`)}<Badge variant="outline">{t(fact.confirmation)}</Badge></span>
              <Textarea disabled={locked} value={fact.value} onChange={(event) => updateFact(fact.key, event.target.value)} placeholder={t(`hint${FACT_KEYS[fact.key]}`)} rows={3} />
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => saveFacts(false)} disabled={locked}>{t("saveFacts")}</Button>
            <Button variant="outline" onClick={() => saveFacts(true)} disabled={locked}>{t("confirmFacts")}</Button>
          </div>
        </CardContent>
      </Card>
      <div className="min-w-0 space-y-4">
        {activeRuns.length > 0 && <p role="status" className="rounded-xl border bg-muted/40 p-3 text-sm">{isZh ? "\u540e\u53f0\u6b63\u5728\u751f\u6210\u6210\u679c\uff0c\u5173\u95ed\u9875\u9762\u4e0d\u4f1a\u53d6\u6d88\u4efb\u52a1\u3002" : "Generating in the background. Closing this page will not cancel the task."}</p>}
        {runReadError && <p role="status" className="text-sm text-muted-foreground">{isZh ? "\u4efb\u52a1\u72b6\u6001\u6682\u65f6\u65e0\u6cd5\u8bfb\u53d6\uff0c\u6b63\u5728\u91cd\u65b0\u8fde\u63a5\u3002\u8bf7\u5148\u4e0d\u8981\u91cd\u590d\u63d0\u4ea4\u3002" : "Reconnecting to task status. Please avoid submitting again."}</p>}
        {project.artifacts.some(a => a.workflowId === "visual-portfolio-v1") && <Button asChild variant="outline"><Link href={`/projects/${project.id}/visual-website`}>{visual("savedLink")}</Link></Button>}
        <Button asChild variant="outline"><Link href={`/projects/${project.id}/website`}>{product("website.openStudio")}</Link></Button>
        {selectedWorkflow && <Card id="selected-workflow" className="scroll-mt-24 border-primary/40"><CardHeader><CardTitle className="text-base">{product("selectedWorkflow")}</CardTitle><CardDescription>{product("selectedWorkflowHint")}</CardDescription></CardHeader><CardContent className="grid"><WorkflowButton workflow={selectedWorkflow} /></CardContent></Card>}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="break-words">{project.title}</CardTitle>
                <CardDescription>{t(project.goal)} · {t("progress", { count: completed })}</CardDescription>
                <p className="mt-2 text-xs text-muted-foreground">{t("privateHint")}</p>
              </div>
              {project.artifacts.some((artifact) => artifact.versions.length > 0) ? <Button asChild variant="outline"><a href={`/api/projects/${project.id}/export`}>{t("export")}</a></Button> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">{t("cost", { points: PROJECT_WORKFLOW_COST_POINTS })}</p>
            <div>
              <h2 className="mb-3 text-sm font-medium">{t("coreTitle")}</h2>
              <div className="grid gap-3 sm:grid-cols-3">{recommended.map((workflow) => <WorkflowButton key={workflow.id} workflow={workflow} />)}</div>
            </div>
            <details>
              <summary className="mb-3 cursor-pointer text-sm font-medium">{t("moreWorkflows")}</summary>
              <div className="grid gap-3 sm:grid-cols-2">{more.map((workflow) => <WorkflowButton key={workflow.id} workflow={workflow} />)}</div>
            </details>
          </CardContent>
        </Card>
        {runs.length > 0 && <div className="rounded-xl border px-4 py-3 text-sm" aria-label={isZh ? "\u8fd0\u884c\u8bb0\u5f55" : "Run history"}>
          {runs.slice(0, 4).map(run => <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
            <span>{OFFICIAL_WORKFLOWS.find(workflow => workflow.id === run.workflowId)?.title ?? run.workflowId}</span>
            <Link href="/workflows/runs" className="text-xs text-muted-foreground underline-offset-4 hover:underline">{run.status === "SUCCEEDED" ? (isZh ? "\u5df2\u5b8c\u6210" : "Completed") : run.status === "FAILED" ? (isZh ? "\u672a\u5b8c\u6210" : "Not completed") : run.status === "CANCELLED" ? (isZh ? "\u5df2\u53d6\u6d88" : "Cancelled") : run.status === "RUNNING" ? (isZh ? "\u751f\u6210\u4e2d" : "Processing") : (isZh ? "\u6392\u961f\u4e2d" : "Queued")}</Link>
            {run.error === "EXECUTION_INTERRUPTED" && <p className="w-full text-xs text-muted-foreground">{isZh ? "\u6267\u884c\u4e2d\u65ad\uff0c\u6a21\u578b\u7ed3\u679c\u672a\u80fd\u786e\u8ba4\u3002\u5df2\u505c\u6b62\u81ea\u52a8\u91cd\u8bd5\uff0c\u5b9e\u9645\u7b97\u529b\u6d88\u8017\u4ee5\u8d26\u5355\u4e3a\u51c6\u3002" : "Execution was interrupted and the model outcome is unknown. Automatic retry stopped; your statement reflects actual usage."}</p>}
          </div>)}
        </div>}
        {message ? <p role="status" className="text-sm text-primary">{message}</p> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <p className="rounded-lg border p-4 text-sm leading-6 text-muted-foreground">{t("draftWarning")}</p>
        {project.artifacts.length === 0 ? <Card className="border-dashed"><CardContent className="py-8 text-sm text-muted-foreground">{t("noArtifacts")}</CardContent></Card> : project.artifacts.filter((artifact) => artifact.workflowId !== "resume-website").map((artifact) => {
          const saved = savedVersions[artifact.id];
          if (saved && !artifact.versions.some((item) => item.id === saved.id)) {
            artifact = { ...artifact, currentVersion: Math.max(artifact.currentVersion, saved.version), versions: [...artifact.versions, saved].sort((a, b) => b.version - a.version) };
          }
          const version = artifact.versions[0];
          const selectedVersionId = selectedVersions[artifact.id] ?? version?.id;
          const selectedVersion = artifact.versions.find((item) => item.id === selectedVersionId) ?? version;
          const publicationStatus = selectedVersion ? publications[selectedVersion.id]?.status : undefined;
          return version ? (
            <Card key={artifact.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">{artifact.title}</CardTitle>
                  <Badge variant="secondary">v{selectedVersion?.version}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {artifact.versions.length > 1 ? <label className="flex flex-wrap items-center gap-2 text-sm"><span>{t("versionHistory")}</span><select disabled={locked} className="h-9 rounded-md border bg-background px-2" value={selectedVersion?.id ?? ""} onChange={(event) => setSelectedVersions((current) => ({ ...current, [artifact.id]: event.target.value }))}>{artifact.versions.map((item) => <option key={item.id} value={item.id}>v{item.version} · {new Date(item.createdAt).toLocaleDateString(locale)}</option>)}</select></label> : null}
                {editing?.artifactId === artifact.id ? <div className="space-y-3">
                  <label className="block space-y-2"><span className="text-sm">{t("editLabel")}</span><Textarea rows={16} value={editing.markdown} disabled={Boolean(pending)} onChange={(event) => setEditing({ ...editing, markdown: event.target.value })} /></label>
                  <div className="flex flex-wrap gap-2"><Button disabled={Boolean(pending) || !editing.markdown.trim()} onClick={saveEdit}>{t("saveEdit")}</Button><Button variant="outline" disabled={Boolean(pending)} onClick={() => setEditing(null)}>{t("cancelEdit")}</Button></div>
                </div> : <><pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-sm leading-6">{selectedVersion?.markdown}</pre><Button variant="outline" disabled={locked || !selectedVersion} onClick={() => selectedVersion && setEditing({ artifactId: artifact.id, baseVersionId: selectedVersion.id, expectedVersion: artifact.currentVersion, markdown: selectedVersion.markdown })}>{t("edit")}</Button></>}
                <details className="border-t pt-4">
                  <summary className="cursor-pointer text-sm">{t("sharing")} · {t(publicationStatus === "APPROVED" ? "shareApproved" : publicationStatus === "PENDING" ? "sharePending" : publicationStatus === "REJECTED" ? "shareRejected" : "sharePrivate")}</summary>
                  <p className="my-3 text-xs leading-5 text-muted-foreground">{t("sharingHint")}</p>
                  {publicationStatus !== "APPROVED" && publicationStatus !== "PENDING" && selectedVersion ? <label className="mb-3 flex items-start gap-2 text-sm"><input type="checkbox" disabled={locked} checked={acknowledged[selectedVersion.id] ?? false} onChange={(event) => setAcknowledged((current) => ({ ...current, [selectedVersion.id]: event.target.checked }))} />{t("shareAck")}</label> : null}
                  <Button variant="outline" disabled={locked || !selectedVersion || (publicationStatus !== "APPROVED" && publicationStatus !== "PENDING" && !acknowledged[selectedVersion.id])} onClick={() => selectedVersion && changePublication(selectedVersion.id, publicationStatus)}>{t(pending === `publication:${selectedVersion?.id}` ? "busy" : publicationStatus === "APPROVED" || publicationStatus === "PENDING" ? "shareWithdraw" : "shareRequest")}</Button>
                  {publications[selectedVersion?.id ?? ""]?.reviewNote ? <p className="mt-2 text-sm text-muted-foreground">{t("reviewNote", { note: publications[selectedVersion?.id ?? ""].reviewNote! })}</p> : null}
                </details>
              </CardContent>
            </Card>
          ) : null;
        })}
      </div>
    </div>
  );
}
