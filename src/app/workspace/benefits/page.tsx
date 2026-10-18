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
            className="space-y-4 rounded-2xl border border-emerald-600/30 bg-emerald-500/5 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
                <Badge className="bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-400 dark:text-slate-950">
                  {isEn ? "Onboarding Guide" : "新手引导 · 怎么免费领算力积分？"}
                </Badge>
                <span className="font-semibold text-foreground">
                  {isEn
                    ? "Not signed in yet (Live Balance: 0 pts) · Try the claw machine below or sign in to claim real points"
                    : "当前未登录（真实账户余额为 0）· 下方抓娃娃机支持免登录试玩手感，登录后积分直接入账"}
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
            </div>
            <div className="grid gap-4 border-t border-emerald-600/20 pt-4 text-[13px] leading-relaxed sm:grid-cols-3 sm:divide-x sm:divide-emerald-600/20">
              <div className="space-y-1">
                <div className="font-bold text-foreground">01 · 填 30 秒问卷领 50 积分</div>
                <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">登录账号后，在页面下半部分填写简短的新手破冰问卷，50 积分（价值 ¥5）立即到账。</p>
              </div>
              <div className="space-y-1 sm:pl-4">
                <div className="font-bold text-foreground">02 · 签到与抓娃娃再领 50~100 分</div>
                <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">完成右侧每日签到和阅读任务可拿免费抓娃娃币，每次下爪必得 10~1000 积分奖励。</p>
              </div>
              <div className="space-y-1 sm:pl-4">
                <div className="font-bold text-foreground">03 · 在工作台与工具市场直接用</div>
                <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">领到的积分可在个人工作台调用 DeepSeek / GPT 模型，或在市场兑换论文润色、周报生成等工具。</p>
              </div>
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
          aria-label="3D 小龙展台与基因养成舱"
          className="group rounded-3xl border border-border bg-card p-5 shadow-xs"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-foreground">
            <span>🥚 {isEn ? "Expand 3D Dino Appearance & Wardrobe Pod (Optional)" : "展开小恐龙外观与换装设置（可选）"}</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground group-open:hidden">
              {isEn ? "Click to expand ↓" : "点击展开 ↓"}
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
