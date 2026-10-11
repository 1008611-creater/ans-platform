"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";

const supported = new Set(["modal", "drawer", "toast"]);
export function hasNativeDemo(slug: string) { return supported.has(slug); }

/** Accessible live examples accompany the original visual diagrams. */
export function TermDemo({ slug }: { slug: string }) {
  const t = useTranslations("vibehub"); const dialog = useRef<HTMLDialogElement>(null); const id = useId();
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!visible) return; const timer = setTimeout(() => setVisible(false), 2500); return () => clearTimeout(timer); }, [visible]);
  if (slug === "toast") return <div className="vh-native-demo"><button type="button" className="vh-demo-button" onClick={() => setVisible(true)}>{t("demo.try")}</button><div role="status" aria-live="polite">{visible && <span className="flex items-center gap-2"><Check size={17} />{t("demo.feedback")}</span>}</div></div>;
  if (!supported.has(slug)) return null;
  return <div className="vh-native-demo"><button type="button" className="vh-demo-button" onClick={() => dialog.current?.showModal()}>{t("demo.details")}</button><dialog ref={dialog} aria-labelledby={id} className={`vh-demo-dialog ${slug === "drawer" ? "vh-demo-drawer" : ""}`} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}><div className="vh-demo-dialog-header"><h2 id={id}>{t("demo.panel")}</h2><button type="button" aria-label={t("close")} className="vh-icon-button" onClick={() => dialog.current?.close()}><X size={18} /></button></div><p>{t("demo.hint")}</p><button type="button" className="vh-demo-button" onClick={() => dialog.current?.close()}>{t("close")}</button></dialog></div>;
}