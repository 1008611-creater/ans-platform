import { getTranslations } from "next-intl/server";
import { VibePlan } from "@/components/workspace/vibeplan";

export async function generateMetadata() {
  const t = await getTranslations("product.vibeplan");
  return { title: t("pageTitle"), description: t("description") };
}

export default function VibePlanPage() {
  return <VibePlan />;
}
