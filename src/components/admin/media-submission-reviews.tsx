"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mediaReconciliationSchema } from "@/contracts/media-generation";
interface Entry { id: string; userId: string; provider: string; model: string; type: string; status: string; createdAt: string; updatedAt: string; }
export function MediaSubmissionReviews({ initialEntries }: { initialEntries: Entry[] }) {
  const t = useTranslations("product.mediaReview");
  const [entries, setEntries] = useState(initialEntries);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [resolution, setResolution] = useState<"accepted" | "notAccepted">("accepted");
  const [reference, setReference] = useState(""); const [taskId, setTaskId] = useState(""); const [token, setToken] = useState("");
  const [confirmed, setConfirmed] = useState(false); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  function clear() { setSelected(null); setReference(""); setTaskId(""); setToken(""); setConfirmed(false); }
  async function reload() {
    setBusy(true); setError(null);
    try { const response = await fetch("/api/admin/media-generations"); const data = await response.json(); if (!response.ok) throw new Error(); setEntries(data.reviews); clear(); }
    catch { setError(t("loadFailed")); } finally { setBusy(false); }
  }
  async function reconcile(event: React.FormEvent) {
    event.preventDefault(); if (!selected || busy) return;
    const reconciliation = resolution === "accepted" ? { resolution, reference, task: { taskId, socketAccessToken: token } } : { resolution, reference, confirmedNotAccepted: confirmed };
    if (!mediaReconciliationSchema.safeParse(reconciliation).success) { setError(t("invalid")); return; }
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/admin/media-generations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ generationId: selected.id, reconciliation }) });
      const data = await response.json();
      if (!response.ok) { setError(t(data.error === "MEDIA_REVIEW_CONFLICT" ? "conflict" : data.error === "FORBIDDEN" ? "forbidden" : "saveFailed")); return; }
      setEntries(previous => previous.filter(entry => entry.id !== selected.id)); clear();
      setMessage(t(data.resolution === "accepted" ? "recovered" : data.creditReturned ? "returned" : "oldAllowance"));
    } catch { setError(t("saveFailed")); } finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <Button variant="outline" disabled={busy} onClick={() => { void reload(); }}>{t("refresh")}</Button>
    {error && <p role="alert" className="text-destructive">{error}</p>}{message && <p role="status">{message}</p>}
    {entries.length === 0 && <p className="rounded-xl border p-6 text-muted-foreground">{t("empty")}</p>}
    <div className="grid gap-4 lg:grid-cols-2">{entries.map(entry => <Card key={entry.id}><CardHeader><CardTitle className="break-all text-lg">{entry.model}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="break-all text-sm">{entry.provider} · {entry.type} · {entry.status}</p><p className="break-all text-sm text-muted-foreground">{t("requestId")}: {entry.id}</p><p className="break-all text-sm text-muted-foreground">{t("memberId")}: {entry.userId}</p><Button disabled={busy} variant="outline" onClick={() => { clear(); setResolution("accepted"); setSelected(entry); setError(null); setMessage(null); }}>{t("inspect")}</Button></CardContent></Card>)}</div>
    {selected && <Card><CardHeader><CardTitle>{t("decision")}</CardTitle></CardHeader><CardContent><form onSubmit={reconcile} className="space-y-5">
      <p className="break-all text-sm">{t("requestId")}: {selected.id}</p>
      <div className="space-y-2"><Label htmlFor="media-resolution">{t("outcome")}</Label><select id="media-resolution" value={resolution} disabled={busy} onChange={event => { setResolution(event.target.value as "accepted" | "notAccepted"); setToken(""); setTaskId(""); setConfirmed(false); }} className="w-full rounded-md border bg-background px-3 py-2"><option value="accepted">{t("accepted")}</option><option value="notAccepted">{t("notAccepted")}</option></select></div>
      <div className="space-y-2"><Label htmlFor="media-reference">{t("reference")}</Label><Input id="media-reference" value={reference} onChange={event => setReference(event.target.value)} disabled={busy} minLength={8} maxLength={300} required /><p className="text-sm text-muted-foreground">{t("referenceHint")}</p></div>
      {resolution === "accepted" ? <><div className="space-y-2"><Label htmlFor="media-task">{t("taskId")}</Label><Input id="media-task" value={taskId} onChange={event => setTaskId(event.target.value)} maxLength={200} disabled={busy} required /></div><div className="space-y-2"><Label htmlFor="media-token">{t("taskToken")}</Label><Input id="media-token" type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} maxLength={500} disabled={busy} required /><p className="text-sm text-muted-foreground">{t("tokenHint")}</p></div></> : <label className="flex items-start gap-3"><input type="checkbox" checked={confirmed} disabled={busy} required onChange={event => setConfirmed(event.target.checked)} className="mt-1" /><span className="text-sm leading-6">{t("confirmRejection")}</span></label>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy}>{t("apply")}</Button><Button type="button" variant="outline" disabled={busy} onClick={clear}>{t("cancel")}</Button></div>
    </form></CardContent></Card>}
  </div>;
}
