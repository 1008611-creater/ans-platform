"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { isTabRootPath } from "@/domain/navigation/app-shell";

interface SiteFrameProps {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  mobileNavigation: ReactNode;
  companion: ReactNode;
  skipLabel: string;
}

/** iOS home-screen apps cannot be told apart by user agent, so mark them on the client; also backfills the Android mark if the server missed it. */
function useStandaloneMarker() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.appShell) return;
    if (/ANSMobileApp\//.test(navigator.userAgent)) { root.dataset.appShell = "android"; return; }
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) root.dataset.appShell = /ANSMobileApp\//.test(navigator.userAgent) ? "android" : "ios";
  }, []);
}

/** Root layouts persist across navigation; the visible frame must follow the current route. */
export function SiteFrame({ children, header, footer, mobileNavigation, companion, skipLabel }: SiteFrameProps) {
  const pathname = usePathname();
  useStandaloneMarker();
  if (pathname.startsWith("/embed") || pathname.startsWith("/kids") || pathname.startsWith("/vibe-hub")) return children;
  // Pushed screens give the bottom of the viewport to their own content and actions.
  const tabRoot = isTabRootPath(pathname);
  return <div data-site-frame data-tab-root={tabRoot ? "" : undefined} className={cn("relative min-h-screen flex flex-col xl:pb-0", tabRoot ? "pb-[calc(4rem+env(safe-area-inset-bottom))]" : "pb-[env(safe-area-inset-bottom)]")}>
    <a href="#main-content" className="sr-only fixed start-4 top-2 z-[60] rounded-lg bg-background p-3 font-medium text-foreground focus:not-sr-only focus-visible:outline-2 focus-visible:outline-primary">{skipLabel}</a>
    {header}
    <main id="main-content" tabIndex={-1} className="flex-1 scroll-mt-16">{children}</main>
    {footer}
    {tabRoot && mobileNavigation}
    {companion}
  </div>;
}
