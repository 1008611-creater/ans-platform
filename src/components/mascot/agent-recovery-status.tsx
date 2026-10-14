"use client";
import { useTranslations } from "next-intl";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { getRunModel } from "@/lib/run-models";
import type { RecoverableAgentTurn } from "./use-agent-recovery";
export function AgentRecoveryStatus({ turns, onCheck }: { turns: RecoverableAgentTurn[]; onCheck: (requestId: string) => Promise<void> }) {
  const t = useTranslations("companion");
  if (!turns.length) return null;
  return <section className="ans-agent-turn" aria-label={t("agentRecoveredTurns")}>
    <p className="text-xs leading-5 text-muted-foreground">{t("agentRecoveryHint")}</p>
    <ul className="space-y-3">{turns.map(turn => {
      const settled = turn.checked && turn.receipts.length > 0 && turn.receipts.every(item => ["SETTLED", "RELEASED"].includes(item.state) && item.settledPoints !== null);
      const points = settled ? turn.receipts.reduce((sum, item) => sum + item.settledPoints!, 0) : null;
      return <li key={turn.requestId} className="space-y-1 text-xs">
        <p>{getRunModel(turn.model)?.label} · <time dateTime={new Date(turn.submittedAt).toISOString()}>{new Date(turn.submittedAt).toLocaleString()}</time></p>
        <p role="status">{turn.checking ? t("agentReceiptChecking") : turn.error ? t("agentRecoveryUnavailable") : points !== null ? t("agentUsedPoints", { points: new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(points) }) : turn.checked && !turn.receipts.length ? t("agentRecoveryNoReceipt") : t("agentReceiptPending")}</p>
        {!settled && <button className="underline underline-offset-2" type="button" disabled={turn.checking} onClick={() => void onCheck(turn.requestId)}>{t("agentCheckReceipt")}</button>}
      </li>;
    })}</ul>
    <WorkspaceLink className="text-xs underline underline-offset-2" href="/workspace/credits">{t("agentBillingDetails")}</WorkspaceLink>
  </section>;
}
