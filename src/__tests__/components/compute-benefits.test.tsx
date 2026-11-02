import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createTranslator } from "use-intl/core";
import product from "../../../messages/product/zh.json";
import { ComputeBenefits, formatBenefitUsd } from "@/components/workspace/compute-benefits";
import { AdminComputeBenefits } from "@/components/admin/compute-benefits";
import type { ComputeBenefitsSummary, AdminComputeBenefitsList } from "@/contracts/compute-benefits";

const state = vi.hoisted(() => ({ actor: "u1", refresh: vi.fn() }));
vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: (namespace: "product.computeBenefits" | "product.accountBoundary") => createTranslator({ locale: "zh", messages: { product }, namespace }) }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated", data: { user: { id: state.actor } } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => state }));
const copy = product.computeBenefits;
const scenario = "Build a useful agricultural data agent for farmers";
const summary: ComputeBenefitsSummary = {
  enabled: true, questionnaireVersion: "onboarding-v1", applicationVersion: "agri-v1", onboarding: null, application: null, activity: [],
  grants: [{ id: "grant-1", kind: "GPT_AGRI", campaignId: "agri", modelIds: ["gpt-6-astra", "gpt-6.1-sol"], totalUsdMicros: "200000000", usedUsdMicros: "1000000", reservedUsdMicros: "250000", availableUsdMicros: "198750000", expiredUsdMicros: "0", grantedAt: "2026-10-16T01:00:00Z", expiresAt: "2026-11-15T01:00:00Z", status: "ACTIVE" }],
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
beforeEach(() => { state.actor = "u1"; state.refresh.mockReset(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function fetchSummary(value = summary) { return vi.spyOn(globalThis, "fetch").mockResolvedValue(json(value)); }
function fillOnboarding() {
  const submit = screen.getByRole("button", { name: copy.submitQuestionnaire });
  const form = submit.closest("form")!;
  fireEvent.change(within(form).getByLabelText(copy.role), { target: { value: "DEVELOPER" } });
  fireEvent.change(within(form).getByLabelText(copy.experience), { target: { value: "BUILDING" } });
  fireEvent.change(within(form).getByLabelText(copy.agent), { target: { value: "CODEX" } });
  fireEvent.change(within(form).getByLabelText(copy.useCase), { target: { value: scenario } });
  fireEvent.click(form.querySelector('input[name="acceptedRules"]')!);
  return form;
}
describe("compute benefits UI", () => {
  it("formats microdollars exactly without floating point rounding", () => {
    expect(formatBenefitUsd("1")).toBe("$0.000001");
    expect(formatBenefitUsd("198750000")).toBe("$198.75");
    expect(formatBenefitUsd("9007199254740993")).toBe("$9007199254.740993");
  });
  it("renders only actual owner grant balances separately from paid points", async () => {
    const fetcher = fetchSummary(); render(<ComputeBenefits actorId="u1" compact />);
    expect(await screen.findByText("$198.75")).toBeVisible();
    expect(screen.getByText("$0.25")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0.62");
    expect(screen.getByText(copy.separation)).toBeVisible();
    expect(screen.getByRole("link", { name: copy.manage })).toHaveAttribute("href", "/workspace/benefits");
    expect(fetcher).toHaveBeenCalledWith("/api/compute-benefits", expect.objectContaining({ headers: { "x-ans-actor": "u1" }, cache: "no-store" }));
  });
  it("does not invent a grant for the empty state and distinguishes blocked models", async () => {
    fetchSummary({ ...summary, grants: [{ ...summary.grants[0], kind: "TERRA_AGRI", modelIds: ["gpt-5.6-terra"] }] }); render(<ComputeBenefits actorId="u1" />);
    expect(await screen.findByText(copy.terraPending)).toBeVisible();
    expect(screen.getByText(copy.funding)).toBeVisible();
    expect(screen.getByText(/x-ans-funding: paid/)).toBeVisible();
    expect(screen.getByRole("link", { name: copy.keys })).toHaveAttribute("href", "/settings#api-key");
  });
  it("submits only the versioned questionnaire answers and prevents double submission", async () => {
    const fetcher = fetchSummary(); render(<ComputeBenefits actorId="u1" />);
    await screen.findByText("$198.75");
    let complete!: (response: Response) => void;
    fetcher.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const form = fillOnboarding(); fireEvent.submit(form); fireEvent.submit(form);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const [path, init] = fetcher.mock.calls[1];
    expect(path).toBe("/api/compute-benefits/questionnaire");
    expect(init?.headers).toEqual({ "Content-Type": "application/json", "x-ans-actor": "u1" });
    expect(JSON.parse(String(init?.body))).toEqual({ version: "onboarding-v1", role: "DEVELOPER", experience: "BUILDING", agent: "CODEX", useCase: scenario, acceptedRules: true });
    complete(json({ success: true })); await screen.findByText(copy.saved);
  });
  it("aborts a pending write when the account changes and removes private grants", async () => {
    const fetcher = fetchSummary(); const page = render(<ComputeBenefits actorId="u1" />); await screen.findByText("$198.75");
    fetcher.mockImplementationOnce(() => new Promise(() => {})); fireEvent.submit(fillOnboarding());
    const signal = fetcher.mock.calls[1][1]?.signal;
    state.actor = "u2"; page.rerender(<ComputeBenefits actorId="u1" />);
    expect(screen.queryByText("$198.75")).not.toBeInTheDocument();
    expect(signal?.aborted).toBe(true);
  });
  it("allows a rejected applicant to amend and resubmit the prefilled form", async () => {
    fetchSummary({ ...summary, application: { ...application.applications[0], status: "REJECTED", reviewNote: "Please clarify delivery" } });
    render(<ComputeBenefits actorId="u1" />);
    await screen.findByRole("button", { name: copy.submitApplication });
    expect(screen.getByLabelText(copy.teamName)).toHaveValue("Farm team");
    expect(screen.getByLabelText(copy.problem)).toHaveValue("Help farmers organize and act on fragmented data");
    expect(document.getElementById("benefits-agri")).toBeInTheDocument();
  });
  it("keeps load errors distinct from an empty account and hides feature-disabled UI", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline")); render(<ComputeBenefits actorId="u1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(copy.loadFailed);
    expect(screen.queryByText(copy.empty)).not.toBeInTheDocument();
    fetcher.mockResolvedValueOnce(json({ ...summary, enabled: false })); fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.queryByText(copy.title)).not.toBeInTheDocument();
  });
});
const application: AdminComputeBenefitsList = { enabled: true, applications: [{ id: "app-1", userId: "u2", username: "farmer", status: "PENDING", revision: 3, submittedAt: "2026-10-16T01:00:00Z", reviewedAt: null, reviewNote: null, answers: { version: "agri-v1", teamName: "Farm team", projectTitle: "Farm data tools", role: "DEVELOPER", problem: "Help farmers organize and act on fragmented data", plan: "Collect real requirements and deliver an independently usable tool", acceptedRules: true } }] };
describe("compute benefits review UI", () => {
  it("binds review to exact application revision and sends no client grant amount", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(json(application)); render(<AdminComputeBenefits actorId="u1" />);
    await screen.findByText("Farm data tools");
    fireEvent.change(screen.getByLabelText(copy.adminNote), { target: { value: "Clear application meets eligibility" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fetcher.mockResolvedValueOnce(json({ error: "REVISION_CONFLICT" }, 409));
    fireEvent.click(screen.getByRole("button", { name: copy.adminApprove }));
    expect(await screen.findByText(copy.adminConflict)).toBeVisible();
    const [path, init] = fetcher.mock.calls[1];
    expect(path).toBe("/api/admin/compute-benefits/app-1/review");
    expect(JSON.parse(String(init?.body))).toEqual({ revision: 3, decision: "APPROVED", note: "Clear application meets eligibility" });
  });
});
