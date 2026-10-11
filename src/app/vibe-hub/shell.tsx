"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { useState, useEffect, useSyncExternalStore } from "react";
import { Search, Moon, Sun, Menu, X } from "lucide-react";
import { useVibeLanguage } from "./use-vibe-language";
import { CommunityButton, ThemePicker, LanguagePicker } from "./official/navigation-controls";
import { zG, vS, type VibeTheme } from "./official/themes";
import labels from "./labels.json";
import { VibeFavoritesProvider } from "./favorite-button";
import "../../../public/vibe-hub/source/scoped.css";
import { usePersistedSetting } from "./use-persisted-setting";

function Navigation({ theme, accentId, toggleTheme, setAccent }: { theme: string; accentId: string; toggleTheme: () => void; setAccent: (value: VibeTheme) => void }) {
  const t = useTranslations("vibehub");
  const lang = useVibeLanguage();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, setSavedLanguage] = usePersistedSetting("vibehub:language", lang);
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [{ label: "terms", path: "" }, { label: "courses", path: "/courses" }, { label: "practice", path: "/practice" }, { label: "antiAi", path: "/anti-ai-flavor" }, { label: "updates", path: "/updates" }, { label: "skill", path: "/vibehub-skill" }, { label: "saved", path: "/favorites" }, { label: "journeys", path: "/journeys" }, { label: "lab", path: "/lab" }] as const;

  function switchLanguage(value: string) {
    setSavedLanguage(value);
    const next = new URLSearchParams(params.toString()); next.set("lang", value);
    window.location.assign(`${pathname}?${next}${window.location.hash}`);
  }

  return <header className="vh-header">
    <div className="vh-header-inner">
      <Link href={`/vibe-hub?lang=${lang}`} className="vh-brand" aria-label="ANS VibeHub">
        <Image src={theme === "dark" ? "/ans-logo-dark.svg" : "/ans-logo-light.svg"} width={27} height={27} alt="" /><span>ANS Vibe<b>Hub</b></span>
      </Link>
      <nav className="vh-desktop-nav" aria-label={t("navigation")}>
        {links.slice(0, 6).map((link) => <Link key={link.label} href={`/vibe-hub${link.path}?lang=${lang}`} aria-current={pathname === `/vibe-hub${link.path}` ? "page" : undefined}>{t(link.label)}</Link>)}
      </nav>
      <form className="vh-global-search" action="/vibe-hub">
        <Search size={15} aria-hidden="true" /><input aria-label={t("search")} placeholder={t("searchPlaceholder")} name="q" defaultValue={params.get("q") || ""} /><input type="hidden" name="lang" value={lang} />
      </form>
      <div className="vh-header-actions">
        <CommunityButton isEn={lang === "en"} />
        <LanguagePicker locale={lang} onSelect={switchLanguage} />
        <ThemePicker theme={accentId} onPick={setAccent} isEn={lang === "en"} />
        <button type="button" className="vh-icon-button" onClick={toggleTheme} aria-label={t(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button>
        <button type="button" className="vh-icon-button vh-menu-toggle" aria-expanded={menuOpen} aria-controls="vh-mobile-nav" aria-label={t(menuOpen ? "close" : "menu")} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <Link href="/" className="vh-ans-link">ANS ↗</Link>
      </div>
    </div>
    {menuOpen && <nav id="vh-mobile-nav" className="vh-mobile-nav" aria-label={t("navigation")}>{links.map((link) => <Link key={link.label} href={`/vibe-hub${link.path}?lang=${lang}`} onClick={() => setMenuOpen(false)}>{t(link.label)}</Link>)}</nav>}
  </header>;
}

function subscribeColorScheme(listener: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
const systemDarkSnapshot = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

export function VibeHubShell({ children }: { children: React.ReactNode }) {
  const lang = useVibeLanguage();
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams();
  useEffect(() => {
    if (params.has("lang")) return;
    const next = new URLSearchParams(params.toString()); next.set("lang",lang);
    router.replace(`${pathname}?${next}${window.location.hash}`, {scroll:false});
  }, [lang, params, pathname, router]);
  const [savedTheme, setTheme] = usePersistedSetting("vibehub:theme", "system");
  const systemDark = useSyncExternalStore(subscribeColorScheme, systemDarkSnapshot, () => false);
  const theme = savedTheme === "system" ? (systemDark ? "dark" : "light") : savedTheme;
  const [accent, setAccent] = usePersistedSetting("vibehub:accent", "klein");
  const palette = zG.find(item => item.id === accent || item.brand === accent) || zG[0];
  const changeAccent = (value: VibeTheme) => { setAccent(value.id); };
  const toggleTheme = () => { setTheme(theme === "dark" ? "light" : "dark"); };
  return <NextIntlClientProvider locale={lang} messages={{ vibehub: labels[lang] }}>
    <VibeFavoritesProvider><div className="vibehub-source" data-theme={theme} data-color-mode={theme} style={{ ...vS(palette), "--brand": theme === "dark" ? (palette.id === "zinc" ? "#b7bec9" : palette.accent) : palette.brand, "--vh-accent": theme === "dark" ? palette.accent : palette.brand } as React.CSSProperties} lang={lang}>
      <Navigation theme={theme} accentId={palette.id} toggleTheme={toggleTheme} setAccent={changeAccent} />
      <div className="vh-page-content">{children}</div>
    </div></VibeFavoritesProvider>
  </NextIntlClientProvider>;
}
