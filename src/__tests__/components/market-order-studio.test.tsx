import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketOrderView } from "@/contracts/marketplace-view";
import { OrderStudio } from "@/components/marketplace/order-studio";

const mocks = vi.hoisted(() => ({ request: vi.fn(), refresh: vi.fn() }));
vi.mock("@/components/marketplace/request", () => ({ marketRequest: mocks.request }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("next-intl", () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => false }) }));

function order(patch: Partial<MarketOrderView> = {}): MarketOrderView {
  return { id: "order-1", listingId: "listing-1", buyerId: "buyer-1", sellerId: "seller-1", status: "IN_PROGRESS",
    revision: 3, revisionRequests: 0, requirements: "Private requirements", paidAt: "2026-10-09T00:00:00Z", completedAt: null,
    createdAt: "2026-10-09T00:00:00Z", updatedAt: "2026-10-09T00:00:00Z", events: [], deliveries: [], messages: [], review: null,
    quote: { slug: "fixture-website", title: "Fixture website", summary: "A complete personal website", description: "Prepare and deliver a personal website from supplied facts.",
      category: "web", subcategory: "website", fulfillment: "service", priceMinor: 1000, currency: "CNY", deliveryDays: 3,
      revisionLimit: 2, computeIncluded: false, deliverables: ["One website"], licenseTerms: "Personal use rights for this fixture.",
      listingId: "listing-1", listingVersion: 1, sellerId: "seller-1", commissionBps: 1000, platformFeeMinor: 100, sellerDueMinor: 900 }, ...patch };
}
function formOf(element: HTMLElement): HTMLFormElement {
  const form = element.closest("form"); if (!form) throw new Error("Fixture form unavailable"); return form;
}
function deferred() {
  let resolve: (value: unknown) => void = () => { throw new Error("Fixture deferred is not ready"); };
  const promise = new Promise<unknown>((done) => { resolve = done; }); return { promise, resolve };
}
beforeEach(() => { mocks.request.mockReset(); mocks.refresh.mockReset(); });
afterEach(cleanup);

