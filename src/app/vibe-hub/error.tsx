"use client";
import { useTranslations } from "next-intl";
export default function ErrorPage({reset}: {reset:()=>void}){const t=useTranslations("vibehub");return <main className="vh-page"><div role="alert" className="vh-empty"><p>{t("unavailable")}</p><button type="button" className="vh-primary mt-5" onClick={reset}>{t("retry")}</button></div></main>;}
