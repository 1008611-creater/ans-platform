import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Code, Lock, Building2, LogIn, Boxes, Workflow, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { DiscoveryPrompts } from "@/components/prompts/discovery-prompts";
import { HeroCategories } from "@/components/prompts/hero-categories";
import { AnimatedText } from "@/components/layout/animated-text";
import { QuotaPoolBanner } from "@/components/quota-pool-banner";

export default async function HomePage() {
  const tHomepage = await getTranslations("homepage");
  const tNav = await getTranslations("nav");
  const session = await auth();
  const config = await getConfig();
  
  const isOAuth = config.auth.provider !== "credentials";
  // Show register button only for non-logged-in users
  const showRegisterButton = !session && (isOAuth || (config.auth.provider === "credentials" && config.auth.allowRegistration));

  const useCloneBranding = config.homepage?.useCloneBranding ?? false;

  // Show landing page for all users
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-12 md:py-16 border-b overflow-hidden">
        {/* Background - Right Side */}
        {useCloneBranding ? (
          <div className="absolute top-0 end-0 bottom-0 w-1/2 hidden md:block pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-background via-background/80 to-transparent z-10" />
            <Image
              src={config.branding.logo}
              alt={config.branding.name}
              width={800}
              height={800}
              className="absolute top-1/2 -translate-y-1/2 -end-20 w-[150%] h-auto opacity-15 dark:hidden"
            />
            <Image
              src={config.branding.logoDark || config.branding.logo}
              alt={config.branding.name}
              width={800}
              height={800}
              className="absolute top-1/2 -translate-y-1/2 -end-20 w-[150%] h-auto opacity-10 hidden dark:block"
            />
          </div>
        ) : (
          <div className="absolute top-0 end-0 bottom-0 w-2/5 xl:w-[45%] 2xl:w-1/2 hidden md:block pointer-events-none overflow-hidden">
            {/* Video background */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-background via-background/80 to-transparent z-10" />
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute top-1/2 -translate-y-1/2 end-0 w-full h-auto opacity-30 dark:opacity-15 dark:invert"
              >
                <source src="https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/public/animation_compressed.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="absolute inset-0 hidden lg:flex items-center justify-center z-30 pe-8 pointer-events-auto">
              <HeroCategories />
            </div>
          </div>
        )}
        
        <div className="container relative z-20">
          <div className="max-w-2xl lg:max-w-xl xl:max-w-2xl">
            {useCloneBranding ? (
              <>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl !text-2xl sm:!text-3xl md:!text-4xl lg:!text-5xl text-primary">
                  {config.branding.name}
                </h1>
            <p className="mt-6 text-muted-foreground text-lg max-w-xl">
              {config.branding.description}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              {tHomepage("campusBadge")}
            </div>
            <div className="mt-6 grid max-w-xl grid-cols-3 gap-2">
              <Link
                href="/prompts"
                className="group rounded-xl border bg-background/75 p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="mt-2 block text-sm font-medium">{tHomepage("capabilityPrompt")}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{tHomepage("capabilityPromptHint")}</span>
              </Link>
              <Link
                href="/templates"
                className="group rounded-xl border bg-background/75 p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <Boxes className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="mt-2 block text-sm font-medium">{tHomepage("capabilityTemplate")}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{tHomepage("capabilityTemplateHint")}</span>
              </Link>
              <Link
                href="/workflows"
                className="group rounded-xl border bg-background/75 p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <Workflow className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="mt-2 block text-sm font-medium">{tHomepage("capabilityWorkflow")}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{tHomepage("capabilityWorkflowHint")}</span>
              </Link>
            </div>
          </>
            ) : (
              <>
                <h1 className="space-y-0 overflow-visible">
                  <AnimatedText className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-none text-balance">{tHomepage("heroTitle")}</AnimatedText>
                  <AnimatedText className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl italic font-display tracking-tight leading-none text-balance break-words">{tHomepage("heroSubtitle")}</AnimatedText>
                </h1>
                <p className="mt-6 text-muted-foreground text-lg max-w-xl">
                  {tHomepage("heroDescription")}
                </p>
                
                {/* Feature badges */}
                <div className="mt-8 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Code className="h-5 w-5 text-primary" />
                    <span>{tHomepage("heroFeature1")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="h-5 w-5 text-primary" />
                    <span>{tHomepage("heroFeature2")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span>{tHomepage("heroFeature3")}</span>
                  </div>
                </div>
              </>
            )}

            <div className="mt-10 flex flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href={session ? "/feed" : "/prompts"}>
                    {session ? tHomepage("viewFeed") : tHomepage("browsePrompts")}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                {showRegisterButton && (
                  <Button variant="outline" size="lg" asChild>
                    <Link href={isOAuth ? "/login" : "/register"}>
                      <LogIn className="mr-1.5 h-4 w-4" />
                      {isOAuth ? tNav("login") : tNav("register")}
                    </Link>
                  </Button>
                )}
              </div>
              {!useCloneBranding && (
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {tHomepage("ourHistory")}
                </Link>
              )}
            </div>
            
            {/* Mobile Hero Categories */}
            <div className="mt-8 lg:hidden">
              <HeroCategories />
            </div>

          </div>
        </div>
      </section>

      {/* ANS 免费算力池（引流钩子） */}
      <QuotaPoolBanner />

      {/* Featured & Latest Prompts Section */}
      <DiscoveryPrompts isHomepage />

      {/* CTA Section - only show if not using clone branding */}
      {!useCloneBranding && (
        <section className="py-12">
          <div className="container">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-4">
                <Image
                  src={config.branding.logo}
                  alt={config.branding.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 dark:hidden"
                />
                <Image
                  src={config.branding.logoDark || config.branding.logo}
                  alt={config.branding.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 hidden dark:block"
                />
                <div>
                  <h2 className="font-semibold">{tHomepage("readyToStart")}</h2>
                  <p className="text-sm text-muted-foreground">{tHomepage("freeAndOpen")}</p>
                </div>
              </div>
              {showRegisterButton && (
                <Button asChild>
                  <Link href={isOAuth ? "/login" : "/register"}>
                    {isOAuth ? tNav("login") : tHomepage("createAccount")}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
