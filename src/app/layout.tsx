import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getMessages, getLocale } from "next-intl/server";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { WebsiteStructuredData } from "@/components/seo/structured-data";
import { getConfig } from "@/lib/config";
import { isRtlLocale } from "@/lib/i18n/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://ans.cauai.fun"),
  title: {
    default: "ANS · 让 AI 永不停转",
    template: "%s | ANS",
  },
  description:
    "ANS 是中国农业大学学生发起的 AI 原生社区与算力平台：提示词模板、工作台、团队与比赛，让 AI 永不停转。",
  keywords: [
    "ANS",
    "AI 社区",
    "提示词",
    "AI 工具",
    "算力平台",
    "工作台",
    "团队",
    "比赛",
    "中国农业",
    "AI Never Stops",
  ],
  authors: [{ name: "ANS 社区" }],
  creator: "ANS",
  publisher: "ANS",
  icons: {
    icon: [
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon/favicon.ico", sizes: "48x48" },
    ],
    apple: "/favicon/apple-touch-icon.png",
    shortcut: "/favicon/favicon.svg",
  },
  manifest: "/favicon/site.webmanifest",
  other: {
    "apple-mobile-web-app-title": "ANS",
    "theme-color": "#0b0b0f",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "ANS",
    title: "ANS · 让 AI 永不停转",
    description:
      "ANS 是中国农业大学学生发起的 AI 原生社区与算力平台：提示词模板、工作台、团队与比赛，让 AI 永不停转。",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ANS · 让 AI 永不停转",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ANS · 让 AI 永不停转",
    description:
      "ANS 是中国农业大学学生发起的 AI 原生社区与算力平台：提示词模板、工作台、团队与比赛，让 AI 永不停转。",
    images: ["/og.png"],
    creator: "ANS",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://ans.cauai.fun",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const radiusValues = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
};

/**
 * 解析 `#rrggbb`，返回 0–1 的 sRGB 三元组；不是十六进制则返回 null。
 */
function parseHex(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return null;
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ];
}

/** sRGB 传输函数（伽马解码）。 */
function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** WCAG 相对亮度，用于计算对比度。 */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 对比度，范围 1–21。 */
function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * sRGB → OKLCH（Björn Ottosson 的 OKLab 矩阵）。
 *
 * 这里曾经用 HSL 的近似公式硬凑 OKLCH：拿加权亮度当 L、`(max-min)*0.4` 当 C、
 * HSL 色相当 H。HSL 色相和 OKLCH 色相不是一回事（品牌色 #6366f1 的 HSL 色相是
 * 239°，OKLCH 色相是 277°），换过去等于整体扭色：`--primary` 渲染成了 #0078e2
 * 这种偏青的蓝，既不是品牌色，也把按钮对比度压到 4.13（低于 4.5 门槛）。
 * 换成标准矩阵后 #6366f1 能原样往返，对比度问题也回到「配色本身」而不是「换算 bug」。
 */
function hexToOklch(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "oklch(0.5 0.2 260)";

  const [r, g, b] = rgb.map(toLinear) as [number, number, number];

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  let hue = (Math.atan2(B, A) * 180) / Math.PI;
  if (hue < 0) hue += 360;

  return `oklch(${L.toFixed(3)} ${Math.hypot(A, B).toFixed(3)} ${hue.toFixed(1)})`;
}

/** `--primary-foreground` 的两个候选，取值与 globals.css 的明暗前景一致。 */
const PRIMARY_FOREGROUND_LIGHT = "oklch(0.98 0 0)"; // ≈ #f8f8f8
const PRIMARY_FOREGROUND_DARK = "oklch(0.2 0 0)"; // ≈ #161616

/**
 * 按 WCAG 对比度择优挑选前景色，而不是按「亮度是否大于 0.5」猜。
 * 原先的阈值判断在中间明度区间会选错：品牌色 #4f46e5 的加权亮度只有 0.34，
 * 阈值法恰好选对，但同类色只要再亮一点就会被判成「深色底」而配上深色文字。
 * 直接算对比度不会有这种边界问题。
 */
function pickPrimaryForeground(primary: string): string {
  const rgb = parseHex(primary);
  if (!rgb) return PRIMARY_FOREGROUND_LIGHT;
  const light: [number, number, number] = [0.973, 0.973, 0.973]; // #f8f8f8
  const dark: [number, number, number] = [0.086, 0.086, 0.086]; // #161616
  return contrastRatio(rgb, light) >= contrastRatio(rgb, dark)
    ? PRIMARY_FOREGROUND_LIGHT
    : PRIMARY_FOREGROUND_DARK;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || headersList.get("x-invoke-path") || "";
  const isEmbedRoute = pathname.startsWith("/embed");
  const isKidsRoute = pathname.startsWith("/kids");
  
  const locale = await getLocale();
  const messages = await getMessages();
  const config = await getConfig();
  const isRtl = isRtlLocale(locale);

  // Calculate theme values server-side
  const themeClasses = `theme-${config.theme.variant} density-${config.theme.density}`;
  const primaryOklch = hexToOklch(config.theme.colors.primary);
  const foreground = pickPrimaryForeground(config.theme.colors.primary);
  
  const themeStyles = {
    "--radius": radiusValues[config.theme.radius],
    "--primary": primaryOklch,
    "--primary-foreground": foreground,
  } as React.CSSProperties;

  const fontClasses = isRtl ? "font-arabic" : "font-sans";

  return (
    <html lang={locale} dir={isRtl ? "rtl" : "ltr"} suppressHydrationWarning className={themeClasses} style={themeStyles}>
      <head>
        <WebsiteStructuredData />
      </head>
      <body className={`${fontClasses} antialiased`}>
        <Providers locale={locale} messages={messages} theme={config.theme} branding={{ ...config.branding, useCloneBranding: config.homepage?.useCloneBranding }}>
          {isEmbedRoute || isKidsRoute ? (
            children
          ) : (
            <>
              <div className="relative min-h-screen flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
                <Header authProvider={config.auth.provider} allowRegistration={config.auth.allowRegistration} />
                <main className="flex-1">{children}</main>
                <Footer />
                <MobileTabBar />
                {/* 移动端/WebView 中 Cookie 横幅会遮挡底部 Tab 栏，暂不渲染；桌面端如有合规需要可恢复。 */}
                {/* <CookieConsentBanner /> */}
              </div>
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
