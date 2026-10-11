"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import terms from "./terms.json";
import recordings from "@/data/vibehub/pronunciations.json";
export function PronunciationButton({ slug }: { slug: string }) {
  const t = useTranslations("vibehub"); const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const term = terms.find(item => item.slug === slug)?.name || slug;
  useEffect(() => () => { audio.current?.pause(); window.speechSynthesis?.cancel(); }, [slug]);
  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    const voice = new SpeechSynthesisUtterance(term); voice.lang = "en-US";
    const voices = window.speechSynthesis.getVoices().filter(item => /^en(-|_)US$/i.test(item.lang));
    voice.voice = voices.find(item => /natural|samantha|aria|jenny/i.test(item.name)) || voices[0] || null;
    voice.onstart = () => setPlaying(true); voice.onend = voice.onerror = () => setPlaying(false);
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(voice);
  };
  const play = () => {
    audio.current?.pause(); window.speechSynthesis?.cancel();
    if (!recordings.some(item => item.id === slug)) { speak(); return; }
    const sound = new Audio(`/vibe-hub/source/audio/pronunciations/${slug}.mp3`); audio.current = sound;
    let failed = false;
    const fallback = () => { if (!failed && audio.current === sound) { failed = true; setPlaying(false); speak(); } };
    sound.onplaying = () => setPlaying(true); sound.onended = () => setPlaying(false); sound.onerror = fallback;
    void sound.play().catch(fallback);
  };
  return <button type="button" className={`vh-icon-button${playing ? " is-speaking" : ""}`} aria-label={`${t("pronounce")} ${term}`} aria-pressed={playing} onClick={play}><Volume2 size={18} /></button>;
}
