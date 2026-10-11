"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowUp, ArrowUpRight, X, Settings, Volume2, VolumeX, Sparkles, FolderPlus, Clapperboard, Coins, Users, Compass, BookOpen } from "lucide-react";
import { DinoAvatar, type SpeechRequest } from "./dino-avatar";
import { useDinoTask } from "./dino-task-context";
import { guideReply, pageActions, type GuideAction } from "./guide-actions";
import { WorkspaceLink as Link } from "@/components/providers/workspace-navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { openSiteSettings, useSitePreferences } from "@/lib/site-preferences";
import "./companion.css";

const icons = { project: FolderPlus, video: Clapperboard, credits: Coins, team: Users, discover: Compass, learn: BookOpen };
type Message = { id: number; role: "guide" | "user"; text: string };
export function DinoGuide() {
  const { data, status } = useSession();
  return <Companion key={status === "authenticated" ? data?.user?.id : status} />;
}
function Companion() {
  const t = useTranslations("product.mascot");
  const ui = useTranslations("companion");
  const pathname = usePathname();
  const prefs = useSitePreferences(), task = useDinoTask();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [recommendations, setRecommendations] = useState<GuideAction[] | null>(null);
  const [speech, setSpeech] = useState<SpeechRequest | null>(null);
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const sequence = useRef(0), focusTarget = useRef<string | null>(null), list = useRef<HTMLDivElement>(null);
  const titleId = useId(), taskId = useId(), composer = useRef<HTMLTextAreaElement>(null);
  const greeting = ui("whatWouldYouLikeToMakeTell");
  const nextActions = recommendations ?? pageActions(pathname, ui);
  useEffect(() => { setRecommendations(null); setOpen(false); }, [pathname]);
  useEffect(() => { const node = list.current; if (node) node.scrollTop = node.scrollHeight; }, [messages, open]);
  useEffect(() => { const input = composer.current; if (input) { input.style.height = "auto"; input.style.height = Math.max(34, Math.min(90, input.scrollHeight)) + "px"; } }, [draft, open]);
  // Remove the legacy injected bubble once. React now owns this single panel.
  useEffect(() => {
    const host = window as unknown as Record<symbol, { dispose?: () => void } | undefined>;
    host[Symbol.for("ans.mascot.companion.v1")]?.dispose?.();
  }, []);
  function changeOpen(value: boolean) {
    setOpen(value);
    if (value) { if (prefs.voice) window.dispatchEvent(new CustomEvent("ans:dino-activate")); setSpeech({ id: ++sequence.current, text: messages.filter(m => m.role === "guide").at(-1)?.text ?? greeting }); }
  }
  function submit(event?: FormEvent, quick?: string) {
    event?.preventDefault(); const input = (quick ?? draft).trim().slice(0, 300); if (!input) return;
    const reply = guideReply(input, ui), id = ++sequence.current, responseId = ++sequence.current;
    setMessages(current => [...current, { id, role: "user" as const, text: input }, { id: responseId, role: "guide" as const, text: reply.text }].slice(-40));
    setRecommendations(reply.actions); setDraft("");
    setSpeech({ id: ++sequence.current, text: reply.text });
  }
  function settings() { setOpen(false); requestAnimationFrame(openSiteSettings); }
  const speaking = voiceStatus === "playing", loading = voiceStatus === "loading";
  return <div className="ans-dino-guide ans-companion-v2" data-companion-owner="react" data-open={open} data-task-state={task?.phase ?? "idle"}>
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild><button type="button" aria-label={t(open ? "close" : task ? "taskOpen" : "open")} className="ans-dino-trigger"><DinoAvatar phase={task?.phase ?? "idle"} open={open} speech={speech} onVoiceStatus={setVoiceStatus} /><span className="ans-dino-pip" aria-hidden="true" /></button></PopoverTrigger>
      <PopoverContent id="ans-companion-panel" role="dialog" aria-labelledby={titleId} side="top" align="end" sideOffset={12} collisionPadding={12} className="ans-companion-panel" onOpenAutoFocus={event => { event.preventDefault(); document.getElementById("ans-companion-dismiss")?.focus({ preventScroll: true }); }} onCloseAutoFocus={event => {
        const id = focusTarget.current; focusTarget.current = null;
        if (!id || id !== task?.targetId) return;
        const target = document.getElementById(id);
        if (!target || target.matches(":disabled") || target.closest("[inert]")) return;
        event.preventDefault(); target.scrollIntoView({ block: "center", behavior: "auto" }); target.focus({ preventScroll: true });
      }}>
        <header className="ans-companion-header"><div><span className="ans-companion-kicker">ANS / {ui("byYOURSIDE")}</span><h2 id={titleId}>{t("name")}<span aria-hidden="true" /></h2></div><div className="ans-companion-controls"><button type="button" aria-label={ui("openSiteSettings")} onClick={settings}><Settings aria-hidden="true" /></button><button id="ans-companion-dismiss" type="button" aria-label={t("close")} onClick={() => setOpen(false)}><X aria-hidden="true" /></button></div></header>
        <div className="ans-companion-body" ref={list}>
        {task && <section className="ans-companion-task" aria-labelledby={taskId}><div><h3 id={taskId}>{ui("currentTask")}</h3><span>{task.step}/3</span></div><p role="status">{t(`task.${task.phase}`)}</p><ol aria-label={t("taskSteps")}>{([1, 2, 3] as const).map(step => <li key={step} aria-current={step === task.step ? "step" : undefined}><span>0{step}</span>{t(`taskStep.${step}`)}</li>)}</ol><footer><small>{t("taskCost", { points: task.costPoints })}</small>{task.targetId && <button type="button" onClick={() => { focusTarget.current = task.targetId ?? null; setOpen(false); }}>{t("taskAction")}<ArrowUpRight aria-hidden="true" /></button>}</footer></section>}
        <div className="ans-companion-conversation" role="log" aria-label={ui("conversationWithDino")} aria-live="polite" aria-relevant="additions">
          <div className="ans-companion-welcome"><Sparkles aria-hidden="true" /><p>{greeting}</p></div>
          {messages.map(message => <div key={message.id} className={`ans-companion-message ${message.role}`}><span className="sr-only">{message.role === "user" ? ui("you") : t("name")}</span><p>{message.text}</p></div>)}
          {!messages.length && <div className="ans-companion-prompts" aria-label={ui("tryAsking")}>
            {[ui("iWantToMakeAVideo"), ui("findProjectInspiration"), ui("howDoCreditsWork")].map(prompt => <button key={prompt} type="button" onClick={() => submit(undefined, prompt)}>{prompt}</button>)}
          </div>}
        </div>
        {prefs.suggestions && <nav className="ans-companion-next" aria-label={ui("suggestedNextSteps")}><h3>{ui("suggestedNextSteps")}<span>{ui("keepGoing")}</span></h3>{nextActions.map(action => { const Icon = icons[action.icon]; return <Link href={action.href} key={action.href} onClick={() => setOpen(false)}><span className="ans-companion-action-icon"><Icon aria-hidden="true" /></span><span><strong>{action.title}</strong><small>{action.detail}</small></span><ArrowUpRight className="ans-companion-action-arrow" aria-hidden="true" /></Link>; })}</nav>}
        </div>
        <form className="ans-companion-composer" onSubmit={submit}><label className="sr-only" htmlFor="ans-companion-input">{ui("tellDinoWhatYouWantToDo")}</label><div><textarea ref={composer} id="ans-companion-input" rows={1} maxLength={300} value={draft} onChange={e => setDraft(e.target.value)} placeholder={ui("whatWouldYouLikeToDo")} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} /><button type="submit" disabled={!draft.trim()} aria-label={ui("sendMessage")}><ArrowUp aria-hidden="true" /></button></div><footer><span>{ui("siteGuideNoCreditsUsed")}</span><button type="button" onClick={settings} aria-label={ui("adjustDinoVoiceInSettings")}>{prefs.voice ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}{!prefs.voice ? ui("voiceOff") : voiceStatus === "error" ? ui("voiceUnavailable") : loading ? ui("preparingVoice") : speaking ? ui("speaking") : ui("voiceOn")}</button></footer></form>
      </PopoverContent>
    </Popover>
  </div>;
}
