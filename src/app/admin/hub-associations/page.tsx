import {getTranslations} from "next-intl/server";
import {WorkspaceLink} from "@/components/providers/workspace-navigation";
import {WorkflowHubReviewQueue} from "@/components/workflows/workflow-hub-associations";
export const dynamic="force-dynamic";
export async function generateMetadata(){const t=await getTranslations("hubs.associations");return{title:t("queueTitle")};}
export default async function HubReviewPage(){const t=await getTranslations("hubs.associations");return <div className="container max-w-5xl space-y-6 py-8"><WorkspaceLink className="text-sm underline" href="/admin">{t("backAdmin")}</WorkspaceLink><h1 className="text-3xl font-semibold">{t("queueTitle")}</h1><p className="max-w-prose text-sm leading-7 text-muted-foreground">{t("queueHint")}</p><WorkflowHubReviewQueue/></div>;}
