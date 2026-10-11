"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ComponentProps } from "react";

type LeaveGuard = (afterSave: () => void, cancel: () => void) => void;
type NavigationEvent = { preventDefault(): void };
type NavigationOptions = { replace?: boolean; scroll?: boolean; transitionTypes?: string[] };
interface WorkspaceNavigation {
  register: (guard: LeaveGuard) => () => void;
  run: (action: () => void) => void;
  intercept: (event: NavigationEvent, href: string, options: NavigationOptions) => void;
}
const NavigationContext = createContext<WorkspaceNavigation>({
  register: () => () => {},
  run: action => action(),
  intercept: () => {},
});

export function WorkspaceNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const guards = useRef(new Set<{ guard: LeaveGuard }>());
  const membership = useRef(0);
  const request = useRef(0);
  const mounted = useRef(true);
  const pending = useRef<{ id: number; version: number } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pending.current = null; ++request.current; };
  }, []);
  const register = useCallback((guard: LeaveGuard) => {
    const entry = { guard };
    guards.current.add(entry);
    ++membership.current;
    pending.current = null;
    return () => { if (guards.current.delete(entry)) { ++membership.current; pending.current = null; } };
  }, []);
  const run = useCallback((action: () => void) => {
    // Preserve the first destination while editors are confirming or saving.
    if (pending.current?.version === membership.current) return;
    const entries = Array.from(guards.current);
    const version = membership.current;
    const id = ++request.current;
    pending.current = { id, version };
    const current = () => mounted.current && request.current === id && membership.current === version;
    const proceed = (index: number) => {
      if (!current()) return;
      if (index === entries.length) { pending.current = null; ++request.current; action(); return; }
      const entry = entries[index];
      let answered = false;
      entry.guard(() => {
        if (answered || !current()) return;
        answered = true;
        proceed(index + 1);
      }, () => {
        if (answered || !current()) return;
        answered = true;
        pending.current = null;
        ++request.current;
      });
    };
    proceed(0);
  }, []);
  const intercept = useCallback((event: NavigationEvent, href: string, options: NavigationOptions) => {
    if (guards.current.size === 0) return;
    const destination = new URL(href, window.location.href);
    if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.search === window.location.search) return;
    event.preventDefault();
    run(() => {
      if (options.replace) router.replace(href, { scroll: options.scroll, transitionTypes: options.transitionTypes });
      else router.push(href, { scroll: options.scroll, transitionTypes: options.transitionTypes });
    });
  }, [router, run]);
  const value = useMemo(() => ({ register, run, intercept }), [register, run, intercept]);
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useWorkspaceNavigation() { return useContext(NavigationContext); }

// onNavigate preserves Next's modifier-key, external-URL and download behavior.
// These application navigation links use string destinations, matching the site shell.
export function WorkspaceLink({ href, as, onNavigate, replace, scroll, transitionTypes, ...props }: Omit<ComponentProps<typeof NextLink>, "href" | "as"> & { href: string; as?: string }) {
  const { intercept } = useWorkspaceNavigation();
  return <NextLink {...props} href={href} as={as} replace={replace} scroll={scroll} transitionTypes={transitionTypes} onNavigate={event => {
    let cancelled = false;
    onNavigate?.({ preventDefault() { cancelled = true; event.preventDefault(); } });
    if (!cancelled) intercept(event, as ?? href, { replace, scroll, transitionTypes });
  }} />;
}
