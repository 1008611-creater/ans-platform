"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { AgriReviewCommand, AgriReviewItem } from "@/contracts/agri-reviews";
export interface AgriReviewDraft {
  result: AgriReviewItem["result"]; basis: AgriReviewItem["basis"];
  items: Array<{ key: string; result: "PASS" | "NEEDS_ACTION" | "UNREACHABLE" | "NOT_APPLICABLE"; note: string }>;
  internalNote: string; feedback: Record<string,string>;
}
export interface AgriReviewRecovery { draft: AgriReviewDraft; pending: AgriReviewCommand | null }
const records = new Map<string,AgriReviewRecovery>();
let actor: string | null = null;
export function syncAgriReviewActor(value: string | null) { if (value !== actor || !value) records.clear(); actor = value; }
export function readAgriReviewRecovery(actorId: string, submissionId: string) { return actor === actorId ? records.get(JSON.stringify([actorId,submissionId])) : undefined; }
export function writeAgriReviewRecovery(actorId: string, submissionId: string, value: AgriReviewRecovery | null) {
  if (actor !== actorId) return;
  const key = JSON.stringify([actorId,submissionId]); if (value) records.set(key,value); else records.delete(key);
}
export function AgriReviewSessionBoundary() {
  const {data,status} = useSession(); const current = data?.user?.id ?? null;
  useEffect(()=>{ if(status !== "loading") syncAgriReviewActor(current); },[current,status]);
  return null;
}
