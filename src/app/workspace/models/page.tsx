import { getTranslations } from "next-intl/server";
import { ModelPlaza } from "@/components/workspace/model-plaza";
import { readModelPlazaCatalog } from "@/server/integrations/model-plaza";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("product.modelPlaza");
  return { title: t("title"), description: t("description") };
}
export default async function ModelsPage() {
  return <ModelPlaza catalog={await readModelPlazaCatalog()} />;
}
