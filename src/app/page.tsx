import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, BookOpen, FileCheck, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomepageCtaLink } from "@/components/homepage/homepage-cta-link";

export default async function HomePage() {
  const t = await getTranslations("learning");
  return (
    <div>
      <section className="border-b bg-gradient-to-b from-primary/[0.06] to-background">
        <div className="container max-w-5xl py-14 sm:py-20">
          <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
          <h1 className="mt-5 max-w-3xl text-pretty text-4xl font-semibold tracking-tight sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{t("heroDescription")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild><HomepageCtaLink href="/projects#new-project" eventName="primary_cta">{t("start")}<ArrowRight className="ms-2 h-4 w-4" aria-hidden="true" /></HomepageCtaLink></Button>
            <Button size="lg" variant="outline" asChild><Link href="#first-lesson">{t("viewLesson")}</Link></Button>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{t("privateHint")}</p>
        </div>
      </section>
      <section id="first-lesson" className="container max-w-5xl scroll-mt-20 py-12">
        <h2 className="text-2xl font-semibold">{t("lessonTitle")}</h2>
        <p className="mt-3 text-muted-foreground">{t("lessonDescription")}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <p className="rounded-xl border bg-muted/30 p-5 leading-7">{t("exampleInput")}</p>
          <p className="rounded-xl border border-primary/25 bg-primary/5 p-5 leading-7">{t("exampleOutput")}</p>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("exampleWarning")}</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {([BookOpen, Pencil, FileCheck] as const).map((Icon, index) => <div key={index} className="rounded-xl border p-5"><Icon className="h-5 w-5 text-primary" aria-hidden="true" /><h3 className="mt-4 font-semibold">{t(`step${index + 1}Title`)}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{t(`step${index + 1}Body`)}</p></div>)}
        </div>
        <Button className="mt-7" asChild><Link href="/projects#new-project">{t("start")}</Link></Button>
      </section>
      <section className="container max-w-5xl pb-14">
        <div className="rounded-xl border bg-muted/20 p-6"><h2 className="font-semibold">{t("libraryTitle")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("libraryBody")}</p><div className="mt-4 flex flex-wrap gap-3">{(["prompts", "templates", "workflows"] as const).map((key) => <Button key={key} asChild variant="outline"><Link href={`/${key}`}>{t(key)}</Link></Button>)}</div></div>
      </section>
    </div>
  );
}
