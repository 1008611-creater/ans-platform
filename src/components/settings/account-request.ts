"use client";

import { useCallback, useEffect, useRef } from "react";

/** The keyed account boundary unmounts private settings and cancels their requests. */
export function useSettingsRequest(actorId: string) {
  const active = useRef(true);
  const controllers = useRef(new Set<AbortController>());
  useEffect(() => {
    active.current = true;
    const pending = controllers.current;
    return () => {
      active.current = false;
      for (const controller of pending) controller.abort();
      pending.clear();
    };
  }, [actorId]);
  const isActive = useCallback(() => active.current, []);
  const request = useCallback(async <T,>(url: string, method = "GET", body?: unknown): Promise<T> => {
    if (!actorId || !active.current) throw new Error("ACCOUNT_CHANGED");
    const controller = new AbortController();
    controllers.current.add(controller);
    try {
      const response = await fetch(url, {
        method, cache: "no-store", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "x-ans-actor": actorId },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      if (!active.current || controller.signal.aborted) throw new Error("ACCOUNT_CHANGED");
      const data = await response.json();
      if (!active.current || controller.signal.aborted) throw new Error("ACCOUNT_CHANGED");
      if (!response.ok) throw new Error(data?.message ?? data?.error?.message ?? (typeof data?.error === "string" ? data.error : "REQUEST_FAILED"));
      return data as T;
    } finally {
      controllers.current.delete(controller);
    }
  }, [actorId]);
  return { request, isActive };
}
