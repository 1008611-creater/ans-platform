"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown } from "lucide-react";
import { AgentTurnStatus } from "@/components/mascot/agent-turn-status";
import { useCompanionAgent, type CompanionMessage } from "@/components/mascot/use-companion-agent";
import { useImeEnterGuard } from "@/lib/ui/ime-enter-guard";
import { useFollowBottom } from "@/lib/ui/follow-bottom";
import { StreamText } from "@/lib/ui/stream-text";

/**
 * 项目详情页里的「这个项目的 Agent」。
 *
 * 复用 Pi Agent 运行时（useCompanionAgent → /api/mascot/agent → 报价/预留/结算），
 * 只是把入口从"全局小恐龙"换成"当前项目"：pathname 传给后端，
 * current_page 工具据此读这个项目的公开信息。
 */
export function ProjectAgentChat({
  actor,
  pathname,
  locale,
  projectTitle,
}: {
  actor: string;
  pathname: string;
  locale: "zh" | "en";
  projectTitle: string;
}) {
  const t = useTranslations("preview");
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [draft, setDraft] = useState("");
  const seq = useRef(0);
  const list = useRef<HTMLDivElement>(null);
  const ime = useImeEnterGuard();
  const scroll = useFollowBottom(list);
  const agent = useCompanionAgent(
    actor,
    pathname,
    locale,
    (text) => setMessages((cur) => [...cur, { id: ++seq.current, role: "guide" as const, text }].slice(-40)),
    () => {},
  );

  function send(text?: string) {
    const value = (text ?? draft).trim();
    if (!value || agent.busy) return;
    scroll.follow.current = true;
    setMessages((cur) => [...cur, { id: ++seq.current, role: "user" as const, text: value }].slice(-40));
    setDraft("");
    void agent.ask(messages, value);
  }

  const suggestions = [t("ask1"), t("ask2"), t("ask3")];

  // 外框 rounded-2xl(16) 套 p-1(4) 的输入区：内圆角 = 16 - 4 = 12（rounded-xl）。
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl bg-card ans-hairline">
      <header className="flex items-center gap-2.5 px-4 py-3 shadow-[inset_0_-0.5px_0_var(--hairline)]">
        <span className="grid size-8 place-items-center rounded-xl bg-[#9BE0C5] text-base" aria-hidden="true">🦕</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{t("chatTitle")}</div>
          <div className="truncate text-xs text-muted-foreground">{projectTitle}</div>
        </div>
      </header>

      <div className="relative">
        <div ref={list} className="flex max-h-[420px] min-h-[220px] flex-col gap-2.5 overflow-y-auto px-4 py-3" role="log" aria-live="polite">
          {messages.length === 0 ? <p className="text-sm leading-relaxed text-muted-foreground">{t("chatEmpty")}</p> : null}
          {messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "max-w-[85%] self-end" : "max-w-[92%] self-start"}>
              <div className={message.role === "user"
                ? "whitespace-pre-wrap rounded-2xl rounded-br-md bg-foreground px-3 py-2 text-sm leading-relaxed text-background"
                : "whitespace-pre-wrap rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm leading-relaxed"}>
                {message.role === "guide" ? <StreamText text={message.text} /> : message.text}
              </div>
            </div>
          ))}
          {agent.busy ? (
            <div className="flex items-center gap-2 self-start rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {t("thinking")}
              {agent.activeTool ? <span className="rounded-md bg-surface-raised px-1.5 text-xs text-foreground">{agent.activeTool}</span> : null}
            </div>
          ) : null}
        </div>
        {scroll.showJump && (
          <button type="button" onClick={scroll.jumpToLatest}
            className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-popover px-3 py-1.5 text-xs shadow-[inset_0_0_0_0.5px_var(--hairline),0_3px_12px_rgb(26_26_25/10%)] hover:bg-muted">
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />{t("jumpLatest")}
          </button>
        )}
      </div>

      <div className="px-4">
        <AgentTurnStatus agent={agent} />
      </div>

      <div className="px-4 py-3 shadow-[inset_0_0.5px_0_var(--hairline)]">
        {messages.length === 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {suggestions.map((question) => (
              <button key={question} type="button" onClick={() => send(question)}
                className="rounded-full bg-muted px-2.5 py-1 text-xs transition-colors hover:bg-surface-raised">
                {question}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-1 rounded-2xl bg-background p-1 ans-hairline transition-shadow focus-within:shadow-[inset_0_0_0_0.5px_var(--hairline),var(--focus-ring)]">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            {...ime.bind}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !ime.blocks(event)) {
                event.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder={t("chatPlaceholder")}
            aria-label={t("chatPlaceholder")}
            className="min-h-[44px] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:shadow-none"
          />
          <button type="button" onClick={() => send()} disabled={agent.busy || !draft.trim()}
            className="rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
            {t("send")}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{t("chatHint")}</p>
      </div>
    </section>
  );
}
