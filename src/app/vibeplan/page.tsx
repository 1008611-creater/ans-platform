import { getTranslations } from "next-intl/server";
import { VibePlan } from "@/components/workspace/vibeplan";
import { getPlanSalesReadiness } from "@/server/billing/plan-readiness";

export async function generateMetadata() {
  const t = await getTranslations("product.vibeplan");
  return { title: t("pageTitle"), description: t("description") };
}

export default function VibePlanPage() {
  return <VibePlan readiness={getPlanSalesReadiness()} />;
}
