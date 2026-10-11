"use client";
import { useRouter } from "next/navigation";
import { LearningLab } from "../official/learning-lab.js";
import { useVibeLanguage } from "../use-vibe-language";
export function LabClient() {
  const lang = useVibeLanguage(); const router = useRouter();
  return <LearningLab key={lang} locale={lang} onBack={() => router.push(`/vibe-hub/vibehub-skill?lang=${lang}`)} />;
}
