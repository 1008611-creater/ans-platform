"use client";

import { useMarketRequest, useMarketUpload } from "./account-boundary";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  ExternalLink,
  Github,
  ImagePlus,
  PackageCheck,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
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

const COVER_PRESETS: ReadonlyArray<{ label: string; url: string; category: string }> = [
  { label: "求职/个人主页", url: "https://ans.cauai.fun/catalog/ans-pro-v1/magic-resume.webp", category: "career" },
  { label: "AIGC 视频/漫剧", url: "https://ans.cauai.fun/catalog/ans-pro-v1/ai-video-services.webp", category: "aigc" },
  { label: "无限画布/工作台", url: "https://ans.cauai.fun/catalog/ans-pro-v1/infinite-canvas.webp", category: "web" },
  { label: "3D/智慧农业展厅", url: "https://ans.cauai.fun/catalog/ans-pro-v1/ans-3d-showcase.webp", category: "competition" },
  { label: "多模态视觉工具", url: "https://ans.cauai.fun/catalog/ans-pro-v1/image2-library.webp", category: "learning" },
  { label: "AI 摄影与图像", url: "https://ans.cauai.fun/catalog/ans-pro-v1/vibephoto.webp", category: "productivity" },
];

const COPY_TEMPLATES: Record<
  string,
  { summary: string; description: string; deliverables: string; licenseTerms: string }
> = {
  default: {
    summary: "开箱即用的 AI 实战项目，提供完整在线演示、核心源码与一键部署指南。",
    description:
      "【解决痛点】针对日常研发与创作中的高频痛点，提供拿来即用的完整实现。\n【核心特性】内置前后端工程结构、标准 API 调用封装与可视化交互界面。\n【使用方式】点击右侧「在线体验」可直接试玩 Demo，或前往 GitHub 克隆源码本地运行。",
    deliverables: "完整项目源码与配置文件\n在线可交互 Demo 演示地址\n5 分钟本地复现与部署文档",
    licenseTerms: "MIT 开源授权，支持个人学习、科研课题与科创比赛自由复用。",
  },
  competition: {
    summary: "面向农客松与科创大赛的 AI 落地作品，含在线交互演示、算法管线与实测数据。",
    description:
      "【赛题场景】围绕真实农业/产业痛点构建可验证的 AI 解决方案。\n【技术架构】融合多模态感知、大模型 Agent 决策与可视化监测面板。\n【验证效果】支持在线上传样本实测，附带完整测试集与部署说明。",
    deliverables: "在线可交互系统演示端\n核心算法与前端工程源码\n参赛路演与实测验证说明",
    licenseTerms: "供比赛评审、社区交流与开源学习使用，保留原作者署名。",
  },
  aigc: {
    summary: "一站式 AIGC 视觉/视频创作流，内置分镜提示词矩阵与角色风格锁定参数。",
    description:
      "【创作效果】告别抽卡式生图，稳定输出风格统一的漫画、分镜或动态视频。\n【使用方法】直接在线打开工作台，或复制预设 Prompt 与参数即可复现同款效果。",
    deliverables: "分镜与视觉风格 Prompt 模板库\n高清成片样片与参数配置单\n一键复现操作指南",
    licenseTerms: "生成作品版权归创作者本人所有，支持自媒体发布与比赛路演。",
  },
};

