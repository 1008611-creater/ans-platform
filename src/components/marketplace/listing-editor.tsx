"use client";

import { useMarketRequest, useMarketUpload } from "./account-boundary";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Github, ImagePlus, PackageCheck, Plus, Trash2 } from "lucide-react";
import type { MarketOfferView } from "@/contracts/marketplace-view";
import { marketListingInputSchema } from "@/contracts/marketplace";
import { PROJECT_CATEGORIES } from "@/domain/catalog/projects";
import { parseMarketPrice } from "@/domain/marketplace/presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type TierDraft = { id: string; title: string; description: string; price: string; deliverables: string };
const lines = (value: string) => value.split("\n").map(item => item.trim()).filter(Boolean);
const selectClass = "h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm";

export function ListingEditor({ offer, share = false }: { offer?: MarketOfferView; share?: boolean }) {
  const marketRequest = useMarketRequest(); const upload = useMarketUpload();
  const t = useTranslations("product.market"); const tp = useTranslations("product.marketProject"); const p = useTranslations("product"); const router = useRouter();
  const w = useTranslations("marketWorkflow");
  const data = offer?.listing;
  const [category, setCategory] = useState(data?.category ?? "career"); const [subcategory, setSubcategory] = useState(data?.subcategory ?? "resume");
  const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false); const [error, setError] = useState("");
  const flight = useRef(false);
  const [free, setFree] = useState(offer ? data?.priceMinor === 0 && !data?.pricingTiers?.length : share);
  const [title, setTitle] = useState(data?.title ?? ""); const [summary, setSummary] = useState(data?.summary ?? ""); const [deliverables, setDeliverables] = useState(data?.deliverables.join("\n") ?? "");
  const [coverUrl, setCoverUrl] = useState(data?.coverUrl ?? "");
  const [tiers, setTiers] = useState<TierDraft[]>(data?.pricingTiers?.length ? data.pricingTiers.map(tier => ({ id: tier.id, title: tier.title, description: tier.description, price: (tier.priceMinor / 100).toFixed(2), deliverables: tier.deliverables.join("\n") })) : [{ id: "basic", title: "", description: "", price: data?.priceMinor ? (data.priceMinor / 100).toFixed(2) : "", deliverables: data?.deliverables.join("\n") ?? "" }]);
  const children = PROJECT_CATEGORIES.find(item => item.id === category)!.children;
  function errorMessage(code: string) { return t(t.has("errors." + code) ? "errors." + code : "errors.INTERNAL_ERROR"); }
  function updateTier(id: string, change: Partial<TierDraft>) { setTiers(current => current.map(tier => tier.id === id ? { ...tier, ...change } : tier)); }
  async function uploadCover(file?: File) {
    if (!file || uploading || busy) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024 || file.size === 0) { setError(tp("coverInvalid")); return; }
    setUploading(true);
    try { const result = await upload(file); setCoverUrl(result.url); }
    catch (caught) { setError(caught instanceof Error && caught.message === "ACCOUNT_CHANGED" ? errorMessage("ACCOUNT_CHANGED") : tp("coverFailed")); }
    finally { setUploading(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (flight.current || uploading) return;
    const form = new FormData(event.currentTarget); setError(""); const text = (key: string) => String(form.get(key) ?? "").trim();
    const pricingTiers = free ? [] : tiers.map(tier => ({ id: tier.id, title: tier.title.trim(), description: tier.description.trim(), priceMinor: parseMarketPrice(tier.price), deliverables: lines(tier.deliverables) }));
    const parsed = marketListingInputSchema.safeParse({
      ...(data?.execution ? { execution: data.execution } : {}),
      slug: offer?.slug ?? (free ? "project-" + crypto.randomUUID() : text("slug")), title, summary, description: text("description"), category, subcategory,
      fulfillment: free ? "resource" : text("fulfillment"), priceMinor: free ? 0 : pricingTiers[0]?.priceMinor, currency: "CNY", deliveryDays: free ? 1 : Number(text("deliveryDays")), revisionLimit: free ? 0 : Number(text("revisionLimit")), computeIncluded: !free && form.get("computeIncluded") === "on", deliverables: lines(deliverables), licenseTerms: text("licenseTerms"), pricingTiers,
      ...(coverUrl.trim() ? { coverUrl: coverUrl.trim() } : {}), ...Object.fromEntries(["previewUrl", "sourceUrl", "githubUrl", "usageUrl"].filter(key => text(key)).map(key => [key, text(key)])),
    });
    if (!parsed.success || (free && !parsed.data.execution && !parsed.data.sourceUrl && !parsed.data.previewUrl && !parsed.data.githubUrl && !parsed.data.usageUrl)) { setError(errorMessage("INVALID_INPUT")); return; }
    flight.current = true; setBusy(true);
    try {
      if (offer) { await marketRequest("/api/market/listings/" + offer.id, "PATCH", { expectedVersion: offer.version, listing: parsed.data }); router.refresh(); }
      else { const result = await marketRequest<{ listing: { id: string } }>("/api/market/listings", "POST", parsed.data); router.push("/market/creator/" + result.listing.id); }
    } catch (caught) { setError(errorMessage(caught instanceof Error ? caught.message : "INTERNAL_ERROR")); }
    finally { flight.current = false; setBusy(false); }
  }
  async function act(action: "submit" | "withdraw") {
    if (!offer || flight.current || uploading) return;
    flight.current = true; setBusy(true); setError("");
    try { await marketRequest("/api/market/listings/" + offer.id, "POST", action === "submit" ? { action, expectedVersion: offer.version } : { action }); router.refresh(); }
    catch (caught) { setError(errorMessage(caught instanceof Error ? caught.message : "INTERNAL_ERROR")); }
    finally { flight.current = false; setBusy(false); }
  }
  const field = (label: string, input: ReactNode, hint?: string) => <label className="grid min-w-0 gap-2 text-sm font-medium"><span>{label}</span>{input}{hint && <span className="text-xs font-normal leading-6 text-muted-foreground">{hint}</span>}</label>;
  const section = (number: string, heading: string, body: string) => <div className="mb-6 flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{number}</span><div><h2 className="text-lg font-semibold">{heading}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></div></div>;
  const previewPrice = Math.min(...tiers.map(tier => parseMarketPrice(tier.price) ?? Infinity));
  const safeCover = /^https:\/\//i.test(coverUrl);
  return <div className="space-y-6">
    {offer && <div className="ans-detail-block space-y-3"><p className="font-medium">{t("version", { version: offer.version })} · {t("listingStatus." + (offer.submittedAt && !offer.reviewedAt ? "PENDING" : offer.status))}</p>{offer.status === "PUBLISHED" && <p className="text-sm text-muted-foreground">{t("publishedEditNote")}</p>}{offer.reviewNote && <p className="break-words text-sm">{t("reviewNote")}: {offer.reviewNote}</p>}<div className="flex flex-wrap gap-3"><Button type="button" disabled={busy || uploading || Boolean(offer.submittedAt || offer.reviewedAt)} onClick={() => act("submit")}>{t("submit")}</Button><Button type="button" variant="outline" disabled={busy || uploading || offer.status === "WITHDRAWN"} onClick={() => act("withdraw")}>{t("withdraw")}</Button>{!data?.execution && <Button type="button" variant="outline" asChild><Link href={`/market/creator/${offer.id}/integration`}>{tp("integrationAction")}<ArrowUpRight aria-hidden="true"/></Link></Button>}</div></div>}
    {error && <p role="alert" className="rounded-xl border border-destructive p-4 text-sm text-destructive">{error}</p>}
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={save} className="min-w-0 space-y-6"><fieldset disabled={busy || uploading} className="min-w-0 space-y-6">
        <section className="ans-detail-block">{section("01", tp("identityTitle"), tp("identityBody"))}<div className="grid min-w-0 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">{field(t("fields.title"), <Input name="title" required minLength={2} maxLength={100} value={title} onChange={event => setTitle(event.target.value)}/>)}</div>
          {!free && field(t("fields.slug"), <Input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={80} defaultValue={data?.slug} readOnly={Boolean(offer)} placeholder="my-project"/>)}
          {field(t("fields.category"), <select aria-label={t("fields.category")} className={selectClass} value={category} onChange={event => { const next = PROJECT_CATEGORIES.find(item => item.id === event.target.value)!; setCategory(next.id); setSubcategory(next.children[0]); }}>{PROJECT_CATEGORIES.map(item => <option key={item.id} value={item.id}>{p("categories." + item.id)}</option>)}</select>)}
          {field(t("fields.subcategory"), <select aria-label={t("fields.subcategory")} className={selectClass} value={subcategory} onChange={event => setSubcategory(event.target.value)}>{children.map(item => <option key={item} value={item}>{p("children." + item)}</option>)}</select>)}
          <div className="md:col-span-2">{field(t("fields.summary"), <Textarea name="summary" required minLength={10} maxLength={300} value={summary} onChange={event => setSummary(event.target.value)}/>)}</div>
          <div className="md:col-span-2 space-y-3">{field(t("fields.coverUrl"), <Input type="url" name="coverUrl" maxLength={1000} value={coverUrl} onChange={event => setCoverUrl(event.target.value)} placeholder="https://"/>)}{field(tp("uploadCover"), <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { void uploadCover(event.target.files?.[0]); event.target.value = ""; }}/>, tp("coverHint"))}{uploading && <p role="status" className="text-sm text-muted-foreground">{tp("uploading")}</p>}</div>
        </div></section>
        <section className="ans-detail-block">{section("02", tp("projectTitle"), tp("projectBody"))}<div className="grid min-w-0 gap-5 md:grid-cols-2">
          {field(tp("githubUrl"), <Input type="url" name="githubUrl" maxLength={1000} defaultValue={data?.githubUrl} placeholder="https://github.com/owner/repo"/>, tp("githubHint"))}
          {field(tp("usageUrl"), <Input type="url" name="usageUrl" maxLength={1000} defaultValue={data?.usageUrl} placeholder="https://"/>)}
          {field(t("fields.previewUrl"), <Input type="url" name="previewUrl" maxLength={1000} defaultValue={data?.previewUrl}/>)}
          {field(t("fields.sourceUrl"), <Input type="url" name="sourceUrl" maxLength={1000} defaultValue={data?.sourceUrl}/>)}
          <div className="md:col-span-2">{field(t("fields.description"), <Textarea name="description" required minLength={20} maxLength={20000} className="min-h-40" defaultValue={data?.description}/>)}</div>
          <div className="md:col-span-2">{field(t("fields.deliverables"), <Textarea name="deliverables" required className="min-h-28" value={deliverables} onChange={event => setDeliverables(event.target.value)} placeholder={t("deliverablesHint")}/>)}</div>
          <div className="md:col-span-2">{field(t("fields.licenseTerms"), <Textarea name="licenseTerms" required minLength={10} maxLength={3000} defaultValue={data?.licenseTerms}/>)}</div>
        </div></section>
        <section className="ans-detail-block">{section("03", tp("pricingTitle"), tp("pricingBody"))}{data?.execution && <p className="mb-4 text-sm font-medium text-primary">{w("runnable")} · {w("computeOnRun")}</p>}{!data?.execution && <label className="flex items-start gap-3 rounded-xl border p-4 text-sm"><input type="checkbox" checked={free} disabled={Boolean(data?.execution)} onChange={event => setFree(event.target.checked)} className="mt-1 h-4 w-4 accent-primary"/><span><strong>{p("realProject.freeShare")}</strong><span className="mt-1 block leading-6 text-muted-foreground">{tp("freeHint")}</span></span></label>}
          {!free && <div className="mt-5 space-y-5"><div className="grid min-w-0 gap-5 md:grid-cols-2">{field(t("fields.fulfillment"), <select className={selectClass} name="fulfillment" defaultValue={data?.fulfillment ?? "service"}><option value="service">{t("service")}</option><option value="resource">{t("resource")}</option></select>)}{field(t("fields.deliveryDays"), <Input type="number" name="deliveryDays" required min={1} max={90} defaultValue={data?.deliveryDays ?? 3}/>)}{field(t("fields.revisionLimit"), <Input type="number" name="revisionLimit" required min={0} max={20} defaultValue={data?.revisionLimit ?? 1}/>)}</div>
            {tiers.map((tier, index) => <div key={tier.id} className="min-w-0 space-y-4 rounded-xl border bg-muted/20 p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{tp("tierNumber", { number: index + 1 })}</h3><Button type="button" size="sm" variant="ghost" disabled={tiers.length === 1} onClick={() => setTiers(current => current.filter(item => item.id !== tier.id))} aria-label={tp("removeTier", { number: index + 1 })}><Trash2 aria-hidden="true"/>{tp("remove")}</Button></div><div className="grid min-w-0 gap-4 md:grid-cols-2">{field(tp("tierTitle"), <Input value={tier.title} required maxLength={80} onChange={event => updateTier(tier.id, { title: event.target.value })}/>)}{field(tp("tierPrice"), <Input inputMode="decimal" value={tier.price} required pattern="(0|[1-9][0-9]{0,6})([.][0-9]{1,2})?" onChange={event => updateTier(tier.id, { price: event.target.value })}/>)}<div className="md:col-span-2">{field(tp("tierDescription"), <Textarea value={tier.description} required maxLength={1000} onChange={event => updateTier(tier.id, { description: event.target.value })}/>)}</div><div className="md:col-span-2">{field(tp("tierDeliverables"), <Textarea value={tier.deliverables} required onChange={event => updateTier(tier.id, { deliverables: event.target.value })}/>, t("deliverablesHint"))}</div></div></div>)}
            <Button type="button" variant="outline" disabled={tiers.length >= 6} onClick={() => setTiers(current => [...current, { id: crypto.randomUUID(), title: "", description: "", price: "", deliverables }])}><Plus aria-hidden="true"/>{tp("addTier")}</Button><p className="text-xs leading-6 text-muted-foreground">{tp("tierHint")}</p><label className="flex items-center gap-3 text-sm"><input type="checkbox" name="computeIncluded" defaultChecked={data?.computeIncluded} className="h-4 w-4 accent-primary"/>{t("fields.computeIncluded")}</label>
          </div>}
        </section>
        <section className="ans-detail-block space-y-4"><div className="flex items-start gap-3"><Github aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary"/><div><h2 className="font-semibold">{tp("integrationTitle")}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{tp("integrationBody")}</p><Link href="/docs/points-integration" className="mt-3 inline-flex text-sm font-medium text-primary underline underline-offset-4">{tp("integrationGuide")}</Link></div></div><p className="text-sm leading-7 text-muted-foreground">{free ? p("realProject.submitNote") : t("editorNote")}</p><Button type="submit" disabled={busy || uploading}>{t(busy ? "saving" : "save")}</Button></section>
      </fieldset></form>
      <aside className="min-w-0 space-y-3 xl:sticky xl:top-24"><p className="text-sm font-medium text-muted-foreground">{tp("livePreview")}</p><div className="ans-project-card overflow-hidden"><div className="aspect-video bg-muted/40">{safeCover ? <Image unoptimized src={coverUrl} width={640} height={360} alt={tp("coverPreview")} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center"><ImagePlus aria-hidden="true" className="h-10 w-10 text-muted-foreground/50"/></div>}</div><div className="space-y-4 p-5"><p className="text-xs font-medium text-primary">{p("categories." + category)} · {p("children." + subcategory)}</p><h2 className="break-words text-xl font-semibold">{title || tp("previewTitle")}</h2><p className="break-words text-sm leading-7 text-muted-foreground">{summary || tp("previewSummary")}</p><ul className="space-y-2 text-sm">{lines(deliverables).slice(0, 3).map((item, index) => <li key={index} className="flex items-start gap-2"><PackageCheck aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-primary"/><span className="break-words">{item}</span></li>)}</ul><p className="border-t pt-4 text-xl font-semibold">{data?.execution ? w("computeOnRun") : free ? p("realProject.freeShare") : Number.isFinite(previewPrice) ? tp("fromPoints", { amount: previewPrice / 100 }) : tp("pricePending")}</p></div></div><p className="text-xs leading-6 text-muted-foreground">{tp("previewNote")}</p></aside>
    </div>
  </div>;
}
