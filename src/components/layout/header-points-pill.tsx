"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Coins } from "lucide-react";
import { WorkspaceLink as Link } from "@/components/providers/workspace-navigation";

/** Phone header entry to the credits page; shows the real balance once loaded, the plain label until then. */
export function HeaderPointsPill({ userId, label }: { userId: string; label: string }) {
  const pathname = usePathname();
  const locale = useLocale();
  const [points, setPoints] = useState<{ userId: string; value: number } | null>(null);

  // Balances change after runs and claims, so re-read on each navigation; desktop never shows the pill.
  useEffect(() => {
    if (!window.matchMedia?.("(max-width: 767px)").matches) return;
    const controller = new AbortController();
    fetch("/api/me/points", { cache: "no-store", signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then((body: { points?: unknown } | null) => { if (typeof body?.points === "number") setPoints({ userId, value: body.points }); })
      .catch(() => {});
    return () => controller.abort();
  }, [userId, pathname]);

  const value = points?.userId === userId ? new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(points.value) : null;
  return <Link href="/workspace/credits" aria-label={value ? `${label} ${value}` : label} className="flex h-11 shrink-0 items-center md:hidden">
    <span className="flex h-7 items-center gap-1 rounded-full bg-muted px-2.5 text-xs font-medium tabular-nums">
      <Coins className="h-3.5 w-3.5" aria-hidden="true" />
      {value ?? label}
    </span>
  </Link>;
}
