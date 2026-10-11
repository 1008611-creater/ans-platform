"use client";
import { useVibeLanguage } from "../use-vibe-language";
import { AntiAiFlavorPage } from "../official/anti-ai-flavor";
export default function AntiAi() { return <AntiAiFlavorPage locale={useVibeLanguage()} />; }
