"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { Settings, Volume2, Sparkles, Monitor, Moon, Sun, ArrowUpRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { WorkspaceLink as Link, useWorkspaceNavigation } from "@/components/providers/workspace-navigation";
import { setLocale } from "@/lib/i18n/client";
import { resetSitePreferences, updateSitePreferences, useSitePreferences } from "@/lib/site-preferences";
import "./site-settings.css";

export function SiteSettings() {
  const zh = useLocale().startsWith("zh");
  const ui = useTranslations("companion");
  const prefs = useSitePreferences();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const navigation = useWorkspaceNavigation();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setMounted(true); const show = () => setOpen(true); window.addEventListener("ans:open-settings", show); return () => window.removeEventListener("ans:open-settings", show); }, []);
  useEffect(() => { document.documentElement.dataset.ansMotion = prefs.motion; }, [prefs.motion]);
  useEffect(() => { if (!saved) return; const timer = setTimeout(() => setSaved(false), 2200); return () => clearTimeout(timer); }, [saved]);
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={ui("siteSettings")} title={ui("settings")}><Settings className="h-4 w-4" aria-hidden="true" /></Button></SheetTrigger>
    <SheetContent className="ans-settings-sheet" aria-describedby="ans-settings-description">
      <header className="ans-settings-heading"><span className="ans-settings-eyebrow">ANS / {ui("preferences")}</span><SheetTitle>{ui("makeANSYours")}</SheetTitle><SheetDescription id="ans-settings-description">{ui("appliedInstantlyAndSavedInThisBrowser")}</SheetDescription></header>
      <div className="ans-settings-scroll">
        <section className="ans-settings-section" aria-labelledby="ans-companion-settings-title">
          <h3 id="ans-companion-settings-title"><Sparkles aria-hidden="true" />{ui("dinoCompanion")}</h3>
          <div className="ans-settings-row"><div><label htmlFor="ans-setting-voice">{ui("spokenReplies")}</label><p>{ui("offByDefaultDinoCanReadReplies")}</p></div><Switch id="ans-setting-voice" checked={prefs.voice} onCheckedChange={voice => { updateSitePreferences({ voice }); if (voice) window.dispatchEvent(new CustomEvent("ans:dino-activate")); }} /></div>
          <div className="ans-settings-volume"><label htmlFor="ans-setting-volume"><Volume2 aria-hidden="true" />{ui("voiceVolume")}<span>{prefs.volume}%</span></label><input id="ans-setting-volume" type="range" min="0" max="100" step="5" value={prefs.volume} disabled={!prefs.voice} onChange={e => updateSitePreferences({ volume: Number(e.target.value) })} /></div>
          <div className="ans-settings-row"><div><label htmlFor="ans-setting-suggestions">{ui("suggestedNextSteps")}</label><p>{ui("usefulShortcutsForYourCurrentPage")}</p></div><Switch id="ans-setting-suggestions" checked={prefs.suggestions} onCheckedChange={suggestions => updateSitePreferences({ suggestions })} /></div>
          <fieldset className="ans-settings-field"><legend>{ui("motionFeedback")}</legend><div className="ans-settings-segments">{(["auto", "calm"] as const).map(motion => <button key={motion} type="button" aria-pressed={prefs.motion === motion} onClick={() => updateSitePreferences({ motion })}>{motion === "auto" ? ui("playful") : ui("calm")}</button>)}</div><p>{ui("calmModePausesPerformancesSystemReducedMotion")}</p></fieldset>
        </section>
        <section className="ans-settings-section" aria-labelledby="ans-appearance-title"><h3 id="ans-appearance-title"><Monitor aria-hidden="true" />{ui("appearanceLanguage")}</h3>
          <fieldset className="ans-settings-field"><legend>{ui("theme")}</legend><div className="ans-settings-segments">{[{ key: "light", icon: Sun, label: ui("light") }, { key: "dark", icon: Moon, label: ui("dark") }, { key: "system", icon: Monitor, label: ui("system") }].map(({ key, icon: Icon, label }) => <button type="button" key={key} aria-pressed={mounted && theme === key} onClick={() => setTheme(key)}><Icon aria-hidden="true" />{label}</button>)}</div></fieldset>
          <div className="ans-settings-row"><label htmlFor="ans-setting-language">{ui("language")}</label><select id="ans-setting-language" value={zh ? "zh" : "en"} onChange={e => { const locale = e.target.value; navigation.run(() => setLocale(locale)); }}><option value="zh">简体中文</option><option value="en">English</option></select></div>
        </section>
        <section className="ans-settings-section"><h3>{ui("accountUsage")}</h3><Link className="ans-settings-link" href={session?.user ? "/settings" : "/login"} onClick={() => setOpen(false)}>{ui(session?.user ? "profileModelCredentials" : "signInToManageYourProfile")}<ArrowUpRight aria-hidden="true" /></Link><Link className="ans-settings-link" href="/workspace/credits" onClick={() => setOpen(false)}>{ui("creditsUsage")}<ArrowUpRight aria-hidden="true" /></Link></section>
      </div>
      <footer className="ans-settings-footer"><span role="status">{saved ? ui("defaultsRestored") : ui("preferencesSaveAutomatically")}</span><button type="button" onClick={() => { resetSitePreferences(); setTheme("system"); setSaved(true); }}><RotateCcw aria-hidden="true" />{ui("resetDefaults")}</button></footer>
    </SheetContent>
  </Sheet>;
}
