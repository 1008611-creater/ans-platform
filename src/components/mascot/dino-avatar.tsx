"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type AvatarMessage =
  | { event: "phase"; phase: string }
  | { event: "hello" }
  | { event: "pointer"; x: number; y: number }
  | { event: "visibility"; visible: boolean };

/** Decorative renderer only: never receives member data or task content. */
export function DinoAvatar({ phase, open }: { phase: string; open: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const active = enabled && !failed;
  const animated = active && ready;
  const send = useCallback((data: AvatarMessage) => {
    frame.current?.contentWindow?.postMessage({ type: "ans-dino", ...data }, window.location.origin);
  }, []);
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setEnabled(!query.matches); setReady(false); };
    sync(); query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!active) return;
    const source = frame.current?.contentWindow;
    if (!source) return;
    let stopped = false;
    let loaded = false;
    let remaining = 20000;
    let startedAt: number | null = null;
    let timeout: number | undefined;
    const pauseDeadline = () => {
      window.clearTimeout(timeout);
      timeout = undefined;
      if (startedAt !== null) remaining = Math.max(0, remaining - (performance.now() - startedAt));
      startedAt = null;
    };
    const fail = () => {
      stopped = true;
      pauseDeadline();
      setReady(false);
      setFailed(true);
    };
    const resumeDeadline = () => {
      if (stopped || loaded || document.hidden || timeout !== undefined) return;
      startedAt = performance.now();
      timeout = window.setTimeout(() => {
        pauseDeadline();
        if (!document.hidden) fail();
      }, remaining);
    };
    const visibility = () => { if (document.hidden) pauseDeadline(); else resumeDeadline(); };
    const receive = (event: MessageEvent) => {
      if (stopped || event.origin !== window.location.origin || event.source !== source) return;
      if (event.data?.type === "ans-dino-ready") { loaded = true; pauseDeadline(); setReady(true); }
      if (event.data?.type === "ans-dino-error") fail();
    };
    window.addEventListener("message", receive);
    // The renderer acknowledges its first visible frame; background time is not a load failure.
    document.addEventListener("visibilitychange", visibility);
    resumeDeadline();
    return () => {
      stopped = true;
      pauseDeadline();
      window.removeEventListener("message", receive);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [active]);
  useEffect(() => {
    if (!animated) return;
    send({ event: "phase", phase });
  }, [animated, phase, send]);
  useEffect(() => {
    if (animated && open) send({ event: "hello" });
  }, [animated, open, send]);
  useEffect(() => {
    if (!animated) return;
    let last = 0;
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || performance.now() - last < 80) return;
      last = performance.now();
      send({ event: "pointer", x: event.clientX / window.innerWidth * 2 - 1, y: event.clientY / window.innerHeight * 2 - 1 });
    };
    const visibility = () => send({ event: "visibility", visible: !document.hidden });
    visibility(); window.addEventListener("pointermove", pointer, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("pointermove", pointer); document.removeEventListener("visibilitychange", visibility); };
  }, [animated, send]);
  return <span className="ans-dino-avatar" aria-hidden="true">
    <Image src="/mascot/ans-mascot.png" width={88} height={88} alt="" className={animated ? "invisible" : ""} />
    {/* The fixed companion is already in view; lazy loading must not consume its ready timeout. */}
    {active && <iframe ref={frame} src="/mascot/3d/index.html" title="" tabIndex={-1} loading="eager" className={`ans-dino-canvas ${animated ? "opacity-100" : "opacity-0"}`} />}
  </span>;
}

