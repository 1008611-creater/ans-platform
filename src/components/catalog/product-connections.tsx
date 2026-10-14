"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, FolderOpen, Package, Play, ShoppingBag } from "lucide-react";
import { WorkspaceLink as Link } from "@/components/providers/workspace-navigation";
import type { ProductConnection, ProductConnections as Connections } from "@/contracts/product-connections";
import styles from "./product-connections.module.css";

const icons = { project: FolderOpen, workflow: Play, service: ShoppingBag, resource: Package, "workflow-offer": Play };
const actionKeys = { project: "actions.project", workflow: "actions.workflow", service: "actions.service", resource: "actions.resource", "workflow-offer": "actions.workflowOffer" };

/** These are navigation links to verified public snapshots, never run/order commands. */
export function ProductConnectionsSection({ connections, compact = false }: { connections: Connections; compact?: boolean }) {
  const t = useTranslations("product.connections");
  const groups = [
    { key: "workflows", entries: connections.workflows },
    { key: "offers", entries: connections.offers },
    { key: "projects", entries: connections.projects },
  ].filter(group => group.entries.length > 0);
  if (groups.length === 0) return null;

  function connectionLink(connection: ProductConnection) {
    const Icon = icons[connection.kind];
    const executes = connection.kind === "workflow" || connection.kind === "workflow-offer";
    return <Link key={`${connection.kind}:${connection.slug}`} href={connection.href} className={styles.link}>
      <Icon aria-hidden="true" size={18} className={styles.icon} />
      <span className={styles.copy}>
        <span className={styles.linkHeading}><strong>{connection.title}</strong>{connection.version !== undefined && <span className={styles.version}>{t("version", { version: connection.version })}</span>}</span>
        {!compact && connection.summary && <span className={styles.summary}>{connection.summary}</span>}
        <span className={styles.action}>{t(actionKeys[connection.kind])}
          {executes ? <span className={styles.meta}>{t("confirmCompute")}</span> : connection.pricePoints !== undefined && <span className={styles.meta}>{connection.pricePoints === 0 ? t("free") : t("price", { points: connection.pricePoints })}</span>}
        </span>
      </span>
      <ArrowRight size={16} className={styles.arrow} aria-hidden="true" />
    </Link>;
  }

  return <section className={compact ? styles.compact : styles.section} aria-label={t("title")}>
    {!compact && <header className={styles.heading}><h2>{t("title")}</h2><p>{t("navigationNote")}</p></header>}
    <div className={styles.groups}>{groups.map(group => <div key={group.key} className={styles.group}>
      {!compact && <h3>{t(`groups.${group.key}`)}</h3>}
      <div className={styles.links}>{group.entries.map(connectionLink)}</div>
    </div>)}</div>
  </section>;
}
