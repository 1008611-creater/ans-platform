"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";

export interface ToonflowHostConfig { origin: string; src: string; loginUrl: string; userId: string }
interface HostRegistration { register: (config: ToonflowHostConfig, anchor: HTMLElement) => () => void }
interface Entry { config: ToonflowHostConfig; anchor: HTMLElement | null }
const HostContext = createContext<HostRegistration | null>(null);
const Workspace = dynamic(() => import("@/components/workspace/toonflow-workspace").then(module => module.ToonflowWorkspaceSession), { ssr: false });
const keyOf = (config: ToonflowHostConfig) => JSON.stringify([config.origin, config.src, config.loginUrl, config.userId]);

export function useToonflowHost() { return useContext(HostContext); }

export function ToonflowHostProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const accountId = status === "authenticated" ? session?.user?.id : undefined;
  const [identity, setIdentity] = useState(accountId);
  const [entry, setEntry] = useState<Entry | null>(null);
  // Reset in this component's render before children can register the new account.
  // This avoids an ancestor layout effect clearing a child's fresh registration.
  if (identity !== accountId) {
    setIdentity(accountId);
    setEntry(null);
  }
  const [bounds, setBounds] = useState<CSSProperties>({ position: "fixed", left: 0, top: 0, width: "100%", zIndex: 40 });
  const hostElement = useRef<HTMLDivElement>(null);
  const registration = useRef<object | null>(null);
  const activeAnchor = useRef<HTMLElement | null>(null);
  const register = useCallback((config: ToonflowHostConfig, anchor: HTMLElement) => {
    const owner = {};
    registration.current = owner;
    activeAnchor.current = anchor;
    setEntry(previous => previous && keyOf(previous.config) === keyOf(config) && previous.anchor === anchor ? previous : { config, anchor });
    return () => {
      if (registration.current !== owner) return;
      registration.current = null;
      activeAnchor.current = null;
      // Removing a route anchor hides the workspace; it does not discard drafts.
      setEntry(previous => previous ? { ...previous, anchor: null } : null);
    };
  }, []);
  const context = useMemo(() => ({ register }), [register]);
  const valid = !!entry && !!accountId && entry.config.userId === accountId && identity === accountId;
  const active = valid && pathname === "/workflows/toonflow" && !!entry.anchor?.isConnected;

  useLayoutEffect(() => {
    if (!active || !entry?.anchor) return;
    const anchor = activeAnchor.current;
    if (!anchor) return;
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      setBounds({ position: "fixed", left: rect.left, top: rect.top, width: rect.width, zIndex: 40 });
      const height = hostElement.current?.getBoundingClientRect().height;
      // Keep the ordinary document/footers below the retained, fixed-position host.
      // Expanded mode has no natural height and must not collapse the route anchor.
      if (height && Math.abs(anchor.getBoundingClientRect().height - height) > 1) anchor.style.height = `${height}px`;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(anchor);
    if (hostElement.current) observer.observe(hostElement.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [active, entry?.anchor]);

  return <HostContext.Provider value={context}>
    {children}
    {valid && <div ref={hostElement} data-toonflow-host hidden={!active} inert={!active} aria-hidden={!active} style={bounds}>
      <Workspace key={keyOf(entry.config)} {...entry.config} active={active} />
    </div>}
  </HostContext.Provider>;
}
