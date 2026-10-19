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

const PLAYGROUND_PRESETS = [
  {
    id: "weekly",
    labelZh: "📊 课题组周报与 Git 汇总",
    labelEn: "📊 Lab Weekly & Git Report",
    prompt: "请帮我把以下本周实验与代码进展整理成一份结构化的《中国农大课题组周报》（含：1. 本周核心突破；2. 关键实验指标对比表；3. 下周计划与导师需协调事项）：\n- 完成了温室番茄病虫害 YOLOv11-Agri 数据集清洗（共 4,200 张标注样本）；\n- 完成了 DeepSeek-V4.1-Flash 农学知识库 RAG 检索链路联调，Top-3 召回率提升至 91.4%；\n- 修复了边缘端树莓派传感器 MQTT 断连重传 Bug。",
  },
  {
    id: "sci",
    labelZh: "📄 农大 SCI 论文摘要精修",
    labelEn: "📄 Q1 SCI Abstract Polish",
    prompt: "请按 Nature Food / Computers and Electronics in Agriculture (Q1) 学术规范，将以下中文研究概述改写并润色为一段 200 词左右的英文 Abstract（包含 Background, Methods, Results, Conclusion 四个逻辑层次，并附上 5 个高频 Keywords 与 3 条 Highlights）：\n本研究针对日光温室黄瓜霜霉病早期识别困难的问题，提出了一种融合多光谱冠层图像与微气候时序数据的轻量级多模态预警模型，在农大涿州实验站实测准确率达到 94.8%，比单模态基线提升 7.2%。",
  },
  {
    id: "agri",
    labelZh: "🌱 智慧温室病虫害诊断处方",
    labelEn: "🌱 Smart Greenhouse Rx",
    prompt: "作为中国农大植保与智慧农业专家 Agent，请针对以下日光温室实测环境与叶片表征出具一份《病虫害分级诊断与绿色防控处方单》（含疑似病原、环境诱因分析、生物/物理优先防治方案及未来 48 小时温湿度调控目标）：\n- 作物：设施草莓（花果期）\n- 温湿度：夜间相对湿度连续 3 天 > 88%，日间温度 22°C\n- 表征：下部老叶边缘出现 V 字形褐斑，部分幼果表面可见浅灰色霉层。",
  },
  {
    id: "video",
    labelZh: "🎬 农业微短剧 Seedance 分镜",
    labelEn: "🎬 Agri-Sci Storyboard",
    prompt: "请为农客松参赛科普微短剧《一粒玉米的 AI 奇幻漂流》设计 4 个连续的 AIGC 视频生成分镜脚本（每个镜头包含：画面景别、中文剧情旁白、可直接粘贴进 Seedance / Kling 的英文 Visual Prompt 与运镜指令）。",
  },
] as const;

