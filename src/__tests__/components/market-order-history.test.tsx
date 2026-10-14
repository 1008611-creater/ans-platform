import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrderHistory } from "@/components/marketplace/order-history";
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/components/marketplace/account-boundary", () => ({ useMarketRequest: () => mocks.request }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
const latest = [{ id: "m101", authorId: "buyer", content: "Latest message", createdAt: "2026-10-14T00:00:00.000Z" }];
const older = { orderId: "order", kind: "messages", items: [{ id: "m001", authorId: "seller", content: "Original delivery agreement", createdAt: "2026-10-13T00:00:00.000Z" }], nextCursor: null };
beforeEach(() => mocks.request.mockReset()); afterEach(cleanup);
describe("order history reader", () => {
  it("loads earlier messages once, preserves the latest window and reads in chronological order", async () => {
    let resolve!: (value: unknown) => void;
    mocks.request.mockReturnValue(new Promise(done => { resolve = done; }));
    const { container } = render(<OrderHistory orderId="order" userId="buyer" kind="messages" initial={latest} before="m101" />);
    const button = screen.getByRole("button", { name: "olderMessages" });
    act(() => { fireEvent.click(button); fireEvent.click(button); }); expect(mocks.request).toHaveBeenCalledTimes(1);
    expect(mocks.request).toHaveBeenCalledWith("/api/market/orders/order/history?kind=messages&before=m101", "GET", undefined);
    await act(async () => resolve(older));
    expect([...container.querySelectorAll("article")].map(item => item.textContent)).toMatchObject([expect.stringContaining("Original delivery agreement"), expect.stringContaining("Latest message")]);
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("keeps records and cursor after failure so retry requests the same page", async () => {
    mocks.request.mockRejectedValueOnce(new Error("lost response")).mockResolvedValueOnce(older);
    render(<OrderHistory orderId="order" userId="buyer" kind="messages" initial={latest} before="m101" />);
    fireEvent.click(screen.getByRole("button")); await screen.findByRole("alert"); expect(screen.getByText("Latest message")).toBeTruthy();
    fireEvent.click(screen.getByRole("button")); await screen.findByText("Original delivery agreement");
    expect(mocks.request.mock.calls[0]).toEqual(mocks.request.mock.calls[1]);
  });
  it.each([{ ...older, orderId: "foreign" }, { ...older, kind: "events" }, { ...older, nextCursor: "m101" }, { ...older, items: [{ ...older.items[0], createdAt: "invalid" }] }])("rejects unconfirmed history without injecting records", async result => {
    mocks.request.mockResolvedValue(result); render(<OrderHistory orderId="order" userId="buyer" kind="messages" initial={latest} before="m101" />);
    fireEvent.click(screen.getByRole("button")); await screen.findByRole("alert"); expect(screen.queryByText("Original delivery agreement")).toBeNull();
  });
  it("suppresses late history when refreshed window replaces the reader", async () => {
    let resolve!: (value: unknown) => void; mocks.request.mockReturnValue(new Promise(done => { resolve = done; }));
    const { rerender } = render(<OrderHistory orderId="order" userId="buyer" kind="messages" initial={latest} before="m101" />);
    fireEvent.click(screen.getByRole("button"));
    rerender(<OrderHistory orderId="other-order" userId="other-buyer" kind="messages" initial={[]} before={null} />);
    await act(async () => resolve(older)); expect(screen.queryByText("Original delivery agreement")).toBeNull(); expect(screen.queryByText("Latest message")).toBeNull();
  });
  it("renders older status history through the same bounded reader", async () => {
    mocks.request.mockResolvedValue({ orderId: "order", kind: "events", items: [{ id: "e1", actorId: null, action: "ORDER_CREATED", fromStatus: null, toStatus: "AWAITING_PAYMENT", revision: 0, message: "Original order", createdAt: "2026-10-13T00:00:00.000Z" }], nextCursor: null });
    render(<OrderHistory orderId="order" userId="buyer" kind="events" initial={[]} before="e2" />);
    fireEvent.click(screen.getByRole("button", { name: "olderEvents" })); await waitFor(() => expect(screen.getByText("Original order")).toBeTruthy());
    expect(screen.getByRole("listitem").textContent).toContain("orderStatus.AWAITING_PAYMENT");
  });
});
