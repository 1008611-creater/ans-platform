"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { WorkspaceLink as Link } from "@/components/providers/workspace-navigation";
import { useLocale } from "next-intl";
import {
  ArrowUpRight,
  Check,
  Coins,
  Compass,
  Copy,
  Download,
  LayoutDashboard,
  Share,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

export interface MobileAppInstallerProps {
  /** 当前可下载的安卓安装包；还没发版时为 null，页面只给 iPhone 和电脑端的说明。 */
  androidRelease: { versionName: string; sizeLabel: string | null } | null;
}

type GuideTab = "android" | "ios" | "desktop";

const APP_INSTALL_URL = "https://ans.cauai.fun/app";
export const ANDROID_DOWNLOAD_PATH = "/api/app/download?platform=android";

export function MobileAppInstaller({ androidRelease }: MobileAppInstallerProps) {
  const locale = useLocale();
  const isEn = locale === "en";

  const [ready, setReady] = useState(false);
  const [inAppName, setInAppName] = useState<"WeChat" | "QQ" | null>(null);
  const [underlyingOs, setUnderlyingOs] = useState<"android" | "ios" | "desktop">("desktop");
  const [activeTab, setActiveTab] = useState<GuideTab>("desktop");
  const [inApp, setInApp] = useState(false);
  const [wechatOverlayOpen, setWechatOverlayOpen] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoTriggeredRef = useRef(false);

  const startAndroidDownload = () => {
    setDownloadStarted(true);
    const link = document.createElement("a");
    link.href = ANDROID_DOWNLOAD_PATH;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const env = detectDeviceEnvironment(ua);
    const isIpadOs =
      env.platform === "desktop" &&
      /Macintosh/i.test(ua) &&
      typeof window.navigator.maxTouchPoints === "number" &&
      window.navigator.maxTouchPoints > 1;
    const effectivePlatform: DevicePlatform = isIpadOs ? "ios" : env.platform;
    const effectiveOs = isIpadOs ? "ios" : env.underlyingOs;

    const runningInApp =
      /ANSMobileApp/i.test(ua) ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setInAppName(env.inAppName);
    setUnderlyingOs(effectiveOs);
    setActiveTab(effectivePlatform === "wechat" ? (effectiveOs === "ios" ? "ios" : "android") : effectivePlatform);
    setInApp(runningInApp);
    setWechatOverlayOpen(effectivePlatform === "wechat");
    setReady(true);

    // 用户从海报或链接专门来下载的，安卓系统浏览器里直接开始下载，按钮留着兜底。
    let timer: number | undefined;
    if (effectivePlatform === "android" && !runningInApp && androidRelease && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      timer = window.setTimeout(startAndroidDownload, 400);
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
    // 只在首次进入页面时判断一次环境。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(APP_INSTALL_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const tabs: Array<{ id: GuideTab; label: string }> = [
    { id: "android", label: isEn ? "Android" : "安卓" },
    { id: "ios", label: "iPhone" },
    { id: "desktop", label: isEn ? "Computer" : "电脑" },
  ];

  const copyButton = (
    <Button variant="outline" size="sm" onClick={() => void handleCopyUrl()} data-testid="copy-app-url-btn">
      {copied ? (
        <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
      ) : (
        <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? (isEn ? "Copied" : "已复制") : isEn ? "Copy link" : "复制链接"}
    </Button>
  );

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {wechatOverlayOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isEn ? "Open in browser" : "在浏览器打开"}
          data-testid="wechat-escape-banner"
          className="fixed inset-0 z-50 bg-slate-950/85 px-6 pt-4 text-white"
          onClick={() => setWechatOverlayOpen(false)}
        >
          <ArrowUpRight className="ml-auto h-16 w-16 text-amber-400" aria-hidden="true" />
          <div className="mt-4 space-y-3 text-right">
            <p className="text-xl font-bold">
              {isEn ? "Tap ··· at the top right" : "点右上角「···」"}
            </p>
            <p className="text-lg">
              {isEn
                ? "then choose Open in Browser"
                : underlyingOs === "ios"
                  ? "选「在 Safari 中打开」"
                  : "选「在浏览器打开」"}
            </p>
            <p className="pt-2 text-sm text-white/70">
              {isEn
                ? `${inAppName || "WeChat"} blocks app downloads.`
                : `${inAppName === "QQ" ? "QQ" : "微信"}里不能下载安装 App。`}
            </p>
          </div>
        </div>
      ) : null}

      <section className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#09142F] p-2.5 shadow-md">
          <Image src="/favicon/favicon.svg" alt="ANS" width={44} height={44} className="h-11 w-11 object-contain" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {isEn ? "ANS (AI Never Stops) Mobile App" : "ANS (AI Never Stops) 手机 App"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEn
              ? "Sign up, browse and vote on your phone. Keep building on the web."
              : "手机上报名、看赛题、逛广场；电脑上继续用网页版。"}
          </p>
        </div>
      </section>

      {ready && inApp ? (
        <section aria-label={isEn ? "Quick launch" : "常用入口"} className="space-y-3">
          <div
            data-testid="standalone-active-badge"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {isEn ? "You're in the App" : "你已经在 App 里了"}
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {[
              { href: "/competitions/agrihackathon", icon: Trophy, label: isEn ? "AgriHackathon" : "农客松参赛" },
              { href: "/explore", icon: Compass, label: isEn ? "Project Square" : "项目广场" },
              { href: "/workspace/credits", icon: Coins, label: isEn ? "Credits" : "算力与积分" },
              { href: "/workspace", icon: LayoutDashboard, label: isEn ? "Workspace" : "我的工作台" },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-12 items-center gap-3 rounded-xl border p-3.5 text-sm font-semibold transition-colors hover:bg-accent/50"
              >
                <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {ready && !inApp ? (
        <>
          <div
            role="tablist"
            aria-label={isEn ? "Device" : "设备"}
            className="inline-flex gap-1 rounded-xl bg-muted/60 p-1"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                data-testid={`platform-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "android" ? (
            <section data-testid="guide-panel-android" className="space-y-3 rounded-2xl border bg-card p-5">
              {androidRelease ? (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="h-12 w-full bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-500"
                  >
                    <a
                      href={ANDROID_DOWNLOAD_PATH}
                      data-testid="direct-download-installer-btn"
                      onClick={() => setDownloadStarted(true)}
                    >
                      <Download className="mr-2 h-5 w-5" aria-hidden="true" />
                      {isEn ? "Download for Android" : "下载安卓 App"}
                    </a>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    v{androidRelease.versionName}
                    {androidRelease.sizeLabel ? ` · ${androidRelease.sizeLabel}` : ""}
                  </p>
                  {downloadStarted ? (
                    <p
                      role="status"
                      data-testid="auto-download-status"
                      className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
                    >
                      {isEn
                        ? "Download started. Open the file from your notifications to install."
                        : "已开始下载，下完在通知栏点开安装。没反应就再点一次上面的按钮。"}
                    </p>
                  ) : null}
                  <details className="text-sm text-muted-foreground">
                    <summary className="cursor-pointer select-none">
                      {isEn ? "Install blocked or shows a warning?" : "安装时被拦截或提示风险？"}
                    </summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>
                        {isEn
                          ? "Allow your browser to install unknown apps when asked."
                          : "按提示允许浏览器「安装未知应用」，这是没上应用商店的 App 的正常提示。"}
                      </li>
                      <li>
                        {isEn
                          ? "If you installed an earlier test build, uninstall it first."
                          : "装过之前的测试版（1.2.0）会提示签名冲突，先卸载旧版再装。"}
                      </li>
                      <li>
                        {isEn
                          ? "Phones in pure mode can add the website to the home screen instead."
                          : "手机开了纯净模式装不了，也可以在浏览器菜单里选「添加到主屏幕」。"}
                      </li>
                    </ul>
                  </details>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isEn
                    ? "The Android app is being prepared. Use the website for now."
                    : "安卓安装包还在准备，先用浏览器打开网站，或在浏览器菜单里选「添加到主屏幕」。"}
                </p>
              )}
            </section>
          ) : null}

          {activeTab === "ios" ? (
            <section data-testid="guide-panel-ios" className="space-y-4 rounded-2xl border bg-card p-5">
              <ol className="space-y-3">
                {[
                  isEn ? (
                    <>Open this page in Safari, tap <Share className="mx-1 inline h-4 w-4" aria-label="Share" /> at the bottom</>
                  ) : (
                    <>用 Safari 打开本页，点底部的 <Share className="mx-1 inline h-4 w-4" aria-label="分享" /></>
                  ),
                  isEn ? "Choose Add to Home Screen" : "选「添加到主屏幕」",
                  isEn ? "Tap Add at the top right" : "点右上角「添加」",
                ].map((step, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-muted-foreground">
                {isEn
                  ? "It opens full screen from the home screen and stays signed in."
                  : "之后从桌面图标打开就是全屏的，登录状态会一直保留。"}
              </p>
              {underlyingOs === "ios" ? copyButton : null}
            </section>
          ) : null}

          {activeTab === "desktop" ? (
            <section data-testid="guide-panel-desktop" className="space-y-4 rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-5">
                <div className="shrink-0 rounded-xl border bg-white p-2">
                  <QRCodeSVG value={APP_INSTALL_URL} size={112} title={isEn ? "Scan with your phone" : "手机扫码安装"} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold">{isEn ? "Scan with your phone" : "手机扫码安装"}</p>
                  <p className="text-xs text-muted-foreground">
                    {isEn ? "No download needed on a computer." : "电脑上不用装，直接用网页版。"}
                  </p>
                  {copyButton}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <Link href="/competitions/agrihackathon">{isEn ? "AgriHackathon" : "进入农客松"}</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/workspace">{isEn ? "Open workspace" : "打开工作台"}</Link>
                </Button>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
