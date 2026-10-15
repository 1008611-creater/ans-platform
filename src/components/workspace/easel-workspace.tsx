"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EaselEmbedConfig } from "@/contracts/easel";

interface Props extends EaselEmbedConfig { userId: string }
type Connection = "connecting" | "connected" | "login_required" | "account_mismatch" | "unavailable";
function AccountFrame({ origin, src, loginUrl, userId, retry }: Props & { retry: () => void }) {
  const t = useTranslations("easel");
  const frame = useRef<HTMLIFrameElement>(null);
  const [connection, setConnection] = useState<Connection>("connecting");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = () => { clearTimeout(timer); timer = setTimeout(() => setConnection("unavailable"), 90000); };
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow || !event.data || typeof event.data !== "object") return;
      const data = event.data as Record<string, unknown>;
      if (data.type === "ans:easel:ready") {
        clearTimeout(timer); setConnection(data.userId === userId ? "connected" : "account_mismatch");
      } else if (data.type === "ans:easel:refresh" && data.userId === userId) {
        setConnection("connecting"); timeout();
      } else if (data.type === "ans:easel:error") {
        clearTimeout(timer); setConnection(data.code === "login_required" || data.code === "account_mismatch" ? data.code : "unavailable");
      }
    };
    window.addEventListener("message", receive); timeout();
    return () => { clearTimeout(timer); window.removeEventListener("message", receive); };
  }, [origin, userId]);
  return <div className="relative h-[calc(100dvh-15rem)] min-h-[520px] overflow-hidden rounded-2xl border bg-background">
    <iframe ref={frame} src={src} title={t("title")} className="h-full w-full border-0" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups" hidden={connection !== "connected"} />
    {connection !== "connected" && <div className="absolute inset-0 flex items-center justify-center p-6"><div className="max-w-md text-center">
      <h2 className="text-lg font-semibold" role="status" aria-live="polite">{t(`connection.${connection}.title`)}</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{t(`connection.${connection}.body`)}</p>
      {connection !== "connecting" && <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild><a href={loginUrl} target="_blank" rel="noopener noreferrer">{t("login")}<ExternalLink className="ms-2 size-4" aria-hidden="true" /></a></Button>
        <Button variant="outline" onClick={retry}><RefreshCw className="me-2 size-4" aria-hidden="true" />{t("retry")}</Button>
      </div>}
    </div></div>}
  </div>;
}
export function EaselWorkspace(props: Props) {
  const { data: session, status } = useSession();
  const t = useTranslations("easel");
  const [attempt, setAttempt] = useState(0);
  // A logout or account switch removes the old private DOM synchronously in this render.
  if (status !== "authenticated" || session?.user?.id !== props.userId) return <p role="status" className="rounded-xl border p-6">{t("sessionChanged")}</p>;
  return <AccountFrame key={JSON.stringify([props.origin, props.userId, attempt])} {...props} retry={() => setAttempt(value => value + 1)} />;
}
