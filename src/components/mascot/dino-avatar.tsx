"use client";

import Image from "next/image";
import type { VoiceOffer } from "@/contracts/voice";
import { SANCTUARY_EVENT_NAME, loadSanctuaryState } from "@/domain/mascot/sanctuary";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSitePreferences } from "@/lib/site-preferences";

export type SpeechRequest = { id: number; text: string };

type AvatarMessage =
  | { event: "phase"; phase: string }
  | { event: "preferences"; voice: boolean; volume: number; calm: boolean }
  | { event: "speak"; text: string; actor: string; policyVersion: string }
  | { event: "stop-speech" }
  | { event: "hello" }
  | { event: "pointer"; x: number; y: number }
  | { event: "visibility"; visible: boolean }
  | { event: "sanctuary"; state: unknown };

const isRealBrowserWebGL = () =>
  typeof window !== "undefined" && typeof WebGLRenderingContext !== "undefined";

/** Sends public guide replies and a bound actor ID; no credentials or private task records. */
export function DinoAvatar({ actor = null, voicePolicy = null, phase, open, speech, onVoiceStatus }: { actor?: string | null; voicePolicy?: VoiceOffer | null; phase: string; open: boolean; speech?: SpeechRequest | null; onVoiceStatus?: (status: string) => void }) {
  const preferences = useSitePreferences();
  const deliveredSpeech = useRef<number | null>(null);
  const voiceCallback = useRef(onVoiceStatus);
  voiceCallback.current = onVoiceStatus;
  const frame = useRef<HTMLIFrameElement>(null);
  const [enabled, setEnabled] = useState(() => isRealBrowserWebGL());
  const [requested, setRequested] = useState(() => open || isRealBrowserWebGL());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const active = enabled && (requested || open) && !failed;
  const animated = active && ready;
  const send = useCallback((data: AvatarMessage) => {
    frame.current?.contentWindow?.postMessage({ type: "ans-dino", ...data }, window.location.origin);
  }, []);
  useEffect(() => {
    if (open) setRequested(true);
  }, [open]);
  useEffect(() => {
    if (isRealBrowserWebGL()) {
      setEnabled(true);
      setRequested(true);
      return;
    }
    if (!window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setEnabled(!query.matches); setReady(false); };
    sync(); query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const activate = () => {
      setRequested(true);
      const child = frame.current?.contentWindow as (Window & { __ANS_DINO__?: { activateAudio?: () => Promise<void>; syncSanctuary?: (st?: unknown) => void } }) | null;
      try {
        void child?.__ANS_DINO__?.activateAudio?.()?.catch(() => {});
        child?.__ANS_DINO__?.syncSanctuary?.(loadSanctuaryState());
      } catch { /* Audio or 3D may not be ready. */ }
    };
    window.addEventListener("ans:dino-activate", activate);
    return () => window.removeEventListener("ans:dino-activate", activate);
  }, []);
  useEffect(() => {
    if (!active) return;
    const source = frame.current?.contentWindow;
    if (!source) return;
    let stopped = false;
    let loaded = false;
    let remaining = isRealBrowserWebGL() ? 120000 : 20000;
    let startedAt: number | null = null;
    let timeout: number | undefined;
    let pollTimer: number | undefined;
    const pauseDeadline = () => {
      window.clearTimeout(timeout);
      timeout = undefined;
      if (startedAt !== null) remaining = Math.max(0, remaining - (performance.now() - startedAt));
      startedAt = null;
    };
    const markReady = () => {
      if (stopped || loaded) return;
      loaded = true;
      pauseDeadline();
      if (pollTimer !== undefined) {
        window.clearInterval(pollTimer);
        pollTimer = undefined;
      }
      setReady(true);
    };
    const fail = () => {
      stopped = true;
      pauseDeadline();
      if (pollTimer !== undefined) {
        window.clearInterval(pollTimer);
        pollTimer = undefined;
      }
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
      const currentSource = frame.current?.contentWindow ?? source;
      if (stopped || event.origin !== window.location.origin || (event.source !== source && event.source !== currentSource)) return;
      if (event.data?.type === "ans-dino-ready") markReady();
      if (event.data?.type === "ans-dino-error") fail();
      if (event.data?.type === "ans-dino-voice" && typeof event.data.state === "string") voiceCallback.current?.(event.data.state);
    };
    window.addEventListener("message", receive);
    // The renderer acknowledges its first visible frame; background time is not a load failure.
    document.addEventListener("visibilitychange", visibility);
    resumeDeadline();
    if (isRealBrowserWebGL()) {
      pollTimer = window.setInterval(() => {
        try {
          const child = frame.current?.contentWindow as (Window & { __ANS_DINO__?: { snapshot?: () => { ready?: boolean; modelLoaded?: boolean } } }) | null;
          const snap = child?.__ANS_DINO__?.snapshot?.();
          if (snap?.ready || snap?.modelLoaded) markReady();
        } catch { /* Same-origin frame still initializing. */ }
      }, 250);
    }
    return () => {
      stopped = true;
      pauseDeadline();
      if (pollTimer !== undefined) window.clearInterval(pollTimer);
      window.removeEventListener("message", receive);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [active]);
  useEffect(() => {
    if (!animated) return;
    send({ event: "preferences", voice: preferences.voice, volume: preferences.volume / 100, calm: preferences.motion === "calm" });
    if (!preferences.voice) { send({ event: "stop-speech" }); voiceCallback.current?.("idle"); }
  }, [animated, preferences, send]);
  useEffect(() => {
    if (!animated || !speech || deliveredSpeech.current === speech.id) return;
    if (!open || !preferences.voice) { deliveredSpeech.current = speech.id; return; }
    if (!actor || !voicePolicy?.available || Date.parse(voicePolicy.reviewBy) <= Date.now()) return;
    deliveredSpeech.current = speech.id;
    send({ event: "speak", text: speech.text, actor, policyVersion: voicePolicy.policyVersion });
  }, [actor, voicePolicy, animated, open, preferences.voice, speech, send]);
  useEffect(() => {
    if (!open && animated) { send({ event: "stop-speech" }); voiceCallback.current?.("idle"); }
    return () => { send({ event: "stop-speech" }); };
  }, [animated, open, send]);
  useEffect(() => {
    if (!animated) return;
    send({ event: "phase", phase });
  }, [animated, phase, send]);
  useEffect(() => {
    if (animated && open) send({ event: "hello" });
  }, [animated, open, send]);
  useEffect(() => {
    if (!animated) return;
    const child = frame.current?.contentWindow as (Window & { __ANS_DINO__?: { syncSanctuary?: (st?: unknown) => void } }) | null;
    try { child?.__ANS_DINO__?.syncSanctuary?.(loadSanctuaryState()); } catch { /* Ignore */ }
  }, [animated]);
  useEffect(() => {
    if (!animated) return;
    let last = 0;
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || performance.now() - last < 80) return;
      last = performance.now();
      send({ event: "pointer", x: event.clientX / window.innerWidth * 2 - 1, y: event.clientY / window.innerHeight * 2 - 1 });
    };
    const visibility = () => { send({ event: "visibility", visible: !document.hidden }); if (document.hidden) send({ event: "stop-speech" }); };
    visibility(); window.addEventListener("pointermove", pointer, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("pointermove", pointer); document.removeEventListener("visibilitychange", visibility); };
  }, [animated, send]);
  return <span className="ans-dino-avatar" aria-hidden="true">
    <Image src="/mascot/ans-mascot.png" width={88} height={88} alt="" className={animated ? "invisible" : ""} />
    {/* Download 3D eagerly in real WebGL browsers; retain the frame across subsequent openings. */}
    {active && <iframe ref={frame} src="/mascot/3d/index.html?ui=sanctuary-20261017-v2" title="ANS Little Dino 3D Companion" tabIndex={-1} loading="eager" style={{ backgroundColor: "transparent", colorScheme: "normal" }} className={`ans-dino-canvas ${animated ? "opacity-100" : "opacity-0"}`} />}
  </span>;
}