export function ModelPlaza({ catalog }: { catalog: ModelPlazaCatalog }) {
  const t = useTranslations("product.modelPlaza"), locale = useLocale();
  const isZh = locale.startsWith("zh");
  const [query, setQuery] = useState(""), [vendor, setVendor] = useState("all"), [endpoint, setEndpoint] = useState("all"), [status, setStatus] = useState("all");
  const [currency, setCurrency] = useState<"usd" | "points">("usd"), [unit, setUnit] = useState<"million" | "thousand">("million");
  const [sort, setSort] = useState("name"), [view, setView] = useState<"cards" | "table">("cards");
  const detailOpener = useRef<HTMLButtonElement | null>(null);
  const [detail, setDetail] = useState<ModelPlazaModel | null>(null), [copied, setCopied] = useState<string | null>(null), [copyFailed, setCopyFailed] = useState(false);

  const [pgModel, setPgModel] = useState<"deepseek-v4.1-flash" | "gpt-6.1-sol" | "gpt-6-astra">("deepseek-v4.1-flash");
  const [pgPrompt, setPgPrompt] = useState<string>(PLAYGROUND_PRESETS[0].prompt);
  const [pgRunning, setPgRunning] = useState(false);
  const [pgOutput, setPgOutput] = useState<string>("");
  const [pgMeta, setPgMeta] = useState<{ model?: string; costPoints?: number; balancePoints?: number | null } | null>(null);
  const [pgCopied, setPgCopied] = useState(false);
  const [pgSaving, setPgSaving] = useState(false);
  const [pgSavedProject, setPgSavedProject] = useState<{ href: string; title: string } | null>(null);

  async function runPlayground() {
    if (pgRunning || !pgPrompt.trim()) return;
    setPgRunning(true);
    setPgSavedProject(null);
    try {
      const res = await fetch("/api/mascot/agent", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pi_action",
          intent: "playground",
          model: pgModel,
          prompt: pgPrompt.trim().slice(0, 4000),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.replyZh) {
        setPgOutput(isZh ? data.replyZh : data.replyEn || data.replyZh);
        setPgMeta({
          model: data.data?.model || pgModel,
          costPoints: data.data?.costPoints ?? 0.5,
          balancePoints: data.balancePoints ?? null,
        });
      } else {
        setPgOutput(isZh ? "⚠️ 模型调用暂不可用，请确认已登录账号后重试。" : "⚠️ Model invocation unavailable. Please sign in and retry.");
      }
    } catch {
      setPgOutput(isZh ? "⚠️ 网络请求异常，请稍后重试。" : "⚠️ Network error, please try again.");
    } finally {
      setPgRunning(false);
    }
  }

  async function savePlaygroundAsProject() {
    if (pgSaving || !pgOutput) return;
    setPgSaving(true);
    try {
      const firstLine = pgPrompt.trim().split("\n")[0]?.slice(0, 42) || "ANS 算力演练场实测项目";
      const res = await fetch("/api/mascot/agent", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pi_action",
          intent: "scaffold",
          prompt: firstLine,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data?.href) {
        setPgSavedProject({ href: data.data.href, title: data.data.title || firstLine });
      }
    } finally {
      setPgSaving(false);
    }
  }

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

    <section data-testid="model-playground-card" className="rounded-3xl border border-emerald-500/35 bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/5 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
            <span>⚡ ANS 算力模型实机演练场 · Live Prompt Playground</span>
          </div>
          <h2 className="mt-2 text-lg font-bold tracking-tight sm:text-xl">
            {isZh ? "一键粘贴市场 Prompt 工具包，在线直接调用算力模型出结果" : "Paste Market Prompt Toolkits & Run Live on ANS Compute Models"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {isZh
              ? "支持运行市场 Prompt 模板或预设样例（按实际 Token × 官方倍率实算扣费）。"
              : "Run marketplace prompt templates or presets (billed by actual tokens × official multiplier)."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/market" className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-background px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
            {isZh ? "🛒 去市场挑 Prompt 工具包 →" : "🛒 Browse Market Toolkits →"}
          </Link>
          <Link href="/workspace/benefits" className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
            {isZh ? "🎁 免费领 100~150 积分" : "🎁 Claim Free 100–150 Pts"}
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{isZh ? "官方工具包预设：" : "Toolkit Presets:"}</span>
        {PLAYGROUND_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            data-testid={`playground-preset-${preset.id}`}
            onClick={() => setPgPrompt(preset.prompt)}
            className="rounded-xl border border-emerald-500/25 bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10"
          >
            {isZh ? preset.labelZh : preset.labelEn}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        <textarea
          data-testid="playground-prompt-input"
          value={pgPrompt}
          onChange={(e) => setPgPrompt(e.target.value)}
          rows={4}
          placeholder={isZh ? "在此输入或粘贴从市场订单复制的完整 Prompt 模板…" : "Enter or paste your prompt template..."}
          className="w-full rounded-2xl border bg-background/95 p-3.5 text-xs leading-6 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500/40 sm:text-sm"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              {isZh ? "运行模型：" : "Model:"}
              <select
                data-testid="playground-model-select"
                value={pgModel}
                onChange={(e) => setPgModel(e.target.value as "deepseek-v4.1-flash" | "gpt-6.1-sol" | "gpt-6-astra")}
                className="ml-2 rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
              >
                <option value="deepseek-v4.1-flash">⚡ DeepSeek V4.1 Flash（按 Token 实算 · 官方倍率 1x）</option>
                <option value="gpt-6.1-sol">🧠 GPT-6.1 Sol（按 Token 实算 · 官方倍率 0.16x）</option>
                <option value="gpt-6-astra">🚀 GPT-6 Astra（按 Token 实算 · 官方倍率 0.16x）</option>
              </select>
            </label>
          </div>
          <Button
            type="button"
            data-testid="playground-run-btn"
            disabled={pgRunning || !pgPrompt.trim()}
            onClick={() => void runPlayground()}
            className="rounded-xl bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-500"
          >
            {pgRunning
              ? isZh ? "⏳ 正在调用算力网关推理中…" : "⏳ Running model..."
              : isZh ? "⚡ 立即运行" : "⚡ Run Prompt Now"}
          </Button>
        </div>
      </div>

      {pgOutput && (
        <div data-testid="playground-output" className="mt-4 rounded-2xl border border-emerald-500/30 bg-background/95 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {(pgMeta?.costPoints ?? 0) > 0 ? (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold text-emerald-800 dark:text-emerald-300">
                  ✅ {pgMeta?.model || pgModel} 实机返回
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-semibold text-amber-800 dark:text-amber-300">
                  ⚠️ {pgMeta?.model || pgModel} 未扣费提示
                </span>
              )}
              {pgMeta?.balancePoints !== null && pgMeta?.balancePoints !== undefined && (
                <span className="text-muted-foreground">
                  本次消耗 {pgMeta.costPoints ?? 0} 积分 · 剩余可用 <strong className="text-foreground">{pgMeta.balancePoints} 积分</strong>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="playground-copy-btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(pgOutput);
                    setPgCopied(true);
                    setTimeout(() => setPgCopied(false), 2000);
                  } catch {}
                }}
                className="rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
              >
                {pgCopied ? "✅ 已复制结果" : "📋 一键复制生成结果"}
              </button>
              <button
                type="button"
                data-testid="playground-save-project-btn"
                disabled={pgSaving}
                onClick={() => void savePlaygroundAsProject()}
                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {pgSaving ? "⏳ 正在写入项目库…" : "💾 存为我的参赛项目"}
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-6 text-foreground/95 sm:text-sm">
            {pgOutput}
          </div>
          {pgSavedProject && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
              <span className="font-medium text-emerald-950 dark:text-emerald-200">
                🎉 已成功在个人工作台创建项目《{pgSavedProject.title}》！
              </span>
              <Link href={pgSavedProject.href} className="font-semibold text-emerald-700 underline dark:text-emerald-300">
                立即打开项目编辑 →
              </Link>
            </div>
          )}
        </div>
      )}
    </section>

    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
      <span>💱 {t("exchange", { points: catalog.billing.pointsPerCny })} · {catalog.billing.usdCny === null ? t("fxMissing") : t("fxPresent", { rate: catalog.billing.usdCny })}</span>
      <span>⚡ 支持上方演练场直调与 API Key 客户端接入</span>
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
        {currency === "points" && catalog.billing.usdCny === null && <p className="text-sm text-muted-foreground">{t("pointsUnavailable")}</p>}
        {models.length === 0 ? <div className="rounded-2xl border border-dashed p-8"><p className="font-medium">{t("empty")}</p><Button variant="outline" className="mt-4" onClick={reset}>{t("reset")}</Button></div>
          : view === "cards" ? <div className="grid gap-4 xl:grid-cols-2">{models.map(model => <article key={model.id} className="min-w-0 rounded-2xl border bg-card p-5">{modelHeading(model)}<div className="mt-4 flex flex-wrap gap-2"><Badge variant="secondary">{model.vendor}</Badge><Badge variant="outline">{t(`states.${model.status}`)}</Badge></div><dl className="mt-5 grid grid-cols-2 gap-4">{(["input", "output"] as PriceKey[]).map(key => <div key={key}><dt className="text-xs text-muted-foreground">{t(key)}</dt><dd className="mt-1 break-words text-sm font-medium tabular-nums">{price(model, key)}</dd></div>)}</dl><p className="mt-4 text-xs text-muted-foreground">{t("perUnit", { unit: t(unit) })}</p><p className="mt-3 break-words text-xs leading-6 text-muted-foreground">{model.endpoints.join(" · ") || t("unknown")}</p><Button variant="outline" className="mt-5 w-full" onClick={event => { detailOpener.current = event.currentTarget; setDetail(model); }}>{t("details")}</Button></article>)}</div>
          : <div className="overflow-x-auto rounded-2xl border" tabIndex={0} role="region" aria-label={t("tableRegion")}><table className="w-full min-w-[700px] text-sm"><caption className="sr-only">{t("tableCaption", { unit: t(unit) })}</caption><thead><tr className="border-b bg-muted/40">{["model", "status", "input", "output", "cacheRead", "cacheWrite", "cacheWrite5m", "cacheWrite1h", "endpoint", "details"].map(key => <th key={key} scope="col" className="p-4 text-start font-medium">{t(key)}</th>)}</tr></thead><tbody>{models.map(model => <tr key={model.id} className="border-b last:border-0"><th scope="row" className="min-w-64 p-4 text-start">{modelHeading(model)}<p className="mt-2 text-xs font-normal text-muted-foreground">{model.vendor}</p></th><td className="p-4">{t(`states.${model.status}`)}</td>{priceKeys.map(key => <td key={key} className="whitespace-nowrap p-4 tabular-nums">{price(model, key)}</td>)}<td className="p-4 text-xs">{model.endpoints.join(" · ") || t("unknown")}</td><td className="p-4"><Button variant="outline" size="sm" onClick={event => { detailOpener.current = event.currentTarget; setDetail(model); }} aria-label={t("detailsFor", { model: model.name })}>{t("details")}</Button></td></tr>)}</tbody></table></div>}
      </section>
    </div>
    <footer className="space-y-2 border-t pt-5 text-xs leading-6 text-muted-foreground"><p>{t("sourceNote")} <a className="inline-flex items-center gap-1 underline underline-offset-4" href={catalog.sourceUrl} target="_blank" rel="noopener noreferrer">{t("source")}<ArrowUpRight className="size-3" aria-hidden="true" /></a></p>{catalog.referenceDate && <p>{t("referenceDate", { date: catalog.referenceDate })}</p>}{catalog.observedAt && <p>{t("observedAt", { date: dates.format(new Date(catalog.observedAt)) })}</p>}{catalog.pricingVersion && <p className="break-all">{t("version", { version: catalog.pricingVersion })}</p>}</footer>
    <Dialog open={detail !== null} onOpenChange={open => { if (!open) setDetail(null); }}><DialogContent showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); detailOpener.current?.focus(); }} className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">{detail && <><DialogHeader><DialogTitle className="break-words [overflow-wrap:anywhere]">{detail.name}</DialogTitle><DialogDescription className="break-all">{detail.id}</DialogDescription></DialogHeader><div className="space-y-5"><p className="text-sm">{t(`states.${detail.status}`)} · {detail.vendor}</p><p className="text-sm leading-6 text-muted-foreground">{t(`stateBodies.${detail.status}`)}</p><p className="text-xs leading-6 text-muted-foreground">{priceNote(detail)}</p><dl className="grid grid-cols-2 gap-4">{priceKeys.map(key => <div key={key}><dt className="text-xs text-muted-foreground">{t(key)}</dt><dd className="mt-1 text-sm tabular-nums">{price(detail, key)}</dd></div>)}</dl><p className="text-xs text-muted-foreground">{t("perUnit", { unit: t(unit) })}</p><p className="text-sm">{t("multiplier", { value: detail.consumptionMultiplier })}</p><p className="break-words text-xs">{t("endpoint")}: {detail.endpoints.join(" · ") || t("unknown")}</p>{detail.usdPerMillion && <a className="inline-flex items-center gap-1 text-sm underline underline-offset-4" href={detail.usdPerMillion.sourceUrl} target="_blank" rel="noopener noreferrer">{t(detail.usdPerMillion.source === "official" ? "officialSource" : "apicSource")}<ArrowUpRight className="size-3" aria-hidden="true" /></a>}<Button asChild className="w-full"><Link href="/settings">{t("connection")}</Link></Button><DialogClose asChild><Button variant="outline" className="w-full">{t("close")}</Button></DialogClose></div></>}</DialogContent></Dialog>
  </div></div>;
}
