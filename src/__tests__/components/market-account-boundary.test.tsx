import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketAccountBoundary, useMarketRequest } from "@/components/marketplace/account-boundary";
import { CashPayment, CreateCashOrder } from "@/components/marketplace/cash-payment";
const m = vi.hoisted(() => ({ request: vi.fn(), refresh: vi.fn(), push: vi.fn(), actor: "buyer-1", status: "authenticated" }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: m.actor } }, status: m.status }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: m.push }) }));
vi.mock("next-intl", () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => true }) }));
vi.mock("@/components/marketplace/request", async original => ({ ...await original<typeof import("@/components/marketplace/request")>(), marketRequest: m.request }));
vi.mock("qrcode.react", () => ({ QRCodeSVG: () => <svg role="img" aria-label="payment QR"/> }));
beforeEach(() => { vi.clearAllMocks(); m.actor = "buyer-1"; m.status = "authenticated"; }); afterEach(cleanup);
function deferred() { let resolve: (value: unknown) => void = () => {}; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function Command() { const request = useMarketRequest(); return <button onClick={() => void request("/command", "POST", { draft: "private" }).catch(() => {})}>send private draft</button>; }
const wrap = (children: React.ReactNode) => <MarketAccountBoundary actorId="buyer-1">{children}</MarketAccountBoundary>;
describe("market account isolation", () => {
  it("binds a request to the rendered actor and aborts it on cookie-session change without prop changes", async () => {
    const task = deferred(); m.request.mockReturnValue(task.promise);
    const view = render(wrap(<Command/>)); fireEvent.click(screen.getByRole("button", { name: "send private draft" }));
    expect(m.request.mock.calls[0][3].actorId).toBe("buyer-1"); const signal = m.request.mock.calls[0][3].signal as AbortSignal;
    m.actor = "seller-1"; view.rerender(wrap(<Command/>)); expect(screen.queryByText("send private draft")).not.toBeInTheDocument(); expect(signal.aborted).toBe(true);
    expect(screen.getByRole("alert")).toHaveTextContent("changed"); await act(async () => task.resolve({ id: "saved" })); expect(m.request).toHaveBeenCalledTimes(1);
  });
  it.each(["loading", "unauthenticated"])("hides private data while session is %s", status => {
    m.status = status; render(wrap(<p>private requirements</p>)); expect(screen.queryByText("private requirements")).not.toBeInTheDocument();
  });
  it("never restores a late payment QR after switching to the seller of the same order", async () => {
    const task = deferred(); m.request.mockReturnValue(task.promise);
    const child = <CashPayment orderId="same-order" revision={1} method="WECHAT" amountMinor={9900}/>;
    const view = render(wrap(child)); fireEvent.click(screen.getByRole("checkbox")); fireEvent.submit(screen.getByRole("checkbox").closest("form")!);
    m.actor = "seller-1"; view.rerender(wrap(child));
    await act(async () => task.resolve({ provider: "wechat", mode: "qr", url: "weixin://wxpay/bizpayurl?pr=verified", expiresAt: new Date(Date.now() + 60000).toISOString() }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument(); expect(m.refresh).not.toHaveBeenCalled();
  });
  it("does not navigate the new account when the old account's order creation arrives late", async () => {
    const task = deferred(); m.request.mockReturnValue(task.promise);
    const child = <CreateCashOrder listingId="listing" version={3} offer={{ priceMinor: 9900, providers: ["wechat"] }}/>;
    const view = render(wrap(child)); fireEvent.click(screen.getByRole("checkbox")); fireEvent.submit(screen.getByRole("checkbox").closest("form")!);
    m.actor = "seller-1"; view.rerender(wrap(child)); await act(async () => task.resolve({ order: { id: "old-buyers-order" } })); expect(m.push).not.toHaveBeenCalled();
  });
});
