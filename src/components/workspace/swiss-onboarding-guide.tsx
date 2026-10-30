"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Gift,
  KeyRound,
  Play,
  Terminal,
  Volume2,
  X,
  Zap,
} from "lucide-react";

export type OnboardingPageKey = "credits" | "models" | "settings" | "workspace";

export interface SwissStepItem {
  num: string;
  tag: string;
  title: string;
  subtitle: string;
  accent: string;
  stillImg: string;
  seekSeconds: number;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
}

export const SWISS_COMPUTE_STEPS: SwissStepItem[] = [
  {
    num: "01",
    tag: "告别按次硬扣 · 痛点对比",
    title: "告别一刀切按次扣费，站内与外部 Agent 全通",
    subtitle: "短对话按真实 Token 累计，账本显示清爽保留小数点后 1 位（0.1 积分），绝不锁死在网页端",
    accent: "#10B981",
    stillImg: "/videos/stills/t01.50.png",
    seekSeconds: 0.14,
    bullets: [
      "告别传统套壳站发一句“你好”也硬扣 1.0 积分的黑盒套路",
      "支持站内演练场直连 + URL/Key 外接 OpenClaw、Cursor、Claude Code",
      "共用同一算力积分池，底层按真实 Token 结算，账本显示保留小数点后 1 位",
    ],
    ctaLabel: "查看算力账单与网关 →",
    ctaHref: "/workspace/credits",
  },
  {
    num: "02",
    tag: "免费算力 · 站内即跑",
    title: "免费领 150+ 算力积分，站内演练场 0 配置爽玩",
    subtitle: "30 秒入门问卷立领 $5 (50 积分) + 福利街机日常与扭蛋累计拿满 100~150 积分",
    accent: "#D97757",
    stillImg: "/videos/stills/t04.50.png",
    seekSeconds: 13.34,
    bullets: [
      "新用户注册完成 30 秒问卷自动发放 $5 官方额度（折合 50 积分基准）",
      "打开 /models 实机演练场或右下角 3D 小恐龙伴侣，免配 Key 直接在线试跑",
      "项目详情页内嵌真实 Project Agent，一键运行生成可交付项目成果",
    ],
    ctaLabel: "去免费领 100~150 积分 →",
    ctaHref: "/workspace/benefits",
  },
  {
    num: "03",
    tag: "URL + Key · 外部 Agent 网关",
    title: "复制 URL + pchat_ 密钥，一键接入外部 Agent",
    subtitle: "通用 OpenAI / Codex 双协议网关：https://ans.cauai.fun/api/v1",
    accent: "#10B981",
    stillImg: "/videos/stills/t07.50.png",
    seekSeconds: 26.65,
    bullets: [
      "通用 Base URL：https://ans.cauai.fun/api/v1（兼容 Codex /api/codex/v1）",
      "前往 /settings 创建以 pchat_ 开头的个人 API Key，填入外部客户端即可",
      "同时支持 /v1/chat/completions、/v1/responses 与 /api/claude/v1/messages",
    ],
    ctaLabel: "去生成 / 复制 API Key →",
    ctaHref: "/settings",
  },
  {
    num: "04",
    tag: "官方 Token 单价 × 官方倍率",
    title: "严格按官方 Token 输入/输出/缓存计价 × 官方倍率实算",
    subtitle: "充值固定 ¥1 = 10 积分 · DeepSeek 官方费率 · GPT-6 0.16x 补贴骨折价",
    accent: "#D97757",
    stillImg: "/videos/stills/t10.50.png",
    seekSeconds: 43.41,
    bullets: [
      "deepseek-v4.1-flash：输入 $0.30/1M · 缓存 $0.006/1M · 输出 $1.20/1M",
      "gpt-6.1-sol (推理)：输入 $2.00/1M · 缓存 $0.10/1M · 输出 $10.00/1M · 倍率 0.16x",
      "gpt-6-astra (代码)：输入 $10.0/1M · 缓存 $1.00/1M · 输出 $50.00/1M · 倍率 0.16x",
    ],
    ctaLabel: "去模型演练场实测 →",
    ctaHref: "/models",
  },
];

