"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { useState } from "react";
import { Search, Moon, Sun, Menu, X, Palette } from "lucide-react";
import { useVibeLanguage } from "./use-vibe-language";
import labels from "./labels.json";
import { VibeFavoritesProvider } from "./favorite-button";
import "../../../public/vibe-hub/source/scoped.css";
import { usePersistedSetting } from "./use-persisted-setting";

function Navigation({ theme, toggleTheme, setAccent }: { theme: string; toggleTheme: () => void; setAccent: (value: string) => void }) {
  const t = useTranslations("vibehub");
  const lang = useVibeLanguage();
  const pathname = usePathname();
  const params = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const links = [{ label: "terms", path: "" }, { label: "courses", path: "/courses" }, { label: "practice", path: "/practice" }, { label: "antiAi", path: "/anti-ai-flavor" }, { label: "updates", path: "/updates" }, { label: "skill", path: "/vibehub-skill" }, { label: "saved", path: "/favorites" }, { label: "journeys", path: "/journeys" }, { label: "lab", path: "/lab" }] as const;

  function switchLanguage(value: string) {
    const next = new URLSearchParams(params.toString()); next.set("lang", value);
    window.location.assign(`${pathname}?${next}`);
  }

  return <header className="vh-header">
    <div className="vh-header-inner">
      <Link href={`/vibe-hub?lang=${lang}`} className="vh-brand" aria-label="VibeHub">
        <Image src="/vibe-hub/vh-logo-v4-tight.png" width="27" height="27" alt="" /><span>Vibe<b>Hub</b></span>
      </Link>
      <nav className="vh-desktop-nav" aria-label={t("navigation")}>
        {links.slice(0, 6).map((link) => <Link key={link.label} href={`/vibe-hub${link.path}?lang=${lang}`} aria-current={pathname === `/vibe-hub${link.path}` ? "page" : undefined}>{t(link.label)}</Link>)}
      </nav>
      <form className="vh-global-search" action="/vibe-hub">
        <Search size={15} aria-hidden="true" /><input aria-label={t("search")} placeholder={t("searchPlaceholder")} name="q" defaultValue={params.get("q") || ""} /><input type="hidden" name="lang" value={lang} />
      </form>
      <div className="vh-header-actions">
        <select aria-label={t("language")} value={lang} onChange={(event) => switchLanguage(event.target.value)}><option value="zh">中文</option><option value="en">English</option></select>
        <div className="vh-color-picker"><button type="button" className="vh-icon-button" onClick={() => setColorsOpen(!colorsOpen)} aria-expanded={colorsOpen} aria-label={t("accent")}><Palette size={19} /></button>
          {colorsOpen && <div className="vh-color-popover">{["#4262c7", "#6750a4", "#197765", "#b74b31", "#866528"].map((color) => <button key={color} aria-label={color} style={{ backgroundColor: color }} onClick={() => {setAccent(color); setColorsOpen(false);}} />)}</div>}
        </div>
        <button type="button" className="vh-icon-button" onClick={toggleTheme} aria-label={t(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button>
        <button type="button" className="vh-icon-button vh-menu-toggle" aria-expanded={menuOpen} aria-controls="vh-mobile-nav" aria-label={t(menuOpen ? "close" : "menu")} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <Link href="/" className="vh-ans-link">ANS ↗</Link>
      </div>
    </div>
    {menuOpen && <nav id="vh-mobile-nav" className="vh-mobile-nav" aria-label={t("navigation")}>{links.map((link) => <Link key={link.label} href={`/vibe-hub${link.path}?lang=${lang}`} onClick={() => setMenuOpen(false)}>{t(link.label)}</Link>)}</nav>}
  </header>;
}

export function VibeHubShell({ children }: { children: React.ReactNode }) {
  const lang = useVibeLanguage();
  const [theme, setTheme] = usePersistedSetting("vibehub:theme", "light");
  const [accent, setAccent] = usePersistedSetting("vibehub:accent", "#4262c7");
  const changeAccent = (value: string) => { setAccent(value); };
  const toggleTheme = () => { setTheme(theme === "dark" ? "light" : "dark"); };
  return <NextIntlClientProvider locale={lang} messages={{ vibehub: labels[lang] }}>
    <VibeFavoritesProvider><div className="vibehub-source" data-theme={theme} data-color-mode={theme} style={{ "--brand": accent, "--vh-accent": accent } as React.CSSProperties} lang={lang}>
      <Navigation theme={theme} toggleTheme={toggleTheme} setAccent={changeAccent} />
      <div className="vh-page-content">{children}</div>
    </div></VibeFavoritesProvider>
  </NextIntlClientProvider>;
}
