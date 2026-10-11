import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { quotaAdminOverview } from "@/server/quota/operations";
import { CreditsPanel } from "@/components/admin/credits-panel";
export const dynamic = "force-dynamic";
export default async function CreditsAdminPage() {
 if (!await requireAdminPermission("USERS_MANAGE")) redirect("/");
 const [t, overview] = await Promise.all([getTranslations("product.quotaAdmin"), quotaAdminOverview()]);
 return <main className="container space-y-7 py-8"><header><h1 className="text-3xl font-semibold">{t("title")}</h1><p className="mt-3 text-muted-foreground">{t("description")}</p></header><CreditsPanel overview={overview}/></main>;
}
