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
              <h2 className="min-w-0 text-xl font-semibold">{t(`items.${id}.name`)}</h2>
              <Badge variant="secondary">{t(`items.${id}.status`)}</Badge>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t(`items.${id}.description`)}</p>
            <details className="text-sm"><summary className="min-h-11 w-fit cursor-pointer rounded py-2 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("eventOverview")}</summary><ul className="mt-2 list-disc space-y-1 ps-5 text-muted-foreground">{(t.raw(`items.${id}.highlights`) as string[]).map(item => <li key={item}>{item}</li>)}</ul></details>
            <div className="flex flex-wrap items-center gap-4">
              <Link href={href} className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {t(`items.${id}.cta`)}<ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
              {id === "agrihackathon" && <>
                <Link href="/explore?category=competition&subcategory=agri-wall" className="inline-flex min-h-11 items-center rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("items.agrihackathon.wallCta")}</Link>
                <Link href="/explore/submit?event=agrihackathon" className="inline-flex min-h-11 items-center rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("items.agrihackathon.submitCta")}</Link>
              </>}
            </div>
          </div>
          <figure className="overflow-hidden rounded-xl border bg-slate-950/90 shadow-sm">
            <Image src={cover} alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" />
          </figure>
        </article>)}
      </section>
      <Link href="/teams" className="inline-flex min-h-11 items-center rounded-md text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("continueTeam")}</Link>
    </div>
  </div>;
}
