"use client";

import { useState } from "react";
import Link from "next/link";

// Mini Promi icon for header
function MiniPromi({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 16 20" 
      className={className}
      style={{ imageRendering: "pixelated" }}
    >
      <rect x="7" y="0" width="2" height="2" fill="#FFD700" />
      <rect x="6" y="2" width="4" height="2" fill="#C0C0C0" />
      <rect x="2" y="4" width="12" height="8" fill="#4A90D9" />
      <rect x="4" y="6" width="3" height="3" fill="white" />
      <rect x="9" y="6" width="3" height="3" fill="white" />
      <rect x="5" y="7" width="2" height="2" fill="#333" />
      <rect x="10" y="7" width="2" height="2" fill="#333" />
      <rect x="6" y="10" width="4" height="1" fill="#333" />
      <rect x="5" y="9" width="1" height="1" fill="#333" />
      <rect x="10" y="9" width="1" height="1" fill="#333" />
      <rect x="4" y="12" width="8" height="6" fill="#4A90D9" />
      <rect x="6" y="14" width="4" height="2" fill="#FFD700" />
    </svg>
  );
}
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
  Moon,
  Sun,
  Copy,
  ExternalLink,
  Hammer,
  MoreHorizontal,
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
import { BilingualToggle } from "@/components/layout/bilingual-toggle";
import { setLocale } from "@/lib/i18n/client";
import { useBranding } from "@/components/providers/branding-provider";
import { analyticsAuth, analyticsSettings } from "@/lib/analytics";

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
  authProvider?: string;
  allowRegistration?: boolean;
}

