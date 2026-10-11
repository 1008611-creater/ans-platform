"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink, RefreshCw, Film, ReceiptText, WalletCards } from "lucide-react";
import { useToonflowHost, type ToonflowHostConfig } from "@/components/providers/toonflow-host";
import { useWorkspaceNavigation } from "@/components/providers/workspace-navigation";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type LeaveState = "idle" | "saving" | "navigating" | "failed";
type PrepareLeave = (afterSave: () => void, cancel?: () => void) => void;
type Connection = "connecting" | "connected" | "login_required" | "account_mismatch" | "unavailable";
type Props = ToonflowHostConfig;

function ConnectionNotice({ connection, loginUrl, onRetry, onDiscard }: {
  connection: Exclude<Connection, "connected">;
  loginUrl: string;
  onRetry: () => void;
  onDiscard?: () => void;
}) {
  const t = useTranslations("product.toonflow.embed");
  return <div className="absolute inset-0 flex items-center justify-center bg-background p-6">
    <div className="max-w-md text-center">
      <Film className="mx-auto mb-5 h-10 w-10 text-primary" aria-hidden="true" />
      <h2 className="text-xl font-semibold" role="status" aria-live="polite">{t(`${connection}.title`)}</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{t(`${connection}.body`)}</p>
      {connection !== "connecting" && <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild><a href={loginUrl} target="_blank" rel="noopener noreferrer">{t("login")}<ExternalLink className="ms-2 h-4 w-4" aria-hidden="true" /></a></Button>
        <Button variant="outline" onClick={onRetry}><RefreshCw className="me-2 h-4 w-4" aria-hidden="true" />{t("retry")}</Button>
        {onDiscard && <Button variant="outline" onClick={onDiscard}>{t("discardReconnect")}</Button>}
      </div>}
    </div>
  </div>;
}

