"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, CircleAlert, Search, ArrowUpRight } from "lucide-react";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { getRunModel, RUN_MODEL_METERING } from "@/lib/run-models";
import type { useCompanionAgent } from "./use-companion-agent";
const names = new Set([
  "current_page",
  "site_help",
  "search_projects",
  "search_workflows",
  "my_projects",
  "my_tasks",
  "credits",
  "claim_daily_benefit",
  "play_claw_arcade",
  "search_market",
  "scaffold_project_draft",
  "redeem_market_item",
]);
const toolKey = (name: string | null) => name && names.has(name) ? `agentTool.${name}` : "agentTool.generic";
const errorKeys: Record<string, string> = {
  UNAUTHORIZED: "signIn", ACCOUNT_CHANGED: "accountChanged", ACCOUNT_UNAVAILABLE: "accountChanged", QUOTE_EXPIRED: "quoteExpired", QUOTE_CHANGED: "quoteExpired",
  INSUFFICIENT_QUOTA: "balance", QUOTA_INSUFFICIENT: "balance", RATE_LIMITED: "rateLimit", TOO_MANY_ACTIVE_REQUESTS: "rateLimit",
  AGENT_BUDGET_LIMIT: "limit", AGENT_TOOL_LIMIT: "limit", REQUEST_ALREADY_STARTED: "alreadyStarted", REQUEST_ALREADY_RUNNING: "alreadyStarted", REQUEST_HASH_CONFLICT: "alreadyStarted",
  REQUEST_CONFLICT: "reservationFailed", GATEWAY_RESERVATION_FAILED: "reservationFailed",
  UPSTREAM_REJECTED: "modelUnavailable", UPSTREAM_CAPACITY_UNAVAILABLE: "capacity", BILLING_PENDING: "pending", UPSTREAM_RESULT_UNCERTAIN: "pending", RESPONSE_INTERRUPTED: "interrupted", AGENT_OUTPUT_INCOMPLETE: "incomplete",
};
export function AgentTurnStatus({ agent }: { agent: ReturnType<typeof useCompanionAgent> }) {
  const t = useTranslations("companion");
  // Defaults to checked: the member confirms once and is not asked again.
  const [rememberConsent, setRememberConsent] = useState(true);
  if (agent.phase === "idle") return null;
  const pending = agent.receipts.some(item => ["RUNNING", "UNCERTAIN"].includes(item.state));
  const quotedModel = agent.quote ? getRunModel(agent.quote.model) : undefined;
  const settled = agent.phase === "complete" && agent.receipts.length > 0 && agent.receipts.every(item => item.state === "SETTLED" && item.settledPoints !== null && Number.isFinite(item.settledPoints) && item.settledPoints >= 0);
  const usedPoints = settled ? agent.receipts.reduce((sum, item) => sum + item.settledPoints!, 0) : null;
  const usedLabel = usedPoints === null ? null : new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(usedPoints);
  return <section className="ans-agent-turn" aria-label={t("agentTurn")}>
    {agent.busy && <div className="ans-agent-progress" role="status"><Search aria-hidden="true" /><span>{agent.phase === "reading" ? t(toolKey(agent.activeTool)) : t(`agentPhase.${agent.phase}`)}</span></div>}
    {!!agent.tools.length && <details className="ans-agent-tools"><summary>{t("agentSources", { count: agent.tools.length })}</summary><ul>{agent.tools.map((tool, index) => <li key={index}>{tool.ok ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}<span>{t(toolKey(tool.name))}</span><small>{t(tool.ok ? "agentReadDone" : "agentReadFailed")}</small></li>)}</ul></details>}
    {agent.quote && <div className="ans-agent-quote">
      <div className="ans-agent-quote-heading"><strong>{t("agentQuoteTitle")}</strong><span>{t("agentBillingNotice")}</span></div>
      <blockquote>{agent.question}</blockquote>
      <label><input type="checkbox" checked={agent.privateAccess} onChange={event => agent.allowPrivate(event.target.checked)} /><span>{t("agentPrivateConsent")}</span></label>
      <label><input type="checkbox" checked={rememberConsent} onChange={event => setRememberConsent(event.target.checked)} /><span>{t("agentAutoApprove")}</span></label>
      <details className="ans-agent-details"><summary>{t("agentConsentDetails")}</summary>
        {quotedModel && <p>{t("agentQuoteModel", { model: quotedModel.label, multiplier: RUN_MODEL_METERING[quotedModel.key].consumptionMultiplier })}</p>}
        <p>{t("agentModelRateNote")}</p><p>{t("agentPrivacy")}</p>
        <WorkspaceLink href="/workspace/credits">{t("agentBillingDetails")}<ArrowUpRight aria-hidden="true" /></WorkspaceLink>
      </details>
      <div className="ans-agent-quote-actions"><button type="button" onClick={() => void agent.confirm(rememberConsent)} disabled={agent.quote.balance < agent.quote.maxPoints}>{t("agentConfirm")}</button><button type="button" onClick={agent.cancelQuote}>{t("agentCancel")}</button></div>
      {agent.quote.balance < agent.quote.maxPoints && <WorkspaceLink href="/workspace/credits">{t("agentTopUp")}<ArrowUpRight aria-hidden="true" /></WorkspaceLink>}
    </div>}
    {typeof agent.autoRunCap === "number" && <div className="ans-agent-quote" role="status">
      <div className="ans-agent-quote-heading"><strong>{t("agentAutoRunTitle")}</strong><span>{t("agentBillingNotice")}</span></div>
      <p>{t("agentAutoRunNotice", { points: new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(agent.autoRunCap) })}</p>
    </div>}
    {usedLabel !== null && <div className="ans-agent-usage" role="status"><span>{t("agentUsedPoints", { points: usedLabel })}</span><WorkspaceLink href="/workspace/credits">{t("agentBillingDetails")}<ArrowUpRight aria-hidden="true" /></WorkspaceLink></div>}
    {agent.error && <p role="alert" className="ans-agent-error">{t(`agentError.${errorKeys[agent.error] ?? "unavailable"}`)}</p>}
    {agent.phase === "stopped" && <p role="status" className="ans-agent-error">{t(agent.hasTicket ? "agentStopped" : "agentStoppedBeforeExecution")}</p>}
    {agent.canRetryQuote && <div className="ans-agent-retry"><button type="button" onClick={() => void agent.retryQuote()}>{t("agentRetryQuote")}</button><small>{t("agentRetryQuoteHint")}</small></div>}
    {(pending || (["error", "stopped"].includes(agent.phase) && agent.hasTicket)) && <div className="ans-agent-receipt"><WorkspaceLink href="/workspace/credits">{t("agentBillingDetails")}<ArrowUpRight aria-hidden="true" /></WorkspaceLink>{agent.hasTicket && !agent.busy && <button className="ans-agent-recover" type="button" disabled={agent.checkingReceipts} onClick={() => void agent.refreshReceipts()}>{t(agent.checkingReceipts ? "agentReceiptChecking" : "agentCheckReceipt")}</button>}</div>}
    {agent.receiptChecked && <p className="ans-agent-receipt-note" role="status">{t(pending ? "agentReceiptPending" : "agentReceiptUpdated")}</p>}
  </section>;
}
