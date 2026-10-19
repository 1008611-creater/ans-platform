// Cookie name for storing locale preference
export const LOCALE_COOKIE = "NEXT_LOCALE";

// Supported locales - keep in sync with prompts.config.ts (Chinese & English bilingual only)
export const supportedLocales = ["zh", "en"];
// 默认中文；用户仍可在右上角一键切换英文。
export const defaultLocale = "zh";

// RTL locales
export const rtlLocales: string[] = [];

// Check if a locale is RTL
export function isRtlLocale(locale: string): boolean {
  return rtlLocales.includes(locale);
}

// Get supported locales
export function getSupportedLocales() {
  return supportedLocales;
}

// Get default locale
export function getDefaultLocale() {
  return defaultLocale;
}
