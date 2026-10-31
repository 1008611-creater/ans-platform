"use client";

import { memo } from "react";
import { Check, Copy, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { useCopyFeedback } from "@/lib/ui/copy-feedback";
import { rehypeStreamChars } from "@/lib/ui/stream-chars";

/** `animate` 只给新到达的回复：逐字从模糊晕开到清晰。 */
export const CompanionReply = memo(function CompanionReply({ text, animate = false }: { text: string; animate?: boolean }) {
  const t = useTranslations("companion");
  const feedback = useCopyFeedback();
  return <div className="ans-companion-reply">
    <div className="ans-companion-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={animate ? [rehypeStreamChars] : []} skipHtml disallowedElements={["img", "input"]} components={{
      // Responses cannot load tracking images or execute HTML. Links require an explicit click.
      a: ({ href, children }) => {
        if (href && /^\/(?![/\\])/.test(href) && !href.includes("\\")) return <WorkspaceLink href={href}>{children}</WorkspaceLink>;
        if (href && /^https:\/\//i.test(href)) return <a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children}<ArrowUpRight aria-hidden="true" /></a>;
        return <span>{children}</span>;
      },
      h1: ({ children }) => <h3>{children}</h3>, h2: ({ children }) => <h3>{children}</h3>,
      table: ({ children }) => <div className="ans-companion-table" role="region" aria-label={t("replyTable")} tabIndex={0}><table>{children}</table></div>,
    }}>{text}</ReactMarkdown></div>
    <div className="ans-companion-reply-actions"><button type="button" onClick={() => void feedback.copy(text)} aria-label={t(feedback.copied ? "replyCopied" : "copyReply")} title={t("copyReply")}>{feedback.copied ? <Check aria-hidden="true" className={feedback.state === "leaving" ? "ans-feedback-leaving" : "ans-pop"} /> : <Copy aria-hidden="true" />}<span className={feedback.state === "leaving" ? "ans-feedback-leaving" : undefined}>{t(feedback.copied ? "replyCopied" : "copyReply")}</span></button><span role="status">{feedback.state === "failed" ? t("replyCopyFailed") : ""}</span></div>
  </div>;
});
