import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { HypitWorkspace } from "@/components/workspace/hypit-workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("product.hypit");
  return { title: t("title"), description: t("body") };
}

export default async function HypitPage() {
  const t = await getTranslations("product.hypit");
  return <div className="ans-product-shell"><div className="ans-product-container space-y-10 py-12">
    <header className="max-w-3xl">
      <Link href="/workflows" className="ans-text-link mb-7 w-fit"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("back")}</Link>
      <p className="ans-eyebrow">{t("tag")}</p>
      <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>
      <p className="mt-5 leading-8 text-muted-foreground">{t("body")}</p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("channelsNote")}</p>
    </header>
    <HypitWorkspace />
    <div className="border-t pt-6 text-xs leading-6 text-muted-foreground">
      <p>{t("internalNote")}</p>
      <div className="mt-2 flex gap-5"><a href="https://github.com/hypit-ai/hypit" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{t("sourceLink")}</a><a href="/workflows/hypit/HYPIT-LICENSE" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{t("licenseLink")}</a></div>
    </div>
  </div></div>;
}
