import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, supportedLocales, defaultLocale } from "@/lib/i18n/config";
import { IntlErrorCode } from "next-intl";

/**
 * 语言解析优先级：
 * 1. 用户主动选择写入的 NEXT_LOCALE Cookie
 * 2. 默认中文（defaultLocale）
 * 不再读取 Accept-Language 自动检测，避免首次访问被浏览器语言带成英文。
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  // 1. Check for saved locale preference in cookie
  let locale = cookieStore.get(LOCALE_COOKIE)?.value;
  // 2. 未主动选择时默认中文；不再根据浏览器英文环境自动切走中文。
  // 用户仍可通过右上角语言菜单切换，选择会写入 NEXT_LOCALE Cookie。
  if (!locale || !supportedLocales.includes(locale)) {
    locale = defaultLocale;
  }
  
  // Load messages for the locale
  let messages;
  try {
    messages = (await import(`@/../messages/${locale}.json`)).default;
  } catch {
    // Fall back to default locale messages
    messages = (await import(`@/../messages/${defaultLocale}.json`)).default;
  }
  
  return {
    locale,
    messages: {
      ...messages,
      // Publish one current rule set until translations of the revised event are available.
      agriHackathon: (await import(`@/../messages/${locale === "zh" ? "zh" : "en"}.json`)).default.agriHackathon,
      // The first lesson ships in Chinese and English; other locales explicitly use English.
      agriWall: (await import(`@/../messages/agri-wall/${locale === "zh" ? "zh" : "en"}.json`)).default,
      learning: (await import(`@/../messages/learning/${locale === "zh" ? "zh" : "en"}.json`)).default,
      marketCash: (await import(`@/../messages/market-cash/${locale === "zh" ? "zh" : "en"}.json`)).default,
      companion: (await import(`@/../messages/companion/${locale === "zh" ? "zh" : "en"}.json`)).default,
      visualWebsite: (await import(`@/../messages/visual-website/${locale === "zh" ? "zh" : "en"}.json`)).default,
      fourView: (await import(`@/../messages/four-view/${locale === "zh" ? "zh" : "en"}.json`)).default,
      visualGeneration: (await import(`@/../messages/visual-generation/${locale === "zh" ? "zh" : "en"}.json`)).default,
      visualPublication: (await import(`@/../messages/visual-publication/${locale === "zh" ? "zh" : "en"}.json`)).default,
      workflowAuthor: (await import(`@/../messages/workflow-author/${locale === "zh" ? "zh" : "en"}.json`)).default,
      workflowCatalog: (await import(`@/../messages/workflow-catalog/${locale === "zh" ? "zh" : "en"}.json`)).default,
      workflowStudio: (await import(`@/../messages/workflow-studio/${locale === "zh" ? "zh" : "en"}.json`)).default,
      marketWorkflow: (await import(`@/../messages/market-workflow/${locale === "zh" ? "zh" : "en"}.json`)).default,
      retirement: (await import(`@/../messages/retirement/${locale === "zh" ? "zh" : "en"}.json`)).default,
      hubs: (await import(`@/../messages/hubs/${locale === "zh" ? "zh" : "en"}.json`)).default,
      favorites: (await import(`@/../messages/favorites/${locale === "zh" ? "zh" : "en"}.json`)).default,
      product: (await import(`@/../messages/product/${locale === "zh" ? "zh" : "en"}.json`)).default,
    },
    timeZone: "UTC",
    // Handle missing messages gracefully in production
    onError(error) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        // Log missing messages but don't throw
        console.warn(`Missing translation: ${error.originalMessage}`);
      } else if (error.code === "ENVIRONMENT_FALLBACK" as IntlErrorCode) {
        // Silently ignore environment fallback warnings
      } else {
        console.error(error);
      }
    },
    getMessageFallback({ namespace, key }) {
      return `${namespace}.${key}`;
    },
  };
});
