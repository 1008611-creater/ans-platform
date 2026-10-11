"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useVibeLanguage } from "./use-vibe-language";
import { AnsReturnLink } from "./ans-return-link";
export function VibeHubFooter() {
  const t = useTranslations("vibehub"); const lang = useVibeLanguage();
  return <footer className="vh-footer ans-knowledge-footer"><div className="ans-knowledge-container"><div className="ans-knowledge-footer-main"><div><Link href={`/vibe-hub?lang=${lang}`} className="ans-knowledge-footer-brand">ANS VibeHub</Link><p>{t("knowledgeTagline")}</p></div><nav aria-label={t("ansDestinations")}><Link href="/explore">{t("exploreAns")}</Link><Link href="/workflows">{t("workflowAns")}</Link><Link href="/community">{t("communityAns")}</Link><AnsReturnLink /></nav></div><div className="ans-knowledge-footer-credit"><p>{t("sourceAttribution")}</p><nav aria-label={t("source")}><a href="https://vibe-hub.org" target="_blank" rel="noreferrer">VibeHub ↗</a><a href="https://github.com/oil-oil/vibe-hub-skill" target="_blank" rel="noreferrer">{t("githubSkill")} ↗</a><Link href="/.well-known/vibehub.json">{t("manifest")}</Link><Link href={`/vibe-hub/updates?lang=${lang}`}>{t("updates")}</Link></nav></div></div></footer>;
}
