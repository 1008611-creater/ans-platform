"use client";
import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
export function CopyTermButton({ text, markdown = false, disabled = false }: { text: string; markdown?: boolean; disabled?: boolean }) {
  const t = useTranslations("vibehub"); const [copiedText, setCopiedText] = useState<string | null>(null); const [error, setError] = useState(false); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copied = copiedText === text;
  return <span className="ans-copy-control"><button type="button" className="vh-small-button" disabled={disabled || !text.trim()} onClick={async () => {
    try { await navigator.clipboard.writeText(text); setCopiedText(text); setError(false); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setCopiedText(null), 1800); }
    catch { setError(true); }
  }}>{t(copied ? "copied" : markdown ? "copyMarkdown" : "copy")}</button><span className="sr-only" role="status">{copied ? t("copied") : ""}</span>{error && <span role="alert" className="ml-2 text-xs">{t("copyError")}</span>}</span>;
}
