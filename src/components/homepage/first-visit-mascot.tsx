"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { MintyEngine } from "@/components/homepage/minty-engine";

/**
 * 首访引导里的 Minty 舞台：图像生成的圆球成品图 + 弹簧引擎。
 *
 * 身体与眼睛是两层位图（眼睛从同一张成品图里切出，身体层已补好眼下皮肤），
 * 引擎只驱动整体位移 / 挤压 / 回弹 / 歪头，以及眼睛层的视线与眨眼。
 * 纯装饰：aria-hidden、不可聚焦——绝不能抢焦点把舞台滚出视口。
 */

/** 成品图切片坐标（px，基于 335×374 的身体图）。 */
const ART = { w: 335, h: 374 } as const;
const EYES = [
  { src: "/first-visit/minty/eye-l.webp", x: 84, y: 152.5, w: 45, h: 46 },
  { src: "/first-visit/minty/eye-r.webp", x: 205.5, y: 152.5, w: 45, h: 46 },
] as const;

const pct = (n: number, of: number) => `${(n / of) * 100}%`;

export function FirstVisitMascot({ className }: { className?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const eyes = useRef<(HTMLDivElement | null)[]>([]);
  const engine = useRef<MintyEngine | null>(null);
  const [animated, setAnimated] = useState(false);
  // 三层图都到位才开演：否则慢网下弹簧先跑完，出场那一下只剩一片影子。
  const [loaded, setLoaded] = useState(0);
  const ready = loaded >= 1 + EYES.length;
  const countArt = (img: HTMLImageElement) => {
    if (img.dataset.counted) return;
    img.dataset.counted = "1";
    setLoaded(n => n + 1);
  };
  // 水合前已从缓存加载完的图不会再触发 onLoad，挂上时补记一次。
  const artRef = (img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) queueMicrotask(() => countArt(img));
  };

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const sync = () => setAnimated(!!window.matchMedia && !query?.matches);
    sync();
    query?.addEventListener("change", sync);
    return () => query?.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!animated || !ready || !el) return;
    const minty = new MintyEngine(performance.now());
    engine.current = minty;
    let width = el.clientWidth;
    let rect = el.getBoundingClientRect();
    let rectAt = 0;
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
      if (body.current) {
        body.current.style.transform =
          `translate3d(${(f.x * width).toFixed(2)}px, ${(f.y * width).toFixed(2)}px, 0) rotate(${f.tilt.toFixed(2)}deg) scale(${sx.toFixed(4)}, ${f.squash.toFixed(4)})`;
      }
      if (shadow.current) {
        shadow.current.style.transform = `translateX(${(f.x * width).toFixed(2)}px) scale(${(f.shadow * sx).toFixed(3)}, ${f.shadow.toFixed(3)})`;
        shadow.current.style.opacity = String(Math.min(1, f.shadow));
      }
      for (const eye of eyes.current) {
        if (eye) eye.style.transform = `translate3d(${(f.gazeX * width).toFixed(2)}px, ${(f.gazeY * width).toFixed(2)}px, 0) scaleY(${f.lid.toFixed(3)})`;
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
  }, [animated, ready]);

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
        className="absolute bottom-[7%] left-[22%] h-[7%] w-[56%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(18,33,28,0.22),rgba(18,33,28,0))]"
        style={animated ? { opacity: 0 } : undefined}
      />
      <div
        ref={body}
        className="absolute bottom-[9%] left-[13%] w-[74%] origin-bottom will-change-transform"
        style={{ aspectRatio: `${ART.w} / ${ART.h}`, transform: animated ? "translate3d(0, 55%, 0)" : undefined }}
      >
        <Image src="/first-visit/minty/body.webp" alt="" width={ART.w} height={ART.h} ref={artRef} onLoad={e => countArt(e.currentTarget)} priority unoptimized draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />
        {EYES.map((eye, i) => (
          <div
            key={eye.src}
            ref={node => { eyes.current[i] = node; }}
            className="absolute will-change-transform"
            style={{ left: pct(eye.x, ART.w), top: pct(eye.y, ART.h), width: pct(eye.w, ART.w), height: pct(eye.h, ART.h) }}
          >
            <Image src={eye.src} alt="" width={eye.w} height={eye.h} ref={artRef} onLoad={e => countArt(e.currentTarget)} unoptimized draggable={false} className="pointer-events-none h-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
