"use client";

import { useState } from "react";
import Image from "next/image";

export function DualCoverPreview({
  innerCoverUrl,
  outerCoverUrl,
  alt,
  isEn = false,
}: {
  innerCoverUrl: string;
  outerCoverUrl: string;
  alt: string;
  isEn?: boolean;
}) {
  const [mode, setMode] = useState<"inner" | "outer">("inner");
  const activeSrc = mode === "inner" ? innerCoverUrl : outerCoverUrl;
  const hasDual = Boolean(innerCoverUrl && outerCoverUrl && innerCoverUrl !== outerCoverUrl);

  const selectMode = (next: "inner" | "outer", event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setMode(next);
  };

  return (
    <figure className="relative overflow-hidden rounded-3xl border bg-muted/20" data-testid="dual-cover-preview" data-cover-mode={mode}>
      <Image
        src={activeSrc}
        alt={alt}
        width={1280}
        height={800}
        unoptimized
        className="aspect-[8/5] max-h-[520px] h-auto w-full object-cover object-top transition-all duration-300"
      />
      {hasDual && (
        <div
          className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/80 p-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <span
            role="button"
            tabIndex={0}
            aria-pressed={mode === "inner"}
            onClick={(e) => selectMode("inner", e)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && selectMode("inner", e)}
            className={`cursor-pointer rounded-full px-2.5 py-1 transition ${
              mode === "inner"
                ? "bg-emerald-500 text-slate-950 font-bold shadow-xs"
                : "text-white/80 hover:text-white"
            }`}
          >
            {isEn ? "🌌 Inner · GitGlow 3D" : "🌌 内封 · GitGlow 3D 实景"}
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-pressed={mode === "outer"}
            onClick={(e) => selectMode("outer", e)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && selectMode("outer", e)}
            className={`cursor-pointer rounded-full px-2.5 py-1 transition ${
              mode === "outer"
                ? "bg-amber-400 text-slate-950 font-bold shadow-xs"
                : "text-white/80 hover:text-white"
            }`}
          >
            {isEn ? "🎨 Outer · oil Poster" : "🎨 外封 · oil 大字海报"}
          </span>
        </div>
      )}
    </figure>
  );
}
