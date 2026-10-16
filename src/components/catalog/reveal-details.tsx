"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

/** Supplemental public copy only. Costs, warnings and errors stay directly visible. */
export function RevealDetails({ id, label, children, details, kind = "card", className = "", onRevealChange }: RevealDetailsProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const visible = !dismissed && (hovered || focused || pinned);
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardActivation = useRef(false);
  const previouslyVisible = useRef(false);
  const Tag = kind === "card" ? "article" : "div";

  function cancelLeave() {
    if (leaveTimer.current !== null) clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  }
  function enter() {
    cancelLeave();
    setHovered(true);
    setDismissed(false);
  }
  function leave() {
    cancelLeave();
    // The portalled panel has a small gap; leave time to move the pointer into it.
    leaveTimer.current = setTimeout(() => { setHovered(false); leaveTimer.current = null; }, 140);
  }
  function dismiss() {
    cancelLeave();
    setPinned(false);
    setHovered(false);
    setFocused(false);
    setDismissed(true);
  }

  useEffect(() => () => { if (leaveTimer.current !== null) clearTimeout(leaveTimer.current); }, []);
  useEffect(() => {
    if (previouslyVisible.current !== visible) {
      previouslyVisible.current = visible;
      onRevealChange?.(visible);
    }
  }, [visible, onRevealChange]);
  useEffect(() => {
    if (pinned && visible && keyboardActivation.current) {
      keyboardActivation.current = false;
      panel.current?.focus();
    }
  }, [pinned, visible]);

  return <Popover open={visible} onOpenChange={open => { if (!open) dismiss(); }}>
    <Tag ref={root as Ref<HTMLDivElement & HTMLElement>} className={`${styles.root} ${className}`} data-reveal-kind={kind} data-revealed={visible}
      onPointerEnter={event => { if (event.pointerType === "mouse") enter(); }}
      onPointerLeave={event => { if (event.pointerType === "mouse") leave(); }}
      onFocusCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(true);
          setDismissed(false);
        }
      }}
      onBlurCapture={event => {
        const next = event.relatedTarget as Node | null;
        if (!event.currentTarget.contains(next) && !panel.current?.contains(next)) setFocused(false);
      }}>
      {children}
      <PopoverTrigger asChild>
        <button ref={trigger} type="button" className={styles.trigger} aria-label={label} aria-controls={id}
          onClick={event => {
            // Focus/hover may already have opened the panel before this activation.
            event.preventDefault();
            keyboardActivation.current = event.detail === 0;
            if (pinned) dismiss();
            else { cancelLeave(); setPinned(true); setDismissed(false); }
          }}><Info aria-hidden="true" /></button>
      </PopoverTrigger>
      {/* Preserve existing aria-describedby references without hidden focus targets. */}
      {!visible && <div id={id} hidden inert>{details}</div>}
    </Tag>
    <PopoverContent ref={panel} id={visible ? id : undefined} hidden={!visible} inert={!visible} aria-hidden={!visible} aria-label={label} className={styles.panel} data-reveal-kind={kind}
      side={kind === "caption" ? "top" : "bottom"} align="end" sideOffset={8} collisionPadding={12}
      onOpenAutoFocus={event => event.preventDefault()}
      onCloseAutoFocus={event => event.preventDefault()}
      onPointerEnter={event => { if (event.pointerType === "mouse") enter(); }}
      onPointerLeave={event => { if (event.pointerType === "mouse") leave(); }}
      onEscapeKeyDown={() => { if (panel.current?.contains(document.activeElement)) trigger.current?.focus(); }}
      onInteractOutside={event => { if (root.current?.contains(event.target as Node)) event.preventDefault(); }}>
      {details}
    </PopoverContent>
  </Popover>;
}
