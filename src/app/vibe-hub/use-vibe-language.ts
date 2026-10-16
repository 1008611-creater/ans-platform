"use client";
import { usePersistedSetting } from "./use-persisted-setting";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { getLocaleClient } from "@/lib/i18n/client";

export function useVibeLanguage(): "zh" | "en" {
  const params = useSearchParams();
  const locale = useLocale();
  const defaultLang = locale.startsWith("zh") ? "zh" : "en";
  const [saved] = usePersistedSetting("vibehub:language", defaultLang);
  if (params.get("lang") === "en") return "en";
  if (params.get("lang") === "zh") return "zh";
  if (typeof document !== "undefined") {
    const cookieLocale = getLocaleClient();
    if (cookieLocale?.startsWith("en")) return "en";
    if (cookieLocale?.startsWith("zh")) return "zh";
  }
  return saved === "zh" ? "zh" : defaultLang;
}
