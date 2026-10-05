"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PROJECT_WORKFLOW_COST_POINTS, projectPackWorkflowIds } from "@/contracts/projects";
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

export function ProjectStudio({ project }: { project: ProjectView }) {
  const router = useRouter();
  const t = useTranslations("learning");
  const locale = useLocale();
  const [facts, setFacts] = useState(project.facts);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [publications, setPublications] = useState<Record<string, { status: string; reviewNote: string | null }>>({});
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({});
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ artifactId: string; baseVersionId: string; expectedVersion: number; markdown: string } | null>(null);
  const [savedVersions, setSavedVersions] = useState<Record<string, Artifact["versions"][number]>>({});
  const completed = projectPackWorkflowIds.filter((id) => project.artifacts.some((artifact) => artifact.workflowId === id && artifact.versions.length > 0)).length;
  const locked = Boolean(pending) || Boolean(editing);

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
  const recommended = useMemo(() => projectPackWorkflowIds.map((id) => OFFICIAL_WORKFLOWS.find((workflow) => workflow.id === id)!), []);
  const more = OFFICIAL_WORKFLOWS.filter((workflow) => !recommended.some((item) => item.id === workflow.id));

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
    try {
      await postJson(`/api/projects/${project.id}/facts`, { facts: factPayload(false) }, t("operationFailed"));
      await postJson(`/api/projects/${project.id}/runs`, {
        workflowId,
        idempotencyKey: `${workflowId}-${Date.now().toString(36)}`,
      }, t("operationFailed"));
      setSelectedVersions({});
      setMessage(t("generated"));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("operationFailed"));
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
      <button className="rounded-lg border p-4 text-left transition hover:border-primary disabled:opacity-50" disabled={locked} onClick={() => runWorkflow(workflow.id)}>
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
        {message ? <p role="status" className="text-sm text-primary">{message}</p> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <p className="rounded-lg border p-4 text-sm leading-6 text-muted-foreground">{t("draftWarning")}</p>
        {project.artifacts.length === 0 ? <Card className="border-dashed"><CardContent className="py-8 text-sm text-muted-foreground">{t("noArtifacts")}</CardContent></Card> : project.artifacts.map((artifact) => {
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
                <CardDescription>{t("versionHint")}</CardDescription>
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
