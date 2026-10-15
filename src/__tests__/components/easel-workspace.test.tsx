import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EaselWorkspace } from "@/components/workspace/easel-workspace";
const mocks = vi.hoisted(() => ({ identity: { status: "authenticated", data: { user: { id: "user-a" } } } }));
vi.mock("next-auth/react", () => ({ useSession: () => mocks.identity }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
const props = { origin: "https://easel.example.test", src: "https://easel.example.test/ans/embed?expected=user-a", loginUrl: "https://easel.example.test/ans/oidc/start", userId: "user-a" };
function signal(frame: HTMLIFrameElement, origin: string, userId: string, source: MessageEventSource | null = frame.contentWindow) {
  act(() => window.dispatchEvent(new MessageEvent("message", { origin, source, data: { type: "ans:easel:ready", userId } })));
}
describe("Easel account-bound iframe", () => {
  beforeEach(() => { mocks.identity = { status: "authenticated", data: { user: { id: "user-a" } } }; });
  it("rejects wrong origin, wrong window and a different verified account", () => {
    const view = render(<EaselWorkspace {...props} />); const frame = view.container.querySelector("iframe")!;
    signal(frame, "https://evil.test", "user-a"); expect(frame.hidden).toBe(true);
    signal(frame, props.origin, "user-a", window); expect(frame.hidden).toBe(true);
    signal(frame, props.origin, "user-b"); expect(view.container.querySelector("iframe")).toBeNull(); expect(screen.getByRole("status")).toHaveTextContent("account_mismatch");
  });
  it("shows the verified owner's frame and removes it immediately on account switch", () => {
    const view = render(<EaselWorkspace {...props} />); const frame = view.container.querySelector("iframe")!;
    signal(frame, props.origin, "user-a"); expect(frame.hidden).toBe(false);
    mocks.identity = { status: "authenticated", data: { user: { id: "user-b" } } }; view.rerender(<EaselWorkspace {...props} />);
    expect(view.container.querySelector("iframe")).toBeNull(); expect(screen.getByRole("status")).toHaveTextContent("sessionChanged");
  });
  it("keeps the same visible workspace through session renewal and discards it on failure", () => {
    const view = render(<EaselWorkspace {...props} />); const frame = view.container.querySelector("iframe")!;
    signal(frame, props.origin, "user-a");
    act(() => window.dispatchEvent(new MessageEvent("message", { origin: props.origin, source: frame.contentWindow, data: { type: "ans:easel:refresh", userId: "user-a" } })));
    expect(view.container.querySelector("iframe")).toBe(frame); expect(frame.hidden).toBe(false); expect(screen.getByRole("status")).toHaveTextContent("renewing");
    signal(frame, props.origin, "user-a"); expect(frame.hidden).toBe(false);
    act(() => window.dispatchEvent(new MessageEvent("message", { origin: props.origin, source: frame.contentWindow, data: { type: "ans:easel:error", code: "login_required" } })));
    expect(view.container.querySelector("iframe")).toBeNull(); expect(screen.getByRole("link", {name:"login"})).toHaveAttribute("target", "_blank");
  });
  it("reconnecting discards the previous frame and requires a fresh handshake", () => {
    const view = render(<EaselWorkspace {...props} />); const old = view.container.querySelector("iframe")!;
    signal(old, props.origin, "user-b"); fireEvent.click(screen.getByRole("button", { name: "retry" }));
    expect(view.container.querySelector("iframe")).not.toBe(old); expect(view.container.querySelector("iframe")!.hidden).toBe(true);
  });
});
