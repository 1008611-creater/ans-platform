import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getMessages, getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { DinoGuide } from "@/components/mascot/dino-guide";
import { WebsiteStructuredData } from "@/components/seo/structured-data";
import { getConfig } from "@/lib/config";
import { isRtlLocale } from "@/lib/i18n/config";
import { hexToOklch, pickPrimaryForeground } from "@/lib/theme-colors";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("product");
  const learning = await getTranslations("learning");
  const locale = await getLocale();
  return {
  metadataBase: new URL(process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://ans.cauai.fun"),
  title: {
    default: t("siteTitle"),
    template: "%s | ANS",
  },
  description: t("siteDescription"),
  keywords: ["ANS", ...learning("siteKeywords").split(",")],
  authors: [{ name: "ANS" }],
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
    locale: locale === "zh" ? "zh_CN" : "en_US",
    siteName: "ANS",
    title: t("siteTitle"),
    description: t("siteDescription"),
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
    title: t("siteTitle"),
    description: t("siteDescription"),
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
}

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || headersList.get("x-invoke-path") || "";
  const isEmbedRoute = pathname.startsWith("/embed");
  const isKidsRoute = pathname.startsWith("/kids");
  const isVibeHubRoute = pathname.startsWith("/vibe-hub");
  
  const locale = await getLocale();
  const messages = await getMessages();
  const timeZone = await getTimeZone();
  const product = await getTranslations("product");
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
        <Providers locale={locale} timeZone={timeZone} messages={messages} theme={config.theme} branding={{ ...config.branding, useCloneBranding: config.homepage?.useCloneBranding }}>
          {isEmbedRoute || isKidsRoute || isVibeHubRoute ? (
            children
          ) : (
            <>
              <div className="relative min-h-screen flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
                <a href="#main-content" className="sr-only fixed start-4 top-2 z-[60] rounded-lg bg-background p-3 font-medium text-foreground focus:not-sr-only focus-visible:outline-2 focus-visible:outline-primary">{product("skipToContent")}</a>
                <Header authProvider={config.auth.provider} allowRegistration={config.auth.allowRegistration} />
                <main id="main-content" tabIndex={-1} className="flex-1 scroll-mt-16">{children}</main>
                <Footer />
                <MobileTabBar />
                <DinoGuide />
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
