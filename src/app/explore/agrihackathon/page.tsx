import { getTranslations } from "next-intl/server";
import { AgriWall } from "@/components/competitions/agri-wall";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const t = await getTranslations("agriWall"); return { title: t("title"), description: t("description") }; }
export default function AgriWallPage() { return <div className="ans-product-shell"><div className="ans-product-container ans-page-content"><AgriWall /></div></div>; }
