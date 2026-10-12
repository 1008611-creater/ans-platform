"use client";
import { useMarketRequest } from "./account-boundary";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MarketOfferView } from "@/contracts/marketplace-view";
import { marketListingInputSchema } from "@/contracts/marketplace";
import { PROJECT_CATEGORIES } from "@/domain/catalog/projects";
import { parseMarketPrice } from "@/domain/marketplace/presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ListingEditor({ offer, share = false }: { offer?: MarketOfferView; share?: boolean }) {
  const marketRequest = useMarketRequest();
  const t = useTranslations("product.market"); const p = useTranslations("product"); const router = useRouter();
  const data = offer?.listing; const [category, setCategory] = useState(data?.category ?? "career");
  const [subcategory, setSubcategory] = useState(data?.subcategory ?? "resume");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [free, setFree] = useState(offer ? data?.priceMinor === 0 : share);
  const children = PROJECT_CATEGORIES.find((item) => item.id === category)!.children;
  function errorMessage(code: string) { return t(t.has("errors." + code) ? "errors." + code : "errors.INTERNAL_ERROR"); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setError("");
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const parsed = marketListingInputSchema.safeParse({
      ...(data?.execution ? { execution: data.execution } : {}),
      slug: offer?.slug ?? (free ? "project-" + crypto.randomUUID() : text("slug")), title: text("title"), summary: text("summary"), description: text("description"), category, subcategory,
      fulfillment: free ? "resource" : text("fulfillment"), priceMinor: free ? 0 : parseMarketPrice(text("price")), currency: "CNY", deliveryDays: free ? 1 : Number(text("deliveryDays")), revisionLimit: free ? 0 : Number(text("revisionLimit")), computeIncluded: !free && form.get("computeIncluded") === "on", deliverables: text("deliverables").split("\n").map((item) => item.trim()).filter(Boolean), licenseTerms: text("licenseTerms"), ...(text("coverUrl") ? { coverUrl: text("coverUrl") } : {}), ...(text("previewUrl") ? { previewUrl: text("previewUrl") } : {}), ...(text("sourceUrl") ? { sourceUrl: text("sourceUrl") } : {}),
    });
    if (!parsed.success || (free && !parsed.data.execution && !parsed.data.sourceUrl && !parsed.data.previewUrl)) { setError(errorMessage("INVALID_INPUT")); return; }
    setBusy(true);
    try {
      if (offer) { await marketRequest("/api/market/listings/" + offer.id, "PATCH", { expectedVersion: offer.version, listing: parsed.data }); router.refresh(); }
      else { const result = await marketRequest<{ listing: { id: string } }>("/api/market/listings", "POST", parsed.data); router.push("/market/creator/" + result.listing.id); }
    } catch (caught) { setError(errorMessage(caught instanceof Error ? caught.message : "INTERNAL_ERROR")); }
    finally { setBusy(false); }
  }
  async function act(action: "submit" | "withdraw") {
    if (!offer) return; setBusy(true); setError("");
    try { await marketRequest("/api/market/listings/" + offer.id, "POST", action === "submit" ? { action, expectedVersion: offer.version } : { action }); router.refresh(); }
    catch (caught) { setError(errorMessage(caught instanceof Error ? caught.message : "INTERNAL_ERROR")); }
    finally { setBusy(false); }
  }
  const field = (key: string, input: React.ReactNode) => <label className="grid min-w-0 gap-2 text-sm font-medium"><span>{t("fields." + key)}</span>{input}</label>;
  const selectClass = "h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm";
  return <div className="space-y-6">
    <label className="ans-detail-block flex items-start gap-3 text-sm"><input type="checkbox" checked={free} disabled={busy || Boolean(data?.execution)} onChange={event => setFree(event.target.checked)} className="mt-1 h-4 w-4 accent-primary"/><span><strong>{p("realProject.freeShare")}</strong><span className="mt-2 block leading-6 text-muted-foreground">{p("realProject.submitBody")}</span></span></label>
    {offer && <div className="ans-detail-block space-y-3"><p className="font-medium">{t("version", { version: offer.version })} · {t("listingStatus." + (offer.submittedAt && !offer.reviewedAt ? "PENDING" : offer.status))}</p>{offer.status === "PUBLISHED" && <p className="text-sm text-muted-foreground">{t("publishedEditNote")}</p>}{offer.reviewNote && <p className="break-words text-sm">{t("reviewNote")}: {offer.reviewNote}</p>}
      <div className="flex flex-wrap gap-3"><Button type="button" disabled={busy || Boolean(offer.submittedAt || offer.reviewedAt)} onClick={() => act("submit")}>{t("submit")}</Button><Button type="button" variant="outline" disabled={busy || offer.status === "WITHDRAWN"} onClick={() => act("withdraw")}>{t("withdraw")}</Button></div></div>}
    {error && <p role="alert" className="rounded-xl border border-destructive p-4 text-sm text-destructive">{error}</p>}
    <form onSubmit={save} className="ans-detail-block"><fieldset disabled={busy} className="grid min-w-0 gap-5 md:grid-cols-2">
      {field("title", <Input name="title" required minLength={2} maxLength={100} defaultValue={data?.title}/>)}
      {!free && field("slug", <Input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={80} defaultValue={data?.slug} readOnly={Boolean(offer)} placeholder="my-project"/>)}
      {field("category", <select className={selectClass} value={category} onChange={(e) => { const next = PROJECT_CATEGORIES.find((item) => item.id === e.target.value)!; setCategory(next.id); setSubcategory(next.children[0]); }}>{PROJECT_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{p("categories." + item.id)}</option>)}</select>)}
      {field("subcategory", <select className={selectClass} value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>{children.map((item) => <option key={item} value={item}>{p("children." + item)}</option>)}</select>)}
      {!free && field("fulfillment", <select className={selectClass} name="fulfillment" defaultValue={data?.fulfillment ?? "service"}><option value="service">{t("service")}</option><option value="resource">{t("resource")}</option></select>)}
      {!free && field("price", <Input name="price" inputMode="decimal" required pattern="(0|[1-9][0-9]{0,6})([.][0-9]{1,2})?" defaultValue={data ? (data.priceMinor / 100).toFixed(2) : undefined} placeholder="99.00"/>)}
      {!free && field("deliveryDays", <Input type="number" name="deliveryDays" required min={1} max={90} defaultValue={data?.deliveryDays ?? 3}/>)}
      {!free && field("revisionLimit", <Input type="number" name="revisionLimit" required min={0} max={20} defaultValue={data?.revisionLimit ?? 1}/>)}
      <div className="md:col-span-2">{field("summary", <Textarea name="summary" required minLength={10} maxLength={300} defaultValue={data?.summary}/>)}</div>
      <div className="md:col-span-2">{field("description", <Textarea name="description" required minLength={20} maxLength={20000} className="min-h-40" defaultValue={data?.description}/>)}</div>
      <div className="md:col-span-2">{field("deliverables", <Textarea name="deliverables" required className="min-h-28" defaultValue={data?.deliverables.join("\n")} placeholder={t("deliverablesHint")}/>)}</div>
      <div className="md:col-span-2">{field("licenseTerms", <Textarea name="licenseTerms" required minLength={10} maxLength={3000} defaultValue={data?.licenseTerms}/>)}</div>
      {field("previewUrl", <Input type="url" name="previewUrl" maxLength={1000} defaultValue={data?.previewUrl}/>)}
      {field("coverUrl", <Input type="url" name="coverUrl" maxLength={1000} defaultValue={data?.coverUrl} placeholder="https://"/>)}
      {field("sourceUrl", <Input type="url" name="sourceUrl" maxLength={1000} defaultValue={data?.sourceUrl}/>)}
      {!free && <label className="flex items-center gap-3 text-sm md:col-span-2"><input type="checkbox" name="computeIncluded" defaultChecked={data?.computeIncluded} className="h-4 w-4 accent-primary"/>{t("fields.computeIncluded")}</label>}
      <p className="text-sm leading-7 text-muted-foreground md:col-span-2">{free ? p("realProject.submitNote") : t("editorNote")}</p><div className="md:col-span-2"><Button type="submit" disabled={busy}>{t(busy ? "saving" : "save")}</Button></div>
    </fieldset></form>
  </div>;
}
