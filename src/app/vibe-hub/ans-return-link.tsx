"use client";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { useVibeHubReturn } from "@/components/providers/vibehub-return-navigation";

export function AnsReturnLink({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("vibehub");
  const destination = useVibeHubReturn();
  return <WorkspaceLink href={destination.href} scroll={!destination.remembered} onNavigate={destination.prepare}
    className={compact ? "vh-ans-return" : undefined} aria-label={t("returnAns")} title={t("returnAnsHint")}>
    {compact && <ArrowLeft size={16} aria-hidden="true" />}<span>{t("returnAns")}</span>
  </WorkspaceLink>;
}
