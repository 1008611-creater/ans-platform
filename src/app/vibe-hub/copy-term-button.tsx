"use client";
import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
export function CopyTermButton({ text, markdown = false }: { text: string; markdown?: boolean }) {
  const t = useTranslations("vibehub"); const [copied, setCopied] = useState(false); const [error, setError] = useState(false); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <span><button type="button" className="vh-small-button" onClick={async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setError(false); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1800); }
    catch { setError(true); }
  }}>{t(copied ? "copied" : markdown ? "copyMarkdown" : "copy")}</button>{error && <span role="alert" className="ml-2 text-xs">{t("copyError")}</span>}</span>;
}
