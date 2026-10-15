import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, FileText, Braces, AlignLeft } from "lucide-react";
import type { WorkflowPresentation } from "@/domain/workflows/experience";
import styles from "./workflow-showcase.module.css";

export async function WorkflowShowcase({ title, summary, href, version, presentation, author, useCount, marketPath }: {
  title: string;
  summary: string | null;
  href: string;
  version: number;
  presentation?: WorkflowPresentation;
  author?: string;
  useCount?: number;
  marketPath?: string | null;
}) {
  const t = await getTranslations("workflowCatalog");
  const format = presentation?.output.format ?? "text";
  const Icon = format === "json" ? Braces : format === "markdown" ? FileText : AlignLeft;
  const stages = presentation?.stages ?? [];
  return <article className={styles.showcase}>
    <Link href={href} className={styles.main}>
      <div className={styles.stage}>
        <div className={styles.stageTop}><span>{t("structure")}</span><span>v{version}</span></div>
        <div className={styles.outcome}><Icon size={26} strokeWidth={1.5} aria-hidden="true" /><p>{presentation?.output.label ?? title}</p><span>{t(`formats.${format}`)}</span></div>
        <ol className={styles.steps} aria-label={t("stages")}>
          {stages.slice(0, 3).map((stage, index) => <li key={index}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{stage.title}</span></li>)}
          {stages.length > 3 && <li className={styles.remaining}>{t("moreStages", { count: stages.length - 3 })}</li>}
        </ol>
      </div>
      <div className={styles.caption}>
        <div className={styles.title}><h3>{title}</h3><ArrowUpRight size={18} aria-hidden="true" /></div>
        {summary && <p className={styles.summary}>{summary}</p>}
        <div className={styles.meta}>{author && <span>{author}</span>}{presentation && <span>{t("nodes", { count: presentation.nodeCount })}</span>}{typeof useCount === "number" && <span>{t("uses", { count: useCount })}</span>}<span>{t("start")}</span></div>
      </div>
    </Link>
    {marketPath && <Link href={marketPath} className={styles.market}>{t("market")}<ArrowUpRight size={14} aria-hidden="true" /></Link>}
  </article>;
}
