import type { ComponentProps } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AgentTurnStatus } from "@/components/mascot/agent-turn-status";
import type { useCompanionAgent } from "@/components/mascot/use-companion-agent";
import companion from "../../../messages/companion/zh.json";
vi.mock("@/components/providers/workspace-navigation", () => ({ WorkspaceLink: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string, values?: Record<string, string | number>) => {
  let result = String(key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, companion) ?? key);
  for (const [name, value] of Object.entries(values ?? {})) result = result.replace("{" + name + "}", String(value));
  return result;
} }));
afterEach(cleanup);
it("makes metered consent explicit without exposing spend or balance numbers", () => {
  const agent: ReturnType<typeof useCompanionAgent> = {
    phase: "confirm", quote: { ticket: "isolated-ticket", requestId: "isolated-request", model: "deepseek-v4.1-flash", maxPoints: 123.456, balance: 999.321, expiresAt: 1 },
    error: null, receipts: [], tools: [], activeTool: null, busy: false, privateAccess: false,
    ask: async () => {}, allowPrivate: vi.fn(), confirm: async () => {}, stop: vi.fn(), reset: vi.fn(), refreshReceipts: async () => {}, question: "查找工作流", hasTicket: false, cancelQuote: vi.fn(), checkingReceipts: false, receiptChecked: false, canRetryQuote: false, retryQuote: async () => {},
  };
  const view = render(<AgentTurnStatus agent={agent} />);
  expect(screen.getByText(companion.agentBillingNotice)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: companion.agentBillingDetails })).toHaveAttribute("href", "/workspace/credits");
  expect(view.container).not.toHaveTextContent("123.456");
  expect(view.container).not.toHaveTextContent("999.321");
  expect(screen.getByRole("button", { name: companion.agentConfirm })).toBeEnabled();
  expect(screen.getByRole("checkbox", { name: companion.agentPrivateConsent })).not.toBeChecked();
});
