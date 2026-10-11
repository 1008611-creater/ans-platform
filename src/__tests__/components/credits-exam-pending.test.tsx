import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { QuotaAdminOverview } from "@/contracts/quota";
import { CreditsPanel } from "@/components/admin/credits-panel";
import en from "../../../messages/product/en.json";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string, values?: Record<string, string | number>) => {
 const translated = (en.quotaAdmin as Record<string, unknown>)[key];
 let value = typeof translated === "string" ? translated : key;
 for (const [name, item] of Object.entries(values ?? {})) value = value.replace(`{${name}}`, String(item));
 return value;
}}));
vi.mock("@/components/admin/voucher-panel", () => ({ VoucherPanel: () => null }));
const base: QuotaAdminOverview = { users: [{ id: "member", username: "exam-member", quotaPoints: 3, flagged: false }], operations: [], disputes: [], uncertain: [], mismatchCount: 0, pending: 0, manualRechargeEnabled: false, ldxp: { enabled: false, orders: [] } };
beforeEach(() => { vi.restoreAllMocks(); });
it("shows exam holds separately from API requests without exposing a task reference or a refund button", () => {
 const { container } = render(<CreditsPanel actorId="admin" overview={{ ...base, examPending: { pendingCount: 51, reservedPoints: 51.125001, items: [{ id: "ledger-hold", userId: "member", points: 0.125001, createdAt: "2026-10-12T00:00:00Z" }] } }} />);
 expect(screen.getByText("Awaiting settlement: 51 requests, 51.125001 credits")).toBeInTheDocument();
 const section = container.querySelector('[aria-labelledby="exam-reservation-heading"]')!;
 expect(section.textContent).toContain("exam-member / 0.125001");
 expect(section.querySelectorAll("button")).toHaveLength(0);
 expect(screen.getByText(/a timeout does not trigger a refund/)).toBeInTheDocument();
});
it("shows the explicit empty state for older compatible overview responses", () => {
 render(<CreditsPanel actorId="admin" overview={base} />);
 expect(screen.getByText("No outstanding exam analysis reservations.")).toBeInTheDocument();
});
