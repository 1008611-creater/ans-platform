"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { Info } from "lucide-react";
import styles from "./reveal-details.module.css";

interface RevealDetailsProps {
  id: string;
  label: string;
  children: ReactNode;
  details: ReactNode;
  kind?: "card" | "heading" | "caption";
  className?: string;
  onRevealChange?: (visible: boolean) => void;
}

/** Supplemental public copy: hover, keyboard focus, or a dedicated touch target. */
export function RevealDetails({ id, label, children, details, kind = "card", className = "", onRevealChange }: RevealDetailsProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const visible = !dismissed && (hovered || focused || pinned);
  const root = useRef<HTMLElement>(null);
  const previouslyVisible = useRef(false);
  const Tag = kind === "card" ? "article" : "div";

  useEffect(() => {
    if (previouslyVisible.current !== visible) { previouslyVisible.current = visible; onRevealChange?.(visible); }
  }, [visible, onRevealChange]);
  useEffect(() => {
    if (!visible) return;
    const dismiss = () => { setPinned(false); setDismissed(true); };
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") dismiss(); }
    function onPointer(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) dismiss(); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onPointer); };
  }, [visible]);

  return <Tag ref={root as Ref<HTMLDivElement & HTMLElement>} className={`${styles.root} ${className}`} data-reveal-kind={kind} data-revealed={visible}
    onPointerEnter={event => { if (event.pointerType === "mouse") { setHovered(true); setDismissed(false); } }}
    onPointerLeave={() => { setHovered(false); }}
    onFocusCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setFocused(true); setDismissed(false); } }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    {children}
    <button type="button" className={styles.trigger} aria-label={label} aria-expanded={visible} aria-controls={id}
      onClick={() => { if (pinned) { setPinned(false); setDismissed(true); } else { setPinned(true); setDismissed(false); } }}><Info aria-hidden="true" /></button>
    <div id={id} className={styles.panel} role="note" aria-hidden={!visible}>{details}</div>
  </Tag>;
}
