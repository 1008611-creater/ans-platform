"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AgentTurnStatus } from "@/components/mascot/agent-turn-status";
import { useCompanionAgent, type CompanionMessage } from "@/components/mascot/use-companion-agent";

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
    setMessages((cur) => [...cur, { id: ++seq.current, role: "user" as const, text: value }].slice(-40));
    setDraft("");
    void agent.ask(messages, value);
  }

  const suggestions = [t("ask1"), t("ask2"), t("ask3")];

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-[#E3E8E4] bg-white">
      <header className="flex items-center gap-2.5 border-b border-[#EEF2EF] px-4 py-3">
        <span className="grid size-8 place-items-center rounded-xl bg-[#9BE0C5] text-base">🦕</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-[#12211C]">{t("chatTitle")}</div>
          <div className="truncate text-[11px] text-[#4A5C55]">{projectTitle}</div>
        </div>
      </header>

      <div className="flex max-h-[420px] min-h-[220px] flex-col gap-2.5 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-[#4A5C55]">{t("chatEmpty")}</p>
        ) : null}
        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[92%]"}>
            <div
              className={
                message.role === "user"
                  ? "rounded-2xl rounded-br-md bg-[#12211C] px-3 py-2 text-[12.5px] leading-relaxed text-white"
                  : "rounded-2xl rounded-bl-md bg-[#F4FBF8] px-3 py-2 text-[12.5px] leading-relaxed text-[#12211C]"
              }
            >
              {message.text}
            </div>
          </div>
        ))}
        {agent.busy ? (
          <div className="self-start rounded-2xl rounded-bl-md bg-[#F4FBF8] px-3 py-2 text-[12px] text-[#4A5C55]">
            {t("thinking")}
            {agent.activeTool ? <span className="ml-1 text-[#5BC49A]">· {agent.activeTool}</span> : null}
          </div>
        ) : null}
      </div>

      <div className="px-4">
        <AgentTurnStatus agent={agent} />
      </div>

      <div className="border-t border-[#EEF2EF] px-4 py-3">
        {messages.length === 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {suggestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => send(question)}
                className="rounded-full border border-[#CFE3D8] bg-white px-2.5 py-1 text-[11.5px] text-[#12211C] hover:border-[#5BC49A]"
              >
                {question}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder={t("chatPlaceholder")}
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-[#CFE3D8] bg-white px-3 py-2 text-[12.5px] text-[#12211C] outline-none focus:border-[#5BC49A]"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={agent.busy || !draft.trim()}
            className="rounded-xl bg-[#5BC49A] px-3.5 py-2.5 text-[12.5px] font-bold text-[#05231A] disabled:opacity-40"
          >
            {t("send")}
          </button>
        </div>
        <p className="mt-1.5 text-[10.5px] text-[#9AA6A0]">{t("chatHint")}</p>
      </div>
    </section>
  );
}
