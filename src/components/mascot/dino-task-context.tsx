"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export type DinoTaskPhase = "input" | "saving" | "confirm" | "ready" | "submitting" | "queued" | "working" | "review" | "editing" | "recovering" | "attention" | "failed" | "cancelled" | "archived";
// Only presentation state belongs here. Never publish form values, project titles,
// model responses, credentials or commands to the global companion.
export interface DinoTaskSnapshot {
  phase: DinoTaskPhase;
  step: 1 | 2 | 3;
  costPoints: number;
  targetId?: string;
}
interface Registration { token: string; actorId: string; pathname: string; snapshot: DinoTaskSnapshot }
interface Publisher {
  actorId: string | null;
  publish: (registration: Registration) => void;
  remove: (token: string) => void;
}
const TaskContext = createContext<DinoTaskSnapshot | null>(null);
const PublisherContext = createContext<Publisher | null>(null);

export function DinoTaskProvider({ children, actorId, pathname }: { children: ReactNode; actorId: string | null; pathname: string | null }) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const publish = useCallback((value: Registration) => setRegistration(value), []);
  const remove = useCallback((token: string) => setRegistration(current => current?.token === token ? null : current), []);
  const publisher = useMemo(() => ({ actorId, publish, remove }), [actorId, publish, remove]);
  // Filter synchronously: route/account changes must not show the old task while
  // waiting for passive cleanup. This is not an authorization layer for the task.
  const task = actorId && registration?.actorId === actorId && registration.pathname === pathname ? registration.snapshot : null;
  return <PublisherContext.Provider value={publisher}><TaskContext.Provider value={task}>{children}</TaskContext.Provider></PublisherContext.Provider>;
}

export function DinoTaskSessionProvider({ children }: { children: ReactNode }) {
  const { data, status } = useSession();
  const pathname = usePathname();
  const actorId = status === "authenticated" ? data?.user?.id ?? null : null;
  return <DinoTaskProvider actorId={actorId} pathname={pathname}>{children}</DinoTaskProvider>;
}

export function usePublishDinoTask(pathname: string, snapshot: DinoTaskSnapshot) {
  const publisher = useContext(PublisherContext);
  const token = useId();
  const owner = useRef<string | null>(null);
  useEffect(() => {
    if (!publisher?.actorId) return;
    // An already-mounted editor cannot announce the previous account's task as
    // the new account's task. A fresh editor obtains a fresh registration.
    owner.current ??= publisher.actorId;
    if (owner.current !== publisher.actorId) return;
    publisher.publish({ token, actorId: publisher.actorId, pathname, snapshot });
    return () => publisher.remove(token);
  }, [publisher, token, pathname, snapshot]);
}

export function useDinoTask() { return useContext(TaskContext); }
