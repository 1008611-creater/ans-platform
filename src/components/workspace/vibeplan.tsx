"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, CalendarDays, Ticket, Coins, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import styles from "./vibeplan.module.css";

const PERIODS = ["week", "month", "quarter"] as const;

/** The selected period previews a confirmed direction, never a sellable subscription. */
export function VibePlan() {
  const t = useTranslations("product.vibeplan");
  return <div className={`ans-product-shell ${styles.shell}`}><div className={`ans-product-container ${styles.container}`}>
    <nav className={styles.topline} aria-label={t("navigation")}>
      <Link href="/workspace/credits" className={styles.back}><ArrowLeft className="size-4" aria-hidden="true" />{t("back")}</Link>
      <span className={styles.status}><CircleDashed className="size-3.5" aria-hidden="true" />{t("status")}</span>
    </nav>
    <header className={styles.heading}>
      <p className={styles.eyebrow}>ANS / VIBEPLAN</p>
      <h1>VibePlan<span>{t("headline")}</span></h1>
      <p className={styles.description}>{t("description")}</p>
    </header>
    <Tabs defaultValue="month" className={styles.plans}>
      <div className={styles.selection}>
        <div><h2>{t("choosePeriod")}</h2><p>{t("periodHelp")}</p></div>
        <TabsList className={styles.tabs} aria-label={t("choosePeriod")}>{PERIODS.map(period => <TabsTrigger key={period} value={period}>{t(`periods.${period}.label`)}</TabsTrigger>)}</TabsList>
      </div>
      {PERIODS.map(period => <TabsContent key={period} value={period} className={styles.content}>
        <section className={styles.pass} aria-label={t(`periods.${period}.label`)}>
          <div className={styles.passTop}><Ticket className="size-6" aria-hidden="true" /><span>{t("previewLabel")}</span></div>
          <div className={styles.passIdentity}><p>VibePlan</p><h3>{t(`periods.${period}.label`)}</h3><p className={styles.passCaption}>{t(`periods.${period}.caption`)}</p></div>
          <div className={styles.passFooter}><span>{t("status")}</span><CalendarDays className="size-5" aria-hidden="true" /></div>
        </section>
        <section className={styles.details} aria-labelledby={`vibeplan-${period}-heading`}>
          <div className={styles.detailHeading}><p>{t("subscriptionDirection")}</p><h2 id={`vibeplan-${period}-heading`}>{t(`periods.${period}.title`)}</h2><p>{t(`periods.${period}.description`)}</p></div>
          <dl className={styles.terms}>{["price", "quota", "benefits", "renewal"].map(key => <div key={key}><dt>{t(`terms.${key}`)}</dt><dd>{t("notFinalized")}</dd></div>)}</dl>
          <div className={styles.actions}><Button disabled size="lg">{t("notAvailable")}</Button><p>{t("previewNote")}</p></div>
        </section>
      </TabsContent>)}
    </Tabs>
    <section className={styles.bridge} aria-labelledby="vibeplan-current-option">
      <div><p className={styles.eyebrow}>{t("availableNow")}</p><h2 id="vibeplan-current-option">{t("voucherTitle")}</h2><p>{t("voucherDescription")}</p></div>
      <Button asChild variant="outline"><Link href="/workspace/credits"><Coins className="size-4" aria-hidden="true" />{t("voucherAction")}<ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
    </section>
    <section className={styles.faq} aria-labelledby="vibeplan-faq-heading"><h2 id="vibeplan-faq-heading">{t("faqTitle")}</h2><div>{["difference", "payment", "announcements"].map(key => <details key={key}><summary>{t(`faq.${key}.question`)}</summary><p>{t(`faq.${key}.answer`)}</p></details>)}</div></section>
  </div></div>;
}
