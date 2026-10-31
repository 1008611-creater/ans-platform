"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

export type AgriSegment = "pipeline" | "tracks" | "guide";
const SEGMENTS: AgriSegment[] = ["pipeline", "tracks", "guide"];

/** Anchors that live in another segment; following one switches to that segment first. */
function segmentForHash(hash: string): AgriSegment | null {
  if (hash === "#tracks" || hash.startsWith("#track-")) return "tracks";
  return null;
}

/**
 * Phones (<768px) see one segment at a time instead of a long scroll; wider screens keep every
 * section visible. Children mark their segment with `data-agri-segment`, and CSS in globals.css
 * hides the inactive ones, so server-rendered content and its DOM stay untouched.
 */
export function AgriMobileSegments({ labels, label, children }: { labels: Record<AgriSegment, string>; label: string; children: ReactNode }) {
  const [active, setActive] = useState<AgriSegment>("pipeline");
  const bar = useRef<HTMLDivElement>(null);

  // Opening the page at #tracks (or navigating to it later) shows the segment that holds it.
  useEffect(() => {
    const sync = () => { const segment = segmentForHash(window.location.hash); if (segment) setActive(segment); };
    const frame = requestAnimationFrame(sync);
    window.addEventListener("hashchange", sync);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", sync); };
  }, []);

  function select(segment: AgriSegment) {
    setActive(segment);
    // Once the bar is stuck under the header, start the new segment from its top.
    const node = bar.current;
    if (node && node.getBoundingClientRect().top <= 49) node.scrollIntoView({ block: "start" });
  }

  function followAnchor(event: MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    const segment = anchor && segmentForHash(anchor.getAttribute("href")!);
    if (!segment || !window.matchMedia("(max-width: 767px)").matches) return;
    event.preventDefault();
    flushSync(() => setActive(segment));
    document.querySelector(anchor.getAttribute("href")!)?.scrollIntoView({ block: "start" });
    history.replaceState(null, "", anchor.getAttribute("href"));
  }

  return <div data-agri-active={active} className="ans-agri-segments space-y-6" onClickCapture={followAnchor}>
    <div ref={bar} className="sticky top-12 z-30 -mx-5 scroll-mt-12 bg-background px-5 py-2 md:hidden">
      <div role="group" aria-label={label} className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {SEGMENTS.map(segment => <button key={segment} type="button" aria-pressed={active === segment} onClick={() => select(segment)}
          className={cn("min-h-11 rounded-lg text-sm font-medium transition-[color,background-color,transform] duration-200 ease-out active:scale-[0.97] motion-reduce:transition-none",
            active === segment ? "bg-[var(--surface-raised)] text-foreground" : "text-muted-foreground")}>
          {labels[segment]}
        </button>)}
      </div>
    </div>
    {children}
  </div>;
}
