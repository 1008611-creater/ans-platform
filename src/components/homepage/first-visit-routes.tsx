"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, BookOpen, Compass, Trophy, Upload, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 首访引导的五张分流卡：按「我想……」分流到站内已有的真实去处。
 *
 * 每张卡的结果句都和落地页第一眼同词同义（对齐记录见 docs/prompts/first-visit-guide-report.md v3）。
 * 卡面不写任何会过期的数字或状态（项目个数、「报名中」之类），只写落地页上稳定存在的说法。
 * 改去处之前，先打开落地页核对，再改文案。
 */
export const FIRST_VISIT_ROUTES = [
  { key: "explore", href: "/explore", icon: Compass },
  { key: "learn", href: "/vibe-hub/courses", icon: BookOpen },
  { key: "team", href: "/teams", icon: Users },
  { key: "compete", href: "/competitions/agrihackathon", icon: Trophy },
  { key: "publish", href: "/explore/submit", icon: Upload },
] as const satisfies readonly { key: string; href: string; icon: LucideIcon }[];

export type FirstVisitRouteKey = (typeof FIRST_VISIT_ROUTES)[number]["key"];

export function FirstVisitRoutes({ onNavigate, className }: { onNavigate?: (key: FirstVisitRouteKey) => void; className?: string }) {
  const t = useTranslations("preview.firstVisit.routes");

  return (
    <nav aria-label={t("label")} className={className}>
      <ul className="grid gap-2 [@media(max-height:700px)]:gap-1.5">
        {FIRST_VISIT_ROUTES.map(({ key, href, icon: Icon }, i) => (
          <li
            key={key}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both motion-safe:duration-300"
            style={{ animationDelay: `${180 + i * 50}ms` }}
          >
            <Link
              href={href}
              onClick={() => onNavigate?.(key)}
              data-route={key}
              className={cn(
                "group flex min-h-[64px] items-center gap-3 rounded-2xl border border-[#12211C]/8 bg-white/70 px-3 py-2.5 sm:px-4 text-left outline-none",
                "transition-[background-color,border-color,box-shadow,transform] duration-200 motion-reduce:transition-none",
                "hover:border-[#2F8F6B]/35 hover:bg-white hover:shadow-[0_10px_24px_-18px_rgba(18,33,28,0.55)]",
                "focus-visible:border-[#2F8F6B]/60 focus-visible:ring-2 focus-visible:ring-[#2F8F6B]/35",
                "active:scale-[0.985] motion-reduce:active:scale-100",
                "[@media(max-height:700px)]:min-h-[52px] [@media(max-height:700px)]:py-1.5",
              )}
            >
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#CDEFE0]/70 text-[#1F6B50] transition-colors duration-200 group-hover:bg-[#CDEFE0] [@media(max-height:700px)]:size-8"
              >
                <Icon className="size-[18px]" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-tight text-[#12211C]/70">{t(`${key}.need`)}</span>
                <span className="mt-0.5 block text-[15px] leading-snug font-bold tracking-[-0.01em] text-[#12211C] transition-colors duration-200 group-hover:text-[#1F6B50] sm:text-base">
                  {t(`${key}.result`)}
                </span>
              </span>
              <ArrowRight
                aria-hidden
                className="size-4 shrink-0 text-[#12211C]/30 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-[#1F6B50] motion-reduce:transition-none"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
