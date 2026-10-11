"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import type { AgriReferenceRecordDetail } from "@/contracts/agri-task-references";
import { AgriReviews } from "./agri-reviews";
import { AgriDemoChecks } from "./agri-demo-checks";
import { AgriIssues } from "./agri-issues";
import { AgriOnsiteStaffLink } from "./agri-onsite";
import { AgriRecordSummary } from "./agri-record-summary";
import { AgriRecordArchives } from "./agri-record-archives";
export function AgriReferenceRecord({ submissionId, issueId, scope }: { submissionId: string; issueId: string | null; scope: "team" | "staff" }) {
  const { data, status } = useSession(); const t = useTranslations("product.agriTasks");
  if (status === "loading") return <p role="status">{t("loading")}</p>;
  if (!data?.user?.id) {
    const query = new URLSearchParams({ scope, ...(issueId ? { issue: issueId } : {}) });
    const target = "/competitions/agrihackathon/records/" + encodeURIComponent(submissionId) + "?" + query;
    return <Button asChild><WorkspaceLink href={"/login?callbackUrl=" + encodeURIComponent(target)}>{t("login")}</WorkspaceLink></Button>;
  }
  return <RecordWorkspace key={data.user.id + ":" + submissionId + ":" + (issueId ?? "") + ":" + scope} actorId={data.user.id} submissionId={submissionId} issueId={issueId} scope={scope} />;
}
function RecordWorkspace({ actorId, submissionId, issueId, scope }: { actorId: string; submissionId: string; issueId: string | null; scope: "team" | "staff" }) {
  const t = useTranslations("product.agriTasks"), locale = useLocale();
  const [data, setData] = useState<AgriReferenceRecordDetail | null>(null), [error, setError] = useState("");
  const alive = useRef(true), generation = useRef(0);
  const invalidate = useCallback(() => { setData(null); setError("ACCOUNT_CHANGED"); }, []);
  const load = useCallback(async () => {
    const request = ++generation.current; setData(null); setError("");
    try {
      const response = await fetch("/api/competitions/agrihackathon/tasks/candidates/" + encodeURIComponent(submissionId) + "?" + new URLSearchParams({ scope, ...(issueId ? { issue: issueId } : {}) }), { cache: "no-store", signal: AbortSignal.timeout(15000), headers: { "x-ans-task-actor": actorId } });
      const body = await response.json();
      if (!alive.current || request !== generation.current) return;
      if (!response.ok || body.ok !== true) { setError(body.error?.code ?? "INTERNAL_ERROR"); return; }
      setData(body.data);
    } catch { if (alive.current && request === generation.current) setError("INTERNAL_ERROR"); }
  }, [actorId, submissionId, issueId, scope]);
  useEffect(() => { alive.current = true; const requests = generation; void load(); return () => { alive.current = false; ++requests.current; }; }, [load]);
  if (error) return <div className="space-y-3"><p role="alert">{t.has("errors." + error) ? t("errors." + error) : t("errors.INTERNAL_ERROR")}</p><Button variant="outline" onClick={() => void load()}>{t("refresh")}</Button></div>;
  if (!data) return <p role="status">{t("loading")}</p>;
  const record = data.record;
  const at = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }).format(new Date(record.acceptedAt));
  return <div className="min-w-0 space-y-5"><section className="space-y-3 rounded-xl border p-5"><h2 className="break-words text-xl font-semibold">{record.teamName} · {t("references.stage." + record.stage)}</h2><p>{t("references.version", { sequence: record.sequence, version: record.artifactVersion })}</p><p className="text-sm text-muted-foreground">{t("references.acceptedAt", { at })}</p>{record.issue && <h3 className="break-words font-medium">{record.issue.title}</h3>}<p className="text-sm leading-6 text-muted-foreground">{t("references.recordHint")}</p></section>
    {scope === "staff" && <><AgriOnsiteStaffLink submissionId={submissionId} /><AgriRecordSummary actorId={actorId} submissionId={submissionId} invalidate={invalidate} /><AgriRecordArchives actorId={actorId} submissionId={submissionId} invalidate={invalidate} /></>}
    <AgriReviews actorId={actorId} submissionId={submissionId} scope={scope} invalidate={invalidate} />
    <AgriIssues actorId={actorId} submissionId={submissionId} scope={scope} invalidate={invalidate} initialIssueId={record.issue?.id} />
    <AgriDemoChecks actorId={actorId} submissionId={submissionId} scope={scope} invalidate={invalidate} />
  </div>;
}
