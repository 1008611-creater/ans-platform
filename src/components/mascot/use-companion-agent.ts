"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, AgentInput, AgentLink, AgentQuote, AgentReceipt } from "@/contracts/companion-agent";
import { DEFAULT_RUN_MODEL, type RunModelKey } from "@/lib/run-models";
import { useAgentRecovery } from "./use-agent-recovery";
export type AgentPhase = "idle" | "quoting" | "confirm" | "thinking" | "reading" | "answering" | "complete" | "error" | "stopped";
export type CompanionMessage = { id: number; role: "guide" | "user"; text: string };
export function conversationInput(messages: CompanionMessage[], text: string, pathname: string, locale: "zh" | "en", privateAccess: boolean, model: RunModelKey = DEFAULT_RUN_MODEL): AgentInput {
  const history = [...messages.filter(item => item.text.trim()).map(item => ({ role: item.role === "guide" ? "assistant" as const : "user" as const, content: item.text.slice(0, 2400) })), { role: "user" as const, content: text.trim().slice(0, 1200) }].slice(-12);
  while (history.length > 1 && history.reduce((sum, item) => sum + item.content.length, 0) > 9000) history.shift();
  // Send a route hint only. Search strings, document content and form values stay out.
  return { messages: history, pathname, locale, privateAccess, model };
}
export function useCompanionAgent(actor: string | null, pathname: string, locale: "zh" | "en", onAnswer: (text: string, links: AgentLink[]) => void, onUser: (text: string) => void, model: RunModelKey = DEFAULT_RUN_MODEL, storageReady = true) {
  const recovery = useAgentRecovery(actor, storageReady);
  const [phase, setPhase] = useState<AgentPhase>("idle");
  const [quote, setQuote] = useState<AgentQuote | null>(null);
  const [privateAccess, setPrivateAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<AgentReceipt[]>([]);
  const [tools, setTools] = useState<{ name: string; ok: boolean }[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [checkingReceipts, setCheckingReceipts] = useState(false);
  const [receiptChecked, setReceiptChecked] = useState(false);
  const operation = useRef<AbortController | null>(null), generation = useRef(0);
  const pending = useRef<AgentInput | null>(null), lastTicket = useRef<string | null>(null);
  const stage = useRef<"quote" | "execute" | "status" | null>(null);
  const callbacks = useRef({ onAnswer, onUser }); callbacks.current = { onAnswer, onUser };
  const busy = ["quoting", "thinking", "reading", "answering"].includes(phase);
  const post = useCallback(async (body: unknown, signal?: AbortSignal) => {
    const response = await fetch("/api/mascot/agent", { method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actor ?? "" }, body: JSON.stringify(body), signal });
    if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(typeof data?.error === "string" ? data.error : "AGENT_UNAVAILABLE"); }
    return response;
  }, [actor]);
  const reset = useCallback(() => {
    ++generation.current; operation.current?.abort(); operation.current = null;
    pending.current = null; lastTicket.current = null; stage.current = null;
    setCheckingReceipts(false); setReceiptChecked(false);
    setPrivateAccess(false); setQuote(null); setError(null); setTools([]); setReceipts([]); setActiveTool(null); setPhase("idle");
  }, []);
  useEffect(() => { reset(); return () => reset(); }, [actor, reset]);
  const cancelQuote = useCallback(() => {
    if (stage.current === "execute" || stage.current === "status") return;
    ++generation.current; operation.current?.abort(); operation.current = null; stage.current = null;
    pending.current = null; setQuote(null); setPrivateAccess(false);
    // Changing a model must not erase the recovery handle for a submitted turn.
    if (!lastTicket.current) { setPhase("idle"); setError(null); setActiveTool(null); }
  }, []);
  useEffect(() => { cancelQuote(); }, [model, cancelQuote]);
  useEffect(() => {
    ++generation.current; operation.current?.abort(); operation.current = null; stage.current = null;
    pending.current = null; setQuote(null); setPrivateAccess(false); setActiveTool(null); setCheckingReceipts(false);
    setPhase(current => ["quoting", "confirm"].includes(current) ? "idle" : ["thinking", "reading", "answering"].includes(current) ? "stopped" : current);
  }, [pathname]);
  async function prepare(input: AgentInput) {
    if (stage.current === "execute" || stage.current === "status") return;
    const id = ++generation.current;
    operation.current?.abort(); const controller = new AbortController(); operation.current = controller;
    stage.current = "quote"; pending.current = input; lastTicket.current = null;
    setPhase("quoting"); setError(null); setQuote(null); setTools([]); setReceipts([]); setReceiptChecked(false); setActiveTool(null);
    try {
      const response = await post({ action: "quote", input }, controller.signal);
      const next: AgentQuote = await response.json();
      if (generation.current !== id) return;
      setQuote(next); setPhase("confirm");
    } catch (cause) {
      if (generation.current !== id) return;
      setError(cause instanceof Error ? cause.message : "AGENT_UNAVAILABLE"); setPhase("error");
    } finally { if (generation.current === id) { operation.current = null; stage.current = null; } }
  }
  function ask(messages: CompanionMessage[], text: string) { return prepare(conversationInput(messages, text, pathname, locale, privateAccess, model)); }
  function allowPrivate(value: boolean) {
    setPrivateAccess(value);
    if (pending.current) void prepare({ ...pending.current, privateAccess: value });
  }
  async function confirm() {
    const input = pending.current, approved = quote;
    if (!input || !approved || busy || operation.current) return;
    if (Date.now() > approved.expiresAt) { setQuote(null); setError("QUOTE_EXPIRED"); setPhase("error"); return; }
    if (!recovery.remember(approved)) { setQuote(null); setError("AGENT_RESPONSE_UNAVAILABLE"); setPhase("error"); return; }
    const id = ++generation.current;
    const controller = new AbortController(); operation.current = controller; stage.current = "execute";
    lastTicket.current = approved.ticket; setPhase("thinking"); setQuote(null); setError(null);
    callbacks.current.onUser(input.messages.at(-1)!.content);
    let answered = false, done = false, failed = false;
    try {
      const response = await post({ action: "execute", input, ticket: approved.ticket }, controller.signal);
      const reader = response.body?.getReader(); if (!reader) throw new Error("AGENT_RESPONSE_UNAVAILABLE");
      const decoder = new TextDecoder(); let buffer = "";
      const receive = (line: string) => {
        if (!line.trim() || generation.current !== id) return;
        const event: AgentEvent = JSON.parse(line);
        if (event.type === "phase" && !failed && !answered) { setPhase(event.phase); setActiveTool(event.tool ?? null); }
        if (event.type === "tool") setTools(current => [...current, { name: event.name, ok: event.ok }]);
        if (event.type === "answer" && !answered) { answered = true; callbacks.current.onAnswer(event.text, event.links); }
        if (event.type === "receipt") setReceipts(event.receipts);
        if (event.type === "error") { failed = true; setError(event.code); setPhase("error"); }
        if (event.type === "done") done = true;
      };
      try {
        while (true) {
          const chunk = await reader.read();
          if (generation.current !== id) { await reader.cancel(); return; }
          if (chunk.done) { buffer += decoder.decode(); if (buffer.trim()) receive(buffer); break; }
          buffer += decoder.decode(chunk.value, { stream: true });
          if (buffer.length > 150000) throw new Error("AGENT_RESPONSE_UNAVAILABLE");
          let end: number;
          while ((end = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, end); buffer = buffer.slice(end + 1); receive(line);
          }
        }
      } finally { reader.releaseLock(); }
      if (!done || (!answered && !failed)) throw new Error("RESPONSE_INTERRUPTED");
      if (answered && !failed) setPhase("complete");
    } catch (cause) {
      if (generation.current !== id) return;
      setError(cause instanceof Error ? cause.message : "AGENT_RESPONSE_UNAVAILABLE"); setPhase("error");
    } finally { if (generation.current === id) { operation.current = null; stage.current = null; pending.current = null; setActiveTool(null); } }
  }
  function stop() {
    if (stage.current === "status") return;
    ++generation.current; operation.current?.abort(); operation.current = null; stage.current = null;
    setQuote(null); setPhase("stopped"); setActiveTool(null);
    if (lastTicket.current) pending.current = null;
  }
  async function refreshReceipts() {
    const ticket = lastTicket.current; if (!ticket || busy || quote || operation.current) return;
    const id = ++generation.current, controller = new AbortController();
    operation.current = controller; stage.current = "status"; setCheckingReceipts(true); setReceiptChecked(false);
    try {
      const response = await post({ action: "status", ticket }, controller.signal);
      const data = await response.json();
      if (generation.current === id) { setReceipts(data.receipts); setReceiptChecked(true); }
    } catch (cause) { if (generation.current === id) setError(cause instanceof Error ? cause.message : "AGENT_RESPONSE_UNAVAILABLE"); }
    finally { if (generation.current === id) { operation.current = null; stage.current = null; setCheckingReceipts(false); } }
  }
  const canRetryQuote = ["error", "stopped"].includes(phase) && Boolean(pending.current) && !lastTicket.current && !checkingReceipts;
  function retryQuote() { if (canRetryQuote && pending.current) return prepare(pending.current); }
  return { recovery, currentTicket: lastTicket.current, phase, quote, error, receipts, tools, activeTool, busy, privateAccess, ask, allowPrivate, confirm, stop, reset, cancelQuote, refreshReceipts, checkingReceipts, receiptChecked, canRetryQuote, retryQuote,
    question: pending.current?.messages.at(-1)?.content ?? "", hasTicket: Boolean(lastTicket.current) && !quote };
}
