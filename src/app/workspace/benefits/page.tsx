import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { ComputeBenefits } from "@/components/workspace/compute-benefits";
import { ComputeQuestArcade } from "@/components/workspace/claw-arcade-pod";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("product.computeBenefits");
  return { title: t("title"), robots: { index: false, follow: false } };
}
export default async function BenefitsPage() {
  if (process.env.ANS_COMPUTE_BENEFITS_ENABLED !== "1") notFound();
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fworkspace%2Fbenefits");
  return <div className="ans-product-shell"><div className="ans-product-container space-y-8 py-8 sm:py-12"><ComputeBenefits actorId={session.user.id} /><ComputeQuestArcade actorId={session.user.id} /></div></div>;
}
