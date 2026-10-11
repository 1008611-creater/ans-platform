import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WorkspaceNavigationProvider, WorkspaceLink } from "@/components/providers/workspace-navigation";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { ToonflowWorkspace } from "@/components/workspace/toonflow-workspace";

const mocks = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), session: { status: "authenticated", data: { user: { id: "member-a" } } } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, replace: mocks.replace }), usePathname: () => "/workflows/toonflow" }));
vi.mock("next/link", () => ({ default: ({ onNavigate, transitionTypes: _transitionTypes, replace: _replace, scroll: _scroll, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { onNavigate?: (event: { preventDefault(): void }) => void; transitionTypes?: string[]; replace?: boolean; scroll?: boolean }) =>
  { void _transitionTypes; void _replace; void _scroll; return <a {...props} onClick={event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; onNavigate?.(event); }} />; },
}));
vi.mock("next-auth/react", () => ({ useSession: () => mocks.session }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
const origin = "https://toonflow.cauai.fun";
const props = { origin, src: origin + "/?ans_embed=1", loginUrl: origin + "/api/auth/oidc/start?return_to=%2F", userId: "member-a" };
beforeEach(() => { window.history.replaceState(null, "", "/"); vi.useFakeTimers(); mocks.push.mockReset(); mocks.replace.mockReset(); mocks.session = { status: "authenticated", data: { user: { id: "member-a" } } }; });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
function setup(globalNavigation = false) {
  const result = render(globalNavigation ? <WorkspaceNavigationProvider>
    <WorkspaceLink href="/explore">global-explore</WorkspaceLink>
    <WorkspaceLink href="/templates" as="/workflows" replace scroll={false} transitionTypes={["slide-in"]}>animated-replace</WorkspaceLink>
    <WorkspaceLink href="/workflows/toonflow#main-content">same-document</WorkspaceLink>
    <WorkspaceLink href="/competitions" onNavigate={event => event.preventDefault()}>cancelled-link</WorkspaceLink>
    <MobileTabBar />
    <ToonflowWorkspace {...props} />
  </WorkspaceNavigationProvider> : <ToonflowWorkspace {...props} />);
  const frame = screen.getByTitle("frameTitle") as HTMLIFrameElement;
  const send = vi.spyOn(frame.contentWindow!, "postMessage");
  fireEvent.load(frame);
  const nonce = send.mock.calls.at(-1)![0].nonce as string;
  return { ...result, frame, nonce, send };
}
function message(frame: HTMLIFrameElement, nonce: string, status = "connected", overrides: Record<string, unknown> = {}, trustedOrigin = origin, source: MessageEventSource | null = frame.contentWindow) {
  act(() => { window.dispatchEvent(new MessageEvent("message", { source, origin: trustedOrigin, data: { type: "ans.toonflow.state", version: 1, nonce, status, capability: "workspace-v1", ...overrides } })); });
}
it("keeps private workspace invisible until an account-bound handshake completes", () => {
  const { frame, nonce, send } = setup();
  expect(frame).toHaveClass("invisible");
  expect(frame).toHaveAttribute("tabindex", "-1");
  expect(send).toHaveBeenCalledWith({ type: "ans.toonflow.connect", version: 1, nonce, userId: "member-a" }, origin);
  message(frame, nonce);
  expect(frame).toHaveClass("visible");
  expect(frame).toHaveAttribute("tabindex", "0");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
it("rejects spoofed origins, sources, nonces and capabilities", () => {
  const { frame, nonce } = setup();
  message(frame, nonce, "connected", {}, "https://untrusted.invalid");
  message(frame, nonce, "connected", {}, origin, window);
  message(frame, "stale-nonce");
  message(frame, nonce, "connected", { capability: "old-workspace" });
  message(frame, nonce, "connected", { version: 2 });
  expect(frame).toHaveClass("invisible");
  expect(screen.getByRole("status")).toHaveTextContent("connecting.title");
});
it("offers top-level login without putting credentials in a frame or URL", () => {
  const { frame, nonce } = setup(); message(frame, nonce, "login_required");
  expect(screen.getByRole("status")).toHaveTextContent("login_required.title");
  expect(screen.getByRole("link", { name: "login" })).toHaveAttribute("target", "_blank");
  expect(frame.src).toBe(props.src);
  expect(frame.src).not.toContain("member-a");
});
it("hides an already connected workspace if Toonflow reports an account change", () => {
  const { frame, nonce } = setup(); message(frame, nonce); message(frame, nonce, "account_mismatch");
  expect(frame).toHaveClass("invisible");
  expect(screen.getByRole("status")).toHaveTextContent("account_mismatch.title");
});
it("destroys the frame when the ANS account changes", () => {
  const result = setup(); message(result.frame, result.nonce);
  mocks.session = { status: "authenticated", data: { user: { id: "member-b" } } };
  result.rerender(<ToonflowWorkspace {...props} />);
  expect(screen.queryByTitle("frameTitle")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("account_mismatch.title");
});
it("times out and retries with a new frame and nonce, rejecting stale messages", () => {
  const { frame: oldFrame, nonce: oldNonce } = setup();
  act(() => { vi.advanceTimersByTime(20_001); });
  expect(screen.getByRole("status")).toHaveTextContent("unavailable.title");
  fireEvent.click(screen.getByRole("button", { name: "retry" }));
  const frame = screen.getByTitle("frameTitle") as HTMLIFrameElement;
  expect(frame).not.toBe(oldFrame);
  message(frame, oldNonce);
  expect(frame).toHaveClass("invisible");
  const send = vi.spyOn(frame.contentWindow!, "postMessage"); fireEvent.load(frame);
  const nonce = send.mock.calls.at(-1)![0].nonce;
  expect(nonce).not.toBe(oldNonce); message(frame, nonce);
  expect(frame).toHaveClass("visible");
});
it("answers only the trusted child readiness event", () => {
  const { frame, send } = setup(); send.mockClear();
  const data = { type: "ans.toonflow.ready", version: 1 };
  act(() => { window.dispatchEvent(new MessageEvent("message", { origin: "https://untrusted.invalid", source: frame.contentWindow, data })); });
  expect(send).not.toHaveBeenCalled();
  act(() => { window.dispatchEvent(new MessageEvent("message", { origin, source: frame.contentWindow, data })); });
  expect(send).toHaveBeenCalledTimes(1);
});
it("provides an escape key and an explicit return to the ANS workspace", () => {
  setup(); fireEvent.click(screen.getByRole("button", { name: "expand" }));
  expect(screen.getByRole("button", { name: "collapse" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.getByRole("button", { name: "expand" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("link", { name: "back" })).toHaveAttribute("href", "/workspace");
});

it("does not mount private content while the ANS session is loading", () => {
  mocks.session.status = "loading";
  render(<ToonflowWorkspace {...props} />);
  expect(screen.queryByTitle("frameTitle")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("connecting.title");
});
it("destroys the old connection during session revalidation and requires a fresh handshake", () => {
  const result = setup(); message(result.frame, result.nonce);
  mocks.session.status = "loading";
  result.rerender(<ToonflowWorkspace {...props} />);
  expect(screen.queryByTitle("frameTitle")).not.toBeInTheDocument();
  mocks.session.status = "authenticated";
  result.rerender(<ToonflowWorkspace {...props} />);
  const frame = screen.getByTitle("frameTitle") as HTMLIFrameElement;
  expect(frame).not.toBe(result.frame);
  expect(frame).toHaveClass("invisible");
  message(frame, result.nonce);
  expect(frame).toHaveClass("invisible");
  const send = vi.spyOn(frame.contentWindow!, "postMessage"); fireEvent.load(frame);
  const nonce = send.mock.calls.at(-1)![0].nonce;
  expect(nonce).not.toBe(result.nonce); message(frame, nonce);
  expect(frame).toHaveClass("visible");
});
it("requires a new frame and handshake when the page and session switch accounts together", () => {
  const result = setup(); message(result.frame, result.nonce);
  mocks.session.data.user.id = "member-b";
  result.rerender(<ToonflowWorkspace {...props} userId="member-b" />);
  const frame = screen.getByTitle("frameTitle") as HTMLIFrameElement;
  expect(frame).not.toBe(result.frame);
  expect(frame).toHaveClass("invisible");
  message(frame, result.nonce);
  expect(frame).toHaveClass("invisible");
  const send = vi.spyOn(frame.contentWindow!, "postMessage"); fireEvent.load(frame);
  const nonce = send.mock.calls.at(-1)![0].nonce;
  expect(send).toHaveBeenCalledWith({ type: "ans.toonflow.connect", version: 1, nonce, userId: "member-b" }, origin);
  message(frame, nonce);
  expect(frame).toHaveClass("visible");
});
it.each([
  { src: origin + "/?ans_embed=1&workspace=new" },
  { origin: "https://video.example.test", src: "https://video.example.test/?ans_embed=1" },
])("requires a new connection when the configured workspace address changes: %j", (change) => {
  const result = setup(); message(result.frame, result.nonce);
  result.rerender(<ToonflowWorkspace {...props} {...change} />);
  const frame = screen.getByTitle("frameTitle") as HTMLIFrameElement;
  expect(frame).not.toBe(result.frame);
  expect(frame).toHaveClass("invisible");
});
it("removes the private frame on logout and never restores the old connected state", () => {
  const result = setup(); message(result.frame, result.nonce);
  mocks.session.status = "unauthenticated";
  result.rerender(<ToonflowWorkspace {...props} />);
  expect(screen.queryByTitle("frameTitle")).not.toBeInTheDocument();
  mocks.session.status = "authenticated";
  result.rerender(<ToonflowWorkspace {...props} />);
  const frame = screen.getByTitle("frameTitle");
  expect(frame).not.toBe(result.frame);
  expect(frame).toHaveClass("invisible");
});
it("does not restore a stale connected state after an ANS account mismatch is resolved", () => {
  const result = setup(); message(result.frame, result.nonce);
  mocks.session.data.user.id = "member-b";
  result.rerender(<ToonflowWorkspace {...props} />);
  expect(screen.queryByTitle("frameTitle")).not.toBeInTheDocument();
  mocks.session.data.user.id = "member-a";
  result.rerender(<ToonflowWorkspace {...props} />);
  expect(screen.getByTitle("frameTitle")).toHaveClass("invisible");
});

it("hides a reloaded frame until a new load-bound handshake and rejects the previous nonce", () => {
  const { frame, nonce: oldNonce, send } = setup(); message(frame, oldNonce);
  fireEvent.load(frame);
  expect(frame).toHaveClass("invisible");
  const nonce = send.mock.calls.at(-1)![0].nonce;
  expect(nonce).not.toBe(oldNonce);
  message(frame, oldNonce); expect(frame).toHaveClass("invisible");
  act(() => { vi.advanceTimersByTime(20_001); });
  expect(screen.getByRole("status")).toHaveTextContent("unavailable.title");
});


function escapeMessage(frame: HTMLIFrameElement, nonce: string, overrides: Record<string, unknown> = {}, trustedOrigin = origin, source: MessageEventSource | null = frame.contentWindow) {
  act(() => { window.dispatchEvent(new MessageEvent("message", { source, origin: trustedOrigin, data: { type: "ans.toonflow.escape", version: 1, nonce, ...overrides } })); });
}
it("collapses on an authenticated child Escape, restores toggle focus and keeps the same connection", () => {
  const { frame, nonce, send } = setup(); message(frame, nonce);
  const count = send.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "expand" }));
  escapeMessage(frame, nonce);
  const toggle = screen.getByRole("button", { name: "expand" });
  expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(toggle).toHaveFocus();
  expect(screen.getByTitle("frameTitle")).toBe(frame);
  expect(frame).toHaveClass("visible");
  expect(send).toHaveBeenCalledTimes(count);
  fireEvent.click(toggle);
  escapeMessage(frame, nonce);
  expect(screen.getByRole("button", { name: "expand" })).toHaveAttribute("aria-pressed", "false");
  expect(send).toHaveBeenCalledTimes(count);
});
it("ignores child Escape before connection and from spoofed origins, sources, nonces and versions", () => {
  const { frame, nonce } = setup();
  fireEvent.click(screen.getByRole("button", { name: "expand" }));
  escapeMessage(frame, nonce);
  expect(screen.getByRole("button", { name: "collapse" })).toHaveAttribute("aria-pressed", "true");
  message(frame, nonce);
  escapeMessage(frame, nonce, {}, "https://untrusted.invalid");
  escapeMessage(frame, nonce, {}, origin, window);
  escapeMessage(frame, "stale-nonce");
  escapeMessage(frame, nonce, { version: 2 });
  expect(screen.getByRole("button", { name: "collapse" })).toHaveAttribute("aria-pressed", "true");
  escapeMessage(frame, nonce);
  expect(screen.getByRole("button", { name: "expand" })).toHaveAttribute("aria-pressed", "false");
});
it.each(["login_required", "account_mismatch", "unavailable"])("ignores child Escape after the connection becomes %s", (state) => {
  const { frame, nonce } = setup(); message(frame, nonce);
  fireEvent.click(screen.getByRole("button", { name: "expand" }));
  message(frame, nonce, state);
  escapeMessage(frame, nonce);
  expect(screen.getByRole("button", { name: "collapse" })).toHaveAttribute("aria-pressed", "true");
});

function leaveResult(frame: HTMLIFrameElement, nonce: string, requestId: string, status = "saved", overrides: Record<string, unknown> = {}, trustedOrigin = origin, source: MessageEventSource | null = frame.contentWindow) {
  act(() => { window.dispatchEvent(new MessageEvent("message", { source, origin: trustedOrigin, data: { type: "ans.toonflow.leaveResult", version: 1, nonce, requestId, status, ...overrides } })); });
}
it("waits for trusted save confirmation before returning and sends only one request", () => {
  const { frame, nonce, send } = setup(); message(frame, nonce);
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  const request = send.mock.calls.at(-1)![0];
  expect(request).toEqual({ type: "ans.toonflow.prepareLeave", version: 1, nonce, requestId: expect.any(String) });
  expect(send.mock.calls.at(-1)![1]).toBe(origin);
  expect(screen.getByRole("status")).toHaveTextContent("saving");
  expect(mocks.push).not.toHaveBeenCalled();
  const count = send.mock.calls.length;
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  expect(send).toHaveBeenCalledTimes(count);
  leaveResult(frame, nonce, request.requestId);
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith("/workspace");
  leaveResult(frame, nonce, request.requestId);
  expect(mocks.push).toHaveBeenCalledTimes(1);
});
it("rejects save confirmations from a spoofed origin, source, nonce, request, version or status", () => {
  const { frame, nonce, send } = setup(); message(frame, nonce);
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  const id = send.mock.calls.at(-1)![0].requestId;
  leaveResult(frame, nonce, id, "saved", {}, "https://untrusted.invalid");
  leaveResult(frame, nonce, id, "saved", {}, origin, window);
  leaveResult(frame, "stale", id);
  leaveResult(frame, nonce, "stale");
  leaveResult(frame, nonce, id, "saved", { version: 2 });
  leaveResult(frame, nonce, id, "unknown");
  expect(mocks.push).not.toHaveBeenCalled();
  expect(screen.getByTitle("frameTitle")).toBe(frame);
  leaveResult(frame, nonce, id);
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith("/workspace");
});
it.each(["failed", "timeout"])("retains the frame on %s and a fresh retry rejects late success", (status) => {
  const { frame, nonce, send } = setup(); message(frame, nonce);
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  const oldId = send.mock.calls.at(-1)![0].requestId;
  if (status === "timeout") act(() => vi.advanceTimersByTime(20_001));
  else leaveResult(frame, nonce, oldId, "failed");
  expect(screen.getByRole("alert")).toHaveTextContent("saveFailed");
  expect(screen.getByTitle("frameTitle")).toBe(frame);
  leaveResult(frame, nonce, oldId);
  expect(mocks.push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  const newId = send.mock.calls.at(-1)![0].requestId;
  expect(newId).not.toBe(oldId);
  leaveResult(frame, nonce, oldId);
  expect(mocks.push).not.toHaveBeenCalled();
  leaveResult(frame, nonce, newId);
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith("/workspace");
});
it("does not discard a previously connected workspace on a retry while it is unavailable", () => {
  const { frame, nonce } = setup(); message(frame, nonce); message(frame, nonce, "unavailable");
  fireEvent.click(screen.getByRole("button", { name: "retry" }));
  expect(screen.getByTitle("frameTitle")).toBe(frame);
  expect(screen.getByRole("status")).toHaveTextContent("connecting.title");
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  expect(mocks.push).not.toHaveBeenCalled();
});
it("requires saving before retrying an account-valid recovered workspace", () => {
  const { frame, nonce, send } = setup(); message(frame, nonce); message(frame, nonce, "unavailable");
  fireEvent.click(screen.getByRole("button", { name: "retry" }));
  const revalidation = send.mock.calls.at(-1)![0];
  expect(revalidation.type).toBe("ans.toonflow.revalidate");
  message(frame, nonce, "connected", { requestId: revalidation.requestId });
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  expect(send.mock.calls.at(-1)![0].type).toBe("ans.toonflow.prepareLeave");
  expect(screen.getByTitle("frameTitle")).toBe(frame);
  leaveResult(frame, nonce, send.mock.calls.at(-1)![0].requestId);
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith("/workspace");
});
it.each(["loading", "unauthenticated", "switched"])("immediately discards the frame without saving when identity becomes %s", (status) => {
  const result = setup(); message(result.frame, result.nonce);
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  const id = result.send.mock.calls.at(-1)![0].requestId;
  if (status === "switched") mocks.session.data.user.id = "member-b";
  else mocks.session.status = status;
  result.rerender(<ToonflowWorkspace {...props} />);
  expect(screen.queryByTitle("frameTitle")).not.toBeInTheDocument();
  leaveResult(result.frame, result.nonce, id);
  act(() => vi.advanceTimersByTime(20_001));
  expect(mocks.push).not.toHaveBeenCalled();
});
it("invalidates a pending return when the iframe reloads", () => {
  const { frame, nonce, send } = setup(); message(frame, nonce);
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  const id = send.mock.calls.at(-1)![0].requestId;
  fireEvent.load(frame);
  leaveResult(frame, nonce, id);
  expect(mocks.push).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("saveFailed");
});
it("keeps new-tab clicks independent of saving in the current workspace", () => {
  const { frame, nonce, send } = setup(); message(frame, nonce); send.mockClear();
  fireEvent.click(screen.getByRole("link", { name: "back" }), { ctrlKey: true });
  expect(send).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
});

it("keeps the child locked after saving when an uncancellable navigation is delayed", () => {
  const { frame, nonce, send } = setup(); message(frame, nonce);
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  const id = send.mock.calls.at(-1)![0].requestId;
  leaveResult(frame, nonce, id);
  expect(mocks.push).toHaveBeenCalledTimes(1);
  const count = send.mock.calls.length;
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  expect(send).toHaveBeenCalledTimes(count);
  act(() => vi.advanceTimersByTime(20_001));
  expect(send).toHaveBeenCalledTimes(count);
  expect(screen.getByRole("status")).toHaveTextContent("navigating");
  expect(screen.getByRole("button", { name: "reloadSaved" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  expect(send).toHaveBeenCalledTimes(count);
  expect(mocks.push).toHaveBeenCalledTimes(1);
});
it("requires explicit discard confirmation to reconnect an interrupted workspace", () => {
  const { frame, nonce } = setup(); message(frame, nonce); message(frame, nonce, "unavailable");
  fireEvent.click(screen.getByRole("button", { name: "discardReconnect" }));
  expect(screen.getByRole("alertdialog")).toHaveTextContent("discardBody");
  fireEvent.click(screen.getByRole("button", { name: "keepPage" }));
  expect(screen.getByTitle("frameTitle")).toBe(frame);
  fireEvent.click(screen.getByRole("button", { name: "discardReconnect" }));
  fireEvent.click(screen.getByRole("button", { name: "discardConfirm" }));
  expect(screen.getByTitle("frameTitle")).not.toBe(frame);
  expect(screen.getByTitle("frameTitle")).toHaveClass("invisible");
});
it("cancels an outstanding save on interruption and rejects the late acknowledgment", () => {
  const { frame, nonce, send } = setup(); message(frame, nonce);
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  const id = send.mock.calls.at(-1)![0].requestId;
  message(frame, nonce, "unavailable");
  expect(send.mock.calls.at(-1)![0].type).toBe("ans.toonflow.cancelLeave");
  leaveResult(frame, nonce, id);
  expect(mocks.push).not.toHaveBeenCalled();
  expect(screen.getByTitle("frameTitle")).toBe(frame);
});


it("saves before global navigation and keeps the first destination during repeated clicks", () => {
  window.history.replaceState(null, "", "/workflows/toonflow");
  const { frame, nonce, send } = setup(true); message(frame, nonce);
  fireEvent.click(screen.getByRole("link", { name: "global-explore" }));
  const request = send.mock.calls.at(-1)![0];
  expect(request.type).toBe("ans.toonflow.prepareLeave");
  fireEvent.click(screen.getByRole("link", { name: "product.nav.workspace" }));
  expect(send.mock.calls.at(-1)![0]).toBe(request);
  expect(mocks.push).not.toHaveBeenCalled();
  leaveResult(frame, nonce, request.requestId);
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith("/explore", { scroll: undefined });
});
it("protects actual mobile navigation and retains the iframe after save failure", () => {
  const { frame, nonce, send } = setup(true); message(frame, nonce);
  fireEvent.click(screen.getByRole("link", { name: "product.nav.workspace" }));
  leaveResult(frame, nonce, send.mock.calls.at(-1)![0].requestId, "failed");
  expect(mocks.push).not.toHaveBeenCalled();
  expect(screen.getByTitle("frameTitle")).toBe(frame);
  expect(screen.getByRole("alert")).toHaveTextContent("saveFailed");
  fireEvent.click(screen.getByRole("link", { name: "product.nav.workspace" }));
  leaveResult(frame, nonce, send.mock.calls.at(-1)![0].requestId);
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith("/workspace", { scroll: undefined });
});
it("does not request saving for same-document, cancelled or modified global links", () => {
  window.history.replaceState(null, "", "/workflows/toonflow");
  const { frame, nonce, send } = setup(true); message(frame, nonce); send.mockClear();
  fireEvent.click(screen.getByRole("link", { name: "same-document" }));
  fireEvent.click(screen.getByRole("link", { name: "cancelled-link" }));
  fireEvent.click(screen.getByRole("link", { name: "global-explore" }), { ctrlKey: true });
  expect(send).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
});
it("does not navigate globally after the account changes during a pending save", () => {
  const result = setup(true); message(result.frame, result.nonce);
  fireEvent.click(screen.getByRole("link", { name: "global-explore" }));
  const id = result.send.mock.calls.at(-1)![0].requestId;
  mocks.session.data.user.id = "member-b";
  result.rerender(<WorkspaceNavigationProvider><ToonflowWorkspace {...props} /></WorkspaceNavigationProvider>);
  leaveResult(result.frame, result.nonce, id);
  expect(mocks.push).not.toHaveBeenCalled();
  expect(screen.queryByTitle("frameTitle")).not.toBeInTheDocument();
});
function unload() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}
it("warns on refresh or close only after a private workspace has connected", () => {
  const result = setup();
  expect(unload().defaultPrevented).toBe(false);
  message(result.frame, result.nonce);
  expect(unload().defaultPrevented).toBe(true);
  message(result.frame, result.nonce, "unavailable");
  expect(unload().defaultPrevented).toBe(true);
  result.unmount();
  expect(unload().defaultPrevented).toBe(false);
});
it("keeps the unload reminder during saving and releases it only for a trusted saved acknowledgment", () => {
  const { frame, nonce, send } = setup(); message(frame, nonce);
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  const id = send.mock.calls.at(-1)![0].requestId;
  expect(unload().defaultPrevented).toBe(true);
  leaveResult(frame, nonce, "stale");
  expect(unload().defaultPrevented).toBe(true);
  leaveResult(frame, nonce, id);
  expect(unload().defaultPrevented).toBe(false);
  act(() => vi.advanceTimersByTime(20_001));
  expect(unload().defaultPrevented).toBe(false);
});
it("removes the previous account's unload reminder during session invalidation", () => {
  const result = setup(); message(result.frame, result.nonce);
  mocks.session.status = "unauthenticated";
  result.rerender(<ToonflowWorkspace {...props} />);
  expect(unload().defaultPrevented).toBe(false);
});


it("preserves replacement, scrolling, display URL and transition types after saving", () => {
  const { frame, nonce, send } = setup(true); message(frame, nonce); send.mockClear();
  fireEvent.click(screen.getByRole("link", { name: "animated-replace" }));
  expect(mocks.replace).not.toHaveBeenCalled();
  const request = send.mock.calls.find(call => call[0].type === "ans.toonflow.prepareLeave")![0];
  leaveResult(frame, nonce, request.requestId);
  expect(mocks.replace).toHaveBeenCalledExactlyOnceWith("/workflows", { scroll: false, transitionTypes: ["slide-in"] });
  expect(mocks.push).not.toHaveBeenCalled();
});


it("rechecks the same actor in place without requesting save or discarding drafts", () => {
  const { frame, nonce, send } = setup(); message(frame, nonce); message(frame, nonce, "unavailable");
  send.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "retry" }));
  const request = send.mock.calls.at(-1)![0];
  expect(request).toEqual({ type: "ans.toonflow.revalidate", version: 1, nonce, userId: "member-a", requestId: expect.any(String) });
  expect(send).toHaveBeenCalledTimes(1);
  expect(frame).toHaveClass("invisible");
  message(frame, nonce); // Old connected notification cannot confirm this retry.
  expect(frame).toHaveClass("invisible");
  message(frame, nonce, "connected", { requestId: "stale" });
  expect(frame).toHaveClass("invisible");
  message(frame, nonce, "connected", { requestId: request.requestId });
  expect(screen.getByTitle("frameTitle")).toBe(frame);
  expect(frame).toHaveClass("visible");
  expect(mocks.push).not.toHaveBeenCalled();
});
it("keeps the actor hidden on revalidation timeout and rejects a late result after account replacement", () => {
  const result = setup(); message(result.frame, result.nonce); message(result.frame, result.nonce, "unavailable");
  fireEvent.click(screen.getByRole("button", { name: "retry" }));
  const request = result.send.mock.calls.at(-1)![0];
  act(() => vi.advanceTimersByTime(20_001));
  expect(result.frame).toHaveClass("invisible");
  expect(screen.getByRole("status")).toHaveTextContent("unavailable.title");
  mocks.session.data.user.id = "member-b";
  result.rerender(<ToonflowWorkspace {...props} />);
  message(result.frame, result.nonce, "connected", { requestId: request.requestId });
  expect(screen.queryByTitle("frameTitle")).not.toBeInTheDocument();
  expect(mocks.push).not.toHaveBeenCalled();
});

it("rejects late results after timeout for the same actor and requires a fresh retry owner", () => {
  const { frame, nonce, send } = setup(); message(frame, nonce); message(frame, nonce, "unavailable");
  fireEvent.click(screen.getByRole("button", { name: "retry" }));
  const first = send.mock.calls.at(-1)![0];
  act(() => vi.advanceTimersByTime(20_001));
  message(frame, nonce, "connected", { requestId: first.requestId });
  message(frame, nonce);
  expect(frame).toHaveClass("invisible");
  fireEvent.click(screen.getByRole("button", { name: "retry" }));
  const second = send.mock.calls.at(-1)![0];
  expect(second.requestId).not.toBe(first.requestId);
  message(frame, nonce, "unavailable", { requestId: first.requestId });
  message(frame, nonce, "connected", { requestId: first.requestId });
  expect(frame).toHaveClass("invisible");
  message(frame, nonce, "connected", { requestId: second.requestId });
  expect(frame).toHaveClass("visible");
});

// Opt in to the actual sibling checkout. No Toonflow test files or copied
// production implementation are created; the existing ANS test entry compiles
// and exercises the working child source directly.
const childSourceRoot = process.env.ANS_TOONFLOW_SOURCE_ROOT;
describe.skipIf(!childSourceRoot)("actual Toonflow child identity recovery", () => {
  type ChildMessage = { type: string; nonce?: string; userId?: string; requestId?: string; status?: string; version?: number };
  async function flushChild() { for (let index = 0; index < 32; index++) await Promise.resolve(); }
  function childFixture() {
    const listeners = new Map<string, Set<(event: object) => void>>();
    const posted: ChildMessage[] = [];
    const parent = { postMessage: (message: ChildMessage) => posted.push(message) };
    const privatePanel = document.createElement("div"); privatePanel.textContent = "unsaved private draft"; document.body.append(privatePanel);
    let response: () => Promise<Response> = async () => new Response(JSON.stringify({ data: { integration: { parentOrigin: "https://ans.example.test" }, authenticated: true, user: { sub: "member-a" } } }));
    let dataResponse: () => Promise<Response> = async () => new Response("ok");
    const transport = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => String(input).includes("/api/auth/oidc/session") ? response() : dataResponse());
    const childWindow = {
      parent, location: { href: origin + "/?ans_embed=1", search: "?ans_embed=1", origin }, fetch: transport as typeof fetch,
      addEventListener: (type: string, listener: (event: object) => void) => { const entries = listeners.get(type) ?? new Set(); entries.add(listener); listeners.set(type, entries); },
      removeEventListener: (type: string, listener: (event: object) => void) => listeners.get(type)?.delete(listener),
    };
    const workspaceLeavePending = { value: false };
    const cancelSave = vi.fn(), flushSave = vi.fn(async () => {}), save = vi.fn(async () => true), accountLost = vi.fn();
    const sandbox: Record<string, unknown> = { window: childWindow, document, HTMLElement, MutationObserver, Request, Response, URL, URLSearchParams, AbortController, AbortSignal, Promise, Symbol, setTimeout, clearTimeout, setInterval, clearInterval };
    sandbox.fetch = (input: RequestInfo | URL, init?: RequestInit) => childWindow.fetch(input, init);
    function compile(file: string, dependencies: Record<string, unknown>) {
      const exports: Record<string, unknown> = {};
      const code = transpileModule(readFileSync(join(childSourceRoot!, "apps/web/src/lib", file), "utf8"), { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 } }).outputText;
      runInNewContext(code, { ...sandbox, exports, require: (name: string) => {
        if (!Object.hasOwn(dependencies, name)) throw new Error("Unexpected child dependency: " + name);
        return dependencies[name];
      } });
      return exports;
    }
    const identity = compile("ansIdentity.ts", { vue: { shallowRef: (value: boolean) => ({ value }) } }) as {
      ansIdentityPending: { value: boolean }; assertAnsIdentity(): void; ansIdentitySignal(signal?: AbortSignal): AbortSignal | undefined;
      registerAnsIdentityClient(client: unknown): () => void;
    };
    const bridge = compile("ansEmbed.ts", {
      "element-plus": { ElMessage: { error: vi.fn() } }, "@toonflow/i18n/vue": { translate: (value: string) => value },
      "@/lib/mcpControl": { cancelWorkspaceSave: cancelSave, flushWorkspaceSave: flushSave, workspaceLeavePending },
      "@/stores/settings": { saveSettings: save }, "@/lib/ansIdentity": identity,
    }) as { prepareAnsEmbed(callback: () => void): Promise<{ ready(): Promise<void>; stop(): void }>; lockWorkspaceEditing(message?: string, identityCheck?: boolean): () => void };
    const nonce = "10000000-0000-4000-8000-000000000001";
    const requestId = "20000000-0000-4000-8000-000000000001";
    function emit(data: ChildMessage, trustedOrigin = "https://ans.example.test", source: object = parent) {
      for (const listener of listeners.get("message") ?? []) listener({ source, origin: trustedOrigin, data: { version: 1, ...data } });
    }
    async function mount(beforeReady?: () => void) {
      const mounting = bridge.prepareAnsEmbed(accountLost); await flushChild();
      emit({ type: "ans.toonflow.connect", nonce, userId: "member-a" });
      await flushChild(); const mounted = await mounting; beforeReady?.(); await mounted.ready();
      return mounted;
    }
    return { posted, privatePanel, workspaceLeavePending, transport, identity, bridge, nonce, requestId, emit, mount, accountLost, cancelSave, flushSave, save,
      setResponse: (next: () => Promise<Response>) => { response = next; },
      setDataResponse: (next: () => Promise<Response>) => { dataResponse = next; },
      listenerCount: () => [...listeners.values()].reduce((total, set) => total + set.size, 0),
      disconnect: () => { response = async () => { throw new TypeError("synthetic network unavailable"); }; },
      recover: (sub = "member-a", authenticated = true) => { response = async () => new Response(JSON.stringify({ data: { integration: { parentOrigin: "https://ans.example.test" }, authenticated, user: { sub } } })); },
      focus: () => { for (const listener of listeners.get("focus") ?? []) listener({}); },
      fetch: (path: string) => childWindow.fetch(path),
      event: (type: string) => { const event = new Event(type, { cancelable: true }); for (const listener of listeners.get(type) ?? []) listener(event); return event; },
      dispose: () => { privatePanel.remove(); },
    };
  }
  it("retains drafts but blocks keyboard, tasks, uploads and programmatic I/O until the same actor is reverified", async () => {
    const child = childFixture(); const mounted = await child.mount();
    const running = child.identity.ansIdentitySignal()!;
    child.disconnect(); child.focus(); await flushChild();
    expect(child.accountLost).not.toHaveBeenCalled();
    expect(child.privatePanel.textContent).toBe("unsaved private draft");
    expect(child.privatePanel.inert).toBe(true);
    expect(child.identity.ansIdentityPending.value).toBe(true);
    expect(running.aborted).toBe(true);
    expect(child.event("keydown").defaultPrevented).toBe(true);
    expect(child.event("paste").defaultPrevented).toBe(true);
    const calls = child.transport.mock.calls.length;
    await expect(child.fetch("/api/agent")).rejects.toThrow();
    await expect(child.fetch("/api/upload")).rejects.toThrow();
    expect(() => child.identity.assertAnsIdentity()).toThrow();
    expect(child.transport).toHaveBeenCalledTimes(calls);
    child.recover();
    child.emit({ type: "ans.toonflow.revalidate", nonce: child.nonce, userId: "member-a", requestId: child.requestId });
    await flushChild();
    expect(child.identity.ansIdentityPending.value).toBe(false);
    expect(child.privatePanel.inert).not.toBe(true);
    expect(child.posted.at(-1)).toMatchObject({ status: "connected", requestId: child.requestId });
    expect(child.flushSave).not.toHaveBeenCalled();
    mounted.stop(); child.dispose();
  });
  it.each(["different actor", "logged out"])("isolates and unmounts on confirmed %s without persisting old drafts", async (reason) => {
    const child = childFixture(); await child.mount(); child.disconnect(); child.focus(); await flushChild();
    child.recover("member-b", reason !== "logged out");
    child.emit({ type: "ans.toonflow.revalidate", nonce: child.nonce, userId: "member-a", requestId: child.requestId });
    await flushChild();
    expect(child.accountLost).toHaveBeenCalledTimes(1);
    expect(child.cancelSave).toHaveBeenCalledTimes(1);
    expect(child.save).not.toHaveBeenCalled();
    expect(child.identity.ansIdentityPending.value).toBe(true);
    await expect(child.fetch("/api/agent")).rejects.toThrow();
    child.dispose();
  });
  it("rejects spoofed retry identities and a late successful verification from a superseded nonce", async () => {
    const child = childFixture(); await child.mount(); child.disconnect(); child.focus(); await flushChild();
    const calls = child.transport.mock.calls.length;
    child.emit({ type: "ans.toonflow.revalidate", nonce: child.nonce, userId: "member-b", requestId: child.requestId });
    child.emit({ type: "ans.toonflow.revalidate", nonce: child.nonce, userId: "member-a", requestId: child.requestId }, "https://spoof.invalid");
    expect(child.transport).toHaveBeenCalledTimes(calls);
    let resolveOld!: (value: Response) => void;
    child.setResponse(() => new Promise(resolve => { resolveOld = resolve; }));
    child.emit({ type: "ans.toonflow.revalidate", nonce: child.nonce, userId: "member-a", requestId: child.requestId });
    await flushChild();
    child.emit({ type: "ans.toonflow.connect", nonce: "30000000-0000-4000-8000-000000000001", userId: "member-b" });
    resolveOld(new Response(JSON.stringify({ data: { integration: { parentOrigin: "https://ans.example.test" }, authenticated: true, user: { sub: "member-a" } } })));
    await flushChild();
    expect(child.accountLost).toHaveBeenCalledTimes(1);
    expect(child.identity.ansIdentityPending.value).toBe(true);
    expect(child.posted.at(-1)?.status).not.toBe("connected");
    child.dispose();
  });

  it("keeps a transient ready verification failure recoverable in the same mounted page", async () => {
    const child = childFixture(); const mounted = await child.mount(() => child.disconnect());
    expect(child.accountLost).not.toHaveBeenCalled();
    expect(child.privatePanel.inert).toBe(true);
    child.recover();
    child.emit({ type: "ans.toonflow.revalidate", nonce: child.nonce, userId: "member-a", requestId: child.requestId });
    await flushChild();
    expect(child.privatePanel.inert).not.toBe(true);
    expect(child.posted.at(-1)).toMatchObject({ status: "connected", requestId: child.requestId });
    mounted.stop(); expect(child.listenerCount()).toBe(0); child.dispose();
  });
  it("does not register bridge listeners or expose a workspace when the initial session fails", async () => {
    const child = childFixture(); child.disconnect();
    await expect(child.bridge.prepareAnsEmbed(child.accountLost)).rejects.toThrow();
    expect(child.listenerCount()).toBe(0);
    expect(child.identity.ansIdentityPending.value).toBe(true);
    await expect(child.fetch("/api/agent")).rejects.toThrow();
    child.dispose();
  });
  it("keeps an independent editing lock after identity recovery releases its own owner", async () => {
    const child = childFixture(); const mounted = await child.mount();
    const release = child.bridge.lockWorkspaceEditing();
    child.disconnect(); child.focus(); await flushChild();
    child.recover();
    child.emit({ type: "ans.toonflow.revalidate", nonce: child.nonce, userId: "member-a", requestId: child.requestId });
    await flushChild();
    expect(child.identity.ansIdentityPending.value).toBe(false);
    expect(child.privatePanel.inert).toBe(true);
    expect(child.workspaceLeavePending.value).toBe(true);
    release(); expect(child.privatePanel.inert).not.toBe(true);
    mounted.stop(); child.dispose();
  });
  it("rejects old fetch results even when transport ignores cancellation and identity later recovers", async () => {
    const child = childFixture(); const mounted = await child.mount();
    let finish!: (value: Response) => void;
    child.setDataResponse(() => new Promise(resolve => { finish = resolve; }));
    const pending = child.fetch("/api/upload");
    const rejected = expect(pending).rejects.toThrow();
    child.disconnect(); child.focus(); await flushChild(); child.recover();
    child.emit({ type: "ans.toonflow.revalidate", nonce: child.nonce, userId: "member-a", requestId: child.requestId });
    await flushChild(); finish(new Response("stale result")); await rejected;
    mounted.stop(); child.dispose();
  });
  it("fences Axios requests and responses with their original identity lifetime", async () => {
    const child = childFixture(); const mounted = await child.mount();
    let request!: (value: { signal?: AbortSignal }) => { signal?: AbortSignal };
    let response!: (value: { config: { signal?: AbortSignal } }) => unknown;
    const eject = vi.fn();
    const stop = child.identity.registerAnsIdentityClient({ interceptors: {
      request: { use: (handler: typeof request) => { request = handler; return 1; }, eject },
      response: { use: (handler: typeof response) => { response = handler; return 2; }, eject },
    } });
    const config = request({});
    child.disconnect(); child.focus(); await flushChild();
    expect(config.signal?.aborted).toBe(true);
    expect(() => request({})).toThrow();
    child.recover();
    child.emit({ type: "ans.toonflow.revalidate", nonce: child.nonce, userId: "member-a", requestId: child.requestId });
    await flushChild();
    expect(() => response({ config })).toThrow();
    expect(response({ config: request({}) })).toBeTruthy();
    stop(); expect(eject).not.toHaveBeenCalled();
    mounted.stop(); expect(() => request({})).toThrow(); child.dispose();
  });
  it("never acknowledges a late save after identity uncertainty cancelled that leave request", async () => {
    const child = childFixture(); const mounted = await child.mount();
    let finish!: () => void;
    child.flushSave.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    child.emit({ type: "ans.toonflow.prepareLeave", nonce: child.nonce, requestId: child.requestId });
    await flushChild(); expect(child.flushSave).toHaveBeenCalledTimes(1);
    child.disconnect(); child.focus(); await flushChild();
    expect(child.posted).toContainEqual(expect.objectContaining({ type: "ans.toonflow.leaveResult", requestId: child.requestId, status: "failed" }));
    child.recover();
    child.emit({ type: "ans.toonflow.revalidate", nonce: child.nonce, userId: "member-a", requestId: "40000000-0000-4000-8000-000000000001" });
    await flushChild(); finish(); await flushChild();
    expect(child.save).not.toHaveBeenCalled();
    expect(child.posted).not.toContainEqual(expect.objectContaining({ type: "ans.toonflow.leaveResult", requestId: child.requestId, status: "saved" }));
    mounted.stop(); child.dispose();
  });
});
