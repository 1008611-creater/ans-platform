import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { ComputeBenefits } from "@/components/workspace/compute-benefits";
import { ComputeQuestArcade } from "@/components/workspace/claw-arcade-pod";
import { getComputeBenefits } from "@/server/compute-benefits/service";
import { getArcadeServerBalance } from "@/server/compute-benefits/arcade";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("product.computeBenefits");
  return { title: t("title"), robots: { index: false, follow: false } };
}
export default async function BenefitsPage() {
  if (process.env.ANS_COMPUTE_BENEFITS_ENABLED !== "1") notFound();
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fworkspace%2Fbenefits");
  const [initialBenefits, arcadeBalance] = await Promise.all([
    getComputeBenefits(session.user.id).catch(() => undefined),
    getArcadeServerBalance(session.user.id).catch(() => null),
  ]);
  return (
    <div className="ans-product-shell">
      <div className="ans-product-container space-y-8 py-8 sm:py-12">
        <ComputeQuestArcade
          actorId={session.user.id}
          initialServerPoints={arcadeBalance ? arcadeBalance.balancePoints : undefined}
        />
        <ComputeBenefits actorId={session.user.id} initialData={initialBenefits} />
      </div>
    </div>
  );
}
