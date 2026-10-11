"use client";
import { useRouter } from "next/navigation";
import { VibeSkillPage } from "../official/learning-lab.js";
import { useVibeLanguage } from "../use-vibe-language";
export function SkillClient() {
  const lang = useVibeLanguage(); const router = useRouter();
  return <VibeSkillPage key={lang} locale={lang} onBack={() => router.push(`/vibe-hub?lang=${lang}`)} />;
}