export function SwissCopyField({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-2xl border border-[#E5E0D5] bg-[#FAF9F5] p-3.5 transition-all hover:border-emerald-500/50">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A4843]">
          {label}
        </span>
        {badge ? (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-emerald-900">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E5E0D5] bg-white px-3 py-2 shadow-sm">
        <code className="select-all truncate font-mono text-xs font-extrabold text-[#141413] sm:text-sm">
          {value}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#141413] px-3 py-1 text-[11px] font-extrabold text-[#FAF9F5] transition hover:bg-emerald-700"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-300" />
              已复制
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              复制
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * 瑞士暖白编辑风 URL + Key 接入外部 Agent 专卡
 */
export function SwissUrlKeyGatewayCard({
  baseUrl = "https://ans.cauai.fun/api/v1",
  codexUrl = "https://ans.cauai.fun/api/codex/v1",
  onOpenGuide,
}: {
  baseUrl?: string;
  codexUrl?: string;
  onOpenGuide?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"cursor" | "codex" | "curl">("cursor");

  const snippets = {
    cursor: `# OpenClaw / Cursor / Cline / Cherry Studio 配置
OPENAI_API_BASE="${baseUrl}"
OPENAI_API_KEY="pchat_你的个人密钥" # 在 /settings 创建
MODEL="gpt-6.1-sol" # 或 deepseek-v4.1-flash / gpt-6-astra`,
    codex: `# Codex CLI / Claude Code / Responses API 接入
export OPENAI_BASE_URL="${codexUrl}"
export OPENAI_API_KEY="pchat_你的个人密钥"
# 同时兼容 /v1/chat/completions 与 /v1/responses`,
    curl: `curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer pchat_你的个人密钥" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"你好"}]}'`,
  };

  return (
    <section
      aria-label="外部 Agent 网关接入配置"
      className="relative overflow-hidden rounded-[28px] border-2 border-emerald-500/45 bg-[#FAF9F5] p-6 shadow-[0_22px_52px_rgba(20,20,19,0.08)]"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(20,20,19,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,20,19,0.035) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    >
      {/* Top Editorial Chrome Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-full border border-[#E5E0D5] bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-3 py-1 font-mono text-xs font-extrabold text-emerald-900">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            STEP 03 · EXTERNAL AGENT GATEWAY
          </span>
          <span className="font-mono text-xs font-extrabold tracking-wider text-[#141413]">
            ANS · AI NEVER STOPS
          </span>
          <span className="rounded-full bg-[#F2EFE9] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#4A4843]">
            ans.cauai.fun/api/v1
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenGuide ? (
            <button
              type="button"
              onClick={onOpenGuide}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D97757]/40 bg-[#D97757]/12 px-3.5 py-1.5 text-xs font-extrabold text-[#9A3B1E] transition hover:bg-[#D97757]/20"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              播放 59s 算力引导视频
            </button>
          ) : null}
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-800"
          >
            <KeyRound className="h-3.5 w-3.5" />
            生成 / 复制个人 API Key (pchat_)
          </Link>
        </div>
      </div>

      {/* Headline with Warm Highlighter Sweep */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-[#141413] sm:text-2xl">
            把{" "}
            <span className="rounded-lg bg-[#9BE0C5]/60 px-2 py-0.5 text-[#065F46]">
              URL + 个人 Key
            </span>{" "}
            填入外部 Agent，直连三大主力模型
          </h2>
          <p className="mt-1.5 text-xs font-semibold text-[#4A4843] sm:text-sm">
            支持 OpenClaw、Cursor、Cline、Claude Code、Cherry Studio 与标准 OpenAI SDK，与站内共用同一算力账本，严格按官方 Token 单价 × 官方倍率实算。
          </p>
        </div>
      </div>

      {/* Main 2-Column Editorial Layout: Left Copyable URL/Key + Right Visual Card Showcase */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Column (7 cols): URL + Key Copy Fields + Light Editorial Config Box */}
        <div className="flex flex-col gap-3.5 rounded-[24px] border border-[#E5E0D5] bg-white p-5 shadow-sm lg:col-span-7">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SwissCopyField
              label="01 / 通用 OpenAI Base URL (推荐)"
              value={baseUrl}
              badge="OpenAI 兼容"
            />
            <SwissCopyField
              label="02 / Codex & Responses 网关别名"
              value={codexUrl}
              badge="Codex 兼容"
            />
          </div>

          <div className="rounded-2xl border border-[#E5E0D5] bg-[#FAF9F5] p-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-emerald-800" />
                <span className="text-xs font-extrabold text-[#141413]">
                  03 / 外部客户端一键接入配置示例
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    ["cursor", "OpenClaw / Cursor"],
                    ["codex", "Codex / Claude Code"],
                    ["curl", "cURL 实测"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActiveTab(k)}
                    className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-extrabold transition ${
                      activeTab === k
                        ? "bg-[#141413] text-[#FAF9F5]"
                        : "border border-[#E5E0D5] bg-white text-[#4A4843] hover:text-[#141413]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <pre className="overflow-x-auto rounded-xl border border-[#E5E0D5] bg-white p-3.5 font-mono text-[11px] font-bold leading-relaxed text-[#141413]">
              {snippets[activeTab]}
            </pre>
          </div>
        </div>

        {/* Right Column (5 cols): Official Token Multiplier Visual Cards */}
        <div className="flex flex-col justify-between gap-3 rounded-[24px] border-2 border-emerald-500/40 bg-gradient-to-br from-white to-[#F0FDF4] p-5 shadow-sm lg:col-span-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-mono text-[11px] font-extrabold text-emerald-900">
                ✓ 官方 Token 计价 × 官方倍率
              </span>
              <span className="font-mono text-[11px] font-extrabold text-[#4A4843]">
                ¥1 = 10 积分
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="rounded-2xl border border-emerald-500/30 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-[#141413]">
                    deepseek-v4.1-flash
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[11px] font-black text-emerald-900">
                    官方倍率 1.0x
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] font-bold text-[#4A4843]">
                  输入 $0.30/1M · 缓存 $0.006/1M · 输出 $1.20/1M · 🟢 McGrox + 火山双活池
                </p>
              </div>

              <div className="rounded-2xl border border-[#D97757]/35 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-[#141413]">
                    gpt-6.1-sol / gpt-6-astra
                  </span>
                  <span className="rounded-full bg-[#D97757]/15 px-2.5 py-0.5 font-mono text-[11px] font-black text-[#9A3B1E]">
                    官方倍率 0.16x
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] font-bold text-[#4A4843]">
                  Sol: $2/$10 · Astra: $10/$50 · 🟢 Cockpit McGrox 渠道已连通
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-500/20 pt-3">
            <span className="text-[11px] font-extrabold text-[#065F46]">
              ⚡ 预占防超支 · 账本显示保留 1 位小数 (0.1)
            </span>
            <Link
              href="/models"
              className="inline-flex items-center gap-1 font-mono text-xs font-black text-emerald-800 hover:underline"
            >
              在线试玩模型 <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * 瑞士暖白编辑风（HyperFrames Claude Editorial Swiss Grid）算力系统新手引导弹窗（含 59.1s 真人级口播 MG 动画视频 + 4 幕分镜跳转）
 */
export function SwissOnboardingModal({
  open,
  onClose,
  defaultStep = 0,
}: {
  open: boolean;
  onClose: () => void;
  defaultStep?: number;
}) {
  const [activeStep, setActiveStep] = useState(defaultStep);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setActiveStep(defaultStep);
  }, [defaultStep]);

  const jumpToStep = (idx: number) => {
    setActiveStep(idx);
    const target = SWISS_COMPUTE_STEPS[idx];
    const video = videoRef.current;
    if (video && target) {
      try {
        video.currentTime = target.seekSeconds;
        void video.play().catch(() => undefined);
      } catch {
        // ignore seek before metadata loaded
      }
    }
  };

  if (!open) return null;

  const current = SWISS_COMPUTE_STEPS[activeStep] || SWISS_COMPUTE_STEPS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ANS 算力积分系统新手引导"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/55 p-3 backdrop-blur-md sm:p-5"
    >
      <div
        className="relative flex max-h-[94vh] w-full max-w-[1140px] flex-col overflow-hidden rounded-[30px] border-2 border-[#E5E0D5] bg-[#FAF9F5] text-[#141413] shadow-[0_28px_72px_rgba(20,20,19,0.22)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(20,20,19,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,20,19,0.035) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      >
        {/* Top HyperFrames Editorial Glass Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E0D5] bg-white/95 px-6 py-3.5 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-3 py-1 font-mono text-xs font-extrabold text-emerald-900">
              🟢 ANS 算力系统 · 新手引导
            </span>
            <span className="font-mono text-xs font-black tracking-wider text-[#141413]">
              ANS · AI NEVER STOPS
            </span>
            <span className="hidden rounded-full bg-[#F2EFE9] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#4A4843] sm:inline-block">
              HYPERFRAMES SWISS EDITION · 59S VOICEOVER
            </span>
          </div>

          {/* 4 Chapter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {SWISS_COMPUTE_STEPS.map((st, idx) => (
              <button
                key={st.num}
                type="button"
                onClick={() => jumpToStep(idx)}
                className={`rounded-full px-3 py-1 text-xs font-extrabold transition ${
                  activeStep === idx
                    ? "bg-[#141413] text-[#FAF9F5] shadow-sm"
                    : "bg-[#F2EFE9] text-[#4A4843] hover:text-[#141413]"
                }`}
              >
                {st.num} {st.tag.split(" · ")[0]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-full border border-[#E5E0D5] bg-[#FAF9F5] px-3 py-1.5 text-xs font-extrabold text-[#141413] transition hover:border-[#D97757] hover:bg-[#D97757]/10"
          >
            <X className="h-3.5 w-3.5" />
            关闭引导
          </button>
        </div>

        {/* Modal Body: Left 7-Col 59.1s MG Video Player + Right 5-Col Step Cards */}
        <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-6 lg:grid-cols-12">
          {/* Left 7 Columns: 16:9 MG Video Player + Base URL Quick Copy */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            <div className="overflow-hidden rounded-[24px] border-2 border-emerald-500/45 bg-white p-3 shadow-[0_18px_46px_rgba(20,20,19,0.08)]">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-0.5 font-mono text-[11px] font-extrabold text-emerald-900">
                  <Volume2 className="h-3.5 w-3.5" />
                  59s 瑞士风 MG 动画 · 含真人级口播与 10 大技术动效
                </span>
                <span className="font-mono text-[11px] font-bold text-[#4A4843]">
                  {current.num} / 04 · {current.tag}
                </span>
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-[18px] border border-[#E5E0D5] bg-[#FAF9F5]">
                <video
                  ref={videoRef}
                  src="/videos/ans-compute-swiss-guide.mp4"
                  poster={current.stillImg}
                  controls
                  autoPlay
                  playsInline
                  onLoadedMetadata={() => {
                    if (videoRef.current && defaultStep > 0) {
                      videoRef.current.currentTime = current.seekSeconds;
                    }
                  }}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Bottom Quick Copy Bar for Base URL */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SwissCopyField
                label="通用 OpenAI Base URL (推荐)"
                value="https://ans.cauai.fun/api/v1"
                badge="一键复制"
              />
              <SwissCopyField
                label="Codex / Responses 兼容网关"
                value="https://ans.cauai.fun/api/codex/v1"
                badge="双协议"
              />
            </div>
          </div>

          {/* Right 5 Columns: Active Step Detail Card + 4-Step Selector */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-5">
            {/* Active Step Highlight Card */}
            <div className="rounded-[24px] border-2 border-emerald-500/45 bg-white p-5 shadow-[0_18px_46px_rgba(20,20,19,0.08)]">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-[#D97757]/15 px-3 py-1 font-mono text-xs font-black text-[#9A3B1E]">
                  STEP {current.num} · {current.tag}
                </span>
                <span className="font-mono text-xs font-extrabold text-emerald-800">
                  TOKEN 1:1 实算
                </span>
              </div>

              <h3 className="text-lg font-black leading-snug text-[#141413] sm:text-xl">
                <span className="rounded-md bg-[#FACC15]/65 px-1.5 py-0.5">
                  {current.title}
                </span>
              </h3>
              <p className="mt-1.5 text-xs font-bold text-[#4A4843]">
                {current.subtitle}
              </p>

              <ul className="mt-3.5 space-y-2 border-t border-[#E5E0D5] pt-3">
                {current.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs font-bold leading-relaxed text-[#141413]"
                  >
                    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-[10px] font-black text-emerald-900">
                      ✓
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-1">
                <Link
                  href={current.ctaHref}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#141413] px-4 py-2 text-xs font-extrabold text-[#FAF9F5] transition hover:bg-emerald-700"
                >
                  {current.ctaLabel}
                </Link>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      jumpToStep(
                        (activeStep - 1 + SWISS_COMPUTE_STEPS.length) %
                          SWISS_COMPUTE_STEPS.length
                      )
                    }
                    className="rounded-full border border-[#E5E0D5] bg-[#FAF9F5] px-3 py-1.5 text-xs font-extrabold text-[#4A4843] hover:text-[#141413]"
                  >
                    ← 上一步
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      jumpToStep((activeStep + 1) % SWISS_COMPUTE_STEPS.length)
                    }
                    className="rounded-full bg-emerald-700 px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-800"
                  >
                    下一步 →
                  </button>
                </div>
              </div>
            </div>

            {/* 4-Step Visual Thumbnail Strip */}
            <div className="grid grid-cols-2 gap-2.5">
              {SWISS_COMPUTE_STEPS.map((st, idx) => (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => jumpToStep(idx)}
                  className={`group flex flex-col overflow-hidden rounded-2xl border p-2.5 text-left transition ${
                    activeStep === idx
                      ? "border-2 border-emerald-600 bg-white shadow-md"
                      : "border-[#E5E0D5] bg-white/80 hover:bg-white"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="rounded-full bg-[#F2EFE9] px-2 py-0.5 font-mono text-[10px] font-black text-[#141413]">
                      {st.num}
                    </span>
                    <span className="truncate text-[11px] font-extrabold text-[#4A4843]">
                      {st.tag.split(" · ")[0]}
                    </span>
                  </div>
                  <div className="truncate text-xs font-black text-[#141413]">
                    {st.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 嵌入在 /workspace/credits 的瑞士暖白风新手引导横幅与外部 Agent 网关卡片组合
 */
export function SwissOnboardingBanner({
  pageKey = "credits",
  showGatewayCard = false,
}: {
  pageKey?: OnboardingPageKey;
  showGatewayCard?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultStep, setDefaultStep] = useState(0);

  const openAtStep = (idx: number) => {
    setDefaultStep(idx);
    setModalOpen(true);
  };

  return (
    <div data-onboarding-page={pageKey} className="space-y-6">
      <div
        className="rounded-[26px] border-2 border-[#E5E0D5] bg-[#FAF9F5] p-5 shadow-[0_18px_44px_rgba(20,20,19,0.06)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(20,20,19,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,20,19,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-3 py-1 font-mono text-xs font-extrabold text-emerald-900">
              <Zap className="h-3.5 w-3.5" />
              ANS 算力积分新手引导 · 瑞士 MG 动画 + 图文指南
            </span>
            <span className="text-sm font-black text-[#141413]">
              免费领{" "}
              <span className="rounded bg-[#FACC15]/70 px-1.5 py-0.5">
                150+ 积分
              </span>{" "}
              · 站内演练场直连 · 复制{" "}
              <span className="rounded bg-[#9BE0C5]/65 px-1.5 py-0.5 text-[#065F46]">
                URL + Key
              </span>{" "}
              接入外部 Agent · 官方 Token 费率 × 官方倍率实算
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openAtStep(0)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#141413] px-4 py-2 text-xs font-extrabold text-[#FAF9F5] shadow-sm transition hover:bg-emerald-700"
            >
              <Play className="h-3.5 w-3.5 fill-current text-emerald-400" />
              打开 MG 动画新手引导 (59s)
            </button>
            <Link
              href="/workspace/benefits"
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-extrabold text-emerald-900 transition hover:bg-emerald-500/25"
            >
              <Gift className="h-3.5 w-3.5" />
              免费领 150 积分
            </Link>
          </div>
        </div>

        {/* 4 Step Quick Pills */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {SWISS_COMPUTE_STEPS.map((st, idx) => (
            <button
              key={st.num}
              type="button"
              onClick={() => openAtStep(idx)}
              className="flex items-center justify-between gap-2 rounded-2xl border border-[#E5E0D5] bg-white px-3.5 py-2.5 text-left shadow-sm transition hover:border-emerald-500/50 hover:shadow"
            >
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-black text-emerald-800">
                  STEP {st.num} · {st.tag.split(" · ")[0]}
                </div>
                <div className="truncate text-xs font-black text-[#141413]">
                  {st.title}
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-[#FAF9F5] px-2 py-1 font-mono text-[10px] font-extrabold text-[#4A4843]">
                看动画 →
              </span>
            </button>
          ))}
        </div>
      </div>

      {showGatewayCard && (
        <SwissUrlKeyGatewayCard onOpenGuide={() => openAtStep(2)} />
      )}

      <SwissOnboardingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultStep={defaultStep}
      />
    </div>
  );
}
