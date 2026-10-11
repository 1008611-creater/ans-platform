"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
export default function NotFound(){const t=useTranslations("vibehub");return <main className="vh-page"><header className="vh-feature-heading"><p>404</p><h1>{t("unavailable")}</h1><Link className="vh-text-button" href="/vibe-hub">{t("back")}</Link></header></main>;}
