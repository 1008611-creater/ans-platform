"use client";
import { useEffect, useRef } from "react";
/** The enclosing account boundary unmounts this hook when the active session changes. */
export function useCommunityRequest(actorId: string | undefined) {
  const active = useRef(true), controllers = useRef(new Set<AbortController>());
  useEffect(() => { active.current = true; const pending = controllers.current; return () => { active.current = false; for (const c of pending) c.abort(); pending.clear(); }; }, [actorId]);
  return async <T,>(url: string, method = "GET", body?: unknown): Promise<T> => {
    if (!actorId || !active.current) throw new Error("ACCOUNT_CHANGED");
    const controller = new AbortController(); controllers.current.add(controller);
    try {
      const result = await fetch(url, { method, cache: "no-store", credentials: "same-origin", headers: { "Content-Type": "application/json", "x-ans-actor": actorId }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal });
      const data = await result.json();
      if (!active.current || controller.signal.aborted) throw new Error("ACCOUNT_CHANGED");
      if (!result.ok) throw new Error(typeof data.error === "string" ? data.error : "REQUEST_FAILED");
      return data as T;
    } finally { controllers.current.delete(controller); }
  };
}
