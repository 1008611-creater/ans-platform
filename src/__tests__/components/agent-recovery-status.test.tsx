import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AgentRecoveryStatus } from "@/components/mascot/agent-recovery-status";
import type { RecoverableAgentTurn } from "@/components/mascot/use-agent-recovery";
import companion from "../../../messages/companion/zh.json";
vi.mock("@/components/providers/workspace-navigation", () => ({ WorkspaceLink: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string, values?: Record<string, string | number>) => {
  let text = String((companion as Record<string, unknown>)[key] ?? key);
  for (const [name, value] of Object.entries(values ?? {})) text = text.replace("{" + name + "}", String(value));
  return text;
} }));
afterEach(cleanup);
const turn: RecoverableAgentTurn = { ticket: "synthetic-only-ticket", requestId: "turn-a", model: "gpt-6.1-sol", submittedAt: Date.now(), statusUntil: Date.now() + 86400000, checked: true, checking: false, error: false, receipts: [] };
it.each(["SETTLED", "RELEASED"])("shows verified %s amount and an honest missing-answer explanation", state => {
  render(<AgentRecoveryStatus turns={[{ ...turn, receipts: [{ requestId: "call", state, reservedPoints: 1, settledPoints: state === "SETTLED" ? .0123 : 0 }] }]} onCheck={vi.fn()} />);
  expect(screen.getByRole("status")).toHaveTextContent(state === "SETTLED" ? "0.0123" : companion.agentUsedPoints.replace("{points}", "0"));
  expect(screen.getByText(companion.agentRecoveryHint)).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
it.each(["unknown", "pending", "error", "invalid"])("keeps %s billing uncertain and offers only receipt checking", state => {
  const onCheck = vi.fn();
  render(<AgentRecoveryStatus turns={[{ ...turn, error: state === "error", receipts: state === "unknown" ? [] : [{ requestId: "call", state: state === "invalid" ? "SETTLED" : "UNCERTAIN", reservedPoints: 1, settledPoints: null }] }]} onCheck={onCheck} />);
  expect(screen.getByRole("status")).not.toHaveTextContent(companion.agentUsedPoints.split("{points}")[0]);
  fireEvent.click(screen.getByRole("button", { name: companion.agentCheckReceipt })); expect(onCheck).toHaveBeenCalledWith("turn-a");
});
