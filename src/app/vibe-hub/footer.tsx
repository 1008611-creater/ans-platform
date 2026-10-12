"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useVibeLanguage } from "./use-vibe-language";
import { AnsReturnLink } from "./ans-return-link";
export function VibeHubFooter() {
  const t = useTranslations("vibehub"); const lang = useVibeLanguage();
  return <footer className="vh-footer ans-knowledge-footer"><div className="ans-knowledge-container ans-knowledge-footer-main"><div><Link href={`/vibe-hub?lang=${lang}`} className="ans-knowledge-footer-brand">ANS VibeHub</Link><p className="text-xs text-[var(--vh-muted)]">{t("sourceAttribution")} <a href="https://vibe-hub.org" target="_blank" rel="noreferrer">VibeHub ↗</a> · <a href="https://github.com/oil-oil/vibe-hub-skill" target="_blank" rel="noreferrer">{t("githubSkill")} ↗</a></p></div><nav aria-label={t("ansDestinations")}><Link href="/explore">{t("exploreAns")}</Link><Link href="/workflows">{t("workflowAns")}</Link><Link href="/workspace">{t("workspaceAns")}</Link><Link href={`/vibe-hub/updates?lang=${lang}`}>{t("updates")}</Link><AnsReturnLink /></nav></div></footer>;
}