describe("market order write recovery", () => {
  it("synchronously locks duplicate submits before React renders disabled controls", async () => {
    const task = deferred(); mocks.request.mockReturnValue(task.promise);
    render(<OrderStudio order={order()} userId="buyer-1" />);
    const input = screen.getByRole("textbox", { name: "message" }); fireEvent.change(input, { target: { value: "One message" } });
    const form = formOf(input);
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(mocks.request).toHaveBeenCalledTimes(1);
    await act(async () => { task.resolve({ id: "message-1" }); });
  });
  it("retains the exact command after a lost response and retries it once", async () => {
    mocks.request.mockRejectedValueOnce(new Error("response lost")).mockResolvedValueOnce({ id: "message-1" });
    render(<OrderStudio order={order()} userId="buyer-1" />);
    const input = screen.getByRole("textbox", { name: "message" }); fireEvent.change(input, { target: { value: "Original message" } });
    await act(async () => { fireEvent.submit(formOf(input)); });
    const original = structuredClone(mocks.request.mock.calls[0][2]);
    expect(input).toBeDisabled(); expect(input).toHaveValue("Original message"); expect(mocks.refresh).not.toHaveBeenCalled();
    // Even an external programmatic DOM edit must not rewrite the accepted command.
    fireEvent.change(input, { target: { value: "Changed message" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "recoverRequest" })); });
    expect(mocks.request).toHaveBeenCalledTimes(2); expect(mocks.request.mock.calls[1][2]).toEqual(original);
    expect(mocks.request.mock.calls[1][0]).toBe("/api/market/orders/order-1/messages");
    expect(mocks.refresh).toHaveBeenCalledTimes(1); expect(input).toHaveValue(""); expect(input).not.toBeDisabled();
  });
  it.each([null, {}, { id: "" }, { id: 12 }])("does not clear a message on malformed successful data %j", async (acknowledgement) => {
    mocks.request.mockResolvedValueOnce(acknowledgement);
    render(<OrderStudio order={order()} userId="buyer-1" />);
    const input = screen.getByRole("textbox", { name: "message" }); fireEvent.change(input, { target: { value: "Keep my draft" } });
    await act(async () => { fireEvent.submit(formOf(input)); });
    expect(input).toHaveValue("Keep my draft"); expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "recoverRequest" })).toBeInTheDocument();
  });
  it("unlocks and clears only after a valid record acknowledgement", async () => {
    mocks.request.mockResolvedValueOnce({ id: "message-1" });
    render(<OrderStudio order={order()} userId="buyer-1" />);
    const input = screen.getByRole("textbox", { name: "message" }); fireEvent.change(input, { target: { value: "Confirmed message" } });
    await act(async () => { fireEvent.submit(formOf(input)); });
    expect(mocks.refresh).toHaveBeenCalledTimes(1); expect(input).toHaveValue(""); expect(input).not.toBeDisabled();
  });
  it("locks another write form synchronously during a message dispatch", async () => {
    const task = deferred(); mocks.request.mockReturnValue(task.promise);
    render(<OrderStudio order={order()} userId="seller-1" />);
    const input = screen.getByRole("textbox", { name: "message" }); const delivery = screen.getByRole("textbox", { name: "actionMessage" });
    fireEvent.change(input, { target: { value: "One message" } }); fireEvent.change(delivery, { target: { value: "Delivered website" } });
    act(() => { fireEvent.submit(formOf(input)); fireEvent.submit(formOf(delivery)); });
    expect(mocks.request).toHaveBeenCalledTimes(1); expect(mocks.request.mock.calls[0][0]).toMatch(/\/messages$/);
    await act(async () => { task.resolve({ id: "message-1" }); });
  });
  it("rejects an order action acknowledgement for another order", async () => {
    mocks.request.mockResolvedValueOnce({ order: { ...order(), id: "other-order", revision: 4, status: "DELIVERED" } });
    render(<OrderStudio order={order()} userId="seller-1" />);
    const input = screen.getByRole("textbox", { name: "actionMessage" }); fireEvent.change(input, { target: { value: "Private delivery" } });
    await act(async () => { fireEvent.submit(formOf(input)); });
    expect(input).toHaveValue("Private delivery"); expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "recoverRequest" })).toBeInTheDocument();
  });
  it("rejects an unapplied order revision", async () => {
    mocks.request.mockResolvedValueOnce({ order: { ...order(), status: "DELIVERED" } });
    render(<OrderStudio order={order()} userId="seller-1" />);
    const input = screen.getByRole("textbox", { name: "actionMessage" }); fireEvent.change(input, { target: { value: "Private delivery" } });
    await act(async () => { fireEvent.submit(formOf(input)); });
    expect(input).toHaveValue("Private delivery"); expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("accepts a late idempotent action response at a later order revision", async () => {
    mocks.request.mockResolvedValueOnce({ order: { ...order(), revision: 5, status: "COMPLETED" } });
    render(<OrderStudio order={order()} userId="seller-1" />);
    const input = screen.getByRole("textbox", { name: "actionMessage" }); fireEvent.change(input, { target: { value: "Private delivery" } });
    await act(async () => { fireEvent.submit(formOf(input)); });
    expect(input).toHaveValue(""); expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
  it.each(["order", "account"])("does not leak old drafts or apply a late response after %s changes", async (scope) => {
    const task = deferred(); mocks.request.mockReturnValueOnce(task.promise);
    const view = render(<OrderStudio order={order()} userId="buyer-1" />);
    const oldInput = screen.getByRole("textbox", { name: "message" }); fireEvent.change(oldInput, { target: { value: "Previous private draft" } });
    act(() => { fireEvent.submit(formOf(oldInput)); });
    view.rerender(<OrderStudio order={order(scope === "order" ? { id: "order-2" } : {})} userId={scope === "account" ? "seller-1" : "buyer-1"} />);
    const input = screen.getByRole("textbox", { name: "message" }); expect(input).toHaveValue("");
    fireEvent.change(input, { target: { value: "New scoped draft" } });
    await act(async () => { task.resolve({ id: "previous-message" }); });
    expect(input).toHaveValue("New scoped draft"); expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("validates blank content locally without creating an unresolved write", async () => {
    mocks.request.mockResolvedValueOnce({ id: "message-1" });
    render(<OrderStudio order={order()} userId="buyer-1" />);
    const input = screen.getByRole("textbox", { name: "message" }); fireEvent.change(input, { target: { value: "   " } });
    await act(async () => { fireEvent.submit(formOf(input)); });
    expect(mocks.request).not.toHaveBeenCalled(); expect(input).not.toBeDisabled();
  });
  it("retains review rating and content across an unknown response", async () => {
    mocks.request.mockRejectedValueOnce(new Error("response lost")).mockResolvedValueOnce({ id: "review-1" });
    render(<OrderStudio order={order({ status: "COMPLETED" })} userId="buyer-1" />);
    const input = screen.getByRole("textbox", { name: "reviewContent" }); fireEvent.change(input, { target: { value: "Original review" } });
    await act(async () => { fireEvent.submit(formOf(input)); });
    const original = structuredClone(mocks.request.mock.calls[0][2]);
    expect(input).toBeDisabled(); expect(mocks.refresh).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("combobox", { name: "rating" }), { target: { value: "1" } });
    fireEvent.change(input, { target: { value: "Changed review" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "recoverRequest" })); });
    expect(mocks.request.mock.calls[1][2]).toEqual(original); expect(mocks.request.mock.calls[1][2]).toEqual({ rating: 5, content: "Original review" });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
  it("keeps an action's original expected revision and key after props refresh", async () => {
    mocks.request.mockRejectedValueOnce(new Error("response lost")).mockResolvedValueOnce({ order: { ...order(), revision: 5, status: "COMPLETED" } });
    const view = render(<OrderStudio order={order()} userId="seller-1" />);
    const input = screen.getByRole("textbox", { name: "actionMessage" }); fireEvent.change(input, { target: { value: "Original delivery" } });
    await act(async () => { fireEvent.submit(formOf(input)); });
    const original = structuredClone(mocks.request.mock.calls[0][2]);
    view.rerender(<OrderStudio order={order({ revision: 4, status: "DELIVERED" })} userId="seller-1" />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "recoverRequest" })); });
    expect(mocks.request.mock.calls[1][2]).toEqual(original); expect(mocks.request.mock.calls[1][2].expectedRevision).toBe(3);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
  it("rejects an acknowledgement at the exact revision with the wrong action result", async () => {
    mocks.request.mockResolvedValueOnce({ order: { ...order(), revision: 4, status: "COMPLETED" } });
    render(<OrderStudio order={order()} userId="seller-1" />);
    const input = screen.getByRole("textbox", { name: "actionMessage" }); fireEvent.change(input, { target: { value: "Private delivery" } });
    await act(async () => { fireEvent.submit(formOf(input)); });
    expect(input).toHaveValue("Private delivery"); expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("rejects an acknowledgement with different order participants", async () => {
    mocks.request.mockResolvedValueOnce({ order: { ...order(), buyerId: "outsider", revision: 4, status: "DELIVERED" } });
    render(<OrderStudio order={order()} userId="seller-1" />);
    const input = screen.getByRole("textbox", { name: "actionMessage" }); fireEvent.change(input, { target: { value: "Private delivery" } });
    await act(async () => { fireEvent.submit(formOf(input)); });
    expect(input).toHaveValue("Private delivery"); expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("synchronously locks repeated recovery clicks", async () => {
    const task = deferred(); mocks.request.mockRejectedValueOnce(new Error("response lost")).mockReturnValueOnce(task.promise);
    render(<OrderStudio order={order()} userId="buyer-1" />);
    const input = screen.getByRole("textbox", { name: "message" }); fireEvent.change(input, { target: { value: "Original message" } });
    await act(async () => { fireEvent.submit(formOf(input)); });
    const button = screen.getByRole("button", { name: "recoverRequest" }); act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(mocks.request).toHaveBeenCalledTimes(2);
    await act(async () => { task.resolve({ id: "message-1" }); });
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

});
