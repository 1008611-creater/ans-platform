"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { setLocale } from "@/lib/i18n/client";

/** Skill/Prompt 双语一键切换：默认中文，点击一次切换中文/英文。 */
export function BilingualToggle() {
  const locale = useLocale();
  const isEnglish = locale === "en";
  const nextLocale = isEnglish ? "zh" : "en";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1 px-2 text-xs"
      onClick={() => setLocale(nextLocale)}
      title={isEnglish ? "切换到中文" : "Switch to English"}
      aria-label={isEnglish ? "切换到中文" : "Switch to English"}
    >
      <Languages className="h-3.5 w-3.5" />
      <span>{isEnglish ? "中" : "EN"}</span>
    </Button>
  );
}
