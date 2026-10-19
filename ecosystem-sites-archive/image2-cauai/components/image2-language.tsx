"use client";

import { useEffect, useState } from "react";
import { getImage2LanguageLabel, type Image2Language } from "@/lib/image2-language";
import styles from "./image2-language-toggle.module.css";

const languageStorageKey = "image2-language:v1";

export function useImage2LanguagePreference(defaultLanguage: Image2Language = "zh") {
  const [language, setLanguage] = useState<Image2Language>(defaultLanguage);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(languageStorageKey);
      if (saved === "zh" || saved === "en") setLanguage(saved);
    } catch {
      // Ignore storage read failures and keep the default language.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(languageStorageKey, language);
    } catch {
      // Ignore storage write failures.
    }
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== languageStorageKey) return;
      if (event.newValue === "zh" || event.newValue === "en") setLanguage(event.newValue);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleLanguage = () => {
    setLanguage((current) => (current === "zh" ? "en" : "zh"));
  };

  return {
    language,
    setLanguage,
    toggleLanguage
  };
}

export function Image2LanguageToggle({
  language,
  onChange,
  className
}: {
  className?: string;
  language: Image2Language;
  onChange: (language: Image2Language) => void;
}) {
  return (
    <div aria-label="中英切换" className={[styles.switch, className].filter(Boolean).join(" ")}>
      <button
        aria-pressed={language === "zh"}
        className={language === "zh" ? styles.active : ""}
        type="button"
        onClick={() => onChange("zh")}
        title="切换到中文"
      >
        {getImage2LanguageLabel("zh")}
      </button>
      <button
        aria-pressed={language === "en"}
        className={language === "en" ? styles.active : ""}
        type="button"
        onClick={() => onChange("en")}
        title="Switch to English"
      >
        {getImage2LanguageLabel("en")}
      </button>
    </div>
  );
}
