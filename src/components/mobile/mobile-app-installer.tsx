"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { WorkspaceLink as Link } from "@/components/providers/workspace-navigation";
import { useLocale } from "next-intl";
import {
  ArrowUpRight,
  Check,
  Coins,
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
  underlyingOs: "android" | "ios" | "desktop";
} {
  const ua = userAgent || "";
  const isIosUa = /iPhone|iPad|iPod/i.test(ua);
  const isAndroidUa = /Android/i.test(ua);
  const underlyingOs: "android" | "ios" | "desktop" = isIosUa
    ? "ios"
    : isAndroidUa
      ? "android"
      : "desktop";

  if (/MicroMessenger/i.test(ua)) {
    return { platform: "wechat", inAppName: "WeChat", underlyingOs };
  }
  if (/\bQQ\//i.test(ua)) {
    return { platform: "wechat", inAppName: "QQ", underlyingOs };
  }
  if (isIosUa) {
    return { platform: "ios", inAppName: null, underlyingOs: "ios" };
  }
  if (isAndroidUa) {
    return { platform: "android", inAppName: null, underlyingOs: "android" };
  }
  return { platform: "desktop", inAppName: null, underlyingOs: "desktop" };
}

const APP_INSTALL_URL = "https://ans.cauai.fun/app";
const ANDROID_DOWNLOAD_PATH = "/api/app/download?platform=android";
const IOS_DOWNLOAD_PATH = "/api/app/download?platform=ios";

