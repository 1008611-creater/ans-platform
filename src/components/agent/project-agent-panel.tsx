"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type PanelState = "idle" | "quote" | "running" | "done";

const STATE_ORDER: PanelState[] = ["idle", "quote", "running", "done"];

/**
 * 嵌入式 Agent 面板（预览版）。
 *
 * 四态与线上 `use-companion-agent` 的阶段一一对应：待命 → 报价 → 执行 → 交付/失败。
 * 本组件只负责"长什么样"，真实报价与执行仍走 /api/mascot/agent；接入时把 STATE_ORDER
 * 换成 hook 的 phase 即可，视觉不动。
 */
export function ProjectAgentPanel({ projectLabel, points = 2.4, initialState = "idle" }: { projectLabel: string; points?: number; initialState?: PanelState }) {
  const t = useTranslations("preview");
  const [state, setState] = useState<PanelState>(initialState);
  const stateLabel: Record<PanelState, string> = {
    idle: t("stateIdle"), quote: t("stateQuote"), running: t("stateRunning"), done: t("stateDone"),
  };

  return (
    <aside className="flex flex-col gap-3 rounded-2xl border-2 border-[#9BE0C5] bg-[#F4FBF8] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#12211C]">
        <span className="size-2.5 rounded-full bg-[#5BC49A] shadow-[0_0_0_3px_rgba(91,196,154,0.18)]" />
        {t("agentName")}
        <span className="font-normal text-[#4A5C55]">· {t("agentReady")}</span>
      </div>

      <div className="rounded-lg border border-dashed border-[#CFE3D8] bg-white px-2.5 py-2 text-xs text-[#4A5C55]">
        {t("contextLabel")}：<span className="font-semibold text-[#12211C]">{projectLabel}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATE_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setState(key)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition ${state === key ? "border-[#5BC49A] bg-[#9BE0C5] font-semibold text-[#05231A]" : "border-[#CFE3D8] bg-white text-[#4A5C55] hover:border-[#5BC49A]"}`}
          >
            {stateLabel[key]}
          </button>
        ))}
      </div>

      {state === "idle" ? (
        <>
          <p className="text-[13px] leading-relaxed text-[#3C4A45]">{t("greeting")}</p>
          <div className="rounded-[10px] border border-[#CFE3D8] bg-white px-2.5 py-2 text-xs text-[#5B6B65]">{t("inputPlaceholder")}</div>
          <div className="flex flex-wrap gap-1.5">
            {[t("quick1"), t("quick2"), t("quick3")].map((label) => (
              <button key={label} type="button" className="rounded-full border border-[#CFE3D8] bg-white px-2.5 py-1 text-[11.5px] text-[#12211C] hover:border-[#5BC49A]">{label}</button>
            ))}
          </div>
          <div className="mt-1">
            <div className="mb-1.5 text-xs font-semibold text-[#12211C]">{t("askTitle")}</div>
            <ul className="flex flex-col gap-1.5">
              {[t("ask1"), t("ask2"), t("ask3")].map((question) => (
                <li key={question} className="flex items-center justify-between rounded-lg bg-[#F1F2F1] px-2.5 py-1.5 text-[11.5px] text-[#3C4A45]">
                  <span>{question}</span><span className="text-[#9AA6A0]">›</span>
                </li>
              ))}
            </ul>
          </div>
          <button type="button" onClick={() => setState("quote")} className="mt-1 rounded-[10px] bg-[#5BC49A] px-3 py-2.5 text-[13px] font-bold text-[#05231A] hover:bg-[#4FB78E]">
            {t("cta")}
          </button>
          <div className="flex items-center justify-between border-t border-dashed border-[#CFE3D8] pt-2 text-[11.5px] text-[#4A5C55]">
            <span>{t("price", { points })}</span><span>{t("settleNote")}</span>
          </div>
        </>
      ) : null}

      {state === "quote" ? (
        <>
          <p className="text-sm font-semibold text-[#12211C]">{t("quoteTitle", { points })}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#5BC49A] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#12211C]">{t("remember")}</span>
            <span className="rounded-full border border-[#CFE3D8] bg-white px-2.5 py-1 text-[11.5px] text-[#4A5C55]">{t("once")}</span>
          </div>
          <button type="button" onClick={() => setState("running")} className="rounded-[10px] bg-[#5BC49A] px-3 py-2.5 text-[13px] font-bold text-[#05231A] hover:bg-[#4FB78E]">{t("start")}</button>
        </>
      ) : null}

      {state === "running" ? (
        <>
          <ol className="flex flex-col gap-1.5 text-xs">
            {[
              { label: t("step1"), done: true },
              { label: t("step2"), done: true },
              { label: t("step3"), done: false, now: true },
              { label: t("step4"), done: false },
            ].map((step) => (
              <li key={step.label} className="flex items-start gap-2">
                <span className={`mt-0.5 grid size-3.5 flex-none place-items-center rounded-full border text-[9px] ${step.done ? "border-[#5BC49A] bg-[#5BC49A] text-white" : step.now ? "border-[#F0B429] text-[#F0B429]" : "border-[#5BC49A] text-[#5BC49A]"}`}>
                  {step.done ? "✓" : ""}
                </span>
                <span className={step.done ? "text-[#12211C]" : "text-[#4A5C55]"}>{step.label}</span>
              </li>
            ))}
          </ol>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#E7EFEA]">
            <span className="block h-full w-[62%] bg-gradient-to-r from-[#9BE0C5] to-[#5BC49A]" />
          </div>
        </>
      ) : null}

      {state === "done" ? (
        <>
          <p className="text-xs font-bold text-[#5BC49A]">✓ {t("doneTitle")}</p>
          <p className="text-[11.5px] text-[#4A5C55]">{t("doneItems")}</p>
          <p className="text-[11.5px] text-[#12211C]">{t("charged", { points: 0.62 })} · <span className="text-[#4A5C55]">{t("viewBill")}</span></p>
          <div className="border-t border-dashed border-[#CFE3D8] pt-2">
            <p className="text-[11.5px] text-[#12211C]"><span className="font-bold text-[#E05252]">✗ {t("failTitle")}</span></p>
            <p className="mt-1 text-[11.5px] text-[#4A5C55]">{t("failNote")}</p>
          </div>
        </>
      ) : null}
    </aside>
  );
}
