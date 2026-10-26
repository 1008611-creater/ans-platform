import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ExternalLink, PanelsTopLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getEaselEmbedConfig } from "@/server/integrations/easel";
import { EaselWorkspace } from "@/components/workspace/easel-workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("easel");
  return { title: t("title"), description: t("body") };
}
export default async function EaselPage() {
  const enabled = process.env.ANS_EASEL_ENABLED === "1";
  const session = enabled ? await auth() : null;
  if (enabled && !session?.user?.id) redirect("/login?callbackUrl=/workflows/easel");
  const t = await getTranslations("easel");
  const config = enabled && session?.user?.id ? getEaselEmbedConfig(session.user.id) : null;
  return <div className="ans-product-container py-6 sm:py-10">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><Link className="ans-text-link mb-3 w-fit" href="/workspace"><ArrowLeft className="size-4" aria-hidden="true" />{t("back")}</Link>
        <h1 className="flex items-center gap-3 text-2xl font-semibold sm:text-3xl"><PanelsTopLeft className="size-7 text-primary" aria-hidden="true" />{t("title")}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{t("body")}</p>
      </div>
      <a className="ans-text-link text-sm" href="https://github.com/ZJU-REAL/Easel" target="_blank" rel="noopener noreferrer">{t("source")}<ExternalLink className="size-4" aria-hidden="true" /></a>
    </div>
    {config && session?.user?.id ? <><details className="mb-5 rounded-xl border bg-muted/20 p-4"><summary className="cursor-pointer text-sm font-medium">{t("setupTitle")}</summary><p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{t("setupBody")}</p></details><EaselWorkspace {...config} userId={session.user.id} /></> : <Card>
      <CardHeader><CardTitle>{t("pendingTitle")}</CardTitle></CardHeader>
      <CardContent><p className="max-w-3xl text-sm leading-7 text-muted-foreground">{t("pendingBody")}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{["discover", "plan", "create", "publish", "review"].map(step => <div key={step} className="rounded-xl border p-4"><h2 className="text-sm font-semibold">{t(`steps.${step}.title`)}</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">{t(`steps.${step}.body`)}</p></div>)}</div>
        <Button asChild variant="outline" className="mt-6"><Link href="/workspace">{t("back")}</Link></Button>
      </CardContent>
    </Card>}
    <p className="mt-5 text-xs leading-6 text-muted-foreground">{t("costs")}</p>
  </div>;
}
