"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { AgriPublicationCommand } from "@/contracts/agri-publications";
export interface AgriPublicationDraft {
  title: string; summary: string; teamName: string; track: "" | "PEOPLE" | "DISCOVERY" | "ACTION";
  includeRepository: boolean; includeDemo: boolean; reason: string;
  basis: { submissionId: string; artifactVersionId: string } | null;
}
export const freshPublicationDraft = (): AgriPublicationDraft => ({ title:"",summary:"",teamName:"",track:"",includeRepository:false,includeDemo:false,reason:"",basis:null });
export interface AgriPublicationRecovery { draft: AgriPublicationDraft; pending: AgriPublicationCommand | null }
// Private drafts and unknown receipts live only in this tab, never in URLs or localStorage.
const records = new Map<string, AgriPublicationRecovery>();
let actor: string | null = null;
export function syncAgriPublicationActor(value: string | null) { if (value !== actor || !value) records.clear(); actor = value; }
export function isAgriPublicationActor(actorId: string) { return actor === actorId; }
export function readAgriPublicationRecovery(actorId: string, stageId: string, scope: "team" | "staff") { return actor === actorId ? records.get(JSON.stringify([actorId, stageId, scope])) : undefined; }
export function writeAgriPublicationRecovery(actorId: string, stageId: string, scope: "team" | "staff", value: AgriPublicationRecovery | null) {
  if (actor !== actorId) return;
  const key=JSON.stringify([actorId, stageId, scope]); if(value) records.set(key,value); else records.delete(key);
}
export function AgriPublicationSessionBoundary() {
  const { data, status }=useSession(); const current=data?.user?.id ?? null;
  useEffect(()=>{ if(status !== "loading") syncAgriPublicationActor(status === "authenticated" ? current : null); },[current,status]);
  return null;
}
