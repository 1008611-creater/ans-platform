"use client";
import { useRouter } from "next/navigation";
import { useVibeLanguage } from "../use-vibe-language";
import { ChangelogView } from "../official/changelog";
export default function Updates() {
  const locale = useVibeLanguage(); const router = useRouter();
  return <ChangelogView locale={locale} onGoHome={() => router.push(`/vibe-hub?lang=${locale}`)} onOpenTerm={id => router.push(`/vibe-hub/${id}?lang=${locale}`)} />;
}
