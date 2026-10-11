"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
export function VibeHubFooter() { const t = useTranslations("vibehub"); return <footer className="vh-source-footer"><p>{t("footerBody")}</p><nav aria-label={t("source")}><a href="https://vibe-hub.org" target="_blank" rel="noreferrer">{t("officialSite")} ↗</a><a href="https://github.com/oil-oil/vibe-hub-skill" target="_blank" rel="noreferrer">{t("githubSkill")} ↗</a><Link href="/.well-known/vibehub.json">{t("manifest")}</Link><Link href="/">{t("ans")}</Link></nav></footer>; }
