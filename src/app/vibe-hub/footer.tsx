"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
export function VibeHubFooter() {
  const t = useTranslations("vibehub");
  return <footer className="vh-source-footer"><div><p>{t("footerBody")}</p><p>{t("originalAuthor")} <a href="https://oiloil.org/" target="_blank" rel="noreferrer">oil oil ↗</a></p></div>
    <nav aria-label={t("authorContributions")}>
      <a href="https://github.com/oil-oil" target="_blank" rel="noreferrer">GitHub ↗</a><a href="https://x.com/I_am_oil_oil" target="_blank" rel="noreferrer">X ↗</a>
      <a href="https://www.xiaohongshu.com/user/profile/5f4dfecb000000000100571d" target="_blank" rel="noreferrer">{t("red")} ↗</a><a href="mailto:zhihuang.oiloil@gmail.com">{t("email")}</a>
      <a href="https://my.feishu.cn/share/base/shrcnxcYfvOPpNtF0c1Vv3oBXGb" target="_blank" rel="noreferrer">{t("suggestTerm")} ↗</a>
    </nav><nav aria-label={t("source")}><a href="https://vibe-hub.org" target="_blank" rel="noreferrer">{t("officialSite")} ↗</a><a href="https://github.com/oil-oil/vibe-hub-skill" target="_blank" rel="noreferrer">{t("githubSkill")} ↗</a><Link href="/.well-known/vibehub.json">{t("manifest")}</Link><Link href="/">{t("ans")}</Link></nav>
  </footer>;
}
