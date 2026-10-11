"use client";
import { usePersistedSetting } from "./use-persisted-setting";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
export function useVibeLanguage(): "zh" | "en" {
  const params = useSearchParams();
  const locale = useLocale();
  const [saved] = usePersistedSetting("vibehub:language", locale.startsWith("zh") ? "zh" : "en");
  return params.get("lang") === "en" ? "en" : params.get("lang") === "zh" ? "zh" : saved === "zh" ? "zh" : "en";
}
