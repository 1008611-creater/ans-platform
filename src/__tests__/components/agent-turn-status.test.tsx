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

it("names public-page verification without implying a private read", () => {
  const agent: ReturnType<typeof useCompanionAgent> = {
    phase: "reading", quote: null, error: null, receipts: [], tools: [{ name: "current_page", ok: true }], activeTool: "current_page", busy: true, privateAccess: false,
    ask: async () => {}, allowPrivate: vi.fn(), confirm: async () => {}, stop: vi.fn(), reset: vi.fn(), refreshReceipts: async () => {}, question: "这个项目需要准备什么", hasTicket: true, cancelQuote: vi.fn(), checkingReceipts: false, receiptChecked: false, canRetryQuote: false, retryQuote: async () => {},
  };
  render(<AgentTurnStatus agent={agent} />);
  expect(screen.getByRole("status")).toHaveTextContent(companion.agentTool.current_page);
  expect(screen.getByRole("status")).not.toHaveTextContent(companion.agentTool.my_projects);
});

it("explains a capacity failure while keeping the submitted turn's usage recovery available", () => {
  const agent: ReturnType<typeof useCompanionAgent> = {
    phase: "error", quote: null, error: "UPSTREAM_CAPACITY_UNAVAILABLE",
    receipts: [{ requestId: "isolated-request", state: "UNCERTAIN", reservedPoints: 0.01, settledPoints: null }],
    tools: [], activeTool: null, busy: false, privateAccess: false,
    ask: async () => {}, allowPrivate: vi.fn(), confirm: async () => {}, stop: vi.fn(), reset: vi.fn(), refreshReceipts: async () => {},
    question: "", hasTicket: true, cancelQuote: vi.fn(), checkingReceipts: false, receiptChecked: false, canRetryQuote: false, retryQuote: async () => {},
  };
  render(<AgentTurnStatus agent={agent} />);
  expect(screen.getByRole("alert")).toHaveTextContent(companion.agentError.capacity);
  expect(screen.getByRole("button", { name: companion.agentCheckReceipt })).toBeEnabled();
  expect(screen.queryByRole("button", { name: companion.agentRetryQuote })).not.toBeInTheDocument();
});
