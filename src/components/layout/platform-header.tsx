"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { Header } from "./header";

export function PlatformHeader({ parentOrigin, authProvider, allowRegistration }: { parentOrigin: string; authProvider?: string; allowRegistration?: boolean }) {
  const { data: session, status, update } = useSession();
  useEffect(() => {
    if (status !== "loading") window.parent.postMessage({ type: "ans:platform-session", authenticated: status === "authenticated", subject: session?.user?.id || null }, parentOrigin);
  }, [status, session?.user?.id, parentOrigin]);
  useEffect(() => {
    const refresh = (event: MessageEvent) => { if (event.origin === parentOrigin && event.source === window.parent && event.data?.type === "ans:platform-refresh") void update(); };
    window.addEventListener("message", refresh);
    const timer = window.setInterval(() => void update(), 60000);
    return () => { window.removeEventListener("message", refresh); window.clearInterval(timer); };
  }, [parentOrigin, update]);
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.style.minHeight = "0";
    let scheduled = 0;
    const measure = () => {
      scheduled = 0;
      let height = 49;
      document.querySelectorAll('[role="menu"], [role="dialog"], [data-radix-popper-content-wrapper]').forEach(element => {
        const box = element.getBoundingClientRect();
        if (box.width && box.height) height = Math.max(height, element.getAttribute("role") === "dialog" ? 900 : box.bottom + 8);
      });
      window.parent.postMessage({ type: "ans:platform-height", height: Math.min(900, Math.ceil(height)) }, parentOrigin);
    };
    const changed = () => { if (!scheduled) scheduled = window.requestAnimationFrame(measure); };
    const observer = new MutationObserver(changed);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    const navigate = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element)?.closest('a[href]');
      if (!link) return;
      const url = new URL(link.getAttribute("href")!, location.origin);
      if (url.protocol !== "https:") return;
      event.preventDefault(); event.stopPropagation();
      window.parent.postMessage({ type: "ans:platform-navigate", url: url.href }, parentOrigin);
    };
    document.addEventListener("click", navigate, true);
    window.addEventListener("resize", changed);
    changed();
    return () => { observer.disconnect(); window.cancelAnimationFrame(scheduled); document.removeEventListener("click", navigate, true); window.removeEventListener("resize", changed); };
  }, [parentOrigin]);
  return <Header embedded authProvider={authProvider} allowRegistration={allowRegistration} />;
}
