"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Domain = { id: string; slug: string; name: string; children: { id: string; slug: string; name: string }[] };
export function TemplateFilters({ domains, initialDomain = "", initialScene = "", initialQuery = "" }: { domains: Domain[]; initialDomain?: string; initialScene?: string; initialQuery?: string }) {
  const t = useTranslations("templates");
  const [domain, setDomain] = useState(initialDomain);
  const [scene, setScene] = useState(initialScene);
  const scenes = domain ? domains.find((item) => item.slug === domain)?.children ?? [] : domains.flatMap((item) => item.children);
  return <form action="/templates" role="search" className="mb-5 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(10rem,0.8fr)_minmax(10rem,0.8fr)_auto_auto] sm:items-end">
      <label className="min-w-0 space-y-1.5 text-sm font-medium">
        <span>{t("searchLabel")}</span>
        <Input type="search" name="q" defaultValue={initialQuery} placeholder={t("searchPlaceholder")} autoComplete="off" className="h-11 rounded-xl" />
      </label>
      <label className="space-y-1.5 text-sm font-medium">
        <span>{t("domain")}</span>
        <select name="domain" value={domain} onChange={(event) => { setDomain(event.target.value); setScene(""); }} className="block h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">{t("allDomains")}</option>{domains.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
        </select>
      </label>
      <label className="space-y-1.5 text-sm font-medium">
        <span>{t("scene")}</span>
        <select name="scene" value={scene} onChange={(event) => setScene(event.target.value)} className="block h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">{t("allScenes")}</option>{scenes.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
        </select>
      </label>
      <Button type="submit" className="h-11 rounded-xl px-5">{t("filter")}</Button>
      <Button asChild variant="ghost" className="h-11 rounded-xl px-4"><Link href="/templates">{t("clear")}</Link></Button>
    </div>
  </form>;
}
