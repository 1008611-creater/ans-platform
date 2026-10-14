"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { AgentQuote, AgentReceipt } from "@/contracts/companion-agent";
import { COMPANION_RECOVERY_LIMIT, readSubmittedAgentTurns, saveSubmittedAgentTurns, submittedAgentTurn, type SubmittedAgentTurn } from "./companion-session";
export type RecoverableAgentTurn = SubmittedAgentTurn & { checking: boolean; checked: boolean; error: boolean; receipts: AgentReceipt[] };
const statusSchema = z.object({ receipts: z.array(z.object({ requestId: z.string().min(1).max(160), state: z.enum(["AUTHORIZED", "RUNNING", "UNCERTAIN", "SETTLED", "RELEASED"]), reservedPoints: z.number().finite().nonnegative(), settledPoints: z.number().finite().nonnegative().nullable() }).strict()).max(3) }).strict();
const fresh = (turn: SubmittedAgentTurn): RecoverableAgentTurn => ({ ...turn, checking: false, checked: false, error: false, receipts: [] });
const descriptor = ({ ticket, requestId, model, submittedAt, statusUntil }: SubmittedAgentTurn): SubmittedAgentTurn => ({ ticket, requestId, model, submittedAt, statusUntil });
/** A recovery descriptor is never executable input. Only the authenticated status endpoint is used. */
export function useAgentRecovery(actor: string | null, storageReady: boolean) {
  const [turns, setTurns] = useState<RecoverableAgentTurn[]>([]);
  const current = useRef<RecoverableAgentTurn[]>([]), generation = useRef(0), controllers = useRef(new Map<string, AbortController>());
  const publish = useCallback((next: RecoverableAgentTurn[]) => {
    current.current = next; setTurns(next);
    if (actor) saveSubmittedAgentTurns(actor, next.map(descriptor));
  }, [actor]);
  const check = useCallback(async (requestId: string) => {
    const turn = current.current.find(item => item.requestId === requestId);
    if (!actor || !turn || controllers.current.has(requestId)) return;
    if (turn.statusUntil <= Date.now()) { publish(current.current.filter(item => item.requestId !== requestId)); return; }
    const id = generation.current, controller = new AbortController(); controllers.current.set(requestId, controller);
    publish(current.current.map(item => item.requestId === requestId ? { ...item, checking: true, error: false } : item));
    try {
      const response = await fetch("/api/mascot/agent", { method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actor }, body: JSON.stringify({ action: "status", ticket: turn.ticket }), signal: controller.signal });
      if (generation.current !== id) return;
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (generation.current !== id) return;
        if (["QUOTE_EXPIRED", "ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE", "UNAUTHORIZED"].includes(body?.error)) {
          publish(current.current.filter(item => item.requestId !== requestId)); return;
        }
        throw new Error("STATUS_UNAVAILABLE");
      }
      const body = statusSchema.parse(await response.json());
      if (generation.current !== id) return;
      publish(current.current.map(item => item.requestId === requestId ? { ...item, checking: false, checked: true, error: false, receipts: body.receipts } : item));
    } catch { if (generation.current === id) publish(current.current.map(item => item.requestId === requestId ? { ...item, checking: false, error: true } : item)); }
    finally { if (generation.current === id) controllers.current.delete(requestId); }
  }, [actor, publish]);
  useEffect(() => {
    if (!storageReady) return;
    const loaded = readSubmittedAgentTurns(actor).map(fresh);
    current.current = loaded; setTurns(loaded);
    for (const turn of loaded) void check(turn.requestId);
    return () => {
      ++generation.current;
      for (const controller of controllers.current.values()) controller.abort();
      controllers.current.clear(); current.current = [];
    };
  }, [actor, storageReady, check]);
  useEffect(() => {
    if (!turns.length) return;
    const nextExpiry = Math.min(...turns.map(item => item.statusUntil));
    const timer = window.setTimeout(() => publish(current.current.filter(item => item.statusUntil > Date.now())), Math.max(0, nextExpiry - Date.now()));
    return () => window.clearTimeout(timer);
  }, [turns, publish]);
  function remember(quote: AgentQuote) {
    if (!actor) return false;
    let turn: SubmittedAgentTurn;
    try { turn = submittedAgentTurn(quote); } catch { return false; }
    publish([...current.current.filter(item => item.requestId !== turn.requestId && item.statusUntil > Date.now()), fresh(turn)].slice(-COMPANION_RECOVERY_LIMIT));
    return true;
  }
  return { turns, check, remember };
}
