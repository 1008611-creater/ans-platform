"use client";

import { useVoiceOffer } from "./use-voice-offer";

import { lazy, Suspense, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowUp, ArrowDown, ArrowUpRight, Square, X, Settings, Volume2, VolumeX, Sparkles, FolderPlus, Clapperboard, Coins, Users, Compass, BookOpen, RotateCcw, Maximize2, MoveUpLeft } from "lucide-react";
import { DinoAvatar, type SpeechRequest } from "./dino-avatar";
import { useDinoTask } from "./dino-task-context";
import { guideReply, pageActions, pagePrompts, type GuideAction } from "./guide-actions";
import { WorkspaceLink as Link } from "@/components/providers/workspace-navigation";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { openSiteSettings, updateSitePreferences, useSitePreferences } from "@/lib/site-preferences";
import { useCompanionAgent, type CompanionMessage } from "./use-companion-agent";
import { AgentTurnStatus } from "./agent-turn-status";
import { activateCompanionActor, readCompanionConversation, saveCompanionConversation } from "./companion-session";
import { AgentRecoveryStatus } from "./agent-recovery-status";
import { CompanionModelSelect } from "./companion-model-select";
import { DEFAULT_COMPANION_MODEL, getRunModel, type RunModelKey } from "@/lib/run-models";
import { useCompanionSize } from "./use-companion-size";
import { CompanionQuestPin, CompanionSanctuaryBar } from "./companion-sanctuary-bar";
import "./companion.css";