export function ListingEditor({ offer, share = false, agri = false }: { offer?: MarketOfferView; share?: boolean; agri?: boolean }) {
  const marketRequest = useMarketRequest();
  const upload = useMarketUpload();
  const t = useTranslations("product.market");
  const tp = useTranslations("product.marketProject");
  const p = useTranslations("product");
  const router = useRouter();
  const w = useTranslations("marketWorkflow");
  const aw = useTranslations("agriWall");
  const data = offer?.listing;

  const [category, setCategory] = useState(data?.category ?? (agri ? "competition" : "career"));
  const [subcategory, setSubcategory] = useState(data?.subcategory ?? (agri ? "agri-wall" : "resume"));
  const isAgri = category === "competition" && subcategory === "agri-wall";
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const flight = useRef(false);

  const [free, setFree] = useState(offer ? data?.priceMinor === 0 && !data?.pricingTiers?.length : share || agri);
  const [title, setTitle] = useState(data?.title ?? "");
  const [summary, setSummary] = useState(data?.summary ?? "");
  const [description, setDescription] = useState(data?.description ?? "");
  const [deliverables, setDeliverables] = useState(data?.deliverables.join("\n") ?? "");
  const [licenseTerms, setLicenseTerms] = useState(data?.licenseTerms ?? "");
  const [coverUrl, setCoverUrl] = useState(data?.coverUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(data?.githubUrl ?? "");
  const [usageUrl, setUsageUrl] = useState(data?.usageUrl ?? "");
  const [previewUrl, setPreviewUrl] = useState(data?.previewUrl ?? "");
  const [sourceUrl, setSourceUrl] = useState(data?.sourceUrl ?? "");

  const [tiers, setTiers] = useState<TierDraft[]>(
    data?.pricingTiers?.length
      ? data.pricingTiers.map(tier => ({
          id: tier.id,
          title: tier.title,
          description: tier.description,
          price: (tier.priceMinor / 100).toFixed(2),
          deliverables: tier.deliverables.join("\n"),
        }))
      : [
          {
            id: "basic",
            title: "",
            description: "",
            price: data?.priceMinor ? (data.priceMinor / 100).toFixed(2) : "",
            deliverables: data?.deliverables.join("\n") ?? "",
          },
        ]
  );

  const children = PROJECT_CATEGORIES.find(item => item.id === category)!.children;
  function errorMessage(code: string) {
    return t(t.has("errors." + code) ? "errors." + code : "errors.INTERNAL_ERROR");
  }
  function updateTier(id: string, change: Partial<TierDraft>) {
    setTiers(current => current.map(tier => (tier.id === id ? { ...tier, ...change } : tier)));
  }

  async function uploadCover(file?: File) {
    if (!file || uploading || busy) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024 || file.size === 0) {
      setError(tp("coverInvalid"));
      return;
    }
    setUploading(true);
    try {
      const result = await upload(file);
      setCoverUrl(result.url);
    } catch (caught) {
      setError(caught instanceof Error && caught.message === "ACCOUNT_CHANGED" ? errorMessage("ACCOUNT_CHANGED") : tp("coverFailed"));
    } finally {
      setUploading(false);
    }
  }

  function applyConciseTemplate() {
    const tpl = COPY_TEMPLATES[category] ?? COPY_TEMPLATES.default;
    const projectTitle = title.trim() || "我的 AI 实战项目";
    if (!title.trim()) setTitle(projectTitle);
    setSummary(tpl.summary);
    setDescription(tpl.description);
    setDeliverables(tpl.deliverables);
    setLicenseTerms(tpl.licenseTerms);
    if (!coverUrl.trim()) {
      const matched = COVER_PRESETS.find(item => item.category === category) ?? COVER_PRESETS[0];
      setCoverUrl(matched.url);
    }
  }

  async function generateSwissCover() {
    if (uploading || busy) return;
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Warm Swiss Editorial background (#FAF9F5) + subtle grid
    ctx.fillStyle = "#FAF9F5";
    ctx.fillRect(0, 0, 960, 540);
    ctx.strokeStyle = "rgba(20, 20, 19, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= 960; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 540);
      ctx.stroke();
    }
    for (let y = 0; y <= 540; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(960, y);
      ctx.stroke();
    }

    // Main Card Frame
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#10B981";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(56, 52, 848, 436, 28);
    ctx.fill();
    ctx.stroke();

    // Top Tag Pill
    ctx.fillStyle = "rgba(16, 185, 129, 0.14)";
    ctx.beginPath();
    ctx.roundRect(96, 92, 260, 38, 19);
    ctx.fill();
    ctx.fillStyle = "#065F46";
    ctx.font = "bold 17px sans-serif";
    ctx.fillText(`ANS · ${category.toUpperCase()} PROJECT`, 116, 117);

    // Title
    const displayTitle = (title.trim() || "ANS 创新实战项目").slice(0, 22);
    ctx.fillStyle = "#141413";
    ctx.font = "900 44px sans-serif";
    ctx.fillText(displayTitle, 96, 210);

    // Summary line
    const displaySummary = (summary.trim() || "在线可交互体验 · 完整源码与复现指南").slice(0, 36);
    ctx.fillStyle = "#4A4843";
    ctx.font = "600 22px sans-serif";
    ctx.fillText(displaySummary, 96, 268);

    // Bottom Jump Badge
    ctx.fillStyle = "#141413";
    ctx.beginPath();
    ctx.roundRect(96, 392, 230, 50, 25);
    ctx.fill();
    ctx.fillStyle = "#FAF9F5";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(free ? "🔗 在线体验 / 开源 →" : "⚡ 积分兑换交付 →", 122, 423);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], "swiss-project-cover.png", { type: "image/png" });
    await uploadCover(file);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (flight.current || uploading) return;
    const form = new FormData(event.currentTarget);
    setError("");
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const pricingTiers =
      free || isAgri
        ? []
        : tiers.map(tier => ({
            id: tier.id,
            title: tier.title.trim(),
            description: tier.description.trim(),
            priceMinor: parseMarketPrice(tier.price),
            deliverables: lines(tier.deliverables),
          }));
    const parsed = marketListingInputSchema.safeParse({
      ...(data?.execution ? { execution: data.execution } : {}),
      slug: offer?.slug ?? (free ? "project-" + crypto.randomUUID() : text("slug")),
      title,
      summary,
      description: text("description"),
      category,
      subcategory,
      fulfillment: free ? "resource" : text("fulfillment"),
      priceMinor: free ? 0 : pricingTiers[0]?.priceMinor,
      currency: "CNY",
      deliveryDays: free ? 1 : Number(text("deliveryDays")),
      revisionLimit: free ? 0 : Number(text("revisionLimit")),
      computeIncluded: !free && form.get("computeIncluded") === "on",
      deliverables: lines(deliverables),
      licenseTerms: text("licenseTerms"),
      pricingTiers,
      ...(coverUrl.trim() ? { coverUrl: coverUrl.trim() } : {}),
      ...Object.fromEntries(
        ["previewUrl", "sourceUrl", "githubUrl", "usageUrl"]
          .filter(key => text(key))
          .map(key => [key, text(key)])
      ),
    });
    if (
      !parsed.success ||
      (isAgri && (!free || parsed.data.execution)) ||
      (free && !parsed.data.execution && !parsed.data.sourceUrl && !parsed.data.previewUrl && !parsed.data.githubUrl && !parsed.data.usageUrl)
    ) {
      setError(errorMessage("INVALID_INPUT"));
      return;
    }
    flight.current = true;
    setBusy(true);
    try {
      if (offer) {
        await marketRequest("/api/market/listings/" + offer.id, "PATCH", { expectedVersion: offer.version, listing: parsed.data });
        router.refresh();
      } else {
        const result = await marketRequest<{ listing: { id: string } }>("/api/market/listings", "POST", parsed.data);
        router.push("/market/creator/" + result.listing.id);
      }
    } catch (caught) {
      setError(errorMessage(caught instanceof Error ? caught.message : "INTERNAL_ERROR"));
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }

  async function act(action: "submit" | "withdraw") {
    if (!offer || flight.current || uploading) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      await marketRequest("/api/market/listings/" + offer.id, "POST", action === "submit" ? { action, expectedVersion: offer.version } : { action });
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught instanceof Error ? caught.message : "INTERNAL_ERROR"));
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }

  const field = (label: string, input: ReactNode, hint?: string) => (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {input}
      {hint && <span className="text-xs font-normal leading-5 text-muted-foreground">{hint}</span>}
    </label>
  );
  const section = (number: string, heading: string, body: string, extra?: ReactNode) => (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {number}
        </span>
        <div>
          <h2 className="text-base font-semibold">{heading}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
        </div>
      </div>
      {extra}
    </div>
  );

  const previewPrice = Math.min(...tiers.map(tier => parseMarketPrice(tier.price) ?? Infinity));
  const safeCover = /^https:\/\//i.test(coverUrl);
  const jumpTargetUrl = usageUrl.trim() || previewUrl.trim() || githubUrl.trim() || sourceUrl.trim();
  const jumpLabel = data?.execution
    ? "🚀 在线即跑 →"
    : free
      ? usageUrl.trim() || previewUrl.trim()
        ? "🔗 在线体验 ↗"
        : "📦 查看源码 ↗"
      : "⚡ 积分兑换 →";

  return (
    <div className="space-y-5">
      {isAgri && (
        <aside className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <h2 className="text-sm font-semibold">{aw("publishTitle")}</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            {aw(offer && !offer.submittedAt && offer.status === "DRAFT" ? "publishDraftHint" : "publishBody")}
          </p>
          <Link className="mt-2 inline-block text-xs font-medium text-primary underline underline-offset-4" href="/explore/agrihackathon/submit">
            {aw("continueEntry")}
          </Link>
        </aside>
      )}

      {/* 顶部三要素极速导航栏：跳转方式 + 一键文案 + 一键封面 */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
              三要素极速发布
            </span>
            <span className="text-xs font-medium text-foreground">
              做好 <strong>① 封面</strong> · <strong>② 三句文案</strong> · <strong>③ 跳转链接</strong>，同时展示在项目广场与积分市场
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={applyConciseTemplate} className="h-8 gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              一键填入精简文案模板
            </Button>
            {!isAgri && (
              <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs">
                <Link href="/workflows/new">🚀 去建可运行工作流 →</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {offer && (
        <div className="ans-detail-block space-y-3">
          <p className="font-medium">
            {t("version", { version: offer.version })} · {t("listingStatus." + (offer.submittedAt && !offer.reviewedAt ? "PENDING" : offer.status))}
          </p>
          {offer.status === "PUBLISHED" && <p className="text-sm text-muted-foreground">{t("publishedEditNote")}</p>}
          {offer.reviewNote && (
            <p className="break-words text-sm">
              {t("reviewNote")}: {offer.reviewNote}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={busy || uploading || Boolean(offer.submittedAt || offer.reviewedAt)} onClick={() => act("submit")}>
              {t("submit")}
            </Button>
            <Button type="button" variant="outline" disabled={busy || uploading || offer.status === "WITHDRAWN"} onClick={() => act("withdraw")}>
              {t("withdraw")}
            </Button>
            {!data?.execution && !isAgri && (
              <Button type="button" variant="outline" asChild>
                <Link href={`/market/creator/${offer.id}/integration`}>
                  {tp("integrationAction")}
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-destructive p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <form onSubmit={save} className="min-w-0 space-y-5">
          <fieldset disabled={busy || uploading} className="min-w-0 space-y-5">
            {/* 01: 标题、分类与封面 (Cover) */}
            <section className="ans-detail-block">
              {section(
                "01",
                tp("identityTitle"),
                "标题保持 16 字内，配一张清爽的 16:9 封面（支持上传截图、一键生成或选用预设）",
                <Button type="button" size="sm" variant="secondary" onClick={() => void generateSwissCover()} className="h-8 gap-1 text-xs">
                  <Wand2 className="h-3.5 w-3.5" />
                  根据标题生成 16:9 封面
                </Button>
              )}
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  {field(
                    t("fields.title"),
                    <Input name="title" required minLength={2} maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="例：智慧温室病虫害多模态巡检系统" />
                  )}
                </div>
                {!free &&
                  field(
                    t("fields.slug"),
                    <Input
                      name="slug"
                      required
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      minLength={3}
                      maxLength={80}
                      defaultValue={data?.slug}
                      readOnly={Boolean(offer)}
                      placeholder="my-project"
                    />
                  )}
                {field(
                  t("fields.category"),
                  <select
                    aria-label={t("fields.category")}
                    className={selectClass}
                    value={category}
                    onChange={event => {
                      const next = PROJECT_CATEGORIES.find(item => item.id === event.target.value)!;
                      setCategory(next.id);
                      setSubcategory(next.children[0]);
                    }}
                  >
                    {PROJECT_CATEGORIES.map(item => (
                      <option key={item.id} value={item.id}>
                        {p("categories." + item.id)}
                      </option>
                    ))}
                  </select>
                )}
                {field(
                  t("fields.subcategory"),
                  <select
                    aria-label={t("fields.subcategory")}
                    className={selectClass}
                    value={subcategory}
                    onChange={event => {
                      setSubcategory(event.target.value);
                      if (event.target.value === "agri-wall") setFree(true);
                    }}
                  >
                    {children.map(item => (
                      <option key={item} value={item}>
                        {p("children." + item)}
                      </option>
                    ))}
                  </select>
                )}
                <div className="md:col-span-2">
                  {field(
                    t("fields.summary"),
                    <Textarea
                      name="summary"
                      required
                      minLength={10}
                      maxLength={300}
                      value={summary}
                      onChange={event => setSummary(event.target.value)}
                      placeholder="一句话说清用户能拿到什么成果（建议 35 字以内，直接展示在卡片上）"
                    />
                  )}
                </div>

                {/* 封面配置区：URL + 上传 + 6款高清预设快选 */}
                <div className="md:col-span-2 space-y-3 rounded-xl border bg-muted/15 p-3.5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {field(
                      t("fields.coverUrl"),
                      <Input type="url" name="coverUrl" maxLength={1000} value={coverUrl} onChange={event => setCoverUrl(event.target.value)} placeholder="https://" />
                    )}
                    {field(
                      tp("uploadCover"),
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={event => {
                          void uploadCover(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />,
                      tp("coverHint")
                    )}
                  </div>
                  {uploading && (
                    <p role="status" className="text-xs text-muted-foreground">
                      {tp("uploading")}
                    </p>
                  )}
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">🎨 或点击直接选用官方高清 16:9 封面：</p>
                    <div className="flex flex-wrap gap-1.5">
                      {COVER_PRESETS.map(preset => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => setCoverUrl(preset.url)}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                            coverUrl === preset.url ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 02: 跳转链接与精简文案 (Jump Links & Copy) */}
            <section className="ans-detail-block">
              {section("02", tp("projectTitle"), "填写在线体验地址或 GitHub 仓库（决定卡片点击后的跳转方式），并列出 3 条核心交付物")}
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                {field(
                  tp("usageUrl"),
                  <Input
                    type="url"
                    name="usageUrl"
                    maxLength={1000}
                    value={usageUrl}
                    onChange={e => setUsageUrl(e.target.value)}
                    placeholder="https://你的在线可玩Demo地址"
                  />,
                  "优先作为「🔗 在线体验 ↗」主跳转按钮"
                )}
                {field(
                  tp("githubUrl"),
                  <Input
                    type="url"
                    name="githubUrl"
                    maxLength={1000}
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                  />,
                  tp("githubHint")
                )}
                {field(
                  t("fields.previewUrl"),
                  <Input
                    type="url"
                    name="previewUrl"
                    maxLength={1000}
                    value={previewUrl}
                    onChange={e => setPreviewUrl(e.target.value)}
                    placeholder="https://演示视频或预览页地址（选填）"
                  />
                )}
                {field(
                  t("fields.sourceUrl"),
                  <Input
                    type="url"
                    name="sourceUrl"
                    maxLength={1000}
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    placeholder="https://原项目或文档地址（选填）"
                  />
                )}
                <div className="md:col-span-2">
                  {field(
                    t("fields.deliverables"),
                    <Textarea
                      name="deliverables"
                      required
                      className="min-h-24"
                      value={deliverables}
                      onChange={event => setDeliverables(event.target.value)}
                      placeholder={t("deliverablesHint")}
                    />
                  )}
                </div>
                <div className="md:col-span-2">
                  {field(
                    t("fields.description"),
                    <Textarea
                      name="description"
                      required
                      minLength={20}
                      maxLength={20000}
                      className="min-h-32"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="简述：1) 解决什么问题 2) 核心功能 3) 怎么运行体验"
                    />
                  )}
                </div>
                <div className="md:col-span-2">
                  {field(
                    t("fields.licenseTerms"),
                    <Textarea
                      name="licenseTerms"
                      required
                      minLength={10}
                      maxLength={3000}
                      value={licenseTerms}
                      onChange={e => setLicenseTerms(e.target.value)}
                      placeholder="例：MIT 开源许可，允许个人与参赛团队自由使用。"
                    />
                  )}
                </div>
              </div>
            </section>

            {/* 03: 跳转/收费模式选择 (Free Share vs Points Tiers) */}
            <section className="ans-detail-block">
              {section("03", isAgri ? aw("freeDisplayTitle") : tp("pricingTitle"), isAgri ? aw("freeDisplayBody") : tp("pricingBody"))}
              {data?.execution && (
                <p className="mb-4 text-sm font-medium text-primary">
                  {w("runnable")} · {w("computeOnRun")}
                </p>
              )}
              {!data?.execution && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition hover:border-primary/40">
                  <input
                    type="checkbox"
                    checked={free}
                    disabled={Boolean(data?.execution) || isAgri}
                    onChange={event => setFree(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <span>
                    <strong>{p("realProject.freeShare")}（点击直接跳转在线体验 / GitHub）</strong>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{tp("freeHint")}</span>
                  </span>
                </label>
              )}
              {!free && (
                <div className="mt-5 space-y-5">
                  <div className="grid min-w-0 gap-4 md:grid-cols-2">
                    {field(
                      t("fields.fulfillment"),
                      <select className={selectClass} name="fulfillment" defaultValue={data?.fulfillment ?? "service"}>
                        <option value="service">{t("service")}</option>
                        <option value="resource">{t("resource")}</option>
                      </select>
                    )}
                    {field(t("fields.deliveryDays"), <Input type="number" name="deliveryDays" required min={1} max={90} defaultValue={data?.deliveryDays ?? 3} />)}
                    {field(t("fields.revisionLimit"), <Input type="number" name="revisionLimit" required min={0} max={20} defaultValue={data?.revisionLimit ?? 1} />)}
                  </div>
                  {tiers.map((tier, index) => (
                    <div key={tier.id} className="min-w-0 space-y-4 rounded-xl border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">{tp("tierNumber", { number: index + 1 })}</h3>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={tiers.length === 1}
                          onClick={() => setTiers(current => current.filter(item => item.id !== tier.id))}
                          aria-label={tp("removeTier", { number: index + 1 })}
                        >
                          <Trash2 aria-hidden="true" />
                          {tp("remove")}
                        </Button>
                      </div>
                      <div className="grid min-w-0 gap-4 md:grid-cols-2">
                        {field(
                          tp("tierTitle"),
                          <Input value={tier.title} required maxLength={80} onChange={event => updateTier(tier.id, { title: event.target.value })} />
                        )}
                        {field(
                          tp("tierPrice"),
                          <Input
                            name={index === 0 ? "price" : undefined}
                            inputMode="decimal"
                            value={tier.price}
                            required
                            pattern="(0|[1-9][0-9]{0,6})([.][0-9]{1,2})?"
                            onChange={event => updateTier(tier.id, { price: event.target.value })}
                          />
                        )}
                        <div className="md:col-span-2">
                          {field(
                            tp("tierDescription"),
                            <Textarea value={tier.description} required maxLength={1000} onChange={event => updateTier(tier.id, { description: event.target.value })} />
                          )}
                        </div>
                        <div className="md:col-span-2">
                          {field(
                            tp("tierDeliverables"),
                            <Textarea value={tier.deliverables} required onChange={event => updateTier(tier.id, { deliverables: event.target.value })} />,
                            t("deliverablesHint")
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={tiers.length >= 6}
                    onClick={() => setTiers(current => [...current, { id: crypto.randomUUID(), title: "", description: "", price: "", deliverables }])}
                  >
                    <Plus aria-hidden="true" />
                    {tp("addTier")}
                  </Button>
                  <p className="text-xs leading-6 text-muted-foreground">{tp("tierHint")}</p>
                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" name="computeIncluded" defaultChecked={data?.computeIncluded} className="h-4 w-4 accent-primary" />
                    {t("fields.computeIncluded")}
                  </label>
                </div>
              )}
            </section>

            <section className="ans-detail-block space-y-3">
              {!isAgri && (
                <div className="flex items-start gap-3">
                  <Github aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="text-xs leading-5 text-muted-foreground">
                    <strong className="text-foreground">{tp("integrationTitle")}：</strong>
                    {tp("integrationBody")}{" "}
                    <Link href="/docs/points-integration" className="font-medium text-primary underline underline-offset-4">
                      {tp("integrationGuide")}
                    </Link>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-muted-foreground">{free ? p("realProject.submitNote") : t("editorNote")}</p>
                <Button type="submit" disabled={busy || uploading}>
                  {t(busy ? "saving" : "save")}
                </Button>
              </div>
            </section>
          </fieldset>
        </form>

        {/* 右侧：实时卡片预览（封面 + 文案 + 跳转按钮） */}
        <aside className="min-w-0 space-y-3 xl:sticky xl:top-24">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tp("livePreview")}</p>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              {jumpLabel}
            </span>
          </div>
          <div className="ans-project-card overflow-hidden">
            <div className="relative aspect-video bg-muted/40">
              {safeCover ? (
                <Image unoptimized src={coverUrl} width={640} height={360} alt={tp("coverPreview")} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ImagePlus aria-hidden="true" className="h-8 w-8 text-muted-foreground/50" />
                  <span>点击左侧「生成 16:9 封面」或选预设</span>
                </div>
              )}
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-primary">
                  {p("categories." + category)} · {p("children." + subcategory)}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {free ? "开源 / 直达" : "积分商品"}
                </span>
              </div>
              <h2 className="line-clamp-1 break-words text-lg font-semibold">{title || tp("previewTitle")}</h2>
              <p className="line-clamp-2 break-words text-xs leading-5 text-muted-foreground">{summary || tp("previewSummary")}</p>
              <ul className="space-y-1.5 text-xs">
                {lines(deliverables)
                  .slice(0, 3)
                  .map((item, index) => (
                    <li key={index} className="flex items-start gap-1.5">
                      <PackageCheck aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="line-clamp-1 break-words">{item}</span>
                    </li>
                  ))}
              </ul>
              <div className="flex items-center justify-between border-t pt-3">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {data?.execution
                    ? w("computeOnRun")
                    : free
                      ? p("realProject.freeShare")
                      : Number.isFinite(previewPrice)
                        ? tp("fromPoints", { amount: previewPrice / 100 })
                        : tp("pricePending")}
                </p>
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {jumpLabel}
                </span>
              </div>
              {jumpTargetUrl && (
                <p className="truncate font-mono text-[11px] text-muted-foreground" title={jumpTargetUrl}>
                  <ExternalLink className="mr-1 inline h-3 w-3" />
                  跳转目标：{jumpTargetUrl}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{tp("previewNote")}</p>
        </aside>
      </div>
    </div>
  );
}
