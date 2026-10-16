"use client";

import { WorkspaceLink as Link } from "@/components/providers/workspace-navigation";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Compass, Layers3, LayoutDashboard, Users, Trophy, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_NAVIGATION, isPrimaryNavigationActive } from "@/domain/navigation/primary";

const icons = { compass: Compass, layers: Layers3, users: Users, trophy: Trophy, store: Store, dashboard: LayoutDashboard };

/** The same primary destinations as the desktop header and mobile sheet. */
export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const t = useTranslations("hubs");
  return <nav aria-label={t("mobileNavigation")} className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background xl:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
    <div className="grid grid-cols-6">{PRIMARY_NAVIGATION.map(item => {
      const active = isPrimaryNavigationActive(item.id, pathname), Icon = icons[item.icon];
      return <Link key={item.id} href={item.href} aria-label={t(`nav.${item.id}`)} aria-current={active ? "page" : undefined} className={cn("flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2.5 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-primary", active ? "bg-accent text-foreground" : "text-muted-foreground")}><Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} aria-hidden="true" /><span className="max-w-full break-words text-center text-[11px] font-medium leading-tight">{t(`shortNav.${item.id}`)}</span></Link>;
    })}</div>
  </nav>;
}
