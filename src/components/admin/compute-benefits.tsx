"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { benefitReviewSchema, type AdminComputeBenefitsList, type AdminBenefitApplication } from "@/contracts/compute-benefits";

export function AdminComputeBenefits({ actorId }: { actorId: string }) {
  return <AccountContentBoundary actorId={actorId}><AdminBenefitsSession key={actorId} actorId={actorId} /></AccountContentBoundary>;
}
function AdminBenefitsSession({ actorId }: { actorId: string }) {
  const t = useTranslations("product.computeBenefits"), router = useRouter();
  const [data, setData] = useState<AdminComputeBenefitsList | null>(null), [failed, setFailed] = useState(false), [changed, setChanged] = useState(false), [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15_000);
    setFailed(false);
    void (async () => { try {
      const response = await fetch("/api/admin/compute-benefits", { headers: { "x-ans-actor": actorId }, signal: controller.signal, cache: "no-store" }); const result = await response.json();
      if (!active || controller.signal.aborted) return;
      if (!response.ok) { if (result.error === "ACCOUNT_CHANGED" || response.status === 403) { setChanged(true); setData(null); router.refresh(); } throw new Error("FAILED"); }
      setData(result);
    } catch { if (active) setFailed(true); } finally { clearTimeout(timer); } })();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [actorId, revision, router]);
  if (changed) return <p role="alert">{t("accountChanged")}</p>;
  if (failed) return <div className="space-y-3"><p role="alert">{t("loadFailed")}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>{t("retry")}</Button></div>;
  if (!data) return <p role="status">{t("adminLoading")}</p>;
  if (!data.enabled) return null;
  return <div className="space-y-5"><p className="rounded-xl border bg-muted/30 p-4 text-sm leading-6">{t("adminReward")}</p>{data.applications.length === 0 ? <p className="rounded-2xl border border-dashed p-8 text-muted-foreground">{t("adminEmpty")}</p> : data.applications.map(application => <Review key={`${application.id}:${application.revision}`} actorId={actorId} application={application} refresh={() => { setData(null); setRevision(value => value + 1); router.refresh(); }} invalidate={() => { setChanged(true); setData(null); router.refresh(); }} />)}</div>;
}
function Review({ actorId, application, refresh, invalidate }: { actorId: string; application: AdminBenefitApplication; refresh: () => void; invalidate: () => void }) {
  const t = useTranslations("product.computeBenefits"), locale = useLocale();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const flight = useRef<AbortController | null>(null), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; flight.current?.abort(); }; }, []);
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" });
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (flight.current) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const form = new FormData(event.currentTarget);
    const parsed = benefitReviewSchema.safeParse({ revision: application.revision, decision: submitter?.value, note: form.get("note") });
    if (!parsed.success || form.get("confirmed") !== "on") { setMessage(t("invalid")); return; }
    const controller = new AbortController(); flight.current = controller; const timer = setTimeout(() => controller.abort(), 20_000); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/compute-benefits/${encodeURIComponent(application.id)}/review`, { method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actorId }, body: JSON.stringify(parsed.data), signal: controller.signal }); const result = await response.json();
      if (!alive.current || controller.signal.aborted || flight.current !== controller) return;
      if (!response.ok) { if (result.error === "ACCOUNT_CHANGED" || response.status === 403) { invalidate(); return; } throw new Error(response.status === 409 ? "adminConflict" : "writeFailed"); }
      setMessage(t("adminSuccess")); refresh();
    } catch (error) { if (alive.current && flight.current === controller) setMessage(t(controller.signal.aborted ? "unconfirmed" : error instanceof Error && error.message === "adminConflict" ? "adminConflict" : "writeFailed")); }
    finally { clearTimeout(timer); if (flight.current === controller) { flight.current = null; if (alive.current) setBusy(false); } }
  }
  return <article className="space-y-5 rounded-2xl border p-5 sm:p-6" aria-label={t("adminReview", { name: application.username })}><header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{application.answers.projectTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{t("adminApplicant")}: {application.username} · {application.answers.teamName}</p></div><span className="text-xs text-muted-foreground">{t("adminRevision", { revision: application.revision })}</span></header><p className="text-xs text-muted-foreground"><time dateTime={application.submittedAt}>{dates.format(new Date(application.submittedAt))}</time> · {t(`options.${application.answers.role}`)}</p><dl className="space-y-4 text-sm"><div><dt className="font-medium">{t("problem")}</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6 text-muted-foreground">{application.answers.problem}</dd></div><div><dt className="font-medium">{t("plan")}</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6 text-muted-foreground">{application.answers.plan}</dd></div></dl><form onSubmit={event => void submit(event)}><fieldset disabled={busy} className="space-y-4"><label className="grid gap-2 text-sm">{t("adminNote")}<Textarea name="note" required minLength={2} maxLength={1000} rows={2} /></label><label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" name="confirmed" required className="mt-1 size-4 shrink-0" />{t("adminConfirm")}</label><div className="flex flex-wrap gap-3"><Button type="submit" value="APPROVED">{t(busy ? "saving" : "adminApprove")}</Button><Button type="submit" value="REJECTED" variant="outline">{t("adminReject")}</Button></div></fieldset></form>{message && <p role="status" className="text-sm">{message}</p>}</article>;
}
