import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { AdminComputeBenefits } from "@/components/admin/compute-benefits";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("product.computeBenefits");
  return { title: t("adminTitle"), robots: { index: false, follow: false } };
}
export default async function BenefitsAdminPage() {
  if (process.env.ANS_COMPUTE_BENEFITS_ENABLED !== "1") notFound();
  const actor = await requireAdminPermission("USERS_MANAGE");
  if (!actor) redirect("/");
  const t = await getTranslations("product.computeBenefits");
  return <main className="container space-y-6 py-8"><Link href="/admin" className="text-sm text-muted-foreground">{t("adminBack")}</Link><header><h1 className="text-3xl font-semibold">{t("adminTitle")}</h1><p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{t("adminDescription")}</p></header><AdminComputeBenefits actorId={actor.userId} /></main>;
}
