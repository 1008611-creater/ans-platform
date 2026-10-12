"use client";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PROJECT_CATEGORIES } from "@/domain/catalog/projects";
import { useMarketRequest } from "@/components/marketplace/account-boundary";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
export function WorkflowMarketUpload({ slug, version, available }: { slug: string; version: number; available: boolean }) {
  const t = useTranslations("marketWorkflow"), p = useTranslations("product");
  const request = useMarketRequest(), router = useRouter(), lock = useRef(false);
  const [category, setCategory] = useState("web"), [subcategory, setSubcategory] = useState("frontend");
  const [terms, setTerms] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const selected = PROJECT_CATEGORIES.find(c => c.id === category)!;
  async function upload(event: React.FormEvent) {
    event.preventDefault(); if (lock.current || !available) return; lock.current = true; setBusy(true); setError("");
    try {
      const result = await request<{ id: string }>(`/api/workflows/${slug}/market`, "POST", { expectedWorkflowVersion: version, category, subcategory, licenseTerms: terms });
      if (alive.current) router.push(`/market/creator/${result.id}`);
    } catch (cause) { if (alive.current) setError(t("uploadFailed") + " " + (cause instanceof Error ? cause.message : "")); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  return <section className="rounded-2xl border p-5 space-y-4"><h2 className="text-lg font-semibold">{t("uploadTitle")}</h2><p className="text-sm text-muted-foreground">{t("uploadNotice", { version })}</p>{available ? <form onSubmit={upload} className="space-y-4"><fieldset disabled={busy} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm">{t("category")}<select className="h-10 min-w-0 rounded-md border bg-background px-3" value={category} onChange={e => { const item = PROJECT_CATEGORIES.find(c => c.id === e.target.value)!; setCategory(item.id); setSubcategory(item.children[0]); }}>{PROJECT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{p(`categories.${c.id}`)}</option>)}</select></label><label className="grid gap-2 text-sm">{t("subcategory")}<select className="h-10 min-w-0 rounded-md border bg-background px-3" value={selected.children.includes(subcategory as never) ? subcategory : selected.children[0]} onChange={e => setSubcategory(e.target.value)}>{selected.children.map(c => <option key={c} value={c}>{p(`children.${c}`)}</option>)}</select></label></div><label className="grid gap-2 text-sm">{t("license")}<Textarea required minLength={10} maxLength={3000} value={terms} onChange={e => setTerms(e.target.value)} /></label><Button disabled={busy || terms.trim().length < 10}>{t(busy ? "uploading" : "upload")}</Button></fieldset></form> : <p role="status" className="text-sm">{t("reviewRequired")}</p>}{error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}</section>;
}
