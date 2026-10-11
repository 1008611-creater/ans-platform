import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreditsCenter } from "@/components/workspace/credits-center";
import { VoucherPanel } from "@/components/admin/voucher-panel";
import { VibePlan } from "@/components/workspace/vibeplan";
import { getPlanSalesReadiness } from "@/server/billing/plan-readiness";
import { getCreditProducts } from "@/lib/credits-catalog";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), refresh: vi.fn(), t: (key: string) => key, session: { data: { user: { id: "actor" } }, status: "authenticated" } }));
vi.mock("next-auth/react", () => ({ useSession: () => mocks.session }));
vi.mock("next-intl", () => ({ useLocale: () => "en-US", useTranslations: () => Object.assign(mocks.t, { has: () => true }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
const billing = { rechargeYuanPerPoint: .1, usdQuotaPerPoint: 1, gptConsumptionMultiplier: .16, deepseekConsumptionMultiplier: 1, rechargeEnabled: false };
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", mocks.fetch); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("voucher catalog purchase and account boundaries", () => {
  it("selects 2000 points locally, keeps unpublished purchase disabled, and preserves the real 10-point URL", () => {
    render(<CreditsCenter actorId="actor" billing={billing} availablePoints={0} products={getCreditProducts({})} />);
    const choice = screen.getByRole("radio", { name: /^2,000 pointsUnit / });
    fireEvent.click(choice);
    expect(choice).toBeChecked();
    expect(screen.getByRole("button", { name: "notListed" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "purchase" })).toBeNull();
    expect(screen.getByRole("link", { name: "legacyProduct" })).toHaveAttribute("href", "https://wzyp.cn/item/zkm211");
    expect(screen.getByRole("link", { name: /planExplore/ })).toHaveAttribute("href", "/vibeplan");
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("shows a purchase link only for the selected configured SKU and never issues a recharge request", () => {
    render(<CreditsCenter actorId="actor" billing={billing} availablePoints={0} products={getCreditProducts({ ANS_CREDIT_PRODUCT_500_URL: "https://wzyp.cn/item/verified-500" })} />);
    expect(screen.queryByRole("link", { name: "purchase" })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /^500 pointsUnit / }));
    expect(screen.getByRole("link", { name: "purchase" })).toHaveAttribute("href", "https://wzyp.cn/item/verified-500");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("admin shortcut retains the protected payload and does not generate until submit", async () => {
    mocks.fetch.mockImplementation(async (_url: string, options?: RequestInit) => ({ ok: true, json: async () => options?.method === "POST" ? { codes: ["ANS-ISOLATED"] } : [] }));
    render(<VoucherPanel actorId="actor" />);
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "5,000 pointsUnit" }));
    expect(screen.getByLabelText("points")).toHaveValue(5000);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("batchName"), { target: { value: "Isolated fixture" } });
    fireEvent.click(screen.getByRole("button", { name: "generate" }));
    await screen.findByLabelText("code");
    const write = mocks.fetch.mock.calls.find(call => call[1]?.method === "POST");
    expect(write?.[0]).toBe("/api/admin/credits/vouchers");
    expect(write?.[1].headers["x-ans-actor"]).toBe("actor");
    expect(JSON.parse(write?.[1].body)).toEqual({ name: "Isolated fixture", points: 5000, quantity: 10 });
    expect(screen.getByRole("button", { name: "generate" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "100 pointsUnit" })).toBeDisabled();
  });
});

describe("VibePlan preview", () => {
  it("supports all three periods without payment, invented entitlements or automatic renewal", async () => {
    const user = userEvent.setup();
    render(<VibePlan readiness={getPlanSalesReadiness()} />);
    expect(screen.getByRole("tab", { name: "periods.month.label" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "periods.week.label" }));
    expect(screen.getByRole("tab", { name: "periods.week.label" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "periods.quarter.label" }));
    expect(screen.getByRole("tab", { name: "periods.quarter.label" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("button", { name: "notAvailable" })).toHaveLength(2);
    for (const button of screen.getAllByRole("button", { name: "notAvailable" })) expect(button).toBeDisabled();
    expect(screen.getAllByText("previewNote")).toHaveLength(2);
    expect(screen.queryByText("notFinalized")).toBeNull();
    expect(screen.queryByRole("link", { name: "notAvailable" })).toBeNull();
    expect(screen.getByRole("link", { name: "voucherAction" })).toHaveAttribute("href", "/workspace/credits");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
