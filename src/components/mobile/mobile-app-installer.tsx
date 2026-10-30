"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { WorkspaceLink as Link } from "@/components/providers/workspace-navigation";
import { useLocale } from "next-intl";
import {
  Check,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Laptop,
  LayoutDashboard,
  Share,
  Smartphone,
  Sparkles,
  Trophy,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __ansInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export type DevicePlatform = "android" | "ios" | "wechat" | "desktop";

export function detectDeviceEnvironment(userAgent: string): {
  platform: DevicePlatform;
  inAppName: "WeChat" | "QQ" | null;
} {
  const ua = userAgent || "";
  if (/MicroMessenger/i.test(ua)) {
    return { platform: "wechat", inAppName: "WeChat" };
  }
  if (/\bQQ\//i.test(ua)) {
    return { platform: "wechat", inAppName: "QQ" };
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return { platform: "ios", inAppName: null };
  }
  if (/Android/i.test(ua)) {
    return { platform: "android", inAppName: null };
  }
  return { platform: "desktop", inAppName: null };
}

const APP_INSTALL_URL = "https://ans.cauai.fun/app";

export function MobileAppInstaller() {
  const locale = useLocale();
  const isEn = locale === "en";

  const [detectedPlatform, setDetectedPlatform] = useState<DevicePlatform>("android");
  const [activeTab, setActiveTab] = useState<DevicePlatform>("android");
  const [inAppName, setInAppName] = useState<"WeChat" | "QQ" | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installOutcome, setInstallOutcome] = useState<"idle" | "accepted" | "dismissed">("idle");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const env = detectDeviceEnvironment(window.navigator.userAgent);
    // Check iPadOS desktop-class Safari (MacIntel + touch points)
    const isIpadOs =
      env.platform === "desktop" &&
      /Macintosh/i.test(window.navigator.userAgent) &&
      typeof window.navigator.maxTouchPoints === "number" &&
      window.navigator.maxTouchPoints > 1;

    const effectivePlatform: DevicePlatform = isIpadOs ? "ios" : env.platform;
    setDetectedPlatform(effectivePlatform);
    setActiveTab(effectivePlatform);
    setInAppName(env.inAppName);

    const standaloneMatch =
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(Boolean(standaloneMatch));

    if (window.__ansInstallPrompt) {
      setDeferredPrompt(window.__ansInstallPrompt);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      window.__ansInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      window.__ansInstallPrompt = null;
      setDeferredPrompt(null);
      setInstallOutcome("accepted");
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleTriggerNativeInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setInstallOutcome(choice.outcome);
      if (choice.outcome === "accepted") {
        window.__ansInstallPrompt = null;
        setDeferredPrompt(null);
      }
    } catch {
      // Fallback to manual browser steps shown below
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(APP_INSTALL_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const tabs: Array<{ id: DevicePlatform; label: string }> = [
    { id: "android", label: isEn ? "Android App" : "安卓手机 (Android)" },
    { id: "ios", label: isEn ? "iPhone / iOS" : "苹果手机 (iPhone)" },
    { id: "wechat", label: isEn ? "WeChat / QQ Guide" : "微信 / QQ 内打开" },
    { id: "desktop", label: isEn ? "Desktop Web" : "电脑端网页版" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Hero Card */}
      <section className="rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] via-background to-background p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-[#0A1633] p-2.5 shadow-md">
              <Image
                src="/favicon/favicon.svg"
                alt="ANS"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                  {isEn ? "Mobile App + Desktop Web" : "手机端独立 App · 电脑端网页工作台"}
                </span>
                {isStandalone ? (
                  <span
                    data-testid="standalone-active-badge"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white"
                  >
                    <Check className="h-3 w-3" aria-hidden="true" />
                    {isEn ? "Running in App Mode" : "已运行在手机 App 模式"}
                  </span>
                ) : null}
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {isEn
                  ? "ANS (AI Never Stops) Mobile App"
                  : "ANS (AI Never Stops) 手机端 App"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEn
                  ? "Install ANS to your phone home screen for full-screen access to AgriHackathon, Project Square, 3D Dino Agent, and Compute Center. On PC, use the web workspace directly."
                  : "将 ANS 安装到手机桌面，开启无浏览器地址栏的全屏体验，随时查赛题、逛项目广场、领算力积分；电脑端无需装软件，直接使用网页工作台。"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
            {deferredPrompt && !isStandalone ? (
              <Button
                size="lg"
                onClick={() => void handleTriggerNativeInstall()}
                data-testid="native-pwa-install-btn"
                className="w-full bg-emerald-600 font-semibold text-white hover:bg-emerald-500 sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                {isEn ? "Install ANS App Now" : "一键安装 ANS 手机端 App"}
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleCopyUrl()}
              data-testid="copy-app-url-btn"
              className="w-full sm:w-auto"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  {isEn ? "Copied Link" : "已复制安装链接"}
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {isEn ? "Copy App Install Link" : "复制手机安装链接"}
                </>
              )}
            </Button>
          </div>
        </div>

        {installOutcome === "accepted" ? (
          <div
            role="status"
            className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-200"
          >
            {isEn
              ? "ANS App installation started. You can now launch ANS directly from your phone home screen."
              : "已发起 ANS 手机桌面安装！安装完成后即可直接从手机桌面图标全屏启动。"}
          </div>
        ) : null}
      </section>

      {/* If already running in Standalone App Mode, show Quick Launch Hub */}
      {isStandalone ? (
        <section
          aria-label={isEn ? "App Quick Launch" : "手机 App 快捷入口"}
          className="rounded-2xl border bg-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {isEn ? "Quick Launch" : "手机端核心功能直达"}
            </h2>
            <span className="text-xs text-muted-foreground">
              {isEn ? "Full-screen standalone mode active" : "当前处于全屏独立 App 模式"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/competitions/agrihackathon"
              className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3.5 transition-colors hover:bg-emerald-500/10"
            >
              <Trophy className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <div>
                <div className="text-sm font-semibold">
                  {isEn ? "AgriHackathon Hub" : "农客松一体化主会场"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isEn ? "5-step entry flow, 20 free credits & submissions" : "五步参赛主线、领 20 积分与作品提交"}
                </div>
              </div>
            </Link>
            <Link
              href="/explore"
              className="flex items-center gap-3 rounded-xl border p-3.5 transition-colors hover:bg-accent/50"
            >
              <Compass className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <div className="text-sm font-semibold">
                  {isEn ? "Project Square" : "项目广场"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isEn ? "Browse real projects and open Work Mode" : "先看真实效果，一键打开工作模式"}
                </div>
              </div>
            </Link>
            <Link
              href="/workspace/credits"
              className="flex items-center gap-3 rounded-xl border p-3.5 transition-colors hover:bg-accent/50"
            >
              <Coins className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <div className="text-sm font-semibold">
                  {isEn ? "Compute Center" : "算力与积分中心"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isEn ? "Check credit balance and usage history" : "查看积分余额、参赛赠点与调用明细"}
                </div>
              </div>
            </Link>
            <Link
              href="/workspace"
              className="flex items-center gap-3 rounded-xl border p-3.5 transition-colors hover:bg-accent/50"
            >
              <LayoutDashboard className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <div className="text-sm font-semibold">
                  {isEn ? "My Workspace" : "个人工作台与团队"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isEn ? "Manage projects, teams and Dino Agent" : "管理我的项目、参赛队伍与 3D 小恐龙"}
                </div>
              </div>
            </Link>
          </div>
        </section>
      ) : null}

      {/* Platform Switcher & Step-by-Step Installation Instructions */}
      <section className="rounded-2xl border bg-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {isEn ? "Installation Guide by Device" : "分设备极速安装指南"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {detectedPlatform === "wechat"
                ? isEn
                  ? `Detected ${inAppName || "in-app"} browser — please open in system browser first.`
                  : `已自动识别您当前在 ${inAppName === "QQ" ? "QQ" : "微信"} 内打开，请按下方两步切换至系统浏览器安装。`
                : isEn
                  ? "Auto-selected for your current device. You can also view steps for other devices."
                  : "已自动匹配您当前的设备环境，也可点击切换查看其他设备安装方式。"}
            </p>
          </div>

          <div
            role="tablist"
            aria-label={isEn ? "Device platform tabs" : "设备类型切换"}
            className="flex flex-wrap gap-1.5 rounded-xl bg-muted/60 p-1"
          >
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  data-testid={`platform-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* WECHAT / QQ IN-APP GUIDE */}
        {activeTab === "wechat" ? (
          <div data-testid="guide-panel-wechat" className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-200">
              {isEn
                ? "WeChat / QQ built-in browsers restrict home-screen installation. Open this page in Safari or your system browser to install the full-screen App."
                : "微信与 QQ 内置浏览器屏蔽了手机桌面图标安装权限。请花 3 秒切换到手机自带浏览器，即可一键生成桌面独立 App 图标。"}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-background/60 p-4 space-y-1.5">
                <span className="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  STEP 01
                </span>
                <h3 className="text-sm font-semibold">
                  {isEn ? "Tap '···' in the top-right corner" : "点击右上角「···」菜单按钮"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "In the popup menu, select 'Open in Browser' (Safari on iPhone, Chrome/System Browser on Android)."
                    : "在弹出的底部菜单中，选择「在默认浏览器中打开」（iPhone 自动跳转 Safari，安卓跳转系统浏览器）。"}
                </p>
              </div>
              <div className="rounded-xl border bg-background/60 p-4 space-y-1.5">
                <span className="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  STEP 02
                </span>
                <h3 className="text-sm font-semibold">
                  {isEn ? "Add ANS to Home Screen" : "一键添加到手机主屏幕"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "In your system browser, tap 'Install App' or 'Add to Home Screen' to get the standalone ANS icon."
                    : "在系统浏览器打开后，点击本页「一键安装」或浏览器菜单「添加到主屏幕」，桌面即刻生成 ANS 图标。"}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* ANDROID GUIDE */}
        {activeTab === "android" ? (
          <div data-testid="guide-panel-android" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-background/60 p-4 space-y-2">
                <span className="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  STEP 01
                </span>
                <h3 className="text-sm font-semibold">
                  {isEn
                    ? "One-Click Install or Open Browser Menu"
                    : "点击「一键安装」或打开浏览器菜单"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "On Chrome / Edge / system browser, tap the install button above, or tap the menu icon (≡ / ···) at the bottom or top-right."
                    : "使用 Chrome、Edge 或手机自带浏览器访问本页，若顶部出现「一键安装 ANS 手机端 App」可直接点击；或点击浏览器底部/右上角菜单「≡ / ···」。"}
                </p>
                {deferredPrompt ? (
                  <Button
                    size="sm"
                    onClick={() => void handleTriggerNativeInstall()}
                    className="mt-1 bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    {isEn ? "Install to Home Screen" : "立即弹出安装窗口"}
                  </Button>
                ) : null}
              </div>
              <div className="rounded-xl border bg-background/60 p-4 space-y-2">
                <span className="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  STEP 02
                </span>
                <h3 className="text-sm font-semibold">
                  {isEn
                    ? "Select 'Add to Home Screen' / 'Install App'"
                    : "选择「添加到主屏幕」或「安装应用」"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "Confirm adding the ANS icon. Launch ANS from your home screen for a full-screen native experience."
                    : "确认添加后，手机桌面将生成独立的 ANS 图标。从桌面点开即可全屏运行，长按图标还能直接跳进农客松主会场。"}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* IOS / IPHONE GUIDE */}
        {activeTab === "ios" ? (
          <div data-testid="guide-panel-ios" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-background/60 p-4 space-y-2">
                <span className="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  STEP 01
                </span>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <Share className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  {isEn
                    ? "Open in Safari & Tap the Share Button"
                    : "在 Safari 浏览器点击底部「分享」按钮"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "Use iPhone/iPad Safari to open ans.cauai.fun/app, then tap the Share icon [↑] in the bottom toolbar."
                    : "请使用 iPhone 自带的 Safari 浏览器打开本页，点击屏幕底部正中间的「分享」图标（带向上箭头的方框）。"}
                </p>
              </div>
              <div className="rounded-xl border bg-background/60 p-4 space-y-2">
                <span className="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  STEP 02
                </span>
                <h3 className="text-sm font-semibold">
                  {isEn
                    ? "Tap 'Add to Home Screen'"
                    : "下滑选择「添加到主屏幕」并确认"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "Scroll down the share sheet, tap 'Add to Home Screen', and tap 'Add' in the top right. ANS will launch full-screen like a native iOS App."
                    : "在分享菜单中向下滑动，点击「添加到主屏幕」，再点击右上角「添加」。从桌面打开 ANS 即可隐藏 Safari 地址栏全屏使用。"}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* DESKTOP PC GUIDE */}
        {activeTab === "desktop" ? (
          <div data-testid="guide-panel-desktop" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">
                    {isEn ? "Desktop: Use Web Workspace Directly" : "电脑端：直接使用网页版工作台"}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "On Windows or Mac, no extra software download is needed. Use the full browser workspace for code editing, 3D inspection, and AgriHackathon project packaging."
                    : "在 Windows 或 Mac 电脑上无需下载客户端，直接通过网页使用大屏代码编辑、3D 视口预览与农客松作品打包提交。"}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" asChild>
                    <Link href="/competitions/agrihackathon">
                      {isEn ? "Go to AgriHackathon" : "进入农客松主会场"}
                      <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/workspace">
                      {isEn ? "Open Web Workspace" : "打开网页工作台"}
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border bg-background/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">
                    {isEn ? "Phone: Open Link to Install Mobile App" : "手机端：浏览器打开本页安装 App"}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "Send ans.cauai.fun/app to your phone and open it in Safari (iOS) or Chrome/Edge (Android) to install the standalone ANS App."
                    : "在手机 Safari（苹果）或系统浏览器（安卓）中输入下方网址，即可把 ANS 独立 App 安装到手机桌面："}
                </p>
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                  <code className="text-xs font-semibold text-foreground">{APP_INSTALL_URL}</code>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void handleCopyUrl()}>
                    {copied ? (isEn ? "Copied" : "已复制") : isEn ? "Copy" : "复制"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Dual-Device Division Summary */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            {isEn ? "Full-Screen App View" : "无边框全屏视图"}
          </div>
          <p className="text-xs text-muted-foreground">
            {isEn
              ? "Removes browser URL bars and toolbars, with native bottom 6-tab navigation and safe-area gesture support."
              : "告别浏览器顶栏与底栏遮挡，配备手机底部六栏原生导航与安全区手势适配。"}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            {isEn ? "Home Screen Shortcuts" : "桌面图标长按直达"}
          </div>
          <p className="text-xs text-muted-foreground">
            {isEn
              ? "Long-press the ANS app icon on your phone to jump straight to AgriHackathon, Project Square, or Compute Center."
              : "在手机桌面长按 ANS 图标，即可一键呼出「农客松参赛」「项目广场」与「算力中心」快捷入口。"}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Laptop className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            {isEn ? "Phone + PC Synced" : "手机 App + 电脑网页互通"}
          </div>
          <p className="text-xs text-muted-foreground">
            {isEn
              ? "Check tasks, credits, and projects on your phone App anytime; switch to the PC website for heavy development."
              : "手机端随时报名参赛、查赛题、逛广场、看积分；电脑端浏览器无缝接力大屏开发，同一账号实时同步。"}
          </p>
        </div>
      </section>
    </div>
  );
}
