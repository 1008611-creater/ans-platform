"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { AgriOnsiteCommand, AgriOnsiteFields, AgriOnsiteItemView } from "@/contracts/agri-onsite";
type OnsiteDraftFields = Omit<AgriOnsiteFields, "operations"> & { operations: Omit<AgriOnsiteFields["operations"], "schedule"> & { schedule: { state: "UNKNOWN" | "TENTATIVE" | "CONFIRMED"; at: string | null } } };
export interface AgriOnsiteEditor {
  kind: "create" | "draft" | "operations"; itemId: string | null; expectedRevision: number | null;
  fields: OnsiteDraftFields; baseline: AgriOnsiteFields; scheduleLocal: string; baselineScheduleLocal: string; demoCheckId: string | null;
}
export interface AgriOnsiteRecovery { editor: AgriOnsiteEditor | null; pending: AgriOnsiteCommand | null }
const records = new Map<string, AgriOnsiteRecovery>(); let actor: string | null = null;
const key = (actorId: string, scope: string, submissionId: string | null) => JSON.stringify([actorId, scope, submissionId]);
export function syncAgriOnsiteActor(value: string | null) { if (value !== actor || !value) records.clear(); actor = value; }
export function readAgriOnsiteRecovery(actorId: string, scope: string, submissionId: string | null) { return actor === actorId ? records.get(key(actorId, scope, submissionId)) : undefined; }
export function writeAgriOnsiteRecovery(actorId: string, scope: string, submissionId: string | null, value: AgriOnsiteRecovery | null) { if (actor !== actorId) return; if (value) records.set(key(actorId, scope, submissionId), value); else records.delete(key(actorId, scope, submissionId)); }
export function freshAgriOnsiteFields(): AgriOnsiteFields { return { title: "", mode: "LIVE", summary: "", backupSummary: "", operations: { device: "", conditions: "", schedule: { state: "UNKNOWN", at: null }, status: "NOT_STARTED", result: null } }; }
export function onsiteLocalTime(at: string | null) { return at ? new Date(new Date(at).getTime() + 8 * 3600000).toISOString().slice(0, 16) : ""; }
export function onsiteEditorDirty(editor: AgriOnsiteEditor | null) { return !!editor && (JSON.stringify(editor.fields) !== JSON.stringify(editor.baseline) || editor.scheduleLocal !== editor.baselineScheduleLocal || editor.kind === "create" && editor.demoCheckId !== null); }
export function AgriOnsiteSessionBoundary() { const { data, status } = useSession(); const current = data?.user?.id ?? null; useEffect(() => { if (status !== "loading") syncAgriOnsiteActor(current); }, [current, status]); return null; }

// Retain only explicitly changed fields when the user reviews a newer revision.
export function rebaseAgriOnsiteEditor(editor: AgriOnsiteEditor, item: AgriOnsiteItemView): AgriOnsiteEditor {
  const old = editor.baseline, own = editor.fields, latest = item.fields;
  const scheduleChanged = JSON.stringify(own.operations.schedule) !== JSON.stringify(old.operations.schedule) || editor.scheduleLocal !== editor.baselineScheduleLocal;
  const completionChanged = own.operations.status !== old.operations.status || own.operations.result !== old.operations.result;
  const fields: OnsiteDraftFields = { ...latest, operations: { ...latest.operations,
    device: own.operations.device !== old.operations.device ? own.operations.device : latest.operations.device,
    conditions: own.operations.conditions !== old.operations.conditions ? own.operations.conditions : latest.operations.conditions,
    schedule: scheduleChanged ? own.operations.schedule : latest.operations.schedule,
    ...(completionChanged ? { status: own.operations.status, result: own.operations.result } : {}),
  } };
  if (editor.kind === "draft") for (const name of ["title", "mode", "summary", "backupSummary"] as const) {
    if (own[name] !== old[name]) Object.assign(fields, { [name]: own[name] });
  }
  return { ...editor, expectedRevision: item.revision, fields, baseline: latest, scheduleLocal: scheduleChanged ? editor.scheduleLocal : onsiteLocalTime(latest.operations.schedule.at), baselineScheduleLocal: onsiteLocalTime(latest.operations.schedule.at) };
}
