"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, Coins, CircleDashed, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlanSku, FREE_PLAN_TARGET_BENEFITS, PLAN_PERIODS, PLAN_TIERS, type PlanPeriod, type PlanTier } from "@/domain/billing/plan-catalog";
import styles from "./vibeplan.module.css";

import type { PlanSalesReadiness } from "@/domain/billing/plan-readiness";

const COMPARISON_ROWS = ["discovery", "workflows", "projects", "storage", "concurrency", "history", "delivery", "export"] as const;
const FAQ_KEYS = ["difference", "ratio", "expiry", "renewal", "ownership", "failure", "market"] as const;

/** Approved prices are visible. Only the server can establish sales readiness. */
export function VibePlan({ readiness }: { readiness: PlanSalesReadiness }) {
  const t = useTranslations("product.vibeplan");
  const locale = useLocale();
  const number = new Intl.NumberFormat(locale);
  const price = (minor: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(minor / 100);

  function comparisonValue(row: typeof COMPARISON_ROWS[number], tier: "free" | PlanTier) {
    const benefits = tier === "free" ? FREE_PLAN_TARGET_BENEFITS : getPlanSku(tier, "month").targetBenefits;
    switch (row) {
      case "projects": return t("projectValue", { value: benefits.activeProjects });
      case "storage": return t("storageValue", { value: benefits.storageGb });
      case "concurrency": return t("concurrencyValue", { value: benefits.concurrentTasks });
      case "history": return t("historyValue", { value: benefits.automaticHistoryDays });
      default: return t(`comparison.${row}.${tier}`);
    }
  }

  function PlanOption({ tier, period }: { tier: PlanTier; period: PlanPeriod }) {
    const sku = getPlanSku(tier, period);
    return <article className={`${styles.plan} ${tier === "plan" ? styles.featured : ""}`} aria-labelledby={`plan-${tier}-${period}`}>
      <div className={styles.planTop}><h3 id={`plan-${tier}-${period}`}>{t(`tiers.${tier}.name`)}</h3><span>{t(tier === "plan" ? "personal" : "creator")}</span></div>
      <p className={styles.planDescription}>{t(`tiers.${tier}.description`)}</p>
      <p className={styles.price}><strong>{price(sku.priceMinor)}</strong><span>{t("duration", { days: sku.durationDays })}</span></p>
      <p className={styles.quota}><Coins className="size-4" aria-hidden="true" />{t("includedPoints", { points: number.format(sku.points) })}</p>
      <p className={styles.grants}>{period === "quarter"
        ? t("quarterGrants", { points: number.format(sku.grants[0].points) })
        : t("singleGrant", { days: sku.grants[0].validForDays })}</p>
      <ul className={styles.highlights}>{["workflow", "continuity", "delivery"].map(key => <li key={key}><Check className="size-4" aria-hidden="true" /><span>{t(`tiers.${tier}.${key}`)}</span></li>)}</ul>
      <div className={styles.planAction}><Button disabled size="lg" aria-describedby={`plan-${tier}-${period}-note`}>{t("notAvailable")}</Button><p id={`plan-${tier}-${period}-note`}>{t("previewNote")}</p></div>
    </article>;
  }

  return <div className={`ans-product-shell ${styles.shell}`}><div className={`ans-product-container ${styles.container}`}>
    <nav className={styles.topline} aria-label={t("navigation")}>
      <Link href="/workspace/credits" className={styles.back}><ArrowLeft className="size-4" aria-hidden="true" />{t("back")}</Link>
      <span className={styles.status}><CircleDashed className="size-3.5" aria-hidden="true" />{t("status")}</span>
    </nav>
    <header className={styles.heading}><p className={styles.eyebrow}>ANS / VIBEPLAN</p><h1>{t("headline")}</h1><p className={styles.description}>{t("description")}</p><p className={styles.principle}><ShieldCheck className="size-4" aria-hidden="true" />{t("principle")}</p></header>
    <Tabs defaultValue="month" className={styles.plans}>
      <div className={styles.selection}><div><h2>{t("choosePeriod")}</h2><p>{t("periodHelp")}</p></div><TabsList className={styles.tabs} aria-label={t("choosePeriod")}>{PLAN_PERIODS.map(period => <TabsTrigger key={period} value={period}>{t(`periods.${period}.label`)}</TabsTrigger>)}</TabsList></div>
      {PLAN_PERIODS.map(period => <TabsContent key={period} value={period} className={styles.content}>{PLAN_TIERS.map(tier => <PlanOption key={tier} tier={tier} period={period} />)}</TabsContent>)}
    </Tabs>
    <section className={styles.readiness} aria-labelledby="vibeplan-readiness"><div><p className={styles.eyebrow}>{t("approvedLabel")}</p><h2 id="vibeplan-readiness">{t("readinessTitle")}</h2><p>{t("readinessDescription")}</p></div><ul>{readiness.blockers.map(blocker => <li key={blocker.code}><CircleDashed className="size-4" aria-hidden="true" /><span>{t.has(`blockers.${blocker.code}`) ? t(`blockers.${blocker.code}`) : t("blockerFallback")}</span></li>)}</ul></section>
    <section className={styles.comparison} aria-labelledby="vibeplan-comparison"><div className={styles.sectionHeading}><h2 id="vibeplan-comparison">{t("comparisonTitle")}</h2><p>{t("comparisonNote")}</p></div><div className={styles.tableWrap}><table><caption className="sr-only">{t("comparisonTitle")}</caption><thead><tr><th scope="col">{t("capability")}</th><th scope="col">{t("freeName")}</th><th scope="col">VibePlan</th><th scope="col">VibePlan Pro</th></tr></thead><tbody>{COMPARISON_ROWS.map(row => <tr key={row}><th scope="row">{t(`comparison.${row}.label`)}</th>{(["free", ...PLAN_TIERS] as const).map(tier => <td key={tier}>{comparisonValue(row, tier)}</td>)}</tr>)}</tbody></table></div></section>
    <section className={styles.bridge} aria-labelledby="vibeplan-current-option"><div><p className={styles.eyebrow}>{t("availableNow")}</p><h2 id="vibeplan-current-option">{t("voucherTitle")}</h2><p>{t("voucherDescription")}</p><p className={styles.exchange}>{t("exchange")}</p></div><Button asChild variant="outline"><Link href="/workspace/credits"><Coins className="size-4" aria-hidden="true" />{t("voucherAction")}<ArrowRight className="size-4" aria-hidden="true" /></Link></Button></section>
    <section className={styles.faq} aria-labelledby="vibeplan-faq-heading"><h2 id="vibeplan-faq-heading">{t("faqTitle")}</h2><div>{FAQ_KEYS.map(key => <details key={key}><summary>{t(`faq.${key}.question`)}</summary><p>{t(`faq.${key}.answer`)}</p></details>)}</div></section>
  </div></div>;
}
