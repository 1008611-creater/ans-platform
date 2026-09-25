"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Home, FileText, Sparkles, Compass, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TabItem {
  href: string;
  labelZh: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (pathname: string) => boolean;
}

const TABS: TabItem[] = [
  {
    href: "/",
    labelZh: "首页",
    labelEn: "Home",
    icon: Home,
    match: (pathname) => pathname === "/",
  },
  {
    href: "/prompts",
    labelZh: "提示词",
    labelEn: "Prompts",
    icon: FileText,
    match: (pathname) => pathname.startsWith("/prompts"),
  },
  {
    href: "/skills",
    labelZh: "技能",
    labelEn: "Skills",
    icon: Sparkles,
    match: (pathname) => pathname.startsWith("/skills"),
  },
  {
    href: "/discover",
    labelZh: "发现",
    labelEn: "Discover",
    icon: Compass,
    match: (pathname) =>
      pathname.startsWith("/discover") ||
      pathname.startsWith("/categories") ||
      pathname.startsWith("/tags"),
  },
];

/**
 * 移动端底部 Tab 导航栏。
 * 仅在 lg 以下断点显示，用于让 WebView 封装的 APK 具备原生 App 的导航体验。
 */
export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const locale = useLocale();
  const t = useTranslations();
  const isEnglish = locale === "en";
  const { data: session } = useSession();
  const user = session?.user;

  const accountHref = user?.username ? `/@${user.username}` : "/login";
  const accountActive = pathname === accountHref || pathname.startsWith("/settings");

  return (
    <nav
      aria-label={t("a11y.mobileTabBar")}
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span className="text-[11px] font-medium leading-tight">{isEnglish ? tab.labelEn : tab.labelZh}</span>
            </Link>
          );
        })}

        <Link
          href={accountHref}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-2 transition-colors",
            accountActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          {user?.image ? (
            <Avatar className="h-5 w-5">
              <AvatarImage src={user.image} alt={user.name || "我的"} />
              <AvatarFallback className="text-[8px]">
                {(user.name || user.username || "我").charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <User className={cn("h-5 w-5", accountActive && "stroke-[2.5]")} />
          )}
          <span className="text-[11px] font-medium leading-tight">{isEnglish ? (user ? "Me" : "Sign in") : (user ? "我的" : "登录")}</span>
        </Link>
      </div>
    </nav>
  );
}
