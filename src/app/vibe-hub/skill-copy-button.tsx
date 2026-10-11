"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
export function SkillCopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const t = useTranslations("vibehub"); const [copied, setCopied] = useState(false); const [error, setError] = useState(false);
  const idle = useRef<HTMLSpanElement>(null); const success = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => { const first = idle.current?.getBoundingClientRect().width; const second = success.current?.getBoundingClientRect().width; if (first && second && button.current) { button.current.style.setProperty("--skill-copy-idle-width", `${first}px`); button.current.style.setProperty("--skill-copy-success-width", `${second}px`); } }, [label, copiedLabel]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setError(false); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1600); }
    catch { setError(true); }
  };
  return <><button type="button" className={`skill-copy${copied ? " is-copied" : ""}`} ref={button} onClick={() => void copy()} aria-label={copied ? copiedLabel : label}>
    <span className="skill-copy-state skill-copy-idle" ref={idle} aria-hidden="true"><i className="ti ti-copy" /><span>{label}</span></span>
    <span className="skill-copy-state skill-copy-success" ref={success} aria-hidden="true"><i className="ti ti-check" /><span>{copiedLabel}</span></span>
  </button>{error && <span role="alert">{t("copyError")}</span>}</>;
}
