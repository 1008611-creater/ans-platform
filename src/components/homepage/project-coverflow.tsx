"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, ImageIcon, Pause, Play } from "lucide-react";
import styles from "./project-coverflow.module.css";

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
  labels: { title: string; previous: string; next: string; pause: string; play: string; open: string; select: string; carousel: string };
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
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const root = useRef<HTMLElement>(null);
  const rotationControl = useRef<HTMLButtonElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const count = projects.length;
  const hasProjects = count > 0;
  const active = count ? index % count : 0;
  const project = projects[active];
  const playing = count > 1 && !paused && !hovered && !reduced && visible && pageVisible;

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
    const timer = window.setInterval(() => setIndex(current => (current + 1) % count), 5500);
    return () => window.clearInterval(timer);
  }, [playing, count]);

  function select(next: number) { setPaused(true); setIndex((next + count) % count); }
  if (!project) return null;

  return <section ref={root} className={styles.root} role="region" aria-roledescription={labels.carousel} aria-label={labels.title}
    data-playing={playing} data-reduced-motion={reduced}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={event => { if (event.target !== rotationControl.current && !event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(true); }}
    onKeyDown={event => { if (count < 2) return; if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); select(active + (event.key === "ArrowRight" ? 1 : -1)); } }}>
    <div className={styles.heading}><span>{labels.title}</span><span className={styles.counter}>{String(active + 1).padStart(2, "0")}<span> / {String(count).padStart(2, "0")}</span></span></div>
    <div className={styles.stage}
      onPointerDown={event => { suppressClick.current = false; if (event.pointerType !== "mouse") { setPaused(true); touch.current = { x: event.clientX, y: event.clientY }; } }}
      onPointerCancel={() => { touch.current = null; }}
      onPointerUp={event => { const start = touch.current; touch.current = null; if (!start || count < 2) return; const dx = event.clientX - start.x; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(event.clientY - start.y)) { suppressClick.current = true; select(active + (dx < 0 ? 1 : -1)); } }}>
      {projects.map((item, itemIndex) => {
        let offset = (itemIndex - active + count) % count;
        if (offset > count / 2) offset -= count;
        const distance = Math.abs(offset);
        return <Link key={item.slug} href={item.href} prefetch={false} className={styles.cover} aria-label={`${labels.open}: ${item.title}`} aria-hidden={offset !== 0 || undefined} tabIndex={offset === 0 ? 0 : -1}
          data-offset={offset} data-hidden={distance > 2} style={{ "--offset": offset, "--distance": distance, zIndex: count - distance } as CSSProperties}
          onClick={event => { if (suppressClick.current) { event.preventDefault(); suppressClick.current = false; } else if (offset !== 0) { event.preventDefault(); select(itemIndex); } }}>
          <Cover project={item} priority={itemIndex === 0} />
          <span className={styles.coverName}>{item.title}</span>
        </Link>;
      })}
    </div>
    <div className={styles.caption} aria-live={paused || reduced ? "polite" : "off"} aria-atomic="true">
      <Link href={project.href} className={styles.projectLink}>
        <div className={styles.projectCopy}><span className={styles.category}>{project.category}</span><h2>{project.title}</h2><p>{project.summary}</p></div>
        <span className={styles.open} aria-label={labels.open}><ArrowUpRight aria-hidden="true" /></span>
      </Link>
    </div>
    {count > 1 && <div className={styles.controls}>
      <div className={styles.picks}>{projects.map((item, itemIndex) => <button key={item.slug} type="button" aria-label={`${labels.select} ${item.title}`} aria-current={active === itemIndex ? "true" : undefined} onClick={() => select(itemIndex)}><span /></button>)}</div>
      <div className={styles.navigation}>
        {!reduced && <button ref={rotationControl} type="button" onClick={() => setPaused(current => !current)} aria-label={paused ? labels.play : labels.pause} title={paused ? labels.play : labels.pause}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}</button>}
        <button type="button" onClick={() => select(active - 1)} aria-label={labels.previous} title={labels.previous}><ChevronLeft aria-hidden="true" /></button>
        <button type="button" onClick={() => select(active + 1)} aria-label={labels.next} title={labels.next}><ChevronRight aria-hidden="true" /></button>
      </div>
    </div>}
  </section>;
}
