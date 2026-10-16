import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getToonflowEmbedConfig } from "@/server/integrations/toonflow";
import { ToonflowWorkspace } from "@/components/workspace/toonflow-workspace";
import { getTranslations } from "next-intl/server";
import { Film, ArrowLeft, ExternalLink } from "lucide-react";
import { AIGC_CONNECTORS } from "@/lib/aigc/cluster";
import { Button } from "@/components/ui/button";

// Evaluate the server-only opt-in at request time, not while building the image.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("product");
  return { title: t("toonflow.title"), description: t("toonflow.body") };
}

export default async function ToonflowPage() {
  const t = await getTranslations("product");
  const embed = getToonflowEmbedConfig();
  if (embed) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login?callbackUrl=/workflows/toonflow");
    return <ToonflowWorkspace {...embed} userId={session.user.id} />;
  }
  const connector = AIGC_CONNECTORS.find((item) => item.id === "toonflow")!;
  return <div className="ans-product-shell"><div className="ans-product-container py-12"><Link href="/workspace" className="ans-text-link mb-8 w-fit"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("nav.workspace")}</Link><section className="ans-toonflow-hero"><Film className="h-10 w-10" aria-hidden="true" /><p className="mt-6 text-sm">{t("toonflow.tag")}</p><h1 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">{t("toonflow.title")}</h1><p className="mt-5 max-w-2xl leading-8">{t("toonflow.body")}</p><Button asChild variant="secondary" size="lg" className="mt-8 rounded-full"><a href={connector.url} target="_blank" rel="noopener noreferrer">{t("toonflow.open")}<ExternalLink className="ms-2 h-4 w-4" aria-hidden="true" /></a></Button></section><div className="mt-6 grid gap-5 md:grid-cols-2"><div className="ans-detail-block"><h2 className="text-lg font-semibold">{t("inputsTitle")}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{t("toonflow.inputs")}</p></div><div className="ans-detail-block"><h2 className="text-lg font-semibold">{t("toonflow.status")}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{t("toonflow.integration")}</p><Link href="/workspace" className="ans-text-link mt-5">{t("toonflow.back")}<ArrowLeft className="h-4 w-4" aria-hidden="true" /></Link></div></div></div></div>;
}
