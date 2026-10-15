import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AgriWallSubmit } from "@/components/competitions/agri-wall";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const t = await getTranslations("agriWall"); return { title: t("submitTitle") }; }
export default async function AgriWallSubmitPage() { const t = await getTranslations("agriWall"); return <div className="ans-product-shell"><div className="ans-product-container ans-page-content max-w-4xl space-y-6"><Button asChild variant="ghost"><Link href="/explore?category=competition&subcategory=agri-wall">{t("backWall")}</Link></Button><header><p className="mb-3 text-sm font-medium text-primary">{t("eyebrow")}</p><h1 className="ans-page-title">{t("submitTitle")}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{t("submitDescription")}</p></header><AgriWallSubmit /></div></div>; }
