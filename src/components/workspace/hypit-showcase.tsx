"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./hypit-showcase.module.css";

const EXAMPLES = [
  { id: "ranking", repository: "ranking-football" },
  { id: "podcast", repository: "podcast" },
  { id: "interview", repository: "interview" },
] as const;

// Floating image layers adapted from ANS's GitGlow FloatingLayers template.
// Original attribution: Leny Sauzet; /catalog/gitglow-v1/LICENSE.gitglow.
export function HypitShowcase() {
  const t = useTranslations("product.hypit.showcase");
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const current = EXAMPLES[selected];
  const playRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const playbackChanged = useRef(false);

  useEffect(() => {
    if (!playbackChanged.current) return;
    (playing ? closeRef.current : playRef.current)?.focus();
    playbackChanged.current = false;
  }, [playing]);

  function setPlayback(next: boolean) {
    playbackChanged.current = true;
    setPlaying(next);
  }

  function select(index: number) {
    setSelected(index);
    setPlaying(false);
  }

  return (
    <section id="hypit-examples" className={styles.showcase} aria-labelledby="hypit-showcase-title">
      <div className={styles.topline}>
        <h2 id="hypit-showcase-title" className="ans-eyebrow">{t("title")}</h2>
        <span className="text-xs text-muted-foreground">{t("official")}</span>
      </div>
      <div className={styles.stage}>
        {EXAMPLES.map((example, index) => {
          const offset = (index - selected + EXAMPLES.length) % EXAMPLES.length;
          return (
            <button
              type="button"
              key={example.id}
              onClick={() => select(index)}
              className={cn(styles.phone, offset === 0 ? styles.front : offset === 1 ? styles.right : styles.left)}
              aria-label={t("select", { name: t(`${example.id}.title`) })}
              aria-pressed={selected === index}
              tabIndex={playing ? -1 : 0}
            >
              <Image src={`/catalog/hypit-examples/${example.id}.webp`} alt={t(`${example.id}.alt`)} fill unoptimized sizes="(max-width: 640px) 180px, 220px" className="object-cover" />
              <span className={styles.caption}>{t(`${example.id}.title`)}</span>
            </button>
          );
        })}
        {playing ? (
          <div className={styles.player}>
            <video
              key={current.id}
              src={`https://hypit.ai/demo/reference-${current.id}/full.mp4?v=20260831-reference-lowbitrate`}
              poster={`/catalog/hypit-examples/${current.id}.webp`}
              controls autoPlay playsInline preload="metadata"
              aria-label={t("watch", { name: t(`${current.id}.title`) })}
            />
            <Button variant="secondary" size="icon" ref={closeRef} className={styles.close} onClick={() => setPlayback(false)} aria-label={t("close")}><X className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        ) : (
          <Button size="icon" ref={playRef} className={styles.play} onClick={() => setPlayback(true)} aria-label={t("watch", { name: t(`${current.id}.title`) })}>
            <Play className="h-5 w-5 fill-current" aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className={styles.switcher} role="group" aria-label={t("switcher")}>
        {EXAMPLES.map((example, index) => (
          <Button key={example.id} size="sm" variant={selected === index ? "default" : "ghost"} aria-pressed={selected === index} onClick={() => select(index)}>{t(`${example.id}.short`)}</Button>
        ))}
      </div>
      <div className={styles.details} aria-live="polite" aria-atomic="true">
        <h3 className="text-lg font-semibold">{t(`${current.id}.title`)}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(`${current.id}.body`)}</p>
        <p className="mt-3 text-xs leading-5"><span className="font-medium">{t("input")}</span> {t(`${current.id}.input`)}</p>
      </div>
      <div className={styles.links}>
        <a href={`https://github.com/hypit-ai/hypit/tree/main/examples/${current.repository}`} target="_blank" rel="noopener noreferrer" className="ans-text-link text-xs">{t("source")}<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a>
        <a href="https://hypit.ai/" target="_blank" rel="noopener noreferrer" className="ans-text-link text-xs">{t("fallback")}</a>
        <a href="https://github.com/LenySauzet/gitglow" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground underline underline-offset-4">{t("credit")}</a>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("notice")}</p>
    </section>
  );
}
