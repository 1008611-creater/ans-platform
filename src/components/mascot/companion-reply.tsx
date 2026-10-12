"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Check, Copy, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";

export const CompanionReply = memo(function CompanionReply({ text }: { text: string }) {
  const t = useTranslations("companion");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopyState("copied"); }
    catch { setCopyState("failed"); }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState("idle"), 3000);
  }
  return <div className="ans-companion-reply">
    <div className="ans-companion-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml disallowedElements={["img", "input"]} components={{
      // Responses cannot load tracking images or execute HTML. Links require an explicit click.
      a: ({ href, children }) => {
        if (href && /^\/(?![/\\])/.test(href) && !href.includes("\\")) return <WorkspaceLink href={href}>{children}</WorkspaceLink>;
        if (href && /^https:\/\//i.test(href)) return <a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children}<ArrowUpRight aria-hidden="true" /></a>;
        return <span>{children}</span>;
      },
      h1: ({ children }) => <h3>{children}</h3>, h2: ({ children }) => <h3>{children}</h3>,
      table: ({ children }) => <div className="ans-companion-table" role="region" aria-label={t("replyTable")} tabIndex={0}><table>{children}</table></div>,
    }}>{text}</ReactMarkdown></div>
    <div className="ans-companion-reply-actions"><button type="button" onClick={() => void copy()} aria-label={t(copyState === "copied" ? "replyCopied" : "copyReply")} title={t("copyReply")}>{copyState === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{t(copyState === "copied" ? "replyCopied" : "copyReply")}</button><span role="status">{copyState === "failed" ? t("replyCopyFailed") : ""}</span></div>
  </div>;
});
