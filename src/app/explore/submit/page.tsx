import { getTranslations } from "next-intl/server";
import { marketPageUser } from "@/server/marketplace/access";
import { MarketFrame } from "@/components/marketplace/frame";
import { ListingEditor } from "@/components/marketplace/listing-editor";
export default async function SubmitProjectPage() {
  await marketPageUser("/explore/submit");
  const t = await getTranslations("product.realProject");
  return <MarketFrame title={t("submit")} description={t("submitBody")}><ListingEditor share /></MarketFrame>;
}
