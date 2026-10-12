"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Search, Moon, Sun, Menu, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { AnsReturnLink } from "./ans-return-link";
import { useVibeLanguage } from "./use-vibe-language";
import labels from "./labels.json";
import { VibeFavoritesProvider } from "./favorite-button";
import { usePersistedSetting } from "./use-persisted-setting";
import "../../../public/vibe-hub/source/scoped.css";
import "./ans-knowledge.css";

function Navigation() {
  const t = useTranslations("vibehub");
  const lang = useVibeLanguage();
  const pathname = usePathname(); const params = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();
  const [, setSavedLanguage] = usePersistedSetting("vibehub:language", lang);
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { label: "knowledgeHome", path: "" }, { label: "journeys", path: "/journeys" },
    { label: "ansPractice", path: "/ans" }, { label: "terms", path: "/topics" },
    { label: "courses", path: "/courses" }, { label: "saved", path: "/favorites" },
    { label: "practice", path: "/practice" }, { label: "antiAi", path: "/anti-ai-flavor" },
    { label: "skill", path: "/vibehub-skill" }, { label: "updates", path: "/updates" },
  ] as const;
  const active = (path: string) => path ? pathname === `/vibe-hub${path}` || pathname.startsWith(`/vibe-hub${path}/`) : pathname === "/vibe-hub";
  function switchLanguage() {
    const nextLang = lang === "zh" ? "en" : "zh";
    setSavedLanguage(nextLang);
    const next = new URLSearchParams(params.toString()); next.set("lang", nextLang);
    window.location.assign(`${pathname}?${next}${window.location.hash}`);
  }
  return <header className="vh-header ans-knowledge-header">
    <a href="#ans-knowledge-content" className="ans-knowledge-skip">{t("skipContent")}</a>
    <div className="vh-header-inner">
      <Link href={`/vibe-hub?lang=${lang}`} className="vh-brand" aria-label="ANS VibeHub">
        <Image className="ans-knowledge-logo-light" src="/ans-logo-light.svg" width={28} height={28} alt="" />
        <Image className="ans-knowledge-logo-dark" src="/ans-logo-dark.svg" width={28} height={28} alt="" />
        <span>ANS <b>VibeHub</b></span>
      </Link>
      <nav className="vh-desktop-nav" aria-label={t("navigation")}>
        {links.slice(0, 6).map(link => <Link key={link.label} href={`/vibe-hub${link.path}?lang=${lang}`} aria-current={active(link.path) ? "page" : undefined}>{t(link.label)}</Link>)}
      </nav>
      <div className="vh-header-actions">
        <Button variant="ghost" size="icon" className="ans-knowledge-action ans-language-action" onClick={switchLanguage} aria-label={t("switchLanguage")} title={t("switchLanguage")}><Languages size={18} aria-hidden="true" /><span>{lang === "zh" ? "EN" : "中"}</span></Button>
        <Button variant="ghost" size="icon" className="ans-knowledge-action" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label={t("toggleSiteTheme")} title={t("toggleSiteTheme")}><Sun className="ans-knowledge-logo-dark" size={18} aria-hidden="true" /><Moon className="ans-knowledge-logo-light" size={18} aria-hidden="true" /></Button>
        <AnsReturnLink compact />
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild><Button variant="ghost" size="icon" className="ans-knowledge-action" aria-label={t("menu")}><Menu size={20} aria-hidden="true" /></Button></SheetTrigger>
          <SheetContent className="ans-knowledge-menu" aria-describedby="ans-menu-description">
            <SheetHeader><SheetTitle>ANS VibeHub</SheetTitle><SheetDescription id="ans-menu-description" className="sr-only">{t("knowledgeDescription")}</SheetDescription></SheetHeader>
            <nav aria-label={t("navigation")} className="ans-knowledge-menu-links">{links.map(link => <Link key={link.label} href={`/vibe-hub${link.path}?lang=${lang}`} aria-current={active(link.path) ? "page" : undefined} onClick={() => setMenuOpen(false)}>{t(link.label)}</Link>)}</nav>
            <div className="ans-knowledge-menu-main"><Link href="/explore" onClick={() => setMenuOpen(false)}>{t("exploreAns")}</Link><Link href="/workflows" onClick={() => setMenuOpen(false)}>{t("workflowAns")}</Link><Link href="/community" onClick={() => setMenuOpen(false)}>{t("communityAns")}</Link><AnsReturnLink /></div>
            <Button variant="outline" className="ans-menu-language" onClick={switchLanguage}><Languages size={18} aria-hidden="true" />{t("switchLanguage")}</Button>
          </SheetContent>
        </Sheet>
      </div>
    </div>
    <div className="ans-knowledge-subnav">
      <form className="vh-global-search" action="/vibe-hub/topics" role="search">
        <Search size={17} aria-hidden="true" /><input aria-label={t("search")} placeholder={t("knowledgeSearch")} name="q" defaultValue={params.get("q") || ""} key={`${pathname}:${params.get("q") || ""}`} /><input type="hidden" name="lang" value={lang} /><button type="submit">{t("searchAction")}</button>
      </form>
      <Link href={`/vibe-hub/vibehub-skill?lang=${lang}`} className="ans-knowledge-subnav-note">{t("briefAction")} ↗</Link>
    </div>
  </header>;
}

export function VibeHubShell({ children }: { children: React.ReactNode }) {
  const lang = useVibeLanguage(); const router = useRouter(); const pathname = usePathname(); const params = useSearchParams();
  useEffect(() => {
    if (params.has("lang")) return;
    const next = new URLSearchParams(params.toString()); next.set("lang", lang);
    router.replace(`${pathname}?${next}${window.location.hash}`, { scroll: false });
  }, [lang, params, pathname, router]);
  return <NextIntlClientProvider locale={lang} messages={{ vibehub: labels[lang] }}>
    <VibeFavoritesProvider><div className="vibehub-source ans-knowledge" lang={lang}>
      <Navigation /><div className="vh-page-content" id="ans-knowledge-content" tabIndex={-1}>{children}</div>
    </div></VibeFavoritesProvider>
  </NextIntlClientProvider>;
}