// Each authenticated identity/address/retry gets an isolated connection lifecycle.
// Passive identity invalidation still discards the iframe immediately, without saving old drafts.
function ToonflowFrame({ origin, src, loginUrl, userId, active, onRetry, onEscape, prepareLeaveRef, onLeaveState, onReset }: Props & {
  active: boolean;
  onRetry: () => void; onEscape: () => void; onReset: () => void;
  prepareLeaveRef: React.RefObject<PrepareLeave | null>; onLeaveState: (state: LeaveState) => void;
}) {
  const t = useTranslations("product.toonflow.embed");
  const { register } = useWorkspaceNavigation();
  const frame = useRef<HTMLIFrameElement>(null);
  const connect = useRef<() => void>(() => {});
  const loaded = useRef<() => void>(() => {});
  const connected = useRef(false);
  const revalidate = useRef<() => boolean>(() => false);
  const isActive = useRef(active);
  const suspendLeave = useRef<() => void>(() => {});
  const [connection, setConnection] = useState<Connection>("connecting");
  const [recoveryRequired, setRecoveryRequired] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  // Radix portals live outside the retained host; close them before hiding it.
  if (!active && discardOpen) setDiscardOpen(false);

  useEffect(() => {
    let disposed = false;
    connected.current = false;
    let nonce = crypto.randomUUID();
    let timeout: number;
    let hasWorkspace = false;
    let revalidationRequest: string | undefined;
    let revalidationPending = false;
    let recoveryFenced = false;
    let pending: { requestId: string; afterSave: () => void; cancel?: () => void; timeout: number; phase: "saving" | "saved" } | undefined;
    function finishLeave(saved: boolean) {
      if (!pending) return;
      window.clearTimeout(pending.timeout);
      if (disposed) { pending = undefined; return; }
      if (saved) {
        if (pending.phase === "saved") return;
        pending.phase = "saved";
        // Next navigation cannot be cancelled. Keep edits locked even if it takes a long time;
        // otherwise a late route completion could discard edits made after an automatic unlock.
        onLeaveState("navigating");
        pending.afterSave();
        return;
      }
      frame.current?.contentWindow?.postMessage({ type: "ans.toonflow.cancelLeave", version: 1, nonce, requestId: pending.requestId }, origin);
      const cancel = pending.cancel;
      pending = undefined;
      cancel?.();
      onLeaveState("failed");
    }
    onLeaveState("idle");
    revalidate.current = () => {
      if (disposed || connected.current || !hasWorkspace || !frame.current?.contentWindow) return false;
      if (revalidationPending) return true;
      revalidationRequest = crypto.randomUUID();
      revalidationPending = true;
      recoveryFenced = true;
      setConnection("connecting");
      onLeaveState("idle");
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        if (disposed || !revalidationPending) return;
        revalidationPending = false;
        setConnection("unavailable");
      }, 20_000);
      frame.current.contentWindow.postMessage({ type: "ans.toonflow.revalidate", version: 1, nonce, userId, requestId: revalidationRequest }, origin);
      return true;
    };
    prepareLeaveRef.current = (afterSave, cancel) => {
      if (disposed || pending) { cancel?.(); return; }
      if (!hasWorkspace) { afterSave(); return; }
      if (!connected.current || !frame.current?.contentWindow) { cancel?.(); onLeaveState("failed"); return; }
      const requestId = crypto.randomUUID();
      pending = { requestId, afterSave, cancel, phase: "saving", timeout: window.setTimeout(() => finishLeave(false), 20_000) };
      onLeaveState("saving");
      frame.current.contentWindow.postMessage({ type: "ans.toonflow.prepareLeave", version: 1, nonce, requestId }, origin);
    };
    suspendLeave.current = () => {
      if (pending) {
        window.clearTimeout(pending.timeout);
        frame.current?.contentWindow?.postMessage({ type: "ans.toonflow.cancelLeave", version: 1, nonce, requestId: pending.requestId }, origin);
        pending = undefined;
      }
      onLeaveState("idle");
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      // Browsers cannot wait for async iframe saves during refresh/close.
      // No dirty-state capability exists yet, so protect any connected workspace conservatively.
      if (!hasWorkspace || pending?.phase === "saved") return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    connect.current = () => frame.current?.contentWindow?.postMessage({ type: "ans.toonflow.connect", version: 1, nonce, userId }, origin);
    const startTimeout = () => {
      timeout = window.setTimeout(() => { if (!disposed) setConnection(state => state === "connecting" ? "unavailable" : state); }, 20_000);
    };
    loaded.current = () => {
      finishLeave(false);
      hasWorkspace = false;
      setRecoveryRequired(false);
      window.clearTimeout(timeout);
      nonce = crypto.randomUUID();
      revalidationRequest = undefined;
      revalidationPending = false;
      recoveryFenced = false;
      connected.current = false;
      setConnection("connecting");
      startTimeout();
      connect.current();
    };
    startTimeout();
    const receive = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow || !event.data || event.data.version !== 1) return;
      if (event.data.type === "ans.toonflow.ready") { connect.current(); return; }
      if (event.data.nonce !== nonce) return;
      if (event.data.type === "ans.toonflow.leaveResult") {
        if (!pending || pending.phase !== "saving" || event.data.requestId !== pending.requestId || !connected.current) return;
        if (event.data.status === "saved" || event.data.status === "failed") finishLeave(event.data.status === "saved");
        return;
      }
      if (event.data.type === "ans.toonflow.escape") { if (connected.current && isActive.current) onEscape(); return; }
      if (event.data.type !== "ans.toonflow.state") return;
      const state: unknown = event.data.status;
      if (state !== "connected" && state !== "login_required" && state !== "account_mismatch" && state !== "unavailable") return;
      if (event.data.requestId !== undefined && event.data.requestId !== revalidationRequest) return;
      if (state === "connected" && (event.data.capability !== "workspace-v1" || (recoveryFenced && (!revalidationPending || event.data.requestId !== revalidationRequest)))) return;
      // An untagged transient error may precede the explicit retry result. Keep
      // the request owner so it cannot be cleared by an older notification.
      if (!revalidationPending || event.data.requestId === revalidationRequest || state === "login_required" || state === "account_mismatch") {
        revalidationPending = false;
        window.clearTimeout(timeout);
      }
      if (state === "connected") recoveryFenced = false;
      else if (hasWorkspace) recoveryFenced = true;
      connected.current = state === "connected";
      if (connected.current) { hasWorkspace = true; setRecoveryRequired(true); }
      else {
        finishLeave(false);
        if (state === "account_mismatch" || state === "login_required") { hasWorkspace = false; setRecoveryRequired(false); }
      }
      setConnection(state);
    };
    window.addEventListener("message", receive);
    connect.current();
    return () => {
      disposed = true;
      window.removeEventListener("beforeunload", beforeUnload);
      finishLeave(false);
      prepareLeaveRef.current = null;
      connected.current = false;
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
      revalidate.current = () => false;
      connect.current = () => {};
      loaded.current = () => {};
      suspendLeave.current = () => {};
    };
  }, [origin, userId, onEscape, prepareLeaveRef, onLeaveState]);

  // Route visibility is separate from the connection lifecycle: native traversal
  // keeps the actual iframe alive, but must invalidate any old navigation owner.
  useLayoutEffect(() => {
    isActive.current = active;
    if (!active) suspendLeave.current();
  }, [active]);
  useEffect(() => {
    if (!active) return;
    return register((afterSave, cancel) => { if (prepareLeaveRef.current) prepareLeaveRef.current(afterSave, cancel); else cancel(); });
  }, [active, register, prepareLeaveRef]);

  return <>
    <iframe ref={frame} src={src} title={t("frameTitle")} onLoad={() => loaded.current()} onError={() => { connected.current = false; setConnection("unavailable"); }} tabIndex={connection === "connected" ? 0 : -1} className={`h-full w-full border-0 ${connection === "connected" ? "visible" : "invisible"}`} sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups" referrerPolicy="strict-origin-when-cross-origin" />
    {connection !== "connected" && <ConnectionNotice connection={connection} loginUrl={loginUrl} onRetry={() => { if (!revalidate.current()) onRetry(); }} onDiscard={connection === "unavailable" && recoveryRequired ? () => setDiscardOpen(true) : undefined} />}
    <AlertDialog open={active && discardOpen} onOpenChange={setDiscardOpen}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{t("discardTitle")}</AlertDialogTitle><AlertDialogDescription>{t("discardBody")}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>{t("keepPage")}</AlertDialogCancel><AlertDialogAction onClick={onReset}>{t("discardConfirm")}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

