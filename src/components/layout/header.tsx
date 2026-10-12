"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { WorkspaceLink as Link, useWorkspaceNavigation } from "@/components/providers/workspace-navigation";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  Menu,
  Plus,
  User,
  Settings,
  LogOut,
  Shield,
  Globe,
  Copy,
  Heart,
  Coins,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SiteSettings } from "@/components/settings/site-settings";
import { BilingualToggle } from "@/components/layout/bilingual-toggle";
import { setLocale } from "@/lib/i18n/client";
import { useBranding } from "@/components/providers/branding-provider";
import { analyticsAuth, analyticsSettings } from "@/lib/analytics";
import { PRIMARY_NAVIGATION, isPrimaryNavigationActive } from "@/domain/navigation/primary";

const languages = [
  { code: "en", name: "English" },
  { code: "zh", name: "中文" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "nl", name: "Dutch" },
  { code: "it", name: "Italiano" },
  { code: "ja", name: "日本語" },
  { code: "tr", name: "Türkçe" },
  { code: "az", name: "Azərbaycan dili" },
  { code: "ko", name: "한국어" },
  { code: "ar", name: "العربية" },
  { code: "fa", name: "فارسی" },
  { code: "ru", name: "Русский" },
  { code: "he", name: "עברית" },
  { code: "el", name: "Ελληνικά" }
];

interface HeaderProps {
  embedded?: boolean;
  authProvider?: string;
  allowRegistration?: boolean;
}

