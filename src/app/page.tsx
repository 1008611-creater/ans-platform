import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Boxes, Check, Compass, Sparkles, Workflow, Zap } from "lucide-react";
import { auth } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { getQuotaPoolBannerState } from "@/server/quota-pool/service";
import { Button } from "@/components/ui/button";
import { DiscoveryPrompts } from "@/components/prompts/discovery-prompts";
import { HomepageComputeCard } from "@/components/homepage/homepage-compute-card";
import { HomepageCtaLink } from "@/components/homepage/homepage-cta-link";

export default async function HomePage() {
  const [tHome, tNav, session, config, locale, quota] = await Promise.all([
    getTranslations("homepageNext"),
    getTranslations("nav"),
    auth(),
    getConfig(),
    getLocale(),
    getQuotaPoolBannerState(),
  ]);

  const isOAuth = config.auth.provider !== "credentials";
  const showRegisterButton =
    !session &&
    (isOAuth || (config.auth.provider === "credentials" && config.auth.allowRegistration));
  const primaryHref = session ? "/workspace" : "/templates";
  const primaryLabel = session ? tHome("continue") : tHome("primaryCta");

  return (
    <div className="flex flex-col overflow-x-hidden">
      <section className="border-b bg-gradient-to-b from-primary/[0.06] via-background to-background">
        <div className="container grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center lg:gap-16 lg:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              {tHome("eyebrow")}
            </div>
            <h1 className="mt-6 max-w-3xl text-pretty text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {tHome("heroTitle")}
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              {tHome("heroDescription")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <HomepageCtaLink href={primaryHref} eventName="primary_cta">
                  {primaryLabel}
                  <ArrowRight className="ms-2 h-4 w-4" aria-hidden="true" />
                </HomepageCtaLink>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <HomepageCtaLink href="/prompts" eventName="discover_cta">
                  {tHome("secondaryCta")}
                  <Compass className="ms-2 h-4 w-4" aria-hidden="true" />
                </HomepageCtaLink>
              </Button>
              {showRegisterButton ? (
                <Button variant="ghost" size="lg" asChild>
                  <Link href={isOAuth ? "/login" : "/register"}>{isOAuth ? tNav("login") : tNav("register")}</Link>
                </Button>
              ) : null}
            </div>

            <div className="mt-9 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              {[
                [Sparkles, tHome("proofPrompt")],
                [Boxes, tHome("proofTemplate")],
                [Workflow, tHome("proofWorkflow")],
              ].map(([Icon, label]) => (
                <div className="flex items-center gap-2" key={label as string}>
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{label as string}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:justify-self-end">
            <div className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[1.75rem] border bg-card/95 p-5 shadow-xl shadow-primary/10 sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b pb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">{tHome("previewLabel")}</p>
                  <p className="mt-1 text-sm font-medium">{tHome("previewTitle")}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  {tHome("previewReady")}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border bg-muted/35 p-4">
                  <p className="text-xs font-medium text-muted-foreground">{tHome("previewInputLabel")}</p>
                  <p className="mt-2 text-sm leading-6">{tHome("previewInput")}</p>
                </div>
                <div className="flex justify-center" aria-hidden="true">
                  <ArrowRight className="h-4 w-4 rotate-90 text-primary" />
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {tHome("previewOutputLabel")}
                  </div>
                  <p className="mt-2 text-sm leading-6">{tHome("previewOutput")}</p>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-muted/50 p-4 text-sm">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-medium">{tHome("previewNextLabel")}</p>
                  <p className="mt-1 leading-6 text-muted-foreground">{tHome("previewNext")}</p>
                </div>
              </div>

              <Button className="mt-5 w-full" asChild>
                <HomepageCtaLink href={primaryHref} eventName="preview_cta">
                  {primaryLabel}
                  <ArrowRight className="ms-2 h-4 w-4" aria-hidden="true" />
                </HomepageCtaLink>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container relative z-10 -mt-5 sm:-mt-7">
        <HomepageComputeCard state={quota} locale={locale} />
      </div>

      <section className="container py-12 sm:py-16" aria-labelledby="homepage-path-title">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">{tHome("pathEyebrow")}</p>
          <h2 id="homepage-path-title" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {tHome("pathTitle")}
          </h2>
          <p className="mt-3 text-muted-foreground">{tHome("pathDescription")}</p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {[
            { number: "01", icon: Sparkles, title: tHome("pathDiscoverTitle"), description: tHome("pathDiscoverDescription"), href: "/prompts" },
            { number: "02", icon: Boxes, title: tHome("pathReuseTitle"), description: tHome("pathReuseDescription"), href: "/templates" },
            { number: "03", icon: Workflow, title: tHome("pathBuildTitle"), description: tHome("pathBuildDescription"), href: "/workflows" },
          ].map(({ number, icon: Icon, title, description, href }) => (
            <Link
              key={number}
              href={href}
              className="group rounded-2xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">{number}</span>
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="mt-7 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                {tHome("openAction")}
                <ArrowRight className="ms-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <DiscoveryPrompts isHomepage />

      <section className="container py-12 sm:py-16">
        <div className="rounded-3xl border bg-muted/30 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">{tHome("closingEyebrow")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{tHome("closingTitle")}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{tHome("closingDescription")}</p>
            </div>
            <Button size="lg" asChild>
              <HomepageCtaLink href={primaryHref} eventName="closing_cta">{primaryLabel}<ArrowRight className="ms-2 h-4 w-4" aria-hidden="true" /></HomepageCtaLink>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
