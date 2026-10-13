"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, ImageIcon, Pause, Play } from "lucide-react";
import styles from "./project-coverflow.module.css";
import { RevealDetails } from "@/components/catalog/reveal-details";

const AUTOPLAY_MS = 2800;
const BROWSE_DWELL_MS = 8000;
const WHEEL_THRESHOLD_PX = 40;
const WHEEL_GESTURE_GAP_MS = 180;
const WHEEL_TRANSITION_LOCK_MS = 420;

export interface CoverflowProject {
  slug: string;
  href: string;
  title: string;
  summary: string;
  category: string;
  coverUrl?: string;
}
export interface ProjectCoverflowProps {
  projects: readonly CoverflowProject[];
  labels: { title: string; open: string; carousel: string; info: string; pause: string; play: string };
}

function Cover({ project, priority }: { project: CoverflowProject; priority: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return project.coverUrl && failedSource !== project.coverUrl
    ? <Image src={project.coverUrl} alt="" width={800} height={500} unoptimized loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} draggable={false} onError={() => setFailedSource(project.coverUrl ?? null)} />
    : <span className={styles.fallback}><ImageIcon aria-hidden="true" /><span>{project.title}</span></span>;
}

/** A bounded public catalog island; no private project records or model data. */
export function ProjectCoverflow({ projects, labels }: ProjectCoverflowProps) {
  const [index, setIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const [captionRevealed, setCaptionRevealed] = useState(false);
  const [touching, setTouching] = useState(false);
  const [interaction, setInteraction] = useState<{ at: number } | null>(null);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const count = projects.length;
  const hasProjects = count > 0;
  const active = count ? index % count : 0;
  const project = projects[active];
  const playing = count > 1 && !manualPaused && !focused && !captionRevealed && !touching && !reduced && visible && pageVisible;
  const linger = useCallback(() => setInteraction({ at: Date.now() }), []);
  const onCaptionReveal = useCallback((open: boolean) => { setCaptionRevealed(open); if (!open) linger(); }, [linger]);
  const step = useCallback((direction: number) => {
    if (count < 2) return;
    setIndex(current => ((current + direction) % count + count) % count);
    linger();
  }, [count, linger]);

  useEffect(() => {
    if (!hasProjects) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReduced(media.matches);
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    updateMotion(); updateVisibility();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25), { threshold: 0.25 });
    if (root.current) observer.observe(root.current);
    return () => { media.removeEventListener("change", updateMotion); document.removeEventListener("visibilitychange", updateVisibility); observer.disconnect(); };
  }, [hasProjects]);

  useEffect(() => {
    if (!playing) return;
    const delay = interaction ? Math.max(AUTOPLAY_MS, interaction.at + BROWSE_DWELL_MS - Date.now()) : AUTOPLAY_MS;
    const timer = window.setTimeout(() => { setIndex(current => (current + 1) % count); setInteraction(null); }, delay);
    return () => window.clearTimeout(timer);
  }, [playing, count, active, interaction]);

  useEffect(() => {
    const element = stage.current;
    if (!element || count < 2) return;
    let lastEventAt = -Infinity;
    let lastStepAt = -Infinity;
    let accumulated = 0;
    let consumed = false;
    function onWheel(event: WheelEvent) {
      // Keep zoom and horizontal gestures native; only the cover surface consumes vertical wheel input.
      if (event.ctrlKey || event.metaKey || !event.cancelable || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      linger();
      const now = Date.now();
      if (now - lastEventAt > WHEEL_GESTURE_GAP_MS) { accumulated = 0; consumed = false; }
      lastEventAt = now;
      if (consumed || now - lastStepAt < WHEEL_TRANSITION_LOCK_MS) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element!.clientHeight : 1);
      accumulated += delta;
      if (Math.abs(accumulated) < WHEEL_THRESHOLD_PX) return;
      consumed = true; lastStepAt = now;
      step(accumulated > 0 ? 1 : -1);
    }
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [count, linger, step]);

  if (!project) return null;

  return <section ref={root} className={styles.root} role="region" aria-roledescription={labels.carousel} aria-label={labels.title} tabIndex={count > 1 ? 0 : undefined}
    data-manually-paused={manualPaused} data-playing={playing && !interaction} data-reduced-motion={reduced} data-browsing={interaction !== null}
    onMouseEnter={() => { if (count > 1) linger(); }}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setFocused(false); linger(); } }}
    onKeyDown={event => { if (count < 2 || event.altKey || event.ctrlKey || event.metaKey) return; if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); step(event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1); } }}>
    {count > 1 && !reduced ? <button type="button" className={styles.playback} aria-label={manualPaused ? labels.play : labels.pause}
      onClick={() => { setManualPaused(paused => !paused); linger(); }}>
      {manualPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
    </button> : null}
    <div ref={stage} className={styles.stage}
      onPointerDown={event => { suppressClick.current = false; if (event.pointerType !== "mouse") { setTouching(true); linger(); touch.current = { x: event.clientX, y: event.clientY }; } }}
      onPointerCancel={() => { touch.current = null; setTouching(false); linger(); }}
      onPointerUp={event => { const start = touch.current; touch.current = null; setTouching(false); linger(); if (!start || count < 2) return; const dx = event.clientX - start.x; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(event.clientY - start.y)) { suppressClick.current = true; step(dx < 0 ? 1 : -1); } }}>
      {projects.map((item, itemIndex) => {
        let offset = (itemIndex - active + count) % count;
        if (offset > count / 2) offset -= count;
        const distance = Math.abs(offset);
        return <Link key={item.slug} href={item.href} prefetch={false} className={styles.cover} aria-label={`${labels.open}: ${item.title}`} aria-hidden={offset !== 0 || undefined} tabIndex={offset === 0 ? 0 : -1}
          data-offset={offset} data-hidden={distance > 2} style={{ "--offset": offset, "--distance": distance, zIndex: count - distance } as CSSProperties}
          onClick={event => { if (suppressClick.current) { event.preventDefault(); suppressClick.current = false; } else if (offset !== 0) { event.preventDefault(); setIndex(itemIndex); linger(); } }}>
          <Cover project={item} priority={itemIndex === 0} />
          <span className={styles.coverName}>{item.title}</span>
        </Link>;
      })}
    </div>
    <div className={styles.caption} aria-live={focused || reduced || interaction ? "polite" : "off"} aria-atomic="true">
      <RevealDetails id="coverflow-project-info" kind="caption" label={labels.info} onRevealChange={onCaptionReveal} details={<><p className={styles.category}>{project.category}</p><p>{project.summary}</p></>}>
        <Link href={project.href} className={styles.projectLink} aria-describedby="coverflow-project-info">
          <div className={styles.projectCopy}><h2>{project.title}</h2></div>
          <span className={styles.open} aria-label={labels.open}><ArrowUpRight aria-hidden="true" /></span>
        </Link>
      </RevealDetails>
    </div>
  </section>;
}