export function MobileAppInstaller() {
  const locale = useLocale();
  const isEn = locale === "en";

  const [detectedPlatform, setDetectedPlatform] = useState<DevicePlatform>("android");
  const [underlyingOs, setUnderlyingOs] = useState<"android" | "ios" | "desktop">("android");
  const [activeTab, setActiveTab] = useState<DevicePlatform>("android");
  const [inAppName, setInAppName] = useState<"WeChat" | "QQ" | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installOutcome, setInstallOutcome] = useState<"idle" | "accepted" | "dismissed">("idle");
  const [autoDownloadStarted, setAutoDownloadStarted] = useState<"none" | "android" | "ios">("none");
  const [wechatOverlayOpen, setWechatOverlayOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoTriggeredRef = useRef(false);

  const triggerInstallerDownload = (target: "android" | "ios") => {
    const url = target === "ios" ? IOS_DOWNLOAD_PATH : ANDROID_DOWNLOAD_PATH;
    setAutoDownloadStarted(target);
    if (typeof window !== "undefined") {
      // Create hidden anchor click so browsers trigger file download without breaking SPA state
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", target === "ios" ? "ANS-iOS-App.mobileconfig" : "ANS-Mobile-v1.2.apk");
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const env = detectDeviceEnvironment(window.navigator.userAgent);
    const isIpadOs =
      env.platform === "desktop" &&
      /Macintosh/i.test(window.navigator.userAgent) &&
      typeof window.navigator.maxTouchPoints === "number" &&
      window.navigator.maxTouchPoints > 1;

    const effectivePlatform: DevicePlatform = isIpadOs ? "ios" : env.platform;
    const effectiveOs: "android" | "ios" | "desktop" = isIpadOs ? "ios" : env.underlyingOs;
    setDetectedPlatform(effectivePlatform);
    setUnderlyingOs(effectiveOs);
    setActiveTab(effectivePlatform);
    setInAppName(env.inAppName);

    const standaloneMatch =
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      /ANSMobileApp/i.test(window.navigator.userAgent);
    setIsStandalone(Boolean(standaloneMatch));

    let autoDownloadTimer: number | undefined;
    if (effectivePlatform === "wechat") {
      setWechatOverlayOpen(true);
    } else if (!standaloneMatch && !autoTriggeredRef.current) {
      // Auto-trigger download when opened in a real mobile browser (Android or iOS Safari)
      if (effectivePlatform === "android") {
        autoTriggeredRef.current = true;
        autoDownloadTimer = window.setTimeout(() => {
          triggerInstallerDownload("android");
        }, 450);
      } else if (effectivePlatform === "ios") {
        autoTriggeredRef.current = true;
        autoDownloadTimer = window.setTimeout(() => {
          triggerInstallerDownload("ios");
        }, 450);
      }
    }

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
      if (autoDownloadTimer !== undefined) {
        window.clearTimeout(autoDownloadTimer);
      }
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handlePrimaryDownloadClick = () => {
    if (detectedPlatform === "wechat") {
      setWechatOverlayOpen(true);
      setActiveTab("wechat");
      return;
    }
    if (detectedPlatform === "ios" || underlyingOs === "ios") {
      triggerInstallerDownload("ios");
      setActiveTab("ios");
      return;
    }
    triggerInstallerDownload("android");
    setActiveTab("android");
  };

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
      // Fallback to APK download
      triggerInstallerDownload("android");
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
    { id: "android", label: isEn ? "Android (.apk)" : "安卓安装包 (.apk)" },
    { id: "ios", label: isEn ? "iPhone / iOS" : "苹果手机 (iPhone)" },
    { id: "wechat", label: isEn ? "WeChat / QQ" : "微信 / QQ 内打开" },
    { id: "desktop", label: isEn ? "Desktop Web" : "电脑端网页版" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Prominent WeChat / QQ Escape Banner when inside WeChat WebView */}
      {detectedPlatform === "wechat" || wechatOverlayOpen ? (
        <section
          data-testid="wechat-escape-banner"
          className="rounded-3xl border-2 border-amber-500 bg-amber-500/15 p-5 shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-slate-950">
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                {isEn
                  ? `Opened in ${inAppName || "WeChat"} — Tap Top-Right '···' to Auto-Download`
                  : `当前在${inAppName === "QQ" ? " QQ " : "微信"}内打开，请点右上角「···」选择「在浏览器打开」`}
              </div>
              <h2 className="text-lg font-bold text-foreground">
                {isEn
                  ? "WeChat blocks direct App downloads. Open in system browser to start automatic download!"
                  : "微信内置浏览器拦截了安装包自动下载！只需切到系统浏览器打开，即可自动弹出下载："}
              </h2>
              <ol className="list-decimal space-y-1 pl-5 text-sm font-medium text-foreground/90">
                <li>
                  {isEn
                    ? "Tap the '···' menu button at the top-right corner of WeChat."
                    : "点击屏幕右上角的「···」三个点按钮；"}
                </li>
                <li>
                  {isEn
                    ? "Tap 'Open in Browser' (Safari on iPhone, System Browser on Android) — the App installer will download automatically!"
                    : "选择「在默认浏览器中打开」（安卓跳浏览器后自动下载 .apk 安装包；苹果跳 Safari 后自动弹出桌面安装描述文件）。"}
                </li>
              </ol>
            </div>
          </div>
        </section>
      ) : null}

      {/* Top Hero Card with Direct Installer Download Buttons */}
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
                  ? "Download the ANS Android APK or iPhone WebClip installer for full-screen mobile access. On PC, use the web workspace directly."
                  : "手机浏览器打开本页即可自动下载安装包（安卓 .apk 独立客户端 / 苹果 iOS 桌面描述文件）；电脑端无需安装，直接使用网页工作台。"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Button
              size="lg"
              onClick={handlePrimaryDownloadClick}
              data-testid="direct-download-installer-btn"
              className="w-full bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-500 sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {underlyingOs === "ios"
                ? isEn
                  ? "Download iPhone Installer (.mobileconfig)"
                  : "立即下载苹果 iPhone 安装包"
                : isEn
                  ? "Download Android App (.apk)"
                  : "立即下载安卓手机安装包 (.apk)"}
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={ANDROID_DOWNLOAD_PATH}
                download="ANS-Mobile-v1.2.apk"
                data-testid="download-android-apk-link"
                className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {isEn ? "Android .apk" : "安卓 .apk 下载"}
              </a>
              <a
                href={IOS_DOWNLOAD_PATH}
                download="ANS-iOS-App.mobileconfig"
                data-testid="download-ios-profile-link"
                className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {isEn ? "iOS Profile" : "苹果 iOS 描述文件"}
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleCopyUrl()}
                data-testid="copy-app-url-btn"
                className="h-8 px-2.5 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    {isEn ? "Copied" : "已复制链接"}
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    {isEn ? "Copy Link" : "复制链接"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Auto-Download Feedback Banner */}
        {autoDownloadStarted === "android" ? (
          <div
            role="status"
            data-testid="auto-download-status"
            className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-200"
          >
            {isEn
              ? "Downloading ANS-Mobile-v1.2.apk automatically! Check your browser download prompt to install."
              : "已为您自动发起安卓安装包 (ANS-Mobile-v1.2.apk) 下载！请在浏览器底部弹窗中点击「下载/保存」并完成安装。若未弹出，请点击上方绿色按钮手动下载。"}
          </div>
        ) : null}

        {autoDownloadStarted === "ios" ? (
          <div
            role="status"
            data-testid="auto-download-status"
            className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-200"
          >
            {isEn
              ? "Downloading iOS WebClip profile! Tap 'Allow' in the Safari popup, then open Settings -> Profile Downloaded -> Install."
              : "已为您自动拉起苹果 iOS 桌面安装包！请在弹窗中点击「允许」，随后打开手机「设置 → 已下载描述文件 → 安装」，即可在桌面生成 ANS 独立 App 图标。"}
          </div>
        ) : null}

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
                  : `已自动识别您当前在 ${inAppName === "QQ" ? "QQ" : "微信"} 内打开，请先切换至系统浏览器即可自动下载安装包。`
                : isEn
                  ? "Auto-selected for your current device. You can also view steps for other devices."
                  : "已自动匹配您当前的设备环境并触发下载，也可点击切换查看其他设备安装方式。"}
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
                ? "WeChat / QQ built-in browsers block .apk and .mobileconfig downloads. Open this page in Safari or your system browser to auto-download!"
                : "微信与 QQ 内置浏览器会拦截安装包下载。请点击右上角「···」选择「在默认浏览器中打开」，进入手机浏览器后会自动开始下载安装包！"}
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
                    : "在弹出的菜单中，点击「在默认浏览器中打开」（iPhone 自动跳转 Safari，安卓跳转系统浏览器）。"}
                </p>
              </div>
              <div className="rounded-xl border bg-background/60 p-4 space-y-1.5">
                <span className="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  STEP 02
                </span>
                <h3 className="text-sm font-semibold">
                  {isEn ? "Automatic Installer Download" : "浏览器自动下载并安装"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "Once opened in your system browser, the ANS installer (.apk for Android / .mobileconfig for iPhone) will start downloading automatically."
                    : "跳转到手机浏览器后，页面将自动弹出 ANS 安装包下载，确认安装后桌面即刻生成 ANS 独立图标。"}
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
                  方式 A · 独立安装包 (.apk)
                </span>
                <h3 className="text-sm font-semibold">
                  {isEn
                    ? "Direct APK Download (Recommended)"
                    : "直接下载 ANS 安卓安装包 (ANS-Mobile-v1.2.apk)"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "Tap the button below to download ANS-Mobile-v1.2.apk and install the standalone native Android package."
                    : "安卓手机浏览器打开本页会自动下载 .apk 安装包；您也可以随时点击下方按钮直接下载安装。"}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => triggerInstallerDownload("android")}
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    {isEn ? "Download .APK Now" : "下载安卓 .apk 安装包"}
                  </Button>
                  {deferredPrompt ? (
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid="native-pwa-install-btn"
                      onClick={() => void handleTriggerNativeInstall()}
                    >
                      {isEn ? "1-Click Add to Home Screen" : "免安装包一键加到桌面"}
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="rounded-xl border bg-background/60 p-4 space-y-2">
                <span className="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  方式 B · 浏览器添加到桌面
                </span>
                <h3 className="text-sm font-semibold">
                  {isEn
                    ? "Or Select 'Add to Home Screen' in Browser"
                    : "也可通过浏览器菜单「添加到主屏幕」"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "If your phone restricts third-party APK installation, tap your browser menu (≡ / ···) and select 'Add to Home Screen'."
                    : "若手机开启了纯净模式拦截第三方 .apk，也可直接点击浏览器菜单「≡ / ···」选择「添加到主屏幕」，免安装享受同等全屏体验。"}
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
                  方式 A · 自动下载描述文件
                </span>
                <h3 className="text-sm font-semibold">
                  {isEn
                    ? "Download iOS Desktop Profile (.mobileconfig)"
                    : "下载 iOS 桌面描述文件一键生成图标"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "Tap 'Allow' when Safari prompts to download the configuration profile, then go to iPhone Settings -> Profile Downloaded -> Install."
                    : "在 Safari 中点击下方按钮并在弹窗点「允许」，随后打开手机「设置 → 已下载描述文件 → 右上角安装」，桌面即刻生成 ANS 全屏 App。"}
                </p>
                <Button
                  size="sm"
                  onClick={() => triggerInstallerDownload("ios")}
                  className="mt-1 bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {isEn ? "Download iOS Profile" : "下载 iPhone 描述文件安装包"}
                </Button>
              </div>
              <div className="rounded-xl border bg-background/60 p-4 space-y-2">
                <span className="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  方式 B · Safari 分享添加
                </span>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <Share className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  {isEn
                    ? "Or Tap Safari Share -> 'Add to Home Screen'"
                    : "或点 Safari 底部「分享 → 添加到主屏幕」"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "Tap the Share icon [↑] in Safari bottom bar and select 'Add to Home Screen' to add the full-screen App without opening Settings."
                    : "不想进系统设置安装描述文件时，也可直接点击 Safari 底部正中间的「分享」图标，下滑点击「添加到主屏幕」即可。"}
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
                    {isEn ? "Phone: Open Link to Auto-Download App" : "手机端：浏览器打开本页自动下载 App"}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "Open ans.cauai.fun/app in your phone browser to automatically download the Android .apk or iOS installer:"
                    : "用手机系统浏览器打开下方网址，将自动弹出安卓 .apk 或苹果 iOS 安装包下载："}
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
