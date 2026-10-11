"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { AgriDemoCommand, AgriDemoSnapshot } from "@/contracts/agri-demo";
export interface AgriDemoDraft {
  basis: "METADATA" | "PRIVATE_MATERIALS";
  demo: AgriDemoSnapshot;
  dueAtLocal: string;
  internalNote: string;
  feedback: Record<string, string>;
}
export interface AgriDemoRecovery { draft: AgriDemoDraft; pending: AgriDemoCommand | null }
const records = new Map<string, AgriDemoRecovery>();
let actor: string | null = null;
export function syncAgriDemoActor(value: string | null) { if (value !== actor || !value) records.clear(); actor = value; }
export function readAgriDemoRecovery(actorId: string, submissionId: string) { return actor === actorId ? records.get(JSON.stringify([actorId, submissionId])) : undefined; }
export function writeAgriDemoRecovery(actorId: string, submissionId: string, value: AgriDemoRecovery | null) {
  if (actor !== actorId) return;
  const key = JSON.stringify([actorId, submissionId]);
  if (value) records.set(key, value); else records.delete(key);
}
export function freshAgriDemoDraft(): AgriDemoDraft {
  const condition = () => ({ status: "NOT_TESTED" as const, note: "" });
  return { basis: "METADATA", demo: { schemaVersion: 1, mode: "LIVE", description: "", device: condition(), compatibility: condition(), network: condition(), audio: condition(), backup: { ...condition(), url: null, artifactVersionId: null }, conclusion: "NEEDS_ACTION", recheckDue: { state: "UNKNOWN", at: null } }, dueAtLocal: "", internalNote: "", feedback: {} };
}
export function AgriDemoSessionBoundary() {
  const { data, status } = useSession(); const current = data?.user?.id ?? null;
  useEffect(() => { if (status !== "loading") syncAgriDemoActor(current); }, [current, status]);
  return null;
}
