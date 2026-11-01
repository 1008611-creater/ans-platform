import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DinoAdoptionPod } from "@/components/mascot/dino-adoption-pod";
import { ComputeBenefits } from "@/components/workspace/compute-benefits";
import { ComputeQuestArcade } from "@/components/workspace/claw-arcade-pod";
import type { ComputeBenefitsSummary } from "@/contracts/compute-benefits";
import { getComputeBenefits } from "@/server/compute-benefits/service";
import { getArcadeServerBalance } from "@/server/compute-benefits/arcade";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("product.computeBenefits");
  return { title: t("title"), robots: { index: false, follow: false } };
}

const GUEST_BENEFITS_PREVIEW: ComputeBenefitsSummary = {
  enabled: true,
  questionnaireVersion: "onboarding-v1",
  applicationVersion: "agri-v1",
  onboarding: null,
  application: null,
  activity: [],
  grants: [],
};

export default async function BenefitsPage() {
  if (process.env.ANS_COMPUTE_BENEFITS_ENABLED === "0") notFound();
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  const isEn = locale.startsWith("en");
  const userId = session?.user?.id ?? null;
  const [initialBenefits, arcadeBalance] = userId
    ? await Promise.all([
        getComputeBenefits(userId).catch(() => undefined),
        getArcadeServerBalance(userId).catch(() => null),
      ])
    : [GUEST_BENEFITS_PREVIEW, null];

  return (
    <div className="ans-product-shell">
      <div className="ans-product-container space-y-6 py-6 sm:py-10">
        {!userId && (
          <section
            data-testid="benefits-guest-banner"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-600/30 bg-emerald-500/5 px-5 py-3.5"
          >
            <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
              <Badge className="bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-400 dark:text-slate-950">
                {isEn ? "Guest Trial" : "📖 免登录试玩"}
              </Badge>
              <span className="font-semibold text-foreground">
                {isEn
                  ? "Sign in to get $5 of DeepSeek credit from the survey and keep your claw machine rewards"
                  : "登录后填新手问卷领 $5 DeepSeek 额度，抓娃娃奖励也会存进账户"}
              </span>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button asChild size="sm" className="h-8 rounded-xl bg-emerald-700 px-3.5 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-400 dark:text-slate-950">
                <Link href="/login?callbackUrl=%2Fworkspace%2Fbenefits">
                  {isEn ? "Sign in & Claim →" : "登录领真实积分 →"}
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 rounded-xl px-3.5 text-xs font-semibold">
                <Link href="/workspace/credits">{isEn ? "Compute Center" : "查看算力账本"}</Link>
              </Button>
            </div>
          </section>
        )}

        <ComputeQuestArcade
          actorId={userId ?? "guest-preview"}
          initialServerPoints={userId ? (arcadeBalance ? arcadeBalance.balancePoints : undefined) : 0}
        />

        <ComputeBenefits actorId={userId ?? "guest-preview"} initialData={initialBenefits} />

        <details
          id="ans-dragon-sanctuary-showcase"
          aria-label="3D 小恐龙展台与养成舱"
          className="group rounded-3xl border border-border bg-card p-5 shadow-xs"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-foreground">
            <span>🥚 {isEn ? "3D Dino Appearance & Wardrobe Pod" : "小恐龙外观与换装设置"}</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground group-open:hidden">
              ↓
            </span>
          </summary>
          <div className="mt-4">
            <DinoAdoptionPod compact />
          </div>
        </details>
      </div>
    </div>
  );
}
