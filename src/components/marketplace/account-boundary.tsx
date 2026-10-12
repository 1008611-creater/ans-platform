"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { MarketRequestRejection, marketRequest } from "./request";

const MarketActorContext = createContext<string | null>(null);

export function MarketAccountBoundary({ actorId, children }: { actorId: string; children: ReactNode }) {
  return <AccountContentBoundary actorId={actorId}><MarketActorContext.Provider key={actorId} value={actorId}>{children}</MarketActorContext.Provider></AccountContentBoundary>;
}

export function useMarketActorId() { return useContext(MarketActorContext); }

/** Abort old-account requests and suppress their acknowledgements after unmount. */
export function useMarketRequest() {
  const actorId = useContext(MarketActorContext);
  const controllers = useRef(new Set<AbortController>());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const requests = controllers.current;
    return () => { alive.current = false; for (const controller of requests) controller.abort(); requests.clear(); };
  }, []);
  return async <T,>(url: string, method: string, body: unknown): Promise<T> => {
    if (!actorId || !alive.current) throw new MarketRequestRejection("ACCOUNT_CHANGED", 409);
    const controller = new AbortController(); controllers.current.add(controller);
    try {
      const data = await marketRequest<T>(url, method, body, { actorId, signal: controller.signal });
      if (!alive.current || controller.signal.aborted) throw new MarketRequestRejection("ACCOUNT_CHANGED", 409);
      return data;
    } finally { controllers.current.delete(controller); }
  };
}

/** Upload original cover bytes with the same account lifetime as market commands. */
export function useMarketUpload() {
  const actorId = useContext(MarketActorContext);
  const controllers = useRef(new Set<AbortController>());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const requests = controllers.current;
    return () => { alive.current = false; for (const controller of requests) controller.abort(); requests.clear(); };
  }, []);
  return async (file: File): Promise<{ url: string }> => {
    if (!actorId || !alive.current) throw new MarketRequestRejection("ACCOUNT_CHANGED", 409);
    const controller = new AbortController(); controllers.current.add(controller);
    const body = new FormData(); body.set("file", file);
    try {
      const response = await fetch("/api/market/media", { method: "POST", credentials: "same-origin", signal: controller.signal, headers: { "x-ans-actor": actorId }, body });
      const envelope = await response.json().catch(() => null);
      if (!alive.current || controller.signal.aborted) throw new MarketRequestRejection("ACCOUNT_CHANGED", 409);
      if (!response.ok || envelope?.ok !== true || typeof envelope.data?.url !== "string") throw new Error(typeof envelope?.error?.code === "string" ? envelope.error.code : "INTERNAL_ERROR");
      return { url: envelope.data.url };
    } finally { controllers.current.delete(controller); }
  };
}
