"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MINTY_CELLS, MintyEngine, type MintyCell } from "@/components/homepage/minty-engine";

/**
 * 首访引导里的 Minty 舞台：仓库权威像素图集 + 弹簧引擎。
 *
 * 图集原样使用（public/mascot/pixel/，8×8 格，每格 128px，@2x 为 256px），不重画、不改色。
 * 引擎只做两件事：整只精灵的位移 / 挤压 / 回弹 / 微倾，以及按姿势换图集里的格子（站立、眨眼、歪头、挥手……）。
 * 纯装饰：aria-hidden、不可聚焦——绝不能抢焦点把舞台滚出视口。
 */

export const MINTY_ATLAS = { x1: "/mascot/pixel/dino-atlas.png", x2: "/mascot/pixel/dino-atlas@2x.png", cols: 8, rows: 8 } as const;

/** 角色在格子里的脚底位置（像素实测：站立格脚底在 116/128）。挤压、歪头都绕脚底。 */
const FEET = 116 / 128;

function cellPosition(cell: MintyCell) {
  const [row, col] = MINTY_CELLS[cell];
  return `${(col / (MINTY_ATLAS.cols - 1)) * 100}% ${(row / (MINTY_ATLAS.rows - 1)) * 100}%`;
}

export function FirstVisitMascot({ className }: { className?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const sprite = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const engine = useRef<MintyEngine | null>(null);
  const [animated, setAnimated] = useState(false);
  // 图集到位才开演：否则慢网下弹簧先跑完，出场那一下只剩一片影子。
  const [atlas, setAtlas] = useState<string | null>(null);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const sync = () => setAnimated(!!window.matchMedia && !query?.matches);
    sync();
    query?.addEventListener("change", sync);
    return () => query?.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const src = window.devicePixelRatio > 1 ? MINTY_ATLAS.x2 : MINTY_ATLAS.x1;
    const img = new window.Image();
    let live = true;
    img.onload = () => { if (live) setAtlas(src); };
    img.src = src;
    return () => { live = false; img.onload = null; };
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!animated || !atlas || !el) return;
    const minty = new MintyEngine(performance.now());
    engine.current = minty;
    let width = el.clientWidth;
    let rect = el.getBoundingClientRect();
    let rectAt = 0;
    let shown: MintyCell | null = null;
    const resize = new ResizeObserver(() => { width = el.clientWidth; });
    resize.observe(el);

    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - rectAt > 250) { rect = el.getBoundingClientRect(); rectAt = now; }
      // 以舞台中心为原点，约 2.5 个舞台宽度外视线拉满。
      const reach = Math.max(rect.width * 2.5, 1);
      const dx = (e.clientX - (rect.left + rect.width / 2)) / reach;
      const dy = (e.clientY - (rect.top + rect.height * 0.45)) / reach;
      minty.setPointer([Math.max(-1, Math.min(1, dx)), Math.max(-1, Math.min(1, dy))]);
    };
    const onLeave = () => minty.setPointer(null);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    let raf = 0;
    const loop = (now: number) => {
      const f = minty.tick(now);
      const sx = 1 / Math.sqrt(f.squash);
      const node = sprite.current;
      if (node) {
        node.style.transform =
          `translate3d(${(f.x * width).toFixed(2)}px, ${(f.y * width).toFixed(2)}px, 0) rotate(${f.tilt.toFixed(2)}deg) scale(${sx.toFixed(4)}, ${f.squash.toFixed(4)})`;
        if (f.cell !== shown) {
          node.style.backgroundPosition = cellPosition(f.cell);
          node.dataset.cell = f.cell;
          shown = f.cell;
        }
      }
      if (shadow.current) {
        shadow.current.style.transform = `translateX(${(f.x * width).toFixed(2)}px) scale(${(f.shadow * sx).toFixed(3)}, ${f.shadow.toFixed(3)})`;
        shadow.current.style.opacity = String(Math.min(1, f.shadow));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      engine.current = null;
    };
  }, [animated, atlas]);

  return (
    <div
      ref={stage}
      aria-hidden="true"
      data-testid="first-visit-mascot"
      data-animated={animated ? "true" : "false"}
      onPointerDown={() => engine.current?.poke(performance.now())}
      className={cn("relative aspect-[5/6] select-none overflow-hidden [touch-action:manipulation]", className)}
    >
      <div
        ref={shadow}
        className="absolute bottom-[6%] left-[24%] h-[6%] w-[52%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(18,33,28,0.2),rgba(18,33,28,0))]"
        style={animated ? { opacity: 0 } : undefined}
      />
      {/* 格子比舞台宽：角色只占格子约 56% 宽，放大到舞台约七成宽；脚底落在舞台 92% 高处。 */}
      <div
        ref={sprite}
        data-testid="first-visit-mascot-sprite"
        data-cell="stand"
        className="pointer-events-none absolute bottom-[-2%] left-[-14%] aspect-square w-[128%] bg-no-repeat will-change-transform"
        style={{
          transformOrigin: `50% ${FEET * 100}%`,
          backgroundImage: atlas ? `url(${atlas})` : undefined,
          backgroundSize: `${MINTY_ATLAS.cols * 100}% ${MINTY_ATLAS.rows * 100}%`,
          backgroundPosition: cellPosition("stand"),
          // 与引擎初值 y = 0.55 个舞台宽对齐（格子宽是舞台的 1.28 倍）。
          transform: animated ? "translate3d(0, 43%, 0)" : undefined,
        }}
      />
    </div>
  );
}
