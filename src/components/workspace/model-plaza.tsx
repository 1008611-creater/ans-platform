"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowUpRight, Check, Copy, LayoutGrid, List, Search } from "lucide-react";
import type { ModelPlazaCatalog, ModelPlazaModel } from "@/lib/model-plaza";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PriceKey = "input" | "output" | "cacheRead" | "cacheWrite" | "cacheWrite5m" | "cacheWrite1h";
const priceKeys: PriceKey[] = ["input", "output", "cacheRead", "cacheWrite", "cacheWrite5m", "cacheWrite1h"];
const selectClass = "mt-2 min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function ModelPlaza({ catalog }: { catalog: ModelPlazaCatalog }) {
  const t = useTranslations("product.modelPlaza"), locale = useLocale();
  const [query, setQuery] = useState(""), [vendor, setVendor] = useState("all"), [endpoint, setEndpoint] = useState("all"), [status, setStatus] = useState("all");
  const [currency, setCurrency] = useState<"usd" | "points">("usd"), [unit, setUnit] = useState<"million" | "thousand">("million");
  const [sort, setSort] = useState("name"), [view, setView] = useState<"cards" | "table">("cards");
  const detailOpener = useRef<HTMLButtonElement | null>(null);
  const [detail, setDetail] = useState<ModelPlazaModel | null>(null), [copied, setCopied] = useState<string | null>(null), [copyFailed, setCopyFailed] = useState(false);
  const vendors = [...new Set(catalog.models.map(model => model.vendor))].sort();
  const endpoints = [...new Set(catalog.models.flatMap(model => model.endpoints))].sort();
  const models = useMemo(() => catalog.models.filter(model =>
    (!query.trim() || `${model.id} ${model.name} ${model.vendor}`.toLowerCase().includes(query.trim().toLowerCase())) &&
    (vendor === "all" || model.vendor === vendor) && (endpoint === "all" || model.endpoints.includes(endpoint)) && (status === "all" || model.status === status)
  ).sort((a, b) => sort === "input" ? ((currency === "usd" ? a.usdPerMillion : a.pointsPerMillion)?.input ?? Infinity) - ((currency === "usd" ? b.usdPerMillion : b.pointsPerMillion)?.input ?? Infinity) || a.name.localeCompare(b.name)
    : sort === "output" ? ((currency === "usd" ? a.usdPerMillion : a.pointsPerMillion)?.output ?? Infinity) - ((currency === "usd" ? b.usdPerMillion : b.pointsPerMillion)?.output ?? Infinity) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)), [catalog.models, query, vendor, endpoint, status, sort, currency]);
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 8 });
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" });
  function price(model: ModelPlazaModel, key: PriceKey) {
    const value = (currency === "usd" ? model.usdPerMillion : model.pointsPerMillion)?.[key];
    return value === null || value === undefined ? t("unknown") : t(currency === "usd" ? "usdPrice" : "pointsPrice", { value: numbers.format(value / (unit === "thousand" ? 1000 : 1)) });
  }
  async function copy(id: string) {
    try { await navigator.clipboard.writeText(id); setCopied(id); setCopyFailed(false); }
    catch { setCopied(null); setCopyFailed(true); }
  }
  function priceNote(model: ModelPlazaModel) { return t(model.vendor === "DeepSeek" ? "priceNotes.deepseek" : model.vendor === "Anthropic" ? "priceNotes.claude" : "priceNotes.gpt"); }
  function reset() { setQuery(""); setVendor("all"); setEndpoint("all"); setStatus("all"); }
  const modelHeading = (model: ModelPlazaModel) => <div className="flex min-w-0 items-start gap-2"><div className="min-w-0 flex-1"><h2 className="break-words text-base font-semibold [overflow-wrap:anywhere]">{model.name}</h2><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{model.id}</p></div><Button type="button" size="icon" variant="ghost" aria-label={t("copyModel", { model: model.id })} onClick={() => void copy(model.id)}>{copied === model.id ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}</Button></div>;
  return <div className="ans-product-shell"><div className="ans-product-container space-y-8 py-8 sm:py-12">
    <Link href="/workspace/credits" className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />{t("back")}</Link>
    <header className="mx-auto max-w-3xl text-center"><p className="ans-eyebrow">ANS / API</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">{t("description")}</p><label className="relative mt-6 block text-start"><span className="sr-only">{t("search")}</span><Search className="absolute left-4 top-3.5 size-4 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder={t("search")} className="min-h-12 rounded-xl pl-11" /></label></header>
    <aside className="rounded-2xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground"><p>{t("directoryNotice")}</p><p className="mt-2">{t("referenceNotice")}</p>{catalog.state === "unavailable" && <p role="alert" className="mt-2 text-destructive">{t("unavailable")}</p>}<p className="mt-2">{t("exchange", { points: catalog.billing.pointsPerCny })} {catalog.billing.usdCny === null ? t("fxMissing") : t("fxPresent", { rate: catalog.billing.usdCny })}</p>{catalog.billing.fxSource && catalog.billing.fxAsOf && <p className="mt-2 break-words">{t("fxEvidence", { source: catalog.billing.fxSource, date: dates.format(new Date(catalog.billing.fxAsOf)) })}</p>}</aside>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-xs sm:text-sm">
      <p className="text-foreground/90">
        {locale.startsWith("zh")
          ? "🎁 算力不足？全站 90% 用户可免费领 100~150 积分（¥10~¥15），更有 0.1% 概率抽取 1,000 积分（¥100）神话锦鲤！"
          : "🎁 Need compute credits? Claim 100–150 free pts ($10–$15) + 0.1% 1,000-pt Mythic Jackpot in Benefits, or redeem a voucher."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/workspace/benefits" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500">
          {locale.startsWith("zh") ? "免费领 100~150 积分 →" : "Claim Free 100–150 Pts →"}
        </Link>
        <Link href="/workspace/credits#credits-redeem-heading" className="inline-flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
          {locale.startsWith("zh") ? "卡密充值与兑换" : "Redeem Voucher"}
        </Link>
      </div>
    </div>
    <div className="grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="rounded-2xl border p-4"><h2 className="font-semibold">{t("filters")}</h2><div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        <label className="text-sm">{t("vendor")}<select className={selectClass} value={vendor} onChange={event => setVendor(event.target.value)}><option value="all">{t("all")}</option>{vendors.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="text-sm">{t("endpoint")}<select className={selectClass} value={endpoint} onChange={event => setEndpoint(event.target.value)}><option value="all">{t("all")}</option>{endpoints.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="text-sm">{t("status")}<select className={selectClass} value={status} onChange={event => setStatus(event.target.value)}><option value="all">{t("all")}</option>{["listed", "not-listed", "prepared"].map(value => <option key={value} value={value}>{t(`states.${value}`)}</option>)}</select></label>
      </div><Button type="button" variant="ghost" className="mt-4" onClick={reset}>{t("reset")}</Button></aside>
      <section className="min-w-0 space-y-4" aria-label={t("results")}>
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border p-4">
          <label className="min-w-32 flex-1 text-xs text-muted-foreground">{t("currency")}<select className={selectClass} value={currency} onChange={event => setCurrency(event.target.value as "usd" | "points")}><option value="usd">{t("usd")}</option><option value="points">{t("points")}</option></select></label>
          <label className="min-w-28 flex-1 text-xs text-muted-foreground">{t("unit")}<select className={selectClass} value={unit} onChange={event => setUnit(event.target.value as "million" | "thousand")}><option value="million">{t("million")}</option><option value="thousand">{t("thousand")}</option></select></label>
          <label className="min-w-36 flex-1 text-xs text-muted-foreground">{t("sort")}<select className={selectClass} value={sort} onChange={event => setSort(event.target.value)}><option value="name">{t("sortName")}</option><option value="input">{t("sortInput")}</option><option value="output">{t("sortOutput")}</option></select></label>
          <div role="group" aria-label={t("view")} className="flex gap-1"><Button size="icon" variant={view === "cards" ? "default" : "outline"} aria-label={t("cards")} aria-pressed={view === "cards"} onClick={() => setView("cards")}><LayoutGrid className="size-4" aria-hidden="true" /></Button><Button size="icon" variant={view === "table" ? "default" : "outline"} aria-label={t("table")} aria-pressed={view === "table"} onClick={() => setView("table")}><List className="size-4" aria-hidden="true" /></Button></div>
        </div>
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{copyFailed ? t("copyFailed") : copied ? t("copied", { model: copied }) : t("count", { count: models.length })}</p>
        {currency === "usd" && <p className="text-xs leading-6 text-muted-foreground">{t("usdNotice")}</p>}
        {currency === "points" && catalog.billing.usdCny === null && <p className="text-sm text-muted-foreground">{t("pointsUnavailable")}</p>}
        {models.length === 0 ? <div className="rounded-2xl border border-dashed p-8"><p className="font-medium">{t("empty")}</p><Button variant="outline" className="mt-4" onClick={reset}>{t("reset")}</Button></div>
          : view === "cards" ? <div className="grid gap-4 xl:grid-cols-2">{models.map(model => <article key={model.id} className="min-w-0 rounded-2xl border bg-card p-5">{modelHeading(model)}<div className="mt-4 flex flex-wrap gap-2"><Badge variant="secondary">{model.vendor}</Badge><Badge variant="outline">{t(`states.${model.status}`)}</Badge></div>{model.usdPerMillion && <p className="mt-3 text-xs text-muted-foreground">{t(model.usdPerMillion.source === "official" ? "officialPriceLabel" : "apicPriceLabel")}</p>}<dl className="mt-5 grid grid-cols-2 gap-4">{priceKeys.filter(key => key === "input" || key === "output" || (model.usdPerMillion?.[key] ?? null) !== null).map(key => <div key={key}><dt className="text-xs text-muted-foreground">{t(key)}</dt><dd className="mt-1 break-words text-sm font-medium tabular-nums">{price(model, key)}</dd></div>)}</dl><p className="mt-4 text-xs text-muted-foreground">{t("perUnit", { unit: t(unit) })}</p><p className="mt-2 text-xs leading-6 text-muted-foreground">{priceNote(model)}</p><p className="mt-3 break-words text-xs leading-6 text-muted-foreground">{model.endpoints.join(" · ") || t("unknown")}</p><Button variant="outline" className="mt-5 w-full" onClick={event => { detailOpener.current = event.currentTarget; setDetail(model); }}>{t("details")}</Button></article>)}</div>
          : <div className="overflow-x-auto rounded-2xl border" tabIndex={0} role="region" aria-label={t("tableRegion")}><table className="w-full min-w-[700px] text-sm"><caption className="sr-only">{t("tableCaption", { unit: t(unit) })}</caption><thead><tr className="border-b bg-muted/40">{["model", "status", "input", "output", "cacheRead", "cacheWrite", "cacheWrite5m", "cacheWrite1h", "endpoint", "details"].map(key => <th key={key} scope="col" className="p-4 text-start font-medium">{t(key)}</th>)}</tr></thead><tbody>{models.map(model => <tr key={model.id} className="border-b last:border-0"><th scope="row" className="min-w-64 p-4 text-start">{modelHeading(model)}<p className="mt-2 text-xs font-normal text-muted-foreground">{model.vendor}</p></th><td className="p-4">{t(`states.${model.status}`)}</td>{priceKeys.map(key => <td key={key} className="whitespace-nowrap p-4 tabular-nums">{price(model, key)}</td>)}<td className="p-4 text-xs">{model.endpoints.join(" · ") || t("unknown")}</td><td className="p-4"><Button variant="outline" size="sm" onClick={event => { detailOpener.current = event.currentTarget; setDetail(model); }} aria-label={t("detailsFor", { model: model.name })}>{t("details")}</Button></td></tr>)}</tbody></table></div>}
      </section>
    </div>
    <footer className="space-y-2 border-t pt-5 text-xs leading-6 text-muted-foreground"><p>{t("sourceNote")} <a className="inline-flex items-center gap-1 underline underline-offset-4" href={catalog.sourceUrl} target="_blank" rel="noopener noreferrer">{t("source")}<ArrowUpRight className="size-3" aria-hidden="true" /></a></p>{catalog.referenceDate && <p>{t("referenceDate", { date: catalog.referenceDate })}</p>}{catalog.observedAt && <p>{t("observedAt", { date: dates.format(new Date(catalog.observedAt)) })}</p>}{catalog.pricingVersion && <p className="break-all">{t("version", { version: catalog.pricingVersion })}</p>}</footer>
    <Dialog open={detail !== null} onOpenChange={open => { if (!open) setDetail(null); }}><DialogContent showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); detailOpener.current?.focus(); }} className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">{detail && <><DialogHeader><DialogTitle className="break-words [overflow-wrap:anywhere]">{detail.name}</DialogTitle><DialogDescription className="break-all">{detail.id}</DialogDescription></DialogHeader><div className="space-y-5"><p className="text-sm">{t(`states.${detail.status}`)} · {detail.vendor}</p><p className="text-sm leading-6 text-muted-foreground">{t(`stateBodies.${detail.status}`)}</p><p className="text-xs leading-6 text-muted-foreground">{priceNote(detail)}</p><dl className="grid grid-cols-2 gap-4">{priceKeys.map(key => <div key={key}><dt className="text-xs text-muted-foreground">{t(key)}</dt><dd className="mt-1 text-sm tabular-nums">{price(detail, key)}</dd></div>)}</dl><p className="text-xs text-muted-foreground">{t("perUnit", { unit: t(unit) })}</p><p className="text-sm">{t("multiplier", { value: detail.consumptionMultiplier })}</p><p className="break-words text-xs">{t("endpoint")}: {detail.endpoints.join(" · ") || t("unknown")}</p>{detail.usdPerMillion && <a className="inline-flex items-center gap-1 text-sm underline underline-offset-4" href={detail.usdPerMillion.sourceUrl} target="_blank" rel="noopener noreferrer">{t(detail.usdPerMillion.source === "official" ? "officialSource" : "apicSource")}<ArrowUpRight className="size-3" aria-hidden="true" /></a>}<Button asChild className="w-full"><Link href="/settings">{t("connection")}</Link></Button><DialogClose asChild><Button variant="outline" className="w-full">{t("close")}</Button></DialogClose></div></>}</DialogContent></Dialog>
  </div></div>;
}
