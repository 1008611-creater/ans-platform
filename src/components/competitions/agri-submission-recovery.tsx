"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { AgriStageDetail, AgriStageDraft, AgriStageSubmissionCommand } from "@/contracts/agri-submissions";
export type SubmissionRecovery = { detail: AgriStageDetail; draft: AgriStageDraft; baseline: string; pending: AgriStageSubmissionCommand | null; conflict: boolean };
// Private inputs stay in tab memory. Never persist them in URLs or browser storage.
const recoveries = new Map<string, SubmissionRecovery>();
let actor: string | null = null;
export const readSubmissionRecovery = (actorId: string, stageId: string) => recoveries.get(JSON.stringify([actorId, stageId]));
export function writeSubmissionRecovery(actorId: string, stageId: string, value: SubmissionRecovery | null) {
  const key = JSON.stringify([actorId, stageId]);
  if (value) recoveries.set(key, value); else recoveries.delete(key);
}
export function clearSubmissionRecoveries() { recoveries.clear(); }
export function AgriSubmissionSessionBoundary() {
  const { data, status } = useSession(); const current = data?.user?.id ?? null;
  useEffect(() => { if (status === "loading") return; if (!current || actor !== current) clearSubmissionRecoveries(); actor = current; }, [current, status]);
  return null;
}
