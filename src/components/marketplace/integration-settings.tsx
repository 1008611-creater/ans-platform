"use client";
import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMarketRequest } from "./account-boundary";
export function IntegrationSettings({ listingId, initial }: { listingId: string; initial: { keyPrefix: string; returnOrigins: string[]; revokedAt: string | null } | null }) {
  const t = useTranslations("product.marketIntegration"); const request = useMarketRequest(); const flight = useRef(false);
  const [origins,setOrigins] = useState(initial?.returnOrigins.join("\n") ?? ""); const [key,setKey] = useState(""); const [prefix,setPrefix] = useState(initial?.keyPrefix ?? "");
  const [active,setActive] = useState(Boolean(initial && !initial.revokedAt)); const [busy,setBusy] = useState(false); const [error,setError] = useState(""); const [confirm,setConfirm] = useState(false);
  async function submit(action: "rotate" | "revoke") {
    if (flight.current) return; flight.current = true; setBusy(true); setError(""); setKey("");
    try {
      const result = await request<{ key?: string; keyPrefix?: string }>("/api/market/listings/" + listingId + "/integration", "POST", { action, ...(action === "rotate" ? { returnOrigins: origins.split("\n").map(v => v.trim()).filter(Boolean) } : {}) });
      setActive(action === "rotate"); setKey(result.key ?? ""); if (result.keyPrefix) setPrefix(result.keyPrefix); setConfirm(false);
    } catch (e) { const code = e instanceof Error ? e.message : "INTERNAL_ERROR"; setError(t.has("errors." + code) ? t("errors." + code) : t("errors.INTERNAL_ERROR")); }
    finally { flight.current = false; setBusy(false); }
  }
  return <div className="space-y-8"><section className="ans-detail-block space-y-5"><h2 className="text-xl font-semibold">{t("setupTitle")}</h2><p className="max-w-prose text-sm leading-7 text-muted-foreground">{t("setupBody")}</p>
    <label className="grid gap-2 text-sm font-medium">{t("origins")}<Textarea disabled={busy} value={origins} onChange={e => setOrigins(e.target.value)} rows={4} placeholder="https://your-project.example"/><span className="text-xs leading-6 font-normal text-muted-foreground">{t("originsHint")}</span></label>
    {prefix && <p className="text-sm">{t(active ? "keyActive" : "keyRevoked", { prefix })}</p>}
    <label className="flex gap-3 text-sm leading-6"><input type="checkbox" checked={confirm} disabled={busy} onChange={e => setConfirm(e.target.checked)}/>{t("rotationConfirm")}</label>
    <div className="flex flex-wrap gap-3"><Button disabled={busy || !confirm || !origins.trim()} onClick={() => submit("rotate")}>{t(busy ? "processing" : active ? "rotateKey" : "createKey")}</Button>{active && <Button variant="outline" disabled={busy || !confirm} onClick={() => submit("revoke")}>{t("revokeKey")}</Button>}</div>
    {key && <div className="rounded-xl border bg-muted/30 p-5"><p className="font-medium">{t("saveKey")}</p><p className="mt-2 text-sm leading-7 text-muted-foreground">{t("saveKeyHint")}</p><code className="mt-4 block select-all break-all rounded-lg border bg-background p-3 text-sm">{key}</code></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section><section className="space-y-4"><h2 className="text-xl font-semibold">{t("stepsTitle")}</h2><ol className="list-decimal space-y-3 pl-5 text-sm leading-7">{[1,2,3,4].map(n => <li key={n}>{t("step"+n)}</li>)}</ol><p className="text-sm leading-7 text-muted-foreground">{t("settlementNote")}</p><Button asChild variant="outline"><Link href="/docs/points-integration">{t("openDocs")}</Link></Button></section></div>;
}