const CompanionReply = lazy(() => import("./companion-reply").then(module => ({ default: module.CompanionReply })));
const icons = { project: FolderPlus, video: Clapperboard, credits: Coins, team: Users, discover: Compass, learn: BookOpen };
type Mode = "guide" | "agent";
type Thread = { draft: string; messages: CompanionMessage[]; recommendations: GuideAction[] | null };
const freshThread = (): Thread => ({ draft: "", messages: [], recommendations: null });
export function DinoGuide() {
  const { data, status } = useSession();
  useEffect(() => { if (status !== "loading") activateCompanionActor(status === "authenticated" ? data?.user?.id ?? null : null); }, [status, data?.user?.id]);
  return <Companion storageReady={status !== "loading"} key={status === "authenticated" ? (data?.user?.id ?? "authenticated") : "guest"} actor={status === "authenticated" ? data?.user?.id ?? null : null} />;
}
function Companion({ actor, storageReady }: { actor: string | null; storageReady: boolean }) {
  const t = useTranslations("product.mascot"), ui = useTranslations("companion");
  const pathname = usePathname(), locale = useLocale() === "zh" ? "zh" : "en";
  const [model, setModel] = useState<RunModelKey>(DEFAULT_COMPANION_MODEL);
  const [mode, setMode] = useState<Mode>(actor ? "agent" : "guide");
  const [threads, setThreads] = useState<Record<Mode, Thread>>(() => ({ agent: freshThread(), guide: freshThread() }));
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const { draft, messages, recommendations } = threads[mode];
  function updateThread(which: Mode, update: (thread: Thread) => Thread) {
    setThreads(current => ({ ...current, [which]: update(current[which]) }));
  }
  const [undo, setUndo] = useState<{ mode: Mode; thread: Thread } | null>(null);
  const prefs = useSitePreferences(), task = useDinoTask(), panelSize = useCompanionSize();
  const voiceOffer = useVoiceOffer(actor, prefs.voice);
  const [open, setOpen] = useState(false), [showLatest, setShowLatest] = useState(false), [unread, setUnread] = useState(false);
  const [requestedTab, setRequestedTab] = useState<"none" | "pi" | "pet" | "wardrobe" | "secrets" | "adopt" | null>(null);
  const [speech, setSpeech] = useState<SpeechRequest | null>(null), [voiceStatus, setVoiceStatus] = useState("idle");
  const sequence = useRef(0), welcomed = useRef(false), focusTarget = useRef<string | null>(null), list = useRef<HTMLDivElement>(null);
  const scrollState = useRef<Record<Mode, { top: number; follow: boolean; lastId: number | undefined }>>({ agent: { top: 0, follow: true, lastId: undefined }, guide: { top: 0, follow: true, lastId: undefined } });
  const titleId = useId(), taskId = useId(), composer = useRef<HTMLTextAreaElement>(null);
  const agent = useCompanionAgent(actor, pathname, locale, (text, links) => {
    updateThread("agent", current => ({ ...current, messages: [...current.messages, { id: ++sequence.current, role: "guide" as const, text }].slice(-40), recommendations: links.length ? links : pageActions(pathname, ui) }));
    // The iframe receives a public acknowledgement only, never the user's private reply.
    setSpeech({ id: ++sequence.current, text: ui("agentSpokenReady") });
  }, text => {
    scrollState.current.agent.follow = true;
    updateThread("agent", current => ({ ...current, draft: current.draft.trim() === text ? "" : current.draft, messages: [...current.messages, { id: ++sequence.current, role: "user" as const, text }].slice(-40) }));
    setUndo(null);
  }, model, storageReady);
  useEffect(() => {
    if (!storageReady) return;
    const saved = readCompanionConversation(actor);
    if (saved) {
      setThreads({ agent: { ...saved.threads.agent, recommendations: null }, guide: { ...saved.threads.guide, recommendations: null } });
      setMode(saved.mode === "agent" && !actor ? "guide" : saved.mode);
      sequence.current = Math.max(0, ...Object.values(saved.threads).flatMap(thread => thread.messages.map(item => item.id)));
    }
    setSessionLoaded(true);
  }, [actor, storageReady]);
  useEffect(() => { if (sessionLoaded && storageReady) saveCompanionConversation(actor, mode, threads); }, [actor, sessionLoaded, storageReady, mode, threads]);
  const greeting = ui(mode === "agent" ? "agentGreeting" : "whatWouldYouLikeToMakeTell");
  const nextActions = recommendations ?? pageActions(pathname, ui);
  const blocked = mode === "agent" && (agent.busy || agent.phase === "confirm" || agent.checkingReceipts);
  const modelStorageKey = `ans.companion-model.v1:${actor ?? "guest"}`;
  useEffect(() => {
    try { const option = getRunModel(localStorage.getItem(modelStorageKey) ?? ""); if (option) setModel(option.key); } catch { /* Browser storage is optional. */ }
  }, [modelStorageKey]);
  function changeModel(value: RunModelKey) {
    setModel(value);
    try { localStorage.setItem(modelStorageKey, value); } catch { /* Keep the current choice in memory. */ }
  }
  useEffect(() => {
    setThreads(current => ({ agent: { ...current.agent, recommendations: null }, guide: { ...current.guide, recommendations: null } }));
    setOpen(false);
  }, [pathname]);
  const rememberScroll = useCallback(() => {
    const node = list.current; if (!node) return;
    const follow = node.scrollHeight - node.scrollTop - node.clientHeight < 64;
    scrollState.current[mode].top = node.scrollTop; scrollState.current[mode].follow = follow;
    setShowLatest(!follow); if (follow) setUnread(false);
  }, [mode]);
  const scrollObserver = useRef<ResizeObserver | null>(null);
  const bindList = useCallback((node: HTMLDivElement | null) => {
    scrollObserver.current?.disconnect(); scrollObserver.current = null; list.current = node;
    if (!node) return;
    const state = scrollState.current[mode];
    node.scrollTop = state.follow && node.querySelector(".ans-companion-message") ? node.scrollHeight : state.top;
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(rememberScroll);
      for (const child of Array.from(node.children)) observer.observe(child);
      scrollObserver.current = observer;
    }
  }, [mode, rememberScroll]);
  useLayoutEffect(() => {
    if (!open || !list.current) return;
    const state = scrollState.current[mode], node = list.current;
    node.scrollTop = state.follow && node.querySelector(".ans-companion-message") ? node.scrollHeight : state.top;
    setShowLatest(!state.follow); setUnread(false);
  }, [open, mode]);
  useLayoutEffect(() => {
    const node = list.current; if (!node || !open) return;
    const state = scrollState.current[mode], latest = messages.at(-1), changed = latest?.id !== state.lastId;
    state.lastId = latest?.id;
    if (!state.follow) { if (changed && latest?.role === "guide") setUnread(true); return; }
    // Show a new answer from its beginning, so a long reply doesn't skip its first half.
    const reply = mode === "agent" && agent.phase === "confirm" ? node.querySelector<HTMLElement>(".ans-agent-quote") : changed && latest?.role === "guide" ? node.querySelector<HTMLElement>(`[data-message-id="${latest.id}"]`) : null;
    if (reply) node.scrollTop += reply.getBoundingClientRect().top - node.getBoundingClientRect().top - 16;
    else node.scrollTop = node.scrollHeight;
    rememberScroll();
  }, [messages, open, mode, agent.phase, rememberScroll]);
  useEffect(() => {
    const input = composer.current;
    if (input) { input.style.height = "auto"; input.style.height = Math.max(28, Math.min(120, input.scrollHeight)) + "px"; }
  }, [draft, open, mode]);
  useEffect(() => {
    const host = window as unknown as Record<symbol, { dispose?: () => void } | undefined>;
    host[Symbol.for("ans.mascot.companion.v1")]?.dispose?.();
  }, []);
  // 真浏览器里点击小恐龙本体是"进入近景舞台"（见下方 onClick），面板只能由站内事件打开；
  // 因此按钮的无障碍名称必须跟着这个行为走，而不是永远说"叫小恐龙帮我找方向"。
  // 用 state（而不是直接读全局）是为了避免 SSR 与首帧客户端渲染的名称不一致导致 hydration 警告。
  const [stageClickOwnsTrigger, setStageClickOwnsTrigger] = useState(false);
  useEffect(() => {
    setStageClickOwnsTrigger(typeof WebGLRenderingContext !== "undefined");
  }, []);
  function changeOpen(value: boolean) {
    if (value) {
      document.body.classList.remove("ans-dino-interactive-mode", "ans-sanctuary-open");
      panelSize.prepare();
    } else {
      rememberScroll();
    }
    setOpen(value);
    if (value && !welcomed.current) {
      welcomed.current = true;
      if (prefs.voice) { window.dispatchEvent(new CustomEvent("ans:dino-activate")); setSpeech({ id: ++sequence.current, text: greeting }); }
    }
  }
  useEffect(() => {
    function onOpenCompanionTab(event: Event) {
      const custom = event as CustomEvent<{ tab?: "none" | "pi" | "pet" | "wardrobe" | "secrets" | "adopt"; draft?: string }>;
      const targetTab = custom.detail?.tab ?? "none";
      const incomingDraft = custom.detail?.draft?.trim();
      if (incomingDraft) {
        updateThread(mode, current => ({ ...current, draft: incomingDraft }));
      }
      setRequestedTab(targetTab);
      changeOpen(true);
      window.dispatchEvent(new CustomEvent("ans:dino-activate"));
    }
    function onOpenCompanionChat(event: Event) {
      const custom = event as CustomEvent<{ draft?: string }>;
      const incomingDraft = custom.detail?.draft?.trim();
      if (incomingDraft) {
        updateThread(mode, current => ({ ...current, draft: incomingDraft }));
      }
      changeOpen(true);
      window.dispatchEvent(new CustomEvent("ans:dino-activate"));
    }
    function onEnterMacroFromDialog() {
      changeOpen(false);
    }
    window.addEventListener("ans:open-companion-tab", onOpenCompanionTab);
    window.addEventListener("ans:open-companion-chat", onOpenCompanionChat);
    window.addEventListener("ans:enter-dino-macro", onEnterMacroFromDialog);
    return () => {
      window.removeEventListener("ans:open-companion-tab", onOpenCompanionTab);
      window.removeEventListener("ans:open-companion-chat", onOpenCompanionChat);
      window.removeEventListener("ans:enter-dino-macro", onEnterMacroFromDialog);
    };
  }, [panelSize, mode]);
  function submit(event?: FormEvent, quick?: string) {
    event?.preventDefault(); const input = (quick ?? draft).trim().slice(0, 1200); if (!input || blocked) return;
    scrollState.current[mode].follow = true; setUnread(false); setUndo(null);
    if (mode === "agent") { updateThread("agent", current => ({ ...current, recommendations: null })); void agent.ask(messages, input); return; }
    const reply = guideReply(input, ui), id = ++sequence.current, responseId = ++sequence.current;
    updateThread("guide", current => ({ draft: quick ? current.draft : "", messages: [...current.messages, { id, role: "user" as const, text: input }, { id: responseId, role: "guide" as const, text: reply.text }].slice(-40), recommendations: reply.actions }));
    setSpeech({ id: ++sequence.current, text: reply.text });
  }
  function changeMode(value: Mode) {
    if (value === mode || agent.busy || agent.checkingReceipts) return;
    rememberScroll(); agent.cancelQuote(); setMode(value); setSpeech(null);
  }
  function newConversation() {
    rememberScroll(); setUndo({ mode, thread: threads[mode] });
    if (mode === "agent") { if (agent.hasTicket && ["error", "stopped"].includes(agent.phase)) agent.cancelQuote(); else agent.reset(); }
    updateThread(mode, freshThread); setSpeech(null); scrollState.current[mode] = { top: 0, follow: true, lastId: undefined };
    if (window.innerWidth >= 900) composer.current?.focus();
  }
  function restoreConversation() {
    if (!undo || undo.mode !== mode) return;
    updateThread(mode, () => undo.thread); setUndo(null); scrollState.current[mode].follow = true;
  }
  function jumpToLatest() {
    const node = list.current; if (!node) return;
    node.scrollTop = node.scrollHeight; rememberScroll();
  }
  function settings() { changeOpen(false); requestAnimationFrame(openSiteSettings); }
  function toggleVoice() {
    const voice = !prefs.voice; setSpeech(null); setVoiceStatus("idle"); updateSitePreferences({ voice });
    if (voice) window.dispatchEvent(new CustomEvent("ans:dino-activate"));
  }
  function switchToWorkMode(customPrompt?: string) {
    changeOpen(false);
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.text?.trim() ?? "";
    const q = (customPrompt ?? draft).trim() || lastUserMsg;
    if (pathname === "/workspace") {
      if (q) {
        window.dispatchEvent(new CustomEvent("ans:codex-prompt", { detail: { prompt: q } }));
      }
      const el = document.querySelector('[data-testid="pi-codex-workbench"]');
      if (el && "scrollIntoView" in el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.location.href = "/workspace" + (q ? `?prompt=${encodeURIComponent(q)}` : "");
  }
  const speaking = voiceStatus === "playing", loading = voiceStatus === "loading";
  const voiceLabel = ui(prefs.voice ? "disableDinoVoice" : "enableDinoVoice");
  const voiceHint = !actor ? ui("voiceSignIn") : prefs.voice && !voiceOffer ? ui("voiceUnavailable") : !prefs.voice ? ui("voiceOff") : voiceStatus === "error" ? ui("voiceUnavailable") : loading ? ui("preparingVoice") : speaking ? ui("speaking") : ui("voiceFree");
  const avatarPhase = agent.busy ? "working" : agent.phase === "error" ? "attention" : agent.phase === "confirm" ? "confirm" : agent.phase === "complete" ? "review" : task?.phase ?? "idle";
  return <>
    <CompanionQuestPin dialogOpen={open} onTriggerSpeech={text => setSpeech({ id: ++sequence.current, text })} />
    <div className="ans-dino-guide ans-companion-v2" data-companion-owner="react" data-open={open} data-keyboard={panelSize.keyboard} data-task-state={task?.phase ?? "idle"}>
    <Popover open={open} onOpenChange={nextOpen => {
      // 只拦"打开"：关闭（Escape / 点外部）必须放行。
      if (nextOpen && typeof WebGLRenderingContext !== "undefined") {
        return;
      }
      changeOpen(nextOpen);
    }}>
      <PopoverTrigger asChild><button type="button" aria-label={t(open ? "close" : task ? "taskOpen" : stageClickOwnsTrigger ? "openStage" : "open")} className="ans-dino-trigger" onPointerEnter={() => {
        if (typeof WebGLRenderingContext !== "undefined" && !open) {
          window.dispatchEvent(new CustomEvent("ans:dino-stage-hover", { detail: { hover: true } }));
        }
      }} onPointerLeave={() => {
        if (typeof WebGLRenderingContext !== "undefined" && !open) {
          window.dispatchEvent(new CustomEvent("ans:dino-stage-hover", { detail: { hover: false } }));
        }
      }} onClick={event => {
        if (typeof WebGLRenderingContext !== "undefined" && !open) {
          event.preventDefault();
          event.stopPropagation();
          window.dispatchEvent(new CustomEvent("ans:dino-stage-click"));
        }
      }}><DinoAvatar actor={actor} voicePolicy={voiceOffer} phase={avatarPhase} open={open} speech={speech} onVoiceStatus={setVoiceStatus} /><span className="ans-dino-pip" aria-hidden="true" /></button></PopoverTrigger>
      <PopoverAnchor virtualRef={panelSize.anchor} />
      <PopoverContent style={panelSize.style} id="ans-companion-panel" role="dialog" aria-labelledby={titleId} side="top" align="end" sideOffset={0} collisionPadding={12} className="ans-companion-panel" onOpenAutoFocus={event => {
        event.preventDefault();
        const input = window.innerWidth >= 900 && agent.phase !== "confirm" ? composer.current : null;
        (input ?? document.getElementById("ans-companion-dismiss"))?.focus({ preventScroll: true });
      }} onCloseAutoFocus={event => {
        const id = focusTarget.current; focusTarget.current = null;
        if (!id || id !== task?.targetId) return;
        const target = document.getElementById(id);
        if (!target || target.matches(":disabled") || target.closest("[inert]")) return;
        event.preventDefault(); target.scrollIntoView({ block: "center", behavior: "auto" }); target.focus({ preventScroll: true });
      }}>
        <button type="button" className="ans-companion-resize width" aria-label={ui("resizeChatWidth")} title={ui("resizeChatHint")} {...panelSize.handle("width")} />
        <button type="button" className="ans-companion-resize height" aria-label={ui("resizeChatHeight")} title={ui("resizeChatHint")} {...panelSize.handle("height")} />
        <button type="button" className="ans-companion-resize both" aria-label={ui("resizeChat")} title={ui("resizeChatHint")} {...panelSize.handle("both")}><MoveUpLeft aria-hidden="true" /></button>
        <header className="ans-companion-header">
          <div className="ans-companion-heading"><button type="button" className="ans-companion-voice" aria-label={voiceLabel} aria-pressed={prefs.voice} title={`${voiceLabel} · ${voiceHint}`} onClick={toggleVoice} disabled={!actor}>{prefs.voice ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}</button><div><span className="ans-companion-kicker">ANS / {ui("byYOURSIDE")}</span><h2 id={titleId}>{t("name")}<span aria-hidden="true" /></h2></div></div>
          <div className="ans-companion-controls">
            <button type="button" onClick={panelSize.reset} aria-label={ui("resetChatSize")} title={ui("resetChatSize")}><Maximize2 aria-hidden="true" /></button>
            <button type="button" disabled={agent.busy || agent.checkingReceipts || (!messages.length && !draft && !agent.quote)} aria-label={ui("newConversation")} title={ui("newConversation")} onClick={newConversation}><RotateCcw aria-hidden="true" /></button>
            <button type="button" aria-label={ui("openSiteSettings")} title={ui("openSiteSettings")} onClick={settings}><Settings aria-hidden="true" /></button>
            <button id="ans-companion-dismiss" type="button" aria-label={t("close")} title={t("close")} onClick={() => changeOpen(false)}><X aria-hidden="true" /></button>
          </div>
        </header>
        <div className="ans-companion-mode" role="group" aria-label={ui("conversationMode")}>
          <button type="button" aria-pressed={mode === "agent"} onClick={() => changeMode("agent")} disabled={!actor || agent.busy || agent.checkingReceipts}>
            {ui("agentMode")}
          </button>
          <button type="button" aria-pressed={mode === "guide"} onClick={() => changeMode("guide")} disabled={agent.busy || agent.checkingReceipts}>
            {ui("guideMode")}
          </button>
          <button
            type="button"
            aria-pressed={false}
            data-testid="dino-switch-work-mode"
            onClick={() => switchToWorkMode()}
          >
            {locale === "zh" ? "🛠️ 工作模式 ↗" : "🛠️ Work Mode ↗"}
          </button>
        </div>
        <CompanionSanctuaryBar
          requestedTab={requestedTab}
          currentDraft={draft}
          onRequestedTabHandled={() => setRequestedTab(null)}
          onSpeak={text => setSpeech({ id: ++sequence.current, text })}
          onSwitchToWorkMode={switchToWorkMode}
        />
        {!actor && <Link className="ans-companion-signin" href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}>{ui("agentSignIn")}<ArrowUpRight aria-hidden="true" /></Link>}
        {undo?.mode === mode && <div className="ans-companion-undo" role="status"><span>{ui("conversationCleared")}</span><button type="button" onClick={restoreConversation}>{ui("undoClear")}</button></div>}
        <div className="ans-companion-reading">
          <div className="ans-companion-body" ref={bindList} onScroll={rememberScroll}>
            {task && <section className="ans-companion-task" aria-labelledby={taskId}><div><h3 id={taskId}>{ui("currentTask")}</h3><span>{task.step}/3</span></div><p role="status">{t(`task.${task.phase}`)}</p><ol aria-label={t("taskSteps")}>{([1, 2, 3] as const).map(step => <li key={step} aria-current={step === task.step ? "step" : undefined}><span>0{step}</span>{t(`taskStep.${step}`)}</li>)}</ol><footer>{task.targetId && <button type="button" onClick={() => { focusTarget.current = task.targetId ?? null; changeOpen(false); }}>{t("taskAction")}<ArrowUpRight aria-hidden="true" /></button>}</footer></section>}
            <div className="ans-companion-conversation" role="log" aria-label={ui("conversationWithDino")} aria-live="polite" aria-relevant="additions">
              {!messages.length && !agent.quote && <div className="ans-companion-welcome"><Sparkles aria-hidden="true" /><div><p>{greeting}</p></div></div>}
              {messages.map(message => <div key={message.id} data-message-id={message.id} className={`ans-companion-message ${message.role}`}><span className="sr-only">{message.role === "user" ? ui("you") : t("name")}</span>{message.role === "user" ? <p>{message.text}</p> : <Suspense fallback={<div className="ans-companion-reply"><p>{message.text}</p></div>}><CompanionReply text={message.text} /></Suspense>}</div>)}
              {!messages.length && !agent.quote && !agent.busy && <div className="ans-companion-prompts" aria-label={ui("tryAsking")}>{pagePrompts(pathname, ui).map(prompt => <button key={prompt} type="button" onClick={() => submit(undefined, prompt)}>{prompt}</button>)}</div>}
              {mode === "agent" && <><AgentRecoveryStatus turns={agent.recovery.turns.filter(turn => turn.ticket !== agent.currentTicket)} onCheck={agent.recovery.check} /><AgentTurnStatus agent={agent} /></>}
              <nav className="ans-companion-next" aria-label={ui("suggestedNextSteps")}>
                <div>
                  {nextActions.map(action => {
                    const Icon = icons[action.icon];
                    return (
                      <Link key={action.href + action.title} href={action.href} title={action.detail} onClick={() => changeOpen(false)}>
                        <Icon aria-hidden="true" />
                        <span>
                          <strong>{action.title}</strong>
                          <small className="sr-only">{action.detail}</small>
                        </span>
                        <ArrowUpRight aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </div>
          </div>
          {showLatest && (messages.length > 0 || agent.quote) && <button className="ans-companion-latest" type="button" onClick={jumpToLatest}><ArrowDown aria-hidden="true" />{ui(unread ? "newReplyBelow" : "backToLatest")}</button>}
        </div>
        <form className="ans-companion-composer" onSubmit={event => submit(event)}>
          <label className="sr-only" htmlFor="ans-companion-input">{ui("tellDinoWhatYouWantToDo")}</label>
          <div><textarea ref={composer} id="ans-companion-input" rows={1} maxLength={1200} value={draft} onChange={event => updateThread(mode, current => ({ ...current, draft: event.target.value }))} placeholder={ui(mode === "agent" && agent.busy ? "draftWhileWaiting" : "whatWouldYouLikeToDo")} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); submit(); } }} />
            {mode === "agent" && <CompanionModelSelect model={model} onChange={changeModel} disabled={agent.busy || agent.checkingReceipts} />}
            {mode === "agent" && agent.busy ? <button className="ans-companion-stop" type="button" onClick={agent.stop} aria-label={ui("agentStop")} title={ui("agentStop")}><Square aria-hidden="true" /></button> : <button type="submit" disabled={!draft.trim() || blocked} aria-label={ui("sendMessage")} title={ui("sendMessage")}><ArrowUp aria-hidden="true" /></button>}
          </div>
          {(draft.length > 1050 || (mode === "agent" && agent.busy)) && <footer><span>{ui(mode === "agent" && agent.busy ? "draftWaitingHint" : "messageLimit", { count: draft.length })}</span></footer>}
        </form>
      </PopoverContent>
    </Popover>
  </div>
  </>;
}
