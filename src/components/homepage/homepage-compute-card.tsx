import Link from "next/link";
import { Activity, ArrowRight, CheckCircle2, Info, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { QuotaPoolBannerState } from "@/server/quota-pool/service";
import { Button } from "@/components/ui/button";
import { QuotaClaimButton } from "@/components/quota-claim-button";
import { HomepageCtaLink } from "@/components/homepage/homepage-cta-link";

function formatPoints(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export async function HomepageComputeCard({
  state,
  locale,
}: {
  state: QuotaPoolBannerState | null;
  locale: string;
}) {
  const t = await getTranslations("homepageNext");

  if (!state) {
    return (
      <section className="rounded-2xl border border-dashed bg-card p-5 text-sm text-muted-foreground" aria-label={t("computeTitle")}>
        <div className="flex items-center gap-2"><Info className="h-4 w-4" aria-hidden="true" />{t("computeUnavailable")}</div>
      </section>
    );
  }

  const remaining = formatPoints(state.remaining, locale);
  const total = formatPoints(state.total, locale);
  const perUser = formatPoints(state.perUserPoints, locale);
  const percent = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(state.percent);

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-lg shadow-black/[0.04] sm:p-6" aria-labelledby="homepage-compute-title">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-primary">
            <Activity className="h-4 w-4" aria-hidden="true" />
            <span>{t("computeEyebrow")}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              {t("computeAvailable")}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="homepage-compute-title" className="text-3xl font-semibold tracking-tight">{remaining}</h2>
            <span className="text-sm text-muted-foreground">{t("computeRemaining", { remaining, total })}</span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("computeDescription", { points: perUser })}
          </p>
          <div className="mt-4 max-w-2xl">
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(state.percent)} aria-label={t("computeProgressLabel")}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${state.percent}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>{t("computeClaimed", { claimed: formatPoints(state.claimed, locale) })}</span>
              <span>{percent}%</span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {state.exhausted ? (
            <Button disabled variant="outline" size="lg">{t("computeExhausted")}</Button>
          ) : state.claimState === "anonymous" ? (
            <Button asChild size="lg">
              <HomepageCtaLink href="/login?callbackUrl=%2Ftemplates" eventName="compute_login">
                <Zap className="me-2 h-4 w-4" aria-hidden="true" />
                {t("computeLoginAction")}
              </HomepageCtaLink>
            </Button>
          ) : state.claimState === "claimed" ? (
            <div className="flex flex-col items-start gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{t("computeClaimedState")}</span>
              <Button variant="outline" asChild><Link href="/templates">{t("computeRunAction")}<ArrowRight className="ms-1.5 h-4 w-4" aria-hidden="true" /></Link></Button>
            </div>
          ) : (
            <QuotaClaimButton points={state.perUserPoints} />
          )}
        </div>
      </div>
    </section>
  );
}
