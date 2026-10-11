"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { AgriTaskCommand, AgriTaskDetail, AgriTaskEditable } from "@/contracts/agri-tasks";

export type AgriTaskRecovery = {
  detail: AgriTaskDetail | null;
  draft: AgriTaskEditable;
  baseline: string;
  pending: AgriTaskCommand | null;
  conflict: boolean;
};
type Recovery = { editor?: AgriTaskRecovery; initialization?: AgriTaskCommand };
// Tab memory only: no private inputs in localStorage, URLs or a shared server cache.
const recoveries = new Map<string, Recovery>();
let observedActor: string | null = null;
const key = (actorId: string, competitionId: string) => JSON.stringify([actorId, competitionId]);
export function readAgriRecovery(actorId: string, competitionId: string) {
  return recoveries.get(key(actorId, competitionId));
}
export function writeAgriRecovery(actorId: string, competitionId: string, value: Recovery) {
  const id = key(actorId, competitionId);
  if (value.editor || value.initialization) recoveries.set(id, value);
  else recoveries.delete(id);
}
export function clearAgriRecoveries() { recoveries.clear(); }
export function AgriTaskSessionBoundary() {
  const { data, status } = useSession();
  const actorId = data?.user?.id ?? null;
  useEffect(() => {
    if (status === "loading") return;
    if (!actorId || observedActor !== actorId) clearAgriRecoveries();
    observedActor = actorId;
  }, [actorId, status]);
  return null;
}
