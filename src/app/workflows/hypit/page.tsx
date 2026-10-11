import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowDown, Clapperboard, Layers, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HypitWorkspace } from "@/components/workspace/hypit-workspace";
import { HypitShowcase } from "@/components/workspace/hypit-showcase";
import styles from "@/components/workspace/hypit-showcase.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("product.hypit");
  return { title: t("title"), description: t("body") };
}

export default async function HypitPage() {
  const t = await getTranslations("product.hypit");
  return <div className="ans-product-shell"><div className="ans-product-container space-y-10 py-10 sm:py-12">
    <Link href="/workflows" className="ans-text-link w-fit"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("back")}</Link>
    <div className={styles.hero}>
      <header className={styles.intro}>
        <p className="ans-eyebrow">{t("tag")}</p>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>
        <p className="mt-5 max-w-prose leading-8 text-muted-foreground">{t("body")}</p>
        <ul className={styles.capabilities}>
          <li><Clapperboard className="h-5 w-5" aria-hidden="true" /><span>{t("overview.reference")}</span></li>
          <li><Layers className="h-5 w-5" aria-hidden="true" /><span>{t("overview.edit")}</span></li>
          <li><FileVideo className="h-5 w-5" aria-hidden="true" /><span>{t("overview.deliver")}</span></li>
        </ul>
        <div className={styles.actions}>
          <Button asChild><a href="#hypit-workspace">{t("open")}<ArrowDown className="ms-2 h-4 w-4" aria-hidden="true" /></a></Button>
          <a href="#hypit-examples" className="ans-text-link text-sm">{t("overview.examples")}</a>
        </div>
        <p className="mt-6 text-sm leading-6 text-muted-foreground">{t("status")}</p>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">{t("channelsNote")}</p>
      </header>
      <HypitShowcase />
    </div>
    <section className={styles.preparation} aria-labelledby="hypit-preparation-title">
      <h2 id="hypit-preparation-title" className="text-xl font-semibold">{t("preparation.title")}</h2>
      <ol className={styles.steps}>{(["brief", "assets", "review"] as const).map((step, index) => <li key={step}>
        <span className={styles.stepNumber} aria-hidden="true">{index + 1}</span>
        <div><h3 className="text-sm font-semibold">{t(`preparation.${step}.title`)}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{t(`preparation.${step}.body`)}</p></div>
      </li>)}</ol>
    </section>
    <div id="hypit-workspace" className="scroll-mt-24"><HypitWorkspace /></div>
    <div className="border-t pt-6 text-xs leading-6 text-muted-foreground">
      <p>{t("internalNote")}</p>
      <div className="mt-2 flex gap-5"><a href="https://github.com/hypit-ai/hypit" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{t("sourceLink")}</a><a href="/workflows/hypit/HYPIT-LICENSE" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{t("licenseLink")}</a></div>
    </div>
  </div></div>;
}
