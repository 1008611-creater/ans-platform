import type { ComponentType } from "react";
import type { VibeTheme } from "./themes";
export const CommunityButton: ComponentType<{ isEn: boolean }>;
export const ThemePicker: ComponentType<{ theme: string; onPick: (theme: VibeTheme) => void; isEn: boolean }>;
export const LanguagePicker: ComponentType<{ locale: "en" | "zh"; onSelect: (locale: "en" | "zh") => void }>;
