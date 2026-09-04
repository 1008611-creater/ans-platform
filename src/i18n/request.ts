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
    messages,
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