export function Header({ authProvider = "credentials", allowRegistration = true }: HeaderProps) {
  const { data: session } = useSession();
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  const branding = useBranding();
  const router = useRouter();
  const pathname = usePathname();

  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <div className={`flex h-12 items-center gap-4 ${pathname === "/developers" ? "px-4" : "container"}`}>
        {/* Mobile menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
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
                      className="h-8 w-8 dark:hidden"
                    />
                    <Image
                      src={branding.logoDark || branding.logo}
                      alt={branding.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 hidden dark:block"
                    />
                  </>
                )}
                {/* Radix 要求抽屉有可访问的标题与描述；标题直接用可见品牌名，
                    描述对视觉隐藏，只供读屏使用。 */}
                <SheetTitle className="text-lg font-semibold mt-2">{branding.name}</SheetTitle>
                <SheetDescription className="sr-only">{t("nav.more")}</SheetDescription>
              </div>

              {/* Navigation */}
              <nav aria-label={t("a11y.mobileNav")} className="flex-1 p-4">
                <div className="space-y-1">
                  {user && (
                    <>
                      <Link 
                        href="/collection" 
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        {t("nav.collection")}
                      </Link>
                      <Link 
                        href="/feed" 
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        {t("nav.feed")}
                      </Link>
                    </>
                  )}
                  <Link 
                    href="/prompts" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {t("nav.prompts")}
                  </Link>
                  <Link 
                    href="/skills" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {t("nav.skills")}
                  </Link>
                  <Link 
                    href="/taste" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {t("nav.taste")}
                  </Link>
                  <Link 
                    href="/workflows" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {t("nav.workflows")}
                  </Link>
                  {user && (
                    <>
                      <Link
                        href="/workflows/mine"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 ps-6 pe-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        我的工作流
                      </Link>
                      <Link
                        href="/workflows/runs"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 ps-6 pe-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        运行记录
                      </Link>
                    </>
                  )}
                  <Link
                    href="/status"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {t("nav.status")}
                  </Link>
                  <Link 
                    href="/categories" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {t("nav.categories")}
                  </Link>
                  <Link 
                    href="/tags" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {t("nav.tags")}
                  </Link>
                  <Link 
                    href="/discover" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {t("feed.discover")}
                  </Link>
                  <Link 
                    href="/promptmasters" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {t("nav.promptmasters")}
                  </Link>
                  <Link
                    href="/projects"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    项目包
                  </Link>
                  <Link
                    href="/templates"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    模板广场
                  </Link>
                  <Link
                    href="/teams"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    团队与比赛
                  </Link>
                  <Link
                    href="/competitions"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-primary hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {t("nav.competitionHub")}
                  </Link>
                  {!branding.useCloneBranding && (
                    <Link
                      href="/kids"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-accent transition-colors font-kids"
                    >
                      <MiniPromi className="h-5 w-4" />
                      <span className="font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                        {t("nav.forKids")}
                      </span>
                    </Link>
                  )}
                </div>
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
            <Link href="/" className="flex gap-2">
              {branding.logo && (
                <>
                  {/* 品牌名就在紧邻的文本节点里，图标重复朗读品牌名反而干扰读屏，故 alt 留空。 */}
                  <Image
                    src={branding.logo}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 dark:hidden"
                  />
                  <Image
                    src={branding.logoDark || branding.logo}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 hidden dark:block"
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
            <ContextMenuItem onClick={() => router.push("/brand")}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("brand.brandAssets")}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Primary desktop nav: keep the main job paths visible and move low-frequency destinations into More. */}
        <nav aria-label={t("a11y.mainNav")} className="hidden min-w-0 flex-1 items-center gap-1 text-sm lg:flex">
          {[
            { href: "/prompts", label: t("nav.prompts") },
            { href: "/templates", label: t("homepageNext.templates") },
            { href: "/workflows", label: t("nav.workflows") },
            { href: "/competitions", label: t("nav.competitionHub"), emphasis: true },
          ].map(({ href, label, emphasis }) => (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-md px-3 py-1.5 transition-colors hover:bg-accent hover:text-foreground ${emphasis ? "font-medium text-primary" : "text-muted-foreground"}`}
            >
              {label}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1 px-2 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                <span>{t("nav.more")}</span>
                <span className="sr-only">{t("nav.more")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {user && <DropdownMenuItem asChild><Link href="/workspace">{t("homepageNext.workspace")}</Link></DropdownMenuItem>}
              {user && <DropdownMenuItem asChild><Link href="/collection">{t("nav.collection")}</Link></DropdownMenuItem>}
              {user && <DropdownMenuItem asChild><Link href="/workflows/runs">{t("homepageNext.runHistory")}</Link></DropdownMenuItem>}
              <DropdownMenuItem asChild><Link href="/status">{t("nav.status")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/discover">{t("feed.discover")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/categories">{t("nav.categories")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/tags">{t("nav.tags")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/skills">{t("nav.skills")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/taste">{t("nav.taste")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/promptmasters">{t("nav.promptmasters")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/developers"><Hammer className="mr-2 h-4 w-4" aria-hidden="true" />{t("nav.developers")}</Link></DropdownMenuItem>
              {!branding.useCloneBranding && <DropdownMenuItem asChild><Link href="/kids" className="font-kids"><MiniPromi className="mr-2 h-4 w-4" />{t("nav.forKids")}</Link></DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          <BilingualToggle />
          {/* For Kids link */}
          {!branding.useCloneBranding && (
            <Link
              href="/kids" 
              className="hidden 2xl:flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent transition-colors font-kids"
            >
              <MiniPromi className="h-5 w-4" />
              <span className="text-sm font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                {t("nav.forKids")}
              </span>
            </Link>
          )}

          {/* Developers link */}
          <Button asChild variant="ghost" size="icon" className="hidden 2xl:flex h-8 w-8">
            <Link href="/developers" title={t("nav.developers")}>
              <Hammer className="h-4 w-4" />
              <span className="sr-only">{t("nav.developers")}</span>
            </Link>
          </Button>

          {/* Create prompt button */}
          {user && (
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href="/prompts/new">
                <Plus className="h-4 w-4" />
                <span className="sr-only">{t("prompts.create")}</span>
              </Link>
            </Button>
          )}

          {/* Notifications */}
          {user && <NotificationBell />}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const newTheme = theme === "dark" ? "light" : "dark";
              analyticsSettings.changeTheme(newTheme);
              setTheme(newTheme);
            }}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-[transform,opacity] dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-[transform,opacity] dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* User menu or login */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 gap-2 px-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                    <AvatarFallback className="text-xs">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">
                    @{user.username}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
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
                          setLocale(lang.code);
                        }}
                      >
                        {lang.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  analyticsAuth.logout();
                  signOut({ callbackUrl: "/" });
                }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("nav.logout")}
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
                        setLocale(lang.code);
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
