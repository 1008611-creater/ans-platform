import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, HeartHandshake, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeading } from "@/components/layout/page-heading";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale: locale === "zh" ? "zh" : "en", namespace: "competitionsHub" });
  return { title: t("title"), description: t("description") };
}
const entries = [
  { id: "agrihackathon", href: "/competitions/agrihackathon", icon: HeartHandshake, cover: "/competitions/agrihackathon/gitglow-hub.webp" },
  { id: "aigc", href: "/competitions/aigc", icon: Sparkles, cover: "/catalog/gitglow-v1/aigc-workspace.webp" },
] as const;

export default async function CompetitionsPage() {
  const locale = await getLocale();
  const t = await getTranslations({ locale: locale === "zh" ? "zh" : "en", namespace: "competitionsHub" });
  return <div className="ans-product-shell">
    <div className="ans-product-container ans-page-content space-y-8">
      <PageHeading title={t("title")} description={t("description")} />
      <section aria-label={t("chooseEvent")} className="divide-y rounded-2xl border">
        {entries.map(({ id, href, icon: Icon, cover }) => <article key={id} className="grid min-w-0 gap-5 p-5 sm:p-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <h2 className="min-w-0 text-xl font-semibold"><Link href={href} className="hover:text-primary hover:underline">{t(`items.${id}.name`)}</Link></h2>
              <Badge variant="secondary">{t(`items.${id}.status`)}</Badge>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t(`items.${id}.description`)}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {(t.raw(`items.${id}.highlights`) as string[]).map(item => (
                <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-foreground/90">
                  ✨ {item}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={href}
                style={{ background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "#ffffff", padding: "0 20px", borderRadius: "9999px", fontWeight: 700, boxShadow: "0 6px 16px rgba(37,99,235,0.24)" }}
                className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t(`items.${id}.cta`)}<ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
              {id === "agrihackathon" && <>
                <Link href="/explore?category=competition&subcategory=agri-wall" className="inline-flex min-h-11 items-center rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("items.agrihackathon.wallCta")}</Link>
                <Link href="/explore/submit?event=agrihackathon" className="inline-flex min-h-11 items-center rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("items.agrihackathon.submitCta")}</Link>
              </>}
            </div>
          </div>
          <Link href={href} className="block overflow-hidden rounded-xl border bg-slate-950/90 shadow-sm transition-transform duration-300 hover:scale-[1.01]">
            <Image src={cover} alt={t(`items.${id}.name`)} width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" />
          </Link>
        </article>)}
      </section>
      <Link href="/teams" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4 transition hover:border-primary/50 hover:bg-primary/10">
        <p className="text-base font-bold text-foreground">👥 组队参赛 · 申领 300 点团队专属算力包</p>
        <span style={{ background: "#0f172a", color: "#fff", padding: "8px 16px", borderRadius: "9999px", fontSize: "13px", fontWeight: 700 }}>
          {t("continueTeam")} →
        </span>
      </Link>
    </div>
  </div>;
}
