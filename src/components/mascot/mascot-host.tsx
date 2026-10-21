"use client";

/**
 * 吉祥物宿主：**双形态**的统一挂载点。
 *
 * - 2D 像素形态：<PixelDinoAgent />（精灵图集桌宠 / Agent）
 * - 3D 立体形态：占位实现（真实的 3D 渲染器可通过 ans:mascot-form 契约接入，见
 *   docs/bilibili-ans-launch/mascot-dual-form.md）
 *
 * 形态存于 localStorage["ans.mascot.form"]，两态互斥、切换即时生效。
 * 文案全部取自 next-intl 的 mascot 命名空间（17 个语言已补齐），组件内不硬编码字符串。
 */

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { getFormSnapshot, subscribeMascotStore, writeForm } from "@/lib/mascot/client-store";
import { PixelDinoAgent } from "@/components/mascot/pixel-dino-agent";

/** 3D 形态占位：无依赖的线框立方体 + 明确的「接入中」标识，避免切换后空白 */
function Form3dPlaceholder({ label, backLabel }: { label: string; backLabel: string }) {
  const cubeCss =
    ".ans-cube{width:96px;height:96px;position:relative;transform-style:preserve-3d;animation:ans-cube-spin 6s linear infinite}" +
    ".ans-cube>span{position:absolute;inset:0;border:2px solid rgb(150 200 255 / 0.9);background:rgb(150 200 255 / 0.06)}" +
    ".ans-cube>span:nth-child(1){transform:translateZ(48px)}" +
    ".ans-cube>span:nth-child(2){transform:rotateY(180deg) translateZ(48px)}" +
    ".ans-cube>span:nth-child(3){transform:rotateY(90deg) translateZ(48px)}" +
    ".ans-cube>span:nth-child(4){transform:rotateY(-90deg) translateZ(48px)}" +
    ".ans-cube>span:nth-child(5){transform:rotateX(90deg) translateZ(48px)}" +
    ".ans-cube>span:nth-child(6){transform:rotateX(-90deg) translateZ(48px)}" +
    "@keyframes ans-cube-spin{from{transform:rotateX(-18deg) rotateY(0)}to{transform:rotateX(-18deg) rotateY(360deg)}}" +
    "@media (prefers-reduced-motion: reduce){.ans-cube{animation:none}}";

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 max-sm:hidden">
      <style>{cubeCss}</style>
      <div className="flex items-center gap-3 rounded-[var(--radius)] border bg-background/85 px-4 py-3 shadow-sm">
        <div className="ans-cube" data-testid="mascot-cube" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <button
            type="button"
            data-testid="mascot-form-back"
            onClick={() => writeForm("2d")}
            className="rounded-[var(--radius)] border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MascotHost() {
  const t = useTranslations("mascot");
  const form = useSyncExternalStore(subscribeMascotStore, getFormSnapshot, () => "2d");

  if (form === "3d") {
    return <Form3dPlaceholder label={t("placeholder3d")} backLabel={t("to2d")} />;
  }

  return (
    <PixelDinoAgent
      labels={{
        aria: t("aria"),
        to3d: t("to3d"),
        to2d: t("to2d"),
        dismiss: t("dismiss"),
      }}
    />
  );
}
