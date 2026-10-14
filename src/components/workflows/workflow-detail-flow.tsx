import { getTranslations } from "next-intl/server";
import type { WorkflowDefinition } from "@/contracts/workflow";
import { validateWorkflow } from "@/domain/workflows/graph";
import { ArrowDown, ChevronDown, GitBranch } from "lucide-react";
import styles from "./workflow-detail.module.css";

/** The engine's topological order, with incoming edges visible, never array order. */
export async function WorkflowDetailFlow({ definition }: { definition: WorkflowDefinition }) {
  const t = await getTranslations("product.workflowDetail");
  const validation = validateWorkflow(definition);
  if (!validation.ok) return null;
  const byId = new Map(definition.nodes.map(node => [node.id, node]));
  const nodes = validation.executionOrder.map(id => byId.get(id)!);
  return (
    <section id="workflow-process" className={styles.section} aria-labelledby="workflow-process-title">
      <div className={styles.sectionHeading}>
        <div><p className={styles.kicker}>{t("processEyebrow")}</p><h2 id="workflow-process-title">{t("processTitle")}</h2></div>
        <span className={styles.smallMeta}>{t("stepCount", { count: nodes.length })}</span>
      </div>
      <p className={styles.sectionIntro}>{t("processExplanation")}</p>
      <ol className={styles.flow}>
        {nodes.map((node, index) => {
          const dependencies = definition.edges.filter(edge => edge.to === node.id).map(edge => byId.get(edge.from)!);
          return <li key={node.id} className={styles.flowStep}>
            <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}><h3>{node.label}</h3><span className={styles.nodeType}>{t(`nodeTypes.${node.type}`)}</span></div>
              <p>{t(`nodeDescriptions.${node.type}`)}</p>
              <div className={styles.dependencies}>
                {dependencies.length ? <><ArrowDown size={13} aria-hidden="true" /><span>{t("receivesFrom")}</span>{dependencies.map(dependency => <span key={dependency.id} className={styles.dependency}>{dependency.label}</span>)}</> : <span>{t("receivesInput")}</span>}
              </div>
            </div>
          </li>;
        })}
      </ol>
      <details className={styles.technical}>
        <summary><GitBranch size={16} aria-hidden="true" />{t("technicalDetails")}<ChevronDown className={styles.disclosure} size={15} aria-hidden="true" /></summary>
        <ul className={styles.nodeDetails}>{nodes.map(node => <li key={node.id}><code>{node.id}</code><span>{t("nodeLimits", { seconds: Math.round(node.timeoutMs / 1000), retries: node.maxRetries })}</span></li>)}</ul>
        {definition.edges.length > 0 && <div className={styles.edgeDetails}><h3>{t("connections")}</h3><ul>{definition.edges.map(edge => <li key={edge.id}><code>{edge.from} → {edge.to}</code></li>)}</ul></div>}
      </details>
    </section>
  );
}