export function Header({ embedded = false, authProvider = "credentials", allowRegistration = true }: HeaderProps) {
  const { data: session, status: sessionStatus } = useSession();
  const t = useTranslations();
  const hubText = useTranslations("hubs");
  const { theme } = useTheme();
  const branding = useBranding();
  const router = useRouter();
  const { run: leaveWorkspace } = useWorkspaceNavigation();
  const pathname = usePathname();

  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutState, setLogoutState] = useState<"idle" | "pending" | "confirming">("idle");
  const logoutInFlight = useRef(false);

  const handleLogout = useCallback(async function logout() {
    if (logoutInFlight.current) return;
    logoutInFlight.current = true;
    setLogoutState("pending");
    try {
      // The redirecting branch skips this tab's session refresh. A blocked hard
      // navigation would otherwise leave the old private workspace visible.
      await signOut({ redirect: false, redirectTo: "/" });
      // Auth.js maps failed session fetches to null. Check a successful fresh
      // HTTP response as well, rather than treating a network error as logout.
      const confirmation = await fetch("/api/auth/session", { cache: "no-store" });
      if (!confirmation.ok || await confirmation.json() !== null) throw new Error("Logout not confirmed");
      setLogoutState("confirming");
    } catch {
      logoutInFlight.current = false;
      setLogoutState("idle");
      toast.error(t("product.logoutFailed"), { action: { label: t("product.logoutRetry"), onClick: () => void logout() } });
    }
  }, [t]);

  useEffect(() => {
    if (logoutState !== "confirming" || sessionStatus === "loading") return;
    // The effect runs after the anonymous render removes the private host.
    // Cancel this deferred action if the account or component changes again.
    const continuation = window.setTimeout(() => {
      logoutInFlight.current = false;
      setLogoutState("idle");
      if (sessionStatus !== "unauthenticated") {
        toast.error(t("product.logoutFailed"), { action: { label: t("product.logoutRetry"), onClick: () => void handleLogout() } });
        return;
      }
      analyticsAuth.logout();
      if (!embedded) { router.replace("/"); router.refresh(); }
    }, 0);
    return () => window.clearTimeout(continuation);
  }, [logoutState, sessionStatus, router, t, handleLogout, embedded]);
  const productLinks = PRIMARY_NAVIGATION.map(item => ({ ...item, label: hubText(`nav.${item.id}`) }));

  const handleCopyLogoSvg = async () => {
    try {
      const logoUrl = theme === "dark" ? (branding.logoDark || branding.logo) : branding.logo;
      if (!logoUrl) return;
      const response = await fetch(logoUrl);
      const svgContent = await response.text();
      await navigator.clipboard.writeText(svgContent);
    } catch (error) {
      console.error("Failed to copy logo:", error);
    }
  };

  return (
    <header className="sticky top-[0px] z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 items-center gap-1 sm:gap-2 xl:gap-4">
        {/* Mobile menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="xl:hidden">
            <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8" data-testid="mobile-menu-trigger">
              <Menu className="h-4 w-4" />
              <span className="sr-only">{t("product.menu")}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center gap-3 p-6 border-b">
                {branding.logo && (
                  <>
                    <Image
                      src={branding.logo}
                      alt={branding.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 object-contain dark:hidden"
                    />
                    <Image
                      src={branding.logoDark || branding.logo}
                      alt={branding.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 object-contain hidden dark:block"
                    />
                  </>
                )}
                {/* Radix 要求抽屉有可访问的标题与描述；标题直接用可见品牌名，
                    描述对视觉隐藏，只供读屏使用。 */}
                <SheetTitle className="text-lg font-semibold mt-2">{branding.name}</SheetTitle>
                <SheetDescription className="sr-only">{hubText("navigationDescription")}</SheetDescription>
              </div>

              <nav aria-label={t("a11y.mobileNav")} className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">{productLinks.map(({ id, href, label }) => <Link key={href} href={href} aria-current={isPrimaryNavigationActive(id, pathname) ? "page" : undefined} onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground focus-visible:outline-2 focus-visible:outline-primary">{label}</Link>)}</div>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  {branding.name}
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo — 始终提供右键菜单（复制 SVG / 品牌资源），不受 useCloneBranding 影响 */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <Link href="/" className="flex shrink-0 gap-2">
              {branding.logo && (
                <>
                  {/* 品牌名就在紧邻的文本节点里，图标重复朗读品牌名反而干扰读屏，故 alt 留空。 */}
                  <Image
                    src={branding.logo}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 object-contain dark:hidden"
                  />
                  <Image
                    src={branding.logoDark || branding.logo}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 object-contain hidden dark:block"
                  />
                </>
              )}
              <span className="font-semibold leading-none mt-[2px]">{branding.name}</span>
            </Link>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={handleCopyLogoSvg}>
              <Copy className="mr-2 h-4 w-4" />
              {t("brand.copyLogoSvg")}
            </ContextMenuItem>

          </ContextMenuContent>
        </ContextMenu>

        <nav aria-label={t("a11y.mainNav")} className="hidden min-w-0 items-center gap-1 text-sm xl:flex">
          {productLinks.map(({ id, href, label }) => <Link key={href} href={href} aria-current={isPrimaryNavigationActive(id, pathname) ? "page" : undefined} className="shrink-0 rounded-md px-2 py-2 font-medium text-muted-foreground transition-colors motion-reduce:transition-none hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground focus-visible:outline-2 focus-visible:outline-primary">{label}</Link>)}
        </nav>

        {/* Spacer */}
        <div className="min-w-0 flex-1" />

        {/* Right side actions */}
        <div className="flex shrink-0 items-center gap-1">
          <BilingualToggle />
          {/* Primary creation action follows the learning project flow. */}
          {user && (
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href="/projects#new-project">
                <Plus className="h-4 w-4" />
                <span className="sr-only">{t("learning.newProject")}</span>
              </Link>
            </Button>
          )}

          {/* Notifications */}
          {user && <NotificationBell />}

          <SiteSettings />

          {/* User menu or login */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 min-w-0 max-w-40 gap-2 px-2 lg:max-w-32 xl:max-w-40">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                    <AvatarFallback className="text-xs">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden min-w-0 truncate text-sm font-medium sm:block">
                    @{user.username}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="break-words text-sm font-medium leading-snug">{user.name}</p>
                    <p className="break-all text-xs leading-snug text-muted-foreground">
                      @{user.username}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/@${user.username}`}>
                    <User className="mr-2 h-4 w-4" />
                    {t("nav.profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    {t("nav.settings")}
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      {t("nav.admin")}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Globe className="mr-2 h-4 w-4" />
                    {t("settings.language")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {languages.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => {
                          analyticsSettings.changeLanguage(lang.code);
                          leaveWorkspace(() => setLocale(lang.code));
                        }}
                      >
                        {lang.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem asChild><Link href="/collection"><Heart className="mr-2 h-4 w-4" aria-hidden="true" />{hubText("account.favorites")}</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/workspace/credits"><Coins className="mr-2 h-4 w-4" aria-hidden="true" />{hubText("account.compute")}</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={logoutState !== "idle"} onClick={() => void handleLogout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t(logoutState === "idle" ? "nav.logout" : "product.loggingOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1">
              {/* Language selector for non-logged in users */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("settings.language")}>
                    <Globe className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => {
                        analyticsSettings.changeLanguage(lang.code);
                        leaveWorkspace(() => setLocale(lang.code));
                      }}
                    >
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
              {authProvider === "credentials" && allowRegistration && (
                <Button size="sm" className="h-8 text-xs" asChild>
                  <Link href="/register">
                    {t("nav.register")}
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
