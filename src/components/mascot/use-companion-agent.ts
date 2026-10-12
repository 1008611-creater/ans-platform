"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, AgentInput, AgentLink, AgentQuote, AgentReceipt } from "@/contracts/companion-agent";
import { DEFAULT_RUN_MODEL, type RunModelKey } from "@/lib/run-models";
export type AgentPhase = "idle" | "quoting" | "confirm" | "thinking" | "reading" | "answering" | "complete" | "error" | "stopped";
export type CompanionMessage = { id: number; role: "guide" | "user"; text: string };
export function conversationInput(messages: CompanionMessage[], text: string, pathname: string, locale: "zh" | "en", privateAccess: boolean, model: RunModelKey = DEFAULT_RUN_MODEL): AgentInput {
  const history = [...messages.filter(item => item.text.trim()).map(item => ({ role: item.role === "guide" ? "assistant" as const : "user" as const, content: item.text.slice(0, 2400) })), { role: "user" as const, content: text.trim().slice(0, 1200) }].slice(-12);
  while (history.length > 1 && history.reduce((sum, item) => sum + item.content.length, 0) > 9000) history.shift();
  // Send a route hint only. Search strings, document content and form values stay out.
  return { messages: history, pathname, locale, privateAccess, model };
}
export function useCompanionAgent(actor: string | null, pathname: string, locale: "zh" | "en", onAnswer: (text: string, links: AgentLink[]) => void, onUser: (text: string) => void, model: RunModelKey = DEFAULT_RUN_MODEL) {
  const [phase, setPhase] = useState<AgentPhase>("idle");
  const [quote, setQuote] = useState<AgentQuote | null>(null);
  const [privateAccess, setPrivateAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<AgentReceipt[]>([]);
  const [tools, setTools] = useState<{ name: string; ok: boolean }[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const operation = useRef<AbortController | null>(null), generation = useRef(0);
  const pending = useRef<AgentInput | null>(null), lastTicket = useRef<string | null>(null);
  const callbacks = useRef({ onAnswer, onUser }); callbacks.current = { onAnswer, onUser };
  const busy = ["quoting", "thinking", "reading", "answering"].includes(phase);
  const post = useCallback(async (body: unknown, signal?: AbortSignal) => {
    const response = await fetch("/api/mascot/agent", { method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actor ?? "" }, body: JSON.stringify(body), signal });
    if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(typeof data?.error === "string" ? data.error : "AGENT_UNAVAILABLE"); }
    return response;
  }, [actor]);
  const reset = useCallback(() => {
    ++generation.current; operation.current?.abort(); operation.current = null;
    pending.current = null; lastTicket.current = null;
    setPrivateAccess(false); setQuote(null); setError(null); setTools([]); setReceipts([]); setActiveTool(null); setPhase("idle");
  }, []);
  useEffect(() => { reset(); return () => reset(); }, [actor, model, reset]);
  useEffect(() => {
    ++generation.current; operation.current?.abort(); operation.current = null;
    pending.current = null; setQuote(null); setPrivateAccess(false); setActiveTool(null);
    setPhase(lastTicket.current ? "stopped" : "idle");
  }, [pathname]);
  async function prepare(input: AgentInput) {
    const id = ++generation.current;
    operation.current?.abort(); const controller = new AbortController(); operation.current = controller;
    pending.current = input; setPhase("quoting"); setError(null); setQuote(null); setTools([]); setReceipts([]);
    try {
      const response = await post({ action: "quote", input }, controller.signal);
      const next: AgentQuote = await response.json();
      if (generation.current !== id) return;
      setQuote(next); setPhase("confirm");
    } catch (cause) {
      if (generation.current !== id) return;
      setError(cause instanceof Error ? cause.message : "AGENT_UNAVAILABLE"); setPhase("error");
    } finally { if (generation.current === id) operation.current = null; }
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
    const id = ++generation.current;
    const controller = new AbortController(); operation.current = controller;
    lastTicket.current = approved.ticket; setPhase("thinking"); setQuote(null); setError(null);
    callbacks.current.onUser(input.messages.at(-1)!.content);
    let answered = false, done = false, failed = false;
    try {
      const response = await post({ action: "execute", input, ticket: approved.ticket }, controller.signal);
      const reader = response.body?.getReader(); if (!reader) throw new Error("AGENT_RESPONSE_UNAVAILABLE");
      const decoder = new TextDecoder(); let buffer = "";
      try {
        while (true) {
          const chunk = await reader.read(); if (chunk.done) break;
          if (generation.current !== id) { await reader.cancel(); return; }
          buffer += decoder.decode(chunk.value, { stream: true });
          if (buffer.length > 150000) throw new Error("AGENT_RESPONSE_UNAVAILABLE");
          let end: number;
          while ((end = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, end); buffer = buffer.slice(end + 1); if (!line) continue;
            const event: AgentEvent = JSON.parse(line);
            if (event.type === "phase") { setPhase(event.phase); setActiveTool(event.tool ?? null); }
            if (event.type === "tool") setTools(current => [...current, { name: event.name, ok: event.ok }]);
            if (event.type === "answer") { answered = true; callbacks.current.onAnswer(event.text, event.links); }
            if (event.type === "receipt") setReceipts(event.receipts);
            if (event.type === "error") { failed = true; setError(event.code); setPhase("error"); }
            if (event.type === "done") done = true;
          }
        }
      } finally { reader.releaseLock(); }
      if (!done || (!answered && !failed)) throw new Error("RESPONSE_INTERRUPTED");
      if (answered && !failed) setPhase("complete");
    } catch (cause) {
      if (generation.current !== id) return;
      setError(cause instanceof Error ? cause.message : "AGENT_RESPONSE_UNAVAILABLE"); setPhase("error");
    } finally { if (generation.current === id) { operation.current = null; pending.current = null; setActiveTool(null); } }
  }
  function stop() {
    ++generation.current; operation.current?.abort(); operation.current = null;
    setQuote(null); pending.current = null; setPhase("stopped"); setActiveTool(null);
  }
  async function refreshReceipts() {
    const ticket = lastTicket.current; if (!ticket || busy || quote) return;
    const id = ++generation.current;
    try {
      const response = await post({ action: "status", ticket });
      const data = await response.json(); if (generation.current === id) setReceipts(data.receipts);
    } catch (cause) { if (generation.current === id) setError(cause instanceof Error ? cause.message : "AGENT_RESPONSE_UNAVAILABLE"); }
  }
  return { phase, quote, error, receipts, tools, activeTool, busy, privateAccess, ask, allowPrivate, confirm, stop, reset, refreshReceipts, question: pending.current?.messages.at(-1)?.content ?? "", hasTicket: Boolean(lastTicket.current) && !quote };
}
