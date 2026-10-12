"use client";
import Image from "next/image";
import { WorkspaceLink as Link } from "@/components/providers/workspace-navigation";
import { useTranslations } from "next-intl";
import { useBranding } from "@/components/providers/branding-provider";
export function Footer() {
  const branding = useBranding(), t = useTranslations("footer"), a = useTranslations("a11y");
  return <footer className="shrink-0 border-t"><div className="container flex flex-col items-center justify-between gap-3 py-4 text-xs text-muted-foreground sm:flex-row"><span className="flex items-center gap-2"><Image src="/ans-logo-light.svg" alt="" width={18} height={18} className="dark:invert" />© {new Date().getFullYear()} {branding.name}</span><nav aria-label={a("footerNav")} className="flex flex-wrap justify-center gap-x-4 gap-y-2"><Link href="/privacy" className="hover:text-foreground">{t("privacy")}</Link><Link href="/terms" className="hover:text-foreground">{t("terms")}</Link><Link href="/support" className="hover:text-foreground">{t("support")}</Link><Link href="https://github.com/1008611-creater/ans-platform" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">GitHub</Link></nav></div></footer>;
}
