"use client";
import Link from "next/link";
import { AssociationPicker, type AssociationChoice } from "./association-picker";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Eye, Plus, Save, Send, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CATALOG_SOURCES, CATALOG_TEXT_FIELDS, PROJECT_CATEGORIES, catalogEntrySchema, type CatalogEntry, type CatalogAdminEntry, type CatalogText } from "@/contracts/catalog-content";
import { catalogWorkflowIdSchema } from "@/contracts/catalog";
import { projectGoalSchema } from "@/contracts/projects";
import { catalogSourceLabel } from "@/domain/catalog/content";
async function catalogRequest<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const envelope = await response.json().catch(() => null);
  if (!response.ok || !envelope?.ok) throw new Error(envelope?.error?.code ?? "INTERNAL_ERROR");
  return envelope.data as T;
}
function blankText(): CatalogText { return Object.fromEntries(CATALOG_TEXT_FIELDS.map(field => [field, ""])) as CatalogText; }
function blankEntry(): CatalogEntry { return { slug: "", category: "learning", subcategory: "methods", goal: "career", preview: "document", source: "official", content: { zh: blankText() } }; }
export function CatalogEditor({ entries: initialEntries, builtins, workflowChoices = [], offerChoices = [] }: { entries: CatalogAdminEntry[]; builtins: CatalogEntry[]; workflowChoices?: AssociationChoice[]; offerChoices?: AssociationChoice[] }) {
  const c = useTranslations("product.connectionsAdmin"); const t = useTranslations("product.catalogAdmin"); const p = useTranslations("product"); const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [form, setForm] = useState<CatalogEntry | null>(null); const [base, setBase] = useState<CatalogAdminEntry | null>(null);
  const [saved, setSaved] = useState(""); const [language, setLanguage] = useState<"zh" | "en">("zh");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [reviewedRevision, setReviewedRevision] = useState<number | null>(null);
  const dirty = form !== null && JSON.stringify(form) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const leave = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (!window.confirm(t("unsaved"))) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", leave, true); };
  }, [dirty, t]);
  function open(entry: CatalogEntry, current: CatalogAdminEntry | null) {
    if (dirty && !window.confirm(t("unsaved"))) return;
    setForm(structuredClone(entry)); setBase(current); setSaved(JSON.stringify(entry)); setLanguage("zh"); setMessage(""); setError(""); setReviewedRevision(null);
  }
  function patch(value: Partial<CatalogEntry>) { if (form) { setForm({ ...form, ...value }); setReviewedRevision(null); setMessage(""); } }
  function text(field: keyof CatalogText, value: string) {
    if (form) patch({ content: { ...form.content, [language]: { ...(form.content[language] ?? blankText()), [field]: value } } });
  }
  function accept(entry: CatalogAdminEntry) {
    setEntries(old => [entry, ...old.filter(item => item.slug !== entry.slug)]); setBase(entry); setForm(entry.draft); setSaved(JSON.stringify(entry.draft)); setReviewedRevision(null); router.refresh();
  }
  function showError(cause: unknown) {
    const code = cause instanceof Error ? cause.message : "INTERNAL_ERROR";
    setError(t(t.has("errors." + code) ? "errors." + code : "errors.INTERNAL_ERROR"));
  }
  async function save() {
    if (!form) return; setError(""); setMessage("");
    const parsed = catalogEntrySchema.safeParse(form);
    if (!parsed.success) { setError(t("invalid", { fields: [...new Set(parsed.error.issues.map(issue => issue.path.join(".")))].join(", ") })); return; }
    setBusy(true);
    try { const result = await catalogRequest<{ entry: CatalogAdminEntry }>("/api/admin/catalog", { expectedRevision: base?.revision ?? 0, entry: parsed.data }); accept(result.entry); setMessage(t("saved", { revision: result.entry.revision })); }
    catch (cause) { showError(cause); } finally { setBusy(false); }
  }
  async function publish(action: "publish" | "withdraw") {
    if (!base || dirty) return;
    if (action === "withdraw" && !window.confirm(t("withdrawConfirm"))) return;
    setBusy(true); setError(""); setMessage("");
    try { const result = await catalogRequest<{ entry: CatalogAdminEntry }>("/api/admin/catalog/" + base.slug, { action, expectedRevision: base.revision }); accept(result.entry); setMessage(t(action === "publish" ? "published" : "withdrawn")); }
    catch (cause) { showError(cause); } finally { setBusy(false); }
  }
  async function reload() {
    if (!window.confirm(t("reloadConfirm"))) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/catalog", { cache: "no-store" }); const envelope = await response.json();
      if (!response.ok || !envelope.ok) throw new Error(envelope?.error?.code ?? "INTERNAL_ERROR");
      const rows: CatalogAdminEntry[] = envelope.data.entries; setEntries(rows);
      const latest = rows.find(row => row.slug === form?.slug);
      if (!latest) throw new Error("NOT_FOUND");
      setForm(latest.draft); setBase(latest); setSaved(JSON.stringify(latest.draft)); setReviewedRevision(null); setMessage(t("reloaded"));
    } catch (cause) { showError(cause); } finally { setBusy(false); }
  }
  const known = new Set(entries.map(entry => entry.slug));
  const cards = [...entries.map(entry => ({ draft: entry.draft, current: entry })), ...builtins.filter(entry => !known.has(entry.slug)).map(draft => ({ draft, current: null }))];
  const stateLabel = (entry: CatalogAdminEntry | null) => !entry ? t("builtin") : entry.withdrawn ? t("withdrawn") : entry.publishedRevision === null ? t("draft") : entry.publishedRevision !== entry.revision ? t("pendingChanges") : t("live");
  const selectStyle = "h-11 w-full rounded-xl border bg-background px-3 text-sm";
  return <div className="space-y-7">
    <div className="flex flex-wrap items-center gap-3"><Button variant="outline" asChild><Link href="/admin"><ArrowLeft className="me-2 h-4 w-4" />{t("back")}</Link></Button><Button onClick={() => open(blankEntry(), null)} disabled={busy}><Plus className="me-2 h-4 w-4" />{t("new")}</Button></div>
    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside aria-label={t("list")} className="space-y-2">
        {cards.map(({ draft, current }) => <button key={draft.slug} type="button" disabled={busy} onClick={() => open(draft, current)} aria-pressed={form?.slug === draft.slug} className="w-full rounded-2xl border bg-card p-4 text-start transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/5"><span className="block font-medium">{draft.content.zh.title}</span><span className="mt-2 block text-xs text-muted-foreground">{stateLabel(current)}{current && " · v" + current.revision}</span></button>)}
      </aside>
      <section className="min-w-0 rounded-3xl border bg-card p-5 sm:p-8" aria-label={t("editor")}>
        {!form ? <div className="py-16 text-center"><h2 className="text-xl font-semibold">{t("choose")}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{t("chooseBody")}</p></div> : <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{form.content.zh.title || t("new")}</h2><p className="mt-2 text-sm text-muted-foreground">{stateLabel(base)}{base && " · v" + base.revision} · {dirty ? t("unsavedLabel") : t("savedLabel")}</p></div>{base && <Button variant="ghost" onClick={reload} disabled={busy}>{t("reload")}</Button>}</div>
          {error && <p role="alert" className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}{message && <p role="status" className="mb-5 rounded-xl bg-primary/10 p-4 text-sm">{message}</p>}
          <form onSubmit={event => { event.preventDefault(); void save(); }}>
            <fieldset disabled={busy} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2 text-sm"><span className="block font-medium">{t("slug")}</span><Input data-testid="catalog-slug" value={form.slug} readOnly={Boolean(base)} onChange={event => patch({ slug: event.target.value })} maxLength={80} placeholder="my-project" /><span className="block text-xs leading-6 text-muted-foreground">{t("slugHint")}</span></label>
                <label className="space-y-2 text-sm"><span className="block font-medium">{t("source")}</span><select className={selectStyle} value={form.source} onChange={event => { const source = event.target.value as CatalogEntry["source"]; patch({ source, workflowId: source === "official" ? form.workflowId : undefined }); }}>{CATALOG_SOURCES.map(source => <option key={source} value={source}>{p(catalogSourceLabel(source))}</option>)}</select></label>
                <label className="space-y-2 text-sm"><span className="block font-medium">{t("category")}</span><select className={selectStyle} value={form.category} onChange={event => { const category = PROJECT_CATEGORIES.find(item => item.id === event.target.value)!; patch({ category: category.id, subcategory: category.children[0] }); }}>{PROJECT_CATEGORIES.map(category => <option key={category.id} value={category.id}>{p("categories." + category.id)}</option>)}</select></label>
                <label className="space-y-2 text-sm"><span className="block font-medium">{t("subcategory")}</span><select className={selectStyle} value={form.subcategory} onChange={event => patch({ subcategory: event.target.value })}>{PROJECT_CATEGORIES.find(category => category.id === form.category)?.children.map(child => <option key={child} value={child}>{p("children." + child)}</option>)}</select></label>
                <label className="space-y-2 text-sm"><span className="block font-medium">{t("goal")}</span><select className={selectStyle} value={form.goal} onChange={event => patch({ goal: event.target.value as CatalogEntry["goal"] })}>{projectGoalSchema.options.map(goal => <option key={goal} value={goal}>{t("goals." + goal)}</option>)}</select></label>
                <label className="space-y-2 text-sm"><span className="block font-medium">{t("preview")}</span><select className={selectStyle} value={form.preview} onChange={event => patch({ preview: event.target.value as CatalogEntry["preview"] })}>{["document", "code", "plan", "character", "site", "video", "agent"].map(preview => <option key={preview} value={preview}>{t("previews." + preview)}</option>)}</select></label>
              </div>
              <label className="block space-y-2 text-sm"><span className="block font-medium">{t("sourceUrl")}</span><Input type="url" value={form.sourceUrl ?? ""} onChange={event => patch({ sourceUrl: event.target.value || undefined })} placeholder="https://" maxLength={2000} /></label>
              <label className="block space-y-2 text-sm"><span className="block font-medium">{t("licenseUrl")}</span><Input type="url" value={form.licenseUrl ?? ""} onChange={event => patch({ licenseUrl: event.target.value || undefined })} placeholder="https://" maxLength={2000} /></label>
              <label className="block space-y-2 text-sm"><span className="block font-medium">{t("workflow")}</span><select disabled={form.source !== "official"} className={selectStyle} value={form.workflowId ?? ""} onChange={event => patch({ workflowId: (event.target.value || undefined) as CatalogEntry["workflowId"] })}><option value="">{t("reference")}</option>{catalogWorkflowIdSchema.options.map(id => <option key={id} value={id}>{t("workflows." + id)}</option>)}</select><span className="block text-xs leading-6 text-muted-foreground">{t("workflowHint")}</span></label>
              <section className="space-y-5 border-t pt-5" aria-label={c("title")}><div><h3 className="font-semibold">{c("title")}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{c("body")}</p></div>
                <AssociationPicker key={form.slug + "-workflows"} kind="workflows" selected={form.workflowSlugs ?? []} choices={workflowChoices} onChange={workflowSlugs => patch({ workflowSlugs })} />
                <AssociationPicker key={form.slug + "-offers"} kind="offers" selected={form.marketSlugs ?? []} choices={offerChoices} onChange={marketSlugs => patch({ marketSlugs })} />
              </section>
              <div className="flex flex-wrap items-center gap-3 border-t pt-5"><Button type="button" variant={language === "zh" ? "default" : "outline"} onClick={() => setLanguage("zh")}>{t("zh")}</Button><Button type="button" variant={language === "en" ? "default" : "outline"} onClick={() => { if (!form.content.en) patch({ content: { ...form.content, en: blankText() } }); setLanguage("en"); }}>{t("en")}</Button>{form.content.en && <Button type="button" variant="ghost" onClick={() => { patch({ content: { zh: form.content.zh } }); setLanguage("zh"); }}>{t("removeEnglish")}</Button>}</div>
              <p className="text-xs leading-6 text-muted-foreground">{t("languageHint")}</p>
              {CATALOG_TEXT_FIELDS.map(field => <label key={field} className="block space-y-2 text-sm"><span className="block font-medium">{t("fields." + field)}</span>{field === "title" ? <Input data-testid="catalog-title" value={form.content[language]?.[field] ?? ""} onChange={event => text(field, event.target.value)} maxLength={100} /> : <Textarea data-testid={"catalog-" + field} value={form.content[language]?.[field] ?? ""} onChange={event => text(field, event.target.value)} rows={field === "prompt" ? 5 : 3} maxLength={field === "summary" ? 600 : field === "sample" ? 1000 : 4000} className="resize-y" />}</label>)}
              <p className="rounded-xl bg-muted p-4 text-xs leading-6 text-muted-foreground">{t("promptHint")}</p>
              <Button data-testid="catalog-save" type="submit" disabled={!dirty && Boolean(base)}><Save className="me-2 h-4 w-4" />{busy ? t("busy") : t("save")}</Button>
            </fieldset>
          </form>
          {base && <div className="mt-6 space-y-4 border-t pt-6"><p className="text-sm leading-7 text-muted-foreground">{t("publishHint", { revision: base.revision })}</p><div className="flex flex-wrap gap-3">
            {!dirty && !busy ? <Button variant="outline" asChild><a href={"/admin/catalog/" + base.slug + "/preview?revision=" + base.revision} target="_blank" rel="noopener noreferrer" onClick={() => setReviewedRevision(base.revision)}><Eye className="me-2 h-4 w-4" />{t("previewSaved")}</a></Button> : <Button variant="outline" disabled>{t("previewSaved")}</Button>}
            <Button data-testid="catalog-publish" disabled={dirty || busy || reviewedRevision !== base.revision || (!base.withdrawn && base.publishedRevision === base.revision)} onClick={() => void publish("publish")}><Send className="me-2 h-4 w-4" />{t("publish")}</Button>
            <Button variant="outline" data-testid="catalog-withdraw" disabled={dirty || busy || base.withdrawn || base.publishedRevision === null} onClick={() => void publish("withdraw")}><Archive className="me-2 h-4 w-4" />{t("withdraw")}</Button>
            {base.publishedRevision !== null && !base.withdrawn && <Button variant="ghost" asChild><Link href={"/explore/" + base.slug} target="_blank">{t("viewLive")}</Link></Button>}
          </div></div>}
        </>}
      </section>
    </div>
  </div>;
}