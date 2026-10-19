"use client";

import { useMarketActorId, useMarketRequest, useMarketUpload } from "./account-boundary";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Check, Copy, Download, Github, ImagePlus, PackageCheck, Plus, Sparkles, Trash2 } from "lucide-react";
import type { MarketOfferView } from "@/contracts/marketplace-view";
import { marketListingInputSchema } from "@/contracts/marketplace";
import { PROJECT_CATEGORIES } from "@/domain/catalog/projects";
import { parseMarketPrice } from "@/domain/marketplace/presentation";
import {
  COVER_STUDIO_PRESETS,
  buildCoverStudioSvg,
  generateRoadshowAndSocialPack,
  type CoverStudioPreset,
} from "@/domain/vibehub/ans-site-optimizers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type TierDraft = { id: string; title: string; description: string; price: string; deliverables: string };
const lines = (value: string) => value.split("\n").map(item => item.trim()).filter(Boolean);
const selectClass = "h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm";

export function ListingEditor({ offer, share = false, agri = false }: { offer?: MarketOfferView; share?: boolean; agri?: boolean }) {
  const actorId = useMarketActorId();
  const isGuest = !actorId || actorId === "guest" || actorId === "guest-preview";
  const marketRequest = useMarketRequest(); const upload = useMarketUpload();
  const rawLocale = useLocale();
  const locale = (rawLocale === "en" ? "en" : "zh") as "zh" | "en";
  const t = useTranslations("product.market"); const tp = useTranslations("product.marketProject"); const p = useTranslations("product"); const router = useRouter();
  const w = useTranslations("marketWorkflow");
  const aw = useTranslations("agriWall");
  const data = offer?.listing;
  const [category, setCategory] = useState(data?.category ?? (agri ? "competition" : "career")); const [subcategory, setSubcategory] = useState(data?.subcategory ?? (agri ? "agri-wall" : "resume"));
  const isAgri = category === "competition" && subcategory === "agri-wall";
  const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false); const [error, setError] = useState("");
  const flight = useRef(false);
  const [free, setFree] = useState(offer ? data?.priceMinor === 0 && !data?.pricingTiers?.length : share || agri);
  const [title, setTitle] = useState(data?.title ?? ""); const [summary, setSummary] = useState(data?.summary ?? ""); const [deliverables, setDeliverables] = useState(data?.deliverables.join("\n") ?? "");
  const [coverUrl, setCoverUrl] = useState(data?.coverUrl ?? "");
  const [studioTab, setStudioTab] = useState<"pitch" | "readme" | "social" | "cover">("pitch");
  const [coverPreset, setCoverPreset] = useState<CoverStudioPreset["id"]>("editorial");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [tiers, setTiers] = useState<TierDraft[]>(data?.pricingTiers?.length ? data.pricingTiers.map(tier => ({ id: tier.id, title: tier.title, description: tier.description, price: (tier.priceMinor / 100).toFixed(2), deliverables: tier.deliverables.join("\n") })) : [{ id: "basic", title: "", description: "", price: data?.priceMinor ? (data.priceMinor / 100).toFixed(2) : "", deliverables: data?.deliverables.join("\n") ?? "" }]);
  const children = PROJECT_CATEGORIES.find(item => item.id === category)!.children;
  const categoryLabel = `${p("categories." + category)} · ${p("children." + subcategory)}`;
  const socialPack = generateRoadshowAndSocialPack(
    { title, summary, deliverables: lines(deliverables), category: categoryLabel },
    locale,
  );
  const coverSvgMarkup = buildCoverStudioSvg(coverPreset, title, socialPack.cleanedSummary, categoryLabel);
  function copyStudioText(key: string, value: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(curr => (curr === key ? null : curr)), 1800);
    }
  }
  function fillDescriptionWithReadme() {
    const d = document.querySelector<HTMLTextAreaElement>('textarea[name="description"]');
    if (d) {
      d.value = socialPack.readmeMarkdown;
      d.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  function downloadCoverSvg() {
    if (typeof window === "undefined") return;
    const blob = new Blob([coverSvgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title.trim() || "ans-project").slice(0, 24).replace(/\s+/g, "-")}-${coverPreset}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function errorMessage(code: string) { return t(t.has("errors." + code) ? "errors." + code : "errors.INTERNAL_ERROR"); }
  function updateTier(id: string, change: Partial<TierDraft>) { setTiers(current => current.map(tier => tier.id === id ? { ...tier, ...change } : tier)); }
  async function uploadCover(file?: File) {
    if (!file || uploading || busy) return;
    if (isGuest) { router.push("/login?callbackUrl=%2Fmarket%2Fcreator%2Fnew"); return; }
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024 || file.size === 0) { setError(tp("coverInvalid")); return; }
    setUploading(true);
    try { const result = await upload(file); setCoverUrl(result.url); }
    catch (caught) { setError(caught instanceof Error && caught.message === "ACCOUNT_CHANGED" ? errorMessage("ACCOUNT_CHANGED") : tp("coverFailed")); }
    finally { setUploading(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (flight.current || uploading) return;
    if (isGuest) { router.push(share ? "/login?callbackUrl=%2Fexplore%2Fsubmit" : "/login?callbackUrl=%2Fmarket%2Fcreator%2Fnew"); return; }
    const form = new FormData(event.currentTarget); setError(""); const text = (key: string) => String(form.get(key) ?? "").trim();
    const pricingTiers = (free || isAgri) ? [] : tiers.map(tier => ({ id: tier.id, title: tier.title.trim(), description: tier.description.trim(), priceMinor: parseMarketPrice(tier.price), deliverables: lines(tier.deliverables) }));
    const parsed = marketListingInputSchema.safeParse({
      ...(data?.execution ? { execution: data.execution } : {}),
      slug: offer?.slug ?? (free ? "project-" + crypto.randomUUID() : text("slug")), title, summary, description: text("description"), category, subcategory,
      fulfillment: free ? "resource" : text("fulfillment"), priceMinor: free ? 0 : pricingTiers[0]?.priceMinor, currency: "CNY", deliveryDays: free ? 1 : Number(text("deliveryDays")), revisionLimit: free ? 0 : Number(text("revisionLimit")), computeIncluded: !free && form.get("computeIncluded") === "on", deliverables: lines(deliverables), licenseTerms: text("licenseTerms"), pricingTiers,
      ...(coverUrl.trim() ? { coverUrl: coverUrl.trim() } : {}), ...Object.fromEntries(["previewUrl", "sourceUrl", "githubUrl", "usageUrl"].filter(key => text(key)).map(key => [key, text(key)])),
    });
    if (!parsed.success || (isAgri && (!free || parsed.data.execution)) || (free && !parsed.data.execution && !parsed.data.sourceUrl && !parsed.data.previewUrl && !parsed.data.githubUrl && !parsed.data.usageUrl)) { setError(errorMessage("INVALID_INPUT")); return; }
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
  const safeCover = /^(https:\/\/|\/)/i.test(coverUrl);
  function applyQuickTemplate(tpl: { cat: string; sub: string; title: string; summary: string; deliv: string; cover: string; desc: string; url: string; git: string }) {
    setCategory(tpl.cat as typeof category);
    setSubcategory(tpl.sub);
    setTitle(tpl.title);
    setSummary(tpl.summary);
    setDeliverables(tpl.deliv);
    setCoverUrl(tpl.cover);
    setTimeout(() => {
      const d = document.querySelector<HTMLTextAreaElement>('textarea[name="description"]');
      const u = document.querySelector<HTMLInputElement>('input[name="previewUrl"]');
      const g = document.querySelector<HTMLInputElement>('input[name="githubUrl"]');
      if (d) d.value = tpl.desc;
      if (u) u.value = tpl.url;
      if (g) g.value = tpl.git;
    }, 30);
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div className="space-y-0.5">
        <p className="text-sm font-bold text-foreground">⚡ 一键填入示范项目模板（秒速体验实时预览与发布）</p>
        <p className="text-xs text-muted-foreground">点击任一模板即可自动填充标题、封面、简介、亮点与预览地址，支持在此基础上自由修改</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          {
            label: "🌾 农客松参赛作品模板",
            cat: "competition",
            sub: "agri-wall",
            title: "CAU 农情病虫害多模态遥感诊断终端",
            summary: "基于哨兵二号 NDVI 农情指数与 DeepSeek V4.1 视觉诊断的田间叶斑病实时预警与农艺处方生成系统。",
            deliv: "可交互 HTML5 农情诊断终端\n病虫害置信度分析报告\n开源 Prompt 与数据集索引",
            cover: "https://ans.cauai.fun/competitions/agrihackathon/gitglow-hub.webp",
            desc: "面向中国农大智耕黑客松打造的智慧农业多模态诊断系统，融合田间实拍叶片视觉识别与多光谱遥感指数，3秒生成农艺防治处方。",
            url: "https://ans.cauai.fun/workspace?thread=thread-agri",
            git: "https://github.com/cauai/agri-vision-diagnosis",
          },
          {
            label: "✨ Vibe Coding 3D 网页模板",
            cat: "web",
            sub: "personal-site",
            title: "Three.js 3D 星空个人作品集与简历站",
            summary: "零依赖 HTML5 Canvas 3D 星空粒子交互主页，支持响应式 Bento 卡片、项目时间线与一键导出源码。",
            deliv: "单文件 HTML5 3D 粒子网页\nBento 作品集响应式布局\n在线预览与源码包",
            cover: "https://ans.cauai.fun/catalog/gitglow-v1/magic-resume.webp",
            desc: "使用工作模式 30 秒生成的 3D 星空粒子个人主页，内置鼠标视差追踪与 Bento 作品卡片。",
            url: "https://ans.cauai.fun/workspace?thread=thread-portfolio",
            git: "https://github.com/cauai/vibe-3d-portfolio",
          },
          {
            label: "🎬 AIGC 多模态分镜模板",
            cat: "aigc",
            sub: "video",
            title: "CAUAI 无限画布赛博长安四格分镜工坊",
            summary: "基于 CAUAI 无限画布的一致性角色设定、四宫格电影级运镜脚本与多模态提示词工程。",
            deliv: "4 镜完整分镜脚本与台词\n角色一致性参考图 Prompt\n多模态视频运镜指令",
            cover: "https://ans.cauai.fun/catalog/gitglow-v1/infinite-canvas.webp",
            desc: "AIGC 创作赛道示范作品，包含完整角色设定锚点与四格电影级运镜提示词。",
            url: "https://hb.cauai.fun/",
            git: "https://github.com/cauai/infinite-canvas-cyber-changan",
          },
        ].map(tpl => (
          <button
            key={tpl.label}
            type="button"
            onClick={() => applyQuickTemplate(tpl)}
            className="rounded-full border border-primary/30 bg-background px-3.5 py-1.5 text-xs font-bold text-primary shadow-2xs transition hover:bg-primary hover:text-primary-foreground cursor-pointer"
          >
            {tpl.label}
          </button>
        ))}
      </div>
    </div>
    {isAgri && <aside className="rounded-2xl border border-primary/25 bg-primary/5 p-5"><h2 className="font-semibold">{aw("publishTitle")}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{aw(offer && !offer.submittedAt && offer.status === "DRAFT" ? "publishDraftHint" : "publishBody")}</p><Link className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-4" href="/explore/agrihackathon/submit">{aw("continueEntry")}</Link></aside>}
    {offer && <div className="ans-detail-block space-y-3"><p className="font-medium">{t("version", { version: offer.version })} · {t("listingStatus." + (offer.submittedAt && !offer.reviewedAt ? "PENDING" : offer.status))}</p>{offer.status === "PUBLISHED" && <p className="text-sm text-muted-foreground">{t("publishedEditNote")}</p>}{offer.reviewNote && <p className="break-words text-sm">{t("reviewNote")}: {offer.reviewNote}</p>}<div className="flex flex-wrap gap-3"><Button type="button" disabled={busy || uploading || Boolean(offer.submittedAt || offer.reviewedAt)} onClick={() => act("submit")}>{t("submit")}</Button><Button type="button" variant="outline" disabled={busy || uploading || offer.status === "WITHDRAWN"} onClick={() => act("withdraw")}>{t("withdraw")}</Button>{!data?.execution && !isAgri && <Button type="button" variant="outline" asChild><Link href={`/market/creator/${offer.id}/integration`}>{tp("integrationAction")}<ArrowUpRight aria-hidden="true"/></Link></Button>}</div></div>}
    {error && <p role="alert" className="rounded-xl border border-destructive p-4 text-sm text-destructive">{error}</p>}
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={save} className="min-w-0 space-y-6"><fieldset disabled={busy || uploading} className="min-w-0 space-y-6">
        <section className="ans-detail-block">{section("01", tp("identityTitle"), tp("identityBody"))}<div className="grid min-w-0 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">{field(t("fields.title"), <Input name="title" required minLength={2} maxLength={100} value={title} onChange={event => setTitle(event.target.value)}/>)}</div>
          {!free && field(t("fields.slug"), <Input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={80} defaultValue={data?.slug} readOnly={Boolean(offer)} placeholder="my-project"/>)}
          {field(t("fields.category"), <select aria-label={t("fields.category")} className={selectClass} value={category} onChange={event => { const next = PROJECT_CATEGORIES.find(item => item.id === event.target.value)!; setCategory(next.id); setSubcategory(next.children[0]); }}>{PROJECT_CATEGORIES.map(item => <option key={item.id} value={item.id}>{p("categories." + item.id)}</option>)}</select>)}
          {field(t("fields.subcategory"), <select aria-label={t("fields.subcategory")} className={selectClass} value={subcategory} onChange={event => { setSubcategory(event.target.value); if (event.target.value === "agri-wall") setFree(true); }}>{children.map(item => <option key={item} value={item}>{p("children." + item)}</option>)}</select>)}
          <div className="md:col-span-2 space-y-2">
            {field(t("fields.summary"), <Textarea name="summary" required minLength={10} maxLength={300} value={summary} onChange={event => setSummary(event.target.value)}/>)}
            {summary.trim().length > 0 && socialPack.cleanedSummary !== summary.trim() && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  🧹 <strong className="text-foreground">ans-tone-guard 检测到空洞修辞：</strong>建议精简为可核验的工程事实描述
                </span>
                <button
                  type="button"
                  onClick={() => setSummary(socialPack.cleanedSummary)}
                  className="rounded-full border border-primary/30 bg-background px-3 py-1 font-semibold text-primary hover:bg-primary/10 cursor-pointer"
                >
                  一键去 AI 味精简简介
                </button>
              </div>
            )}
          </div>
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
        <section className="ans-detail-block space-y-4" data-testid="ans-submission-skill-studio">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>ANS 路演发布与高对比封面工坊 · ans-draft-publisher + ans-cover-studio</span>
              </p>
              <h2 className="mt-1 text-lg font-semibold">一鱼四吃：自动生成 60s 路演稿、去 AI 味 README、社媒帖与 16:9 封面</h2>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                基于当前填写的项目标题、简介与交付物，实时执行去 AI 味校验（ans-tone-guard）并同步生成四套发布物料。
              </p>
            </div>
            <button
              type="button"
              onClick={fillDescriptionWithReadme}
              className="rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer"
            >
              📄 将去 AI 味 README 填入项目详情
            </button>
          </div>
          <div className="flex flex-wrap gap-2 border-b pb-3">
            {([
              { id: "pitch", label: "🎙️ 60秒路演逐字稿" },
              { id: "readme", label: "📘 去AI味 GitHub README" },
              { id: "social", label: "📲 小红书/B站发布草稿" },
              { id: "cover", label: "🎨 双封面 Skill 工坊 (oil 外封 + GitGlow 3D 内封)" },
            ] as const).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStudioTab(tab.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  studioTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {studioTab !== "cover" ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {studioTab === "pitch"
                    ? "面向评委/导师的 60 秒三段式路演结构（痛点 → 确定性边界 → 现场可核验交付）"
                    : studioTab === "readme"
                      ? "遵循 Grounding 规范与 30 秒冒烟测试的开源项目 README"
                      : "去除空洞口号、带双备选标题与可验证亮点的社区分享帖"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyStudioText(
                      studioTab,
                      studioTab === "pitch"
                        ? socialPack.roadshowPitch
                        : studioTab === "readme"
                          ? socialPack.readmeMarkdown
                          : socialPack.socialPostDraft,
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-background px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer"
                >
                  {copiedKey === studioTab ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey === studioTab ? "已复制" : "复制文稿"}</span>
                </button>
              </div>
              <pre className="max-h-60 overflow-auto rounded-xl border border-border/80 bg-muted/30 p-3.5 text-xs leading-6 whitespace-pre-wrap text-foreground">
                {studioTab === "pitch"
                  ? socialPack.roadshowPitch
                  : studioTab === "readme"
                    ? socialPack.readmeMarkdown
                    : socialPack.socialPostDraft}
              </pre>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3.5 py-2 text-xs leading-5 text-muted-foreground">
                💡 <strong className="text-foreground">一项目双封面规范：</strong>点进去之前（列表卡片外封）使用 <strong className="text-foreground">oil 大字插画海报 Skill</strong> 一眼看懂；点进去之后（详情页主图内封）使用 <strong className="text-foreground">GitGlow 3D 界面透视 Skill</strong> 展示真实运行界面。
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {COVER_STUDIO_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setCoverPreset(preset.id)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                        coverPreset === preset.id
                          ? "bg-foreground text-background"
                          : "border border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {preset.label[locale]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={downloadCoverSvg}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>下载当前 16:9 SVG 封面</span>
                </button>
              </div>
              <div
                className="overflow-hidden rounded-xl border border-border/80 shadow-xs [&_svg]:h-auto [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: coverSvgMarkup }}
              />
            </div>
          )}
        </section>
        <section className="ans-detail-block">{section("03", isAgri ? aw("freeDisplayTitle") : tp("pricingTitle"), isAgri ? aw("freeDisplayBody") : tp("pricingBody"))}{data?.execution && <p className="mb-4 text-sm font-medium text-primary">{w("runnable")} · {w("computeOnRun")}</p>}{!data?.execution && <label className="flex items-start gap-3 rounded-xl border p-4 text-sm"><input type="checkbox" checked={free} disabled={Boolean(data?.execution) || isAgri} onChange={event => setFree(event.target.checked)} className="mt-1 h-4 w-4 accent-primary"/><span><strong>{p("realProject.freeShare")}</strong><span className="mt-1 block leading-6 text-muted-foreground">{tp("freeHint")}</span></span></label>}
          {!free && <div className="mt-5 space-y-5"><div className="grid min-w-0 gap-5 md:grid-cols-2">{field(t("fields.fulfillment"), <select className={selectClass} name="fulfillment" defaultValue={data?.fulfillment ?? "service"}><option value="service">{t("service")}</option><option value="resource">{t("resource")}</option></select>)}{field(t("fields.deliveryDays"), <Input type="number" name="deliveryDays" required min={1} max={90} defaultValue={data?.deliveryDays ?? 3}/>)}{field(t("fields.revisionLimit"), <Input type="number" name="revisionLimit" required min={0} max={20} defaultValue={data?.revisionLimit ?? 1}/>)}</div>
            {tiers.map((tier, index) => <div key={tier.id} className="min-w-0 space-y-4 rounded-xl border bg-muted/20 p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{tp("tierNumber", { number: index + 1 })}</h3><Button type="button" size="sm" variant="ghost" disabled={tiers.length === 1} onClick={() => setTiers(current => current.filter(item => item.id !== tier.id))} aria-label={tp("removeTier", { number: index + 1 })}><Trash2 aria-hidden="true"/>{tp("remove")}</Button></div><div className="grid min-w-0 gap-4 md:grid-cols-2">{field(tp("tierTitle"), <Input value={tier.title} required maxLength={80} onChange={event => updateTier(tier.id, { title: event.target.value })}/>)}{field(tp("tierPrice"), <Input inputMode="decimal" value={tier.price} required pattern="(0|[1-9][0-9]{0,6})([.][0-9]{1,2})?" onChange={event => updateTier(tier.id, { price: event.target.value })}/>)}<div className="md:col-span-2">{field(tp("tierDescription"), <Textarea value={tier.description} required maxLength={1000} onChange={event => updateTier(tier.id, { description: event.target.value })}/>)}</div><div className="md:col-span-2">{field(tp("tierDeliverables"), <Textarea value={tier.deliverables} required onChange={event => updateTier(tier.id, { deliverables: event.target.value })}/>, t("deliverablesHint"))}</div></div></div>)}
            <Button type="button" variant="outline" disabled={tiers.length >= 6} onClick={() => setTiers(current => [...current, { id: crypto.randomUUID(), title: "", description: "", price: "", deliverables }])}><Plus aria-hidden="true"/>{tp("addTier")}</Button><p className="text-xs leading-6 text-muted-foreground">{tp("tierHint")}</p><label className="flex items-center gap-3 text-sm"><input type="checkbox" name="computeIncluded" defaultChecked={data?.computeIncluded} className="h-4 w-4 accent-primary"/>{t("fields.computeIncluded")}</label>
          </div>}
        </section>
        <section className="ans-detail-block space-y-4">{!isAgri && <div className="flex items-start gap-3"><Github aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary"/><div><h2 className="font-semibold">{tp("integrationTitle")}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{tp("integrationBody")}</p><Link href="/docs/points-integration" className="mt-3 inline-flex text-sm font-medium text-primary underline underline-offset-4">{tp("integrationGuide")}</Link></div></div>}<p className="text-sm leading-7 text-muted-foreground">{free ? p("realProject.submitNote") : t("editorNote")}</p><Button type="submit" disabled={busy || uploading}>{t(busy ? "saving" : "save")}</Button></section>
      </fieldset></form>
      <aside className="min-w-0 space-y-3 xl:sticky xl:top-24"><p className="text-sm font-medium text-muted-foreground">{tp("livePreview")}</p><div className="ans-project-card overflow-hidden"><div className="aspect-video bg-muted/40">{safeCover ? <Image unoptimized src={coverUrl} width={640} height={360} alt={tp("coverPreview")} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center"><ImagePlus aria-hidden="true" className="h-10 w-10 text-muted-foreground/50"/></div>}</div><div className="space-y-4 p-5"><p className="text-xs font-medium text-primary">{p("categories." + category)} · {p("children." + subcategory)}</p><h2 className="break-words text-xl font-semibold">{title || tp("previewTitle")}</h2><p className="break-words text-sm leading-7 text-muted-foreground">{summary || tp("previewSummary")}</p><ul className="space-y-2 text-sm">{lines(deliverables).slice(0, 3).map((item, index) => <li key={index} className="flex items-start gap-2"><PackageCheck aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-primary"/><span className="break-words">{item}</span></li>)}</ul><p className="border-t pt-4 text-xl font-semibold">{data?.execution ? w("computeOnRun") : free ? p("realProject.freeShare") : Number.isFinite(previewPrice) ? tp("fromPoints", { amount: previewPrice / 100 }) : tp("pricePending")}</p></div></div><p className="text-xs leading-6 text-muted-foreground">{tp("previewNote")}</p></aside>
    </div>
  </div>;
}
