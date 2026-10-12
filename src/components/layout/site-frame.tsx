"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface SiteFrameProps {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  mobileNavigation: ReactNode;
  companion: ReactNode;
  skipLabel: string;
}

/** Root layouts persist across navigation; the visible frame must follow the current route. */
export function SiteFrame({ children, header, footer, mobileNavigation, companion, skipLabel }: SiteFrameProps) {
  const pathname = usePathname();
  if (pathname.startsWith("/embed") || pathname.startsWith("/kids") || pathname.startsWith("/vibe-hub")) return children;
  return <div className="relative min-h-screen flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
    <a href="#main-content" className="sr-only fixed start-4 top-2 z-[60] rounded-lg bg-background p-3 font-medium text-foreground focus:not-sr-only focus-visible:outline-2 focus-visible:outline-primary">{skipLabel}</a>
    {header}
    <main id="main-content" tabIndex={-1} className="flex-1 scroll-mt-16">{children}</main>
    {footer}
    {mobileNavigation}
    {companion}
  </div>;
}
