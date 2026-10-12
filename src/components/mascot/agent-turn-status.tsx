"use client";
import { useTranslations } from "next-intl";
import { Check, CircleAlert, Square, Search, ArrowUpRight } from "lucide-react";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { getRunModel, RUN_MODEL_METERING } from "@/lib/run-models";
import type { useCompanionAgent } from "./use-companion-agent";
const names = new Set(["site_help", "search_projects", "search_workflows", "my_projects", "my_tasks", "credits"]);
const toolKey = (name: string | null) => name && names.has(name) ? `agentTool.${name}` : "agentTool.generic";
const errorKeys: Record<string, string> = {
  UNAUTHORIZED: "signIn", ACCOUNT_CHANGED: "accountChanged", ACCOUNT_UNAVAILABLE: "accountChanged", QUOTE_EXPIRED: "quoteExpired", QUOTE_CHANGED: "quoteExpired",
  INSUFFICIENT_QUOTA: "balance", QUOTA_INSUFFICIENT: "balance", RATE_LIMITED: "rateLimit", TOO_MANY_ACTIVE_REQUESTS: "rateLimit",
  AGENT_BUDGET_LIMIT: "limit", AGENT_TOOL_LIMIT: "limit", REQUEST_ALREADY_STARTED: "alreadyStarted", REQUEST_CONFLICT: "alreadyStarted", REQUEST_HASH_CONFLICT: "alreadyStarted",
  BILLING_PENDING: "pending", UPSTREAM_RESULT_UNCERTAIN: "pending", RESPONSE_INTERRUPTED: "interrupted", AGENT_OUTPUT_INCOMPLETE: "incomplete",
};
export function AgentTurnStatus({ agent }: { agent: ReturnType<typeof useCompanionAgent> }) {
  const t = useTranslations("companion");
  if (agent.phase === "idle") return null;
  const pending = agent.receipts.some(item => ["RUNNING", "UNCERTAIN"].includes(item.state));
  const quotedModel = agent.quote ? getRunModel(agent.quote.model) : undefined;
  return <section className="ans-agent-turn" aria-label={t("agentTurn")}>
    {agent.busy && <div className="ans-agent-progress" role="status"><Search aria-hidden="true" /><span>{agent.phase === "reading" ? t(toolKey(agent.activeTool)) : t(`agentPhase.${agent.phase}`)}</span><button type="button" onClick={agent.stop} aria-label={t("agentStop")}><Square aria-hidden="true" /></button></div>}
    {!!agent.tools.length && <details className="ans-agent-tools"><summary>{t("agentSources", { count: agent.tools.length })}</summary><ul>{agent.tools.map((tool, index) => <li key={index}>{tool.ok ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}<span>{t(toolKey(tool.name))}</span><small>{t(tool.ok ? "agentReadDone" : "agentReadFailed")}</small></li>)}</ul></details>}
    {agent.quote && <div className="ans-agent-quote"><strong>{t("agentQuoteTitle")}</strong><blockquote>{agent.question}</blockquote><p>{quotedModel && t("agentQuoteModel", { model: quotedModel.label, multiplier: RUN_MODEL_METERING[quotedModel.key].consumptionMultiplier })}</p><small>{t("agentModelRateNote")}</small><p className="ans-agent-privacy">{t("agentBillingNotice")}</p><WorkspaceLink href="/workspace/credits">{t("agentBillingDetails")}<ArrowUpRight aria-hidden="true" /></WorkspaceLink><label><input type="checkbox" checked={agent.privateAccess} onChange={event => agent.allowPrivate(event.target.checked)} /><span>{t("agentPrivateConsent")}</span></label><p className="ans-agent-privacy">{t("agentPrivacy")}</p><div><button type="button" onClick={() => void agent.confirm()} disabled={agent.quote.balance < agent.quote.maxPoints}>{t("agentConfirm")}</button><button type="button" onClick={agent.reset}>{t("agentCancel")}</button></div>{agent.quote.balance < agent.quote.maxPoints && <WorkspaceLink href="/workspace/credits">{t("agentTopUp")}<ArrowUpRight aria-hidden="true" /></WorkspaceLink>}</div>}
    {agent.error && <p role="alert" className="ans-agent-error">{t(`agentError.${errorKeys[agent.error] ?? "unavailable"}`)}</p>}
    {agent.phase === "stopped" && <p role="status" className="ans-agent-error">{t("agentStopped")}</p>}
    {(pending || (["error", "stopped"].includes(agent.phase) && agent.hasTicket)) && <div className="ans-agent-receipt"><WorkspaceLink href="/workspace/credits">{t("agentBillingDetails")}<ArrowUpRight aria-hidden="true" /></WorkspaceLink>{agent.hasTicket && !agent.busy && <button className="ans-agent-recover" type="button" onClick={() => void agent.refreshReceipts()}>{t("agentCheckReceipt")}</button>}</div>}
  </section>;
}
