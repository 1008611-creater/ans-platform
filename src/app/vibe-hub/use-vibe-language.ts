"use client";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
export function useVibeLanguage(): "zh" | "en" {
  const params = useSearchParams();
  const locale = useLocale();
  return params.get("lang") === "en" ? "en" : params.get("lang") === "zh" ? "zh" : locale.startsWith("zh") ? "zh" : "en";
}