export function ToonflowWorkspaceSession({ origin, src, loginUrl, userId, active = true }: Props & { active?: boolean }) {
  const t = useTranslations("product.toonflow.embed");
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const product = useTranslations("product");
  const prepareLeaveRef = useRef<PrepareLeave | null>(null);
  const [leaveState, setLeaveState] = useState<LeaveState>("idle");
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const expandToggle = useRef<HTMLButtonElement>(null);
  const collapse = useCallback(() => { setExpanded(false); expandToggle.current?.focus(); }, []);
  const accountValid = sessionStatus === "authenticated" && session?.user?.id === userId;

  useEffect(() => {
    if (!expanded || !active) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") collapse(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [expanded, collapse, active]);

  function retry() {
    if (!accountValid) { window.location.reload(); return; }
    prepareLeaveRef.current?.(() => setAttempt(value => value + 1));
  }

  // Financial views use the same confirmed-save handshake as the return link.
  // The retained frame survives the route change, including an expanded editor.
  function navigate(event: { preventDefault(): void }, destination: string) {
    if (!accountValid) return;
    event.preventDefault();
    prepareLeaveRef.current?.(() => router.push(destination));
  }

  return <section className={expanded ? "fixed inset-0 z-50 flex flex-col bg-background" : "ans-product-container flex flex-col py-6"}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3">
      <div className="flex items-center gap-3"><Link href="/workspace" className="ans-text-link" aria-disabled={accountValid && leaveState === "saving"} onNavigate={event => navigate(event, "/workspace")}><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("back")}</Link><span className="hidden text-muted-foreground sm:inline" aria-hidden="true">/</span><h1 className="flex items-center gap-2 text-base font-semibold"><Film className="h-4 w-4" aria-hidden="true" />{t("title")}</h1></div>
      <div className="flex flex-wrap items-center gap-2"><Button ref={expandToggle} variant="ghost" size="sm" onClick={() => setExpanded(value => !value)} aria-pressed={expanded}>{t(expanded ? "collapse" : "expand")}</Button><Button variant="ghost" size="sm" asChild><a href={origin} target="_blank" rel="noopener noreferrer">{t("standalone")}<ExternalLink className="ms-2 h-3 w-3" aria-hidden="true" /></a></Button></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-2 text-xs leading-6 text-muted-foreground">
      <p>{t("billing")}</p>
      <nav aria-label={product("computeHistory.title")} className="flex flex-wrap items-center gap-4">
        <Link href="/workspace/compute" className="inline-flex items-center gap-1.5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4" aria-disabled={accountValid && leaveState === "saving"} onNavigate={event => navigate(event, "/workspace/compute")}><ReceiptText className="size-3.5" aria-hidden="true" />{product("computeHistory.title")}</Link>
        <Link href="/workspace/credits" className="inline-flex items-center gap-1.5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4" aria-disabled={accountValid && leaveState === "saving"} onNavigate={event => navigate(event, "/workspace/credits")}><WalletCards className="size-3.5" aria-hidden="true" />{product("quotaHistory.title")}</Link>
      </nav>
    </div>
    {accountValid && leaveState !== "idle" && <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3 text-sm">
      <p role={leaveState === "failed" ? "alert" : "status"} aria-live="polite">{t(leaveState === "failed" ? "saveFailed" : leaveState)}</p>
      {leaveState === "navigating" && <Button variant="outline" size="sm" onClick={() => window.location.reload()}>{t("reloadSaved")}</Button>}
    </div>}
    <div className={expanded ? "relative min-h-0 flex-1" : "relative h-[calc(100dvh-15rem)] min-h-[480px] overflow-hidden rounded-b-2xl border border-t-0"}>
      {accountValid
        ? <ToonflowFrame key={JSON.stringify([origin, src, userId, attempt])} origin={origin} src={src} loginUrl={loginUrl} userId={userId} active={active} onRetry={retry} onEscape={collapse} prepareLeaveRef={prepareLeaveRef} onLeaveState={setLeaveState} onReset={() => setAttempt(value => value + 1)} />
        : <ConnectionNotice connection={sessionStatus === "loading" ? "connecting" : "account_mismatch"} loginUrl={loginUrl} onRetry={retry} />}
    </div>
  </section>;
}

// Only the server-authenticated, opt-in route supplies this registration.
// The root host owns the DOM; the page owns just its layout anchor.
export function ToonflowWorkspace({ origin, src, loginUrl, userId }: Props) {
  const host = useToonflowHost();
  const anchor = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();
  useLayoutEffect(() => {
    if (!host || !anchor.current || status !== "authenticated" || session?.user?.id !== userId) return;
    return host.register({ origin, src, loginUrl, userId }, anchor.current);
  }, [host, origin, src, loginUrl, userId, status, session?.user?.id]);
  // Standalone rendering supports isolated component/protocol checks.
  if (!host) return <ToonflowWorkspaceSession origin={origin} src={src} loginUrl={loginUrl} userId={userId} />;
  return <div ref={anchor} data-toonflow-anchor className="relative min-h-[calc(100dvh-8rem)]">
    {(status !== "authenticated" || session?.user?.id !== userId) && <ConnectionNotice connection={status === "loading" ? "connecting" : "account_mismatch"} loginUrl={loginUrl} onRetry={() => window.location.reload()} />}
  </div>;
}
