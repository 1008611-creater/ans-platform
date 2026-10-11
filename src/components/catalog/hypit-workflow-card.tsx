import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Clapperboard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export async function HypitWorkflowCard() {
  const t = await getTranslations("product.hypit");
  return <article className="ans-flow-card">
    <Clapperboard className="h-6 w-6 text-primary" aria-hidden="true" />
    <p className="mt-5 text-xs text-muted-foreground">{t("tag")}</p>
    <h3 className="mt-2 text-lg font-semibold">{t("title")}</h3>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("body")}</p>
    <p className="mt-4 text-xs text-muted-foreground">{t("status")}</p>
    <Button asChild size="sm" className="mt-6 w-fit"><Link href="/workflows/hypit">{t("open")}<ArrowRight className="ms-2 h-4 w-4" aria-hidden="true" /></Link></Button>
  </article>;
}
