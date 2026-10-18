import { getTranslations } from "next-intl/server";
import { AgriWall } from "@/components/competitions/agri-wall";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("agriWall");
  return { title: `${t("title")} · ANS`, description: t("description") };
}

export default function AgriHackathonWallPage() {
  return (
    <div className="ans-product-shell">
      <div className="ans-product-container ans-page-content space-y-8 py-8 sm:py-12">
        <AgriWall />
      </div>
    </div>
  );
}
