"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { z } from "zod";
import type { agriRecordArchiveCommandSchema } from "@/contracts/agri-record-archive";
export type AgriArchiveCommand = z.infer<typeof agriRecordArchiveCommandSchema>;
const pending = new Map<string, AgriArchiveCommand>(); let actor: string | null = null;
const key = (actorId: string, submissionId: string) => JSON.stringify([actorId, submissionId]);
export function syncAgriArchiveActor(value: string | null) { if (actor !== value || !value) pending.clear(); actor = value; }
export function readAgriArchivePending(actorId: string, submissionId: string) { return actor === actorId ? pending.get(key(actorId, submissionId)) ?? null : null; }
export function writeAgriArchivePending(actorId: string, submissionId: string, command: AgriArchiveCommand | null) { if (actor !== actorId) return; if (command) pending.set(key(actorId, submissionId), command); else pending.delete(key(actorId, submissionId)); }
export function AgriArchiveSessionBoundary() { const { data, status } = useSession(); const current = data?.user?.id ?? null; useEffect(() => { if (status !== "loading") syncAgriArchiveActor(current); }, [current, status]); return null; }