"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
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
    tag: "按量实算",
    title: "按真实 Token 结算，保留 1 位小数",
    subtitle: "告别按次硬扣 · 站内与外部共用积分池",
    accent: "#10B981",
    stillImg: "/videos/stills/t01.50.png",
    seekSeconds: 0.14,
    bullets: [
      "短对话按实际 Token 计费，账本清爽显示至 0.1 积分",
      "站内演练场与外部客户端共用同一算力池",
    ],
    ctaLabel: "查看账单 →",
    ctaHref: "/workspace/credits",
  },
  {
    num: "02",
    tag: "免费积分",
    title: "免费领 150 积分，站内免配即跑",
    subtitle: "问卷立领 50 积分 + 福利街机日常",
    accent: "#D97757",
    stillImg: "/videos/stills/t04.50.png",
    seekSeconds: 13.34,
    bullets: [
      "30 秒问卷领 50 积分，街机互动累计 100~150 积分",
      "模型演练场与 3D 兔兔龙免配 Key 直接在线试玩",
    ],
    ctaLabel: "免费领积分 →",
    ctaHref: "/workspace/benefits",
  },
  {
    num: "03",
    tag: "外部接入",
    title: "URL + pchat_ 密钥直连外部 Agent",
    subtitle: "兼容 OpenAI / Codex / Responses 协议",
    accent: "#10B981",
    stillImg: "/videos/stills/t07.50.png",
    seekSeconds: 26.65,
    bullets: [
      "通用地址：https://ans.cauai.fun/api/v1",
      "在 /settings 创建 pchat_ 个人密钥填入客户端即可",
    ],
    ctaLabel: "创建 API Key →",
    ctaHref: "/settings",
  },
  {
    num: "04",
    tag: "计价倍率",
    title: "官方 Token 单价 × 消耗倍率",
    subtitle: "¥1 = 10 积分 · 预占防超支",
    accent: "#D97757",
    stillImg: "/videos/stills/t10.50.png",
    seekSeconds: 43.41,
    bullets: [
      "DeepSeek V4.1 Flash：1.5x（双活渠道池）",
      "GPT-6.1 Sol / GPT-6 Astra：0.16x 补贴价",
    ],
    ctaLabel: "去演练场实测 →",
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
    <div className="rounded-xl border border-[#E5E0D5] bg-[#FAF9F5] p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-[#4A4843]">{label}</span>
        {badge ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-900">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-[#E5E0D5] bg-white px-2.5 py-1.5">
        <code className="select-all truncate font-mono text-xs font-bold text-[#141413]">
          {value}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#141413] px-2.5 py-1 text-[11px] font-bold text-[#FAF9F5] transition hover:bg-emerald-700"
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
 * 极简瑞士风 URL + Key 接入外部 Agent 专卡
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
    cursor: `OPENAI_API_BASE="${baseUrl}"
OPENAI_API_KEY="pchat_你的个人密钥"
MODEL="gpt-6.1-sol" # 或 deepseek-v4.1-flash / gpt-6-astra`,
    codex: `export OPENAI_BASE_URL="${codexUrl}"
export OPENAI_API_KEY="pchat_你的个人密钥"`,
    curl: `curl ${baseUrl}/chat/completions -H "Authorization: Bearer pchat_密钥" \\
  -H "Content-Type: application/json" -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"Hi"}]}'`,
  };

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#E5E0D5] pt-4 lg:grid-cols-12">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:col-span-6">
        <SwissCopyField
          label="OpenAI 通用 Base URL"
          value={baseUrl}
          badge="推荐"
        />
        <SwissCopyField
          label="Codex / Responses 网关"
          value={codexUrl}
          badge="双协议"
        />
      </div>

      <div className="rounded-xl border border-[#E5E0D5] bg-white p-3 lg:col-span-6">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#141413]">
            <Terminal className="h-3.5 w-3.5 text-emerald-700" />
            外部 Agent 配置示例
          </span>
          <div className="flex items-center gap-1">
            {(
              [
                ["cursor", "Cursor / OpenClaw"],
                ["codex", "Codex"],
                ["curl", "cURL"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setActiveTab(k)}
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold transition ${
                  activeTab === k
                    ? "bg-[#141413] text-[#FAF9F5]"
                    : "bg-[#FAF9F5] text-[#4A4843] hover:text-[#141413]"
                }`}
              >
                {label}
              </button>
            ))}
            {onOpenGuide ? (
              <Link
                href="/settings"
                className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2.5 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-800"
              >
                <KeyRound className="h-2.5 w-2.5" />
                获取 Key
              </Link>
            ) : null}
          </div>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-[#FAF9F5] px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-[#141413]">
          {snippets[activeTab]}
        </pre>
      </div>
    </div>
  );
}

/**
 * 极简瑞士暖白风算力系统新手引导弹窗（59.1s 视频 + 4 节精简要点）
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
      <div className="relative flex max-h-[92vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-[26px] border border-[#E5E0D5] bg-[#FAF9F5] text-[#141413] shadow-2xl">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E0D5] bg-white px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-900">
              <Volume2 className="h-3.5 w-3.5" />
              算力指南 (59s)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {SWISS_COMPUTE_STEPS.map((st, idx) => (
              <button
                key={st.num}
                type="button"
                onClick={() => jumpToStep(idx)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  activeStep === idx
                    ? "bg-[#141413] text-[#FAF9F5]"
                    : "bg-[#F2EFE9] text-[#4A4843] hover:text-[#141413]"
                }`}
              >
                {st.num} {st.tag}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-full border border-[#E5E0D5] bg-[#FAF9F5] px-3 py-1 text-xs font-bold text-[#141413] hover:bg-[#E5E0D5]/50"
          >
            <X className="h-3.5 w-3.5" />
            关闭引导
          </button>
        </div>

        {/* Modal Body: Left Video (8 cols) + Right Concise Card (4 cols) */}
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#E5E0D5] bg-ink shadow-sm">
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

          <div className="flex flex-col justify-between rounded-2xl border border-[#E5E0D5] bg-white p-4 lg:col-span-4">
            <div>
              <span className="inline-block rounded-full bg-[#D97757]/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#9A3B1E]">
                STEP {current.num} · {current.tag}
              </span>
              <h3 className="mt-2 text-base font-black leading-snug text-[#141413]">
                {current.title}
              </h3>
              <p className="mt-1 text-xs text-[#4A4843]">{current.subtitle}</p>

              <ul className="mt-3 space-y-2 border-t border-[#E5E0D5] pt-3">
                {current.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs leading-relaxed text-[#141413]"
                  >
                    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-[10px] font-bold text-emerald-900">
                      ✓
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#E5E0D5] pt-3">
              <Link
                href={current.ctaHref}
                onClick={onClose}
                className="inline-flex items-center rounded-full bg-[#141413] px-3.5 py-1.5 text-xs font-bold text-[#FAF9F5] hover:bg-emerald-700"
              >
                {current.ctaLabel}
              </Link>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    jumpToStep(
                      (activeStep - 1 + SWISS_COMPUTE_STEPS.length) %
                        SWISS_COMPUTE_STEPS.length
                    )
                  }
                  className="rounded-full border border-[#E5E0D5] px-2.5 py-1 text-xs font-bold text-[#4A4843] hover:text-[#141413]"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() =>
                    jumpToStep((activeStep + 1) % SWISS_COMPUTE_STEPS.length)
                  }
                  className="rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 算力中心顶部紧凑横幅（合一展示 MG 视频入口 + 外部 Agent URL/Key）
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
    <div data-onboarding-page={pageKey}>
      <div className="rounded-2xl border border-[#E5E0D5] bg-[#FAF9F5] p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 font-mono text-xs font-bold text-emerald-900">
              <Zap className="h-3.5 w-3.5" />
              算力与外部网关
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {SWISS_COMPUTE_STEPS.map((st, idx) => (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => openAtStep(idx)}
                  className="rounded-full border border-[#E5E0D5] bg-white px-2.5 py-1 text-xs font-semibold text-[#141413] transition hover:border-emerald-500/50"
                >
                  <span className="mr-1 font-mono text-[10px] text-emerald-700">
                    {st.num}
                  </span>
                  {st.tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openAtStep(0)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#141413] px-3.5 py-1.5 text-xs font-bold text-[#FAF9F5] transition hover:bg-emerald-700"
            >
              <Play className="h-3 w-3 fill-current text-emerald-400" />
              打开 MG 动画新手引导 (59s)
            </button>
            <Link
              href="/workspace/benefits"
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-500/25"
            >
              <Gift className="h-3.5 w-3.5" />
              领免费积分
            </Link>
          </div>
        </div>

        {showGatewayCard && (
          <SwissUrlKeyGatewayCard onOpenGuide={() => openAtStep(2)} />
        )}
      </div>

      <SwissOnboardingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultStep={defaultStep}
      />
    </div>
  );
}
