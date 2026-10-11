import Image from "next/image";
import { listPublishedCatalog } from "@/server/catalog/service";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURED_PROJECT_SLUGS, PROJECT_CATEGORIES } from "@/domain/catalog/projects";
import { ProjectCard } from "@/components/catalog/project-card";
import { OfficialWorkflows } from "@/components/catalog/official-workflows";
import { HomepageCtaLink } from "@/components/homepage/homepage-cta-link";

export default async function HomePage() {
  const t = await getTranslations("product");
  const catalog = await listPublishedCatalog();
  const featured = FEATURED_PROJECT_SLUGS.flatMap((slug) => catalog.filter((project) => project.slug === slug));
  return <div className="ans-product-shell">
    <section className="ans-home-hero"><div className="ans-product-container grid items-center gap-12 py-14 lg:grid-cols-[1.25fr_0.75fr] lg:py-24">
      <div><p className="ans-eyebrow">{t("eyebrow")}</p><h1 className="mt-7 whitespace-pre-line text-balance text-4xl font-semibold leading-[1.18] tracking-tight sm:text-6xl xl:text-7xl">{t("heroTitle")}</h1><p className="mt-6 max-w-xl text-pretty text-base leading-8 text-muted-foreground sm:text-lg">{t("heroBody")}</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg" className="rounded-full"><HomepageCtaLink href="/explore" eventName="primary_cta">{t("exploreAction")}<ArrowRight className="ms-2 h-4 w-4" aria-hidden="true" /></HomepageCtaLink></Button><Button asChild variant="outline" size="lg" className="rounded-full"><HomepageCtaLink href="/workflows" eventName="workflow_cta">{t("workflowAction")}</HomepageCtaLink></Button></div></div>
      <div className="ans-hero-character"><div className="ans-hero-orbit" aria-hidden="true" /><div className="ans-dino-bubble"><p>{t("mascot.hello")}</p></div><Image src="/mascot/ans-mascot.png" alt={t("mascot.name")} width={420} height={420} priority className="ans-hero-dino" /><span className="ans-hero-sticker" aria-hidden="true">✦</span></div>
    </div></section>
    <section className="ans-product-container py-14"><div className="ans-section-heading"><div><h2>{t("selectionTitle")}</h2></div><div className="flex items-center gap-5"><Link href="/vibe-hub" className="ans-text-link">ANS VibeHub<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link><Link href="/explore" className="ans-text-link">{t("viewAll")}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div></div><nav aria-label={t("categoriesLabel")} className="ans-category-row">{PROJECT_CATEGORIES.map((category) => <Link key={category.id} href={`/explore?category=${category.id}`} className="ans-category-pill">{t(`categories.${category.id}`)}</Link>)}</nav><div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{featured.map((project) => <ProjectCard key={project.slug} project={project} />)}</div></section>
    <section className="ans-workflow-section"><div className="ans-product-container py-14"><div className="ans-section-heading"><div><h2>{t("workflowTitle")}</h2><p>{t("workflowBody")}</p></div><Link href="/workflows" className="ans-text-link">{t("nav.workflows")}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div><OfficialWorkflows compact /></div></section>
    <section className="ans-product-container py-16"><h2 className="text-balance text-2xl font-semibold sm:text-3xl">{t("stepsTitle")}</h2><div className="mt-8 grid gap-8 md:grid-cols-3">{[1, 2, 3].map((step) => <div key={step} className="border-t pt-5"><span className="ans-step-number" aria-hidden="true">0{step}</span><h3 className="mt-4 text-lg font-semibold">{t(`steps.${step}.title`)}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{t(`steps.${step}.body`)}</p></div>)}</div><div className="ans-community-banner mt-14"><div><h2 className="text-2xl font-semibold">{t("communityTitle")}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">{t("communityBody")}</p></div><Button asChild className="rounded-full"><Link href="/community">{t("communityAction")}<ArrowRight className="ms-2 h-4 w-4" aria-hidden="true" /></Link></Button></div></section>
  </div>;
}
