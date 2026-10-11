import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToonflowHostProvider } from "@/components/providers/toonflow-host";
import { WorkspaceNavigationProvider, WorkspaceLink } from "@/components/providers/workspace-navigation";
import { ToonflowWorkspace } from "@/components/workspace/toonflow-workspace";

const mocks = vi.hoisted(() => ({ path: "/workflows/toonflow", push: vi.fn(), replace: vi.fn(), session: { status: "authenticated", data: { user: { id: "member-a" } } } }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.path, useRouter: () => ({ push: mocks.push, replace: mocks.replace }) }));
vi.mock("next-auth/react", () => ({ useSession: () => mocks.session }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/dynamic", async () => {
  const { lazy } = await import("react");
  return { default: (loader: () => Promise<React.ComponentType>) => lazy(async () => ({ default: await loader() })) };
});
vi.mock("next/link", () => ({ default: ({ onNavigate, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { onNavigate?: (event: { preventDefault(): void }) => void }) => <a {...props} onClick={event => { onNavigate?.(event); event.preventDefault(); }} /> }));
const origin = "https://toonflow.cauai.fun";
const config = { origin, src: origin + "/?ans_embed=1", loginUrl: origin + "/login", userId: "member-a" };
function App({ enabled = true, userId = "member-a" }: { enabled?: boolean; userId?: string }) {
  return <WorkspaceNavigationProvider><ToonflowHostProvider>
    <WorkspaceLink href="/explore">global</WorkspaceLink>
    {mocks.path === "/workflows/toonflow" && enabled && <ToonflowWorkspace {...config} userId={userId} />}
  </ToonflowHostProvider></WorkspaceNavigationProvider>;
}
beforeEach(() => {
  mocks.path = "/workflows/toonflow";
  mocks.session = { status: "authenticated", data: { user: { id: "member-a" } } };
  mocks.push.mockReset(); mocks.replace.mockReset();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function setup() {
  const result = render(<App />);
  const frame = await screen.findByTitle("frameTitle") as HTMLIFrameElement;
  const send = vi.spyOn(frame.contentWindow!, "postMessage");
  fireEvent.load(frame);
  const nonce = send.mock.calls.at(-1)![0].nonce as string;
  message(frame, { type: "ans.toonflow.state", version: 1, nonce, status: "connected", capability: "workspace-v1" });
  return { ...result, frame, send, nonce };
}
function message(frame: HTMLIFrameElement, data: object) {
  act(() => window.dispatchEvent(new MessageEvent("message", { origin, source: frame.contentWindow, data })));
}
function acknowledge(result: Awaited<ReturnType<typeof setup>>, requestId: string, status = "saved") {
  message(result.frame, { type: "ans.toonflow.leaveResult", version: 1, nonce: result.nonce, requestId, status });
}
function route(result: ReturnType<typeof render>, path: string) { mocks.path = path; result.rerender(<App />); }
it("creates no workspace until the opt-in, authenticated page registers", async () => {
  mocks.path = "/explore";
  const result = render(<App />);
  expect(screen.queryByTitle("frameTitle")).not.toBeInTheDocument();
  mocks.path = "/workflows/toonflow"; result.rerender(<App enabled={false} />);
  expect(screen.queryByTitle("frameTitle")).not.toBeInTheDocument();
  result.rerender(<App />);
  expect(await screen.findByTitle("frameTitle")).toBeInTheDocument();
});
it("keeps the actual iframe through page unmount and native route return, hidden and inert while away", async () => {
  const result = await setup(); result.send.mockClear();
  route(result, "/explore");
  expect(screen.getByTitle("frameTitle")).toBe(result.frame);
  expect(result.frame.closest("[data-toonflow-host]")).toHaveAttribute("hidden");
  expect(result.frame.closest("[data-toonflow-host]")).toHaveAttribute("inert");
  expect(result.send).not.toHaveBeenCalled();
  route(result, "/workflows/toonflow");
  expect(screen.getByTitle("frameTitle")).toBe(result.frame);
  expect(result.frame.closest("[data-toonflow-host]")).not.toHaveAttribute("hidden");
  expect(result.send).not.toHaveBeenCalled();
});
it("removes the hidden workspace navigation guard", async () => {
  const result = await setup(); route(result, "/explore"); result.send.mockClear();
  fireEvent.click(screen.getByRole("link", { name: "global" }));
  expect(result.send).not.toHaveBeenCalled();
});
it("releases the original save owner after actual route departure and permits a fresh return", async () => {
  const result = await setup();
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  const request = result.send.mock.calls.at(-1)![0];
  acknowledge(result, request.requestId);
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith("/workspace");
  route(result, "/workspace");
  expect(result.send.mock.calls.at(-1)![0]).toEqual({ type: "ans.toonflow.cancelLeave", version: 1, nonce: result.nonce, requestId: request.requestId });
  route(result, "/workflows/toonflow");
  expect(screen.getByTitle("frameTitle")).toBe(result.frame);
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  const next = result.send.mock.calls.at(-1)![0];
  expect(next.type).toBe("ans.toonflow.prepareLeave"); expect(next.requestId).not.toBe(request.requestId);
  acknowledge(result, next.requestId);
  expect(mocks.push).toHaveBeenCalledTimes(2);
});
it("cancels an in-flight save on native departure and rejects its late acknowledgment", async () => {
  const result = await setup();
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  const request = result.send.mock.calls.at(-1)![0];
  route(result, "/explore");
  expect(result.send.mock.calls.at(-1)![0].type).toBe("ans.toonflow.cancelLeave");
  acknowledge(result, request.requestId);
  expect(mocks.push).not.toHaveBeenCalled();
  route(result, "/workflows/toonflow");
  expect(screen.queryByText("navigating")).not.toBeInTheDocument();
});
it("retains the frame and current page after a failed explicit save", async () => {
  const result = await setup();
  fireEvent.click(screen.getByRole("link", { name: "back" }));
  acknowledge(result, result.send.mock.calls.at(-1)![0].requestId, "failed");
  expect(mocks.push).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("saveFailed");
  expect(screen.getByTitle("frameTitle")).toBe(result.frame);
});
it.each(["loading", "unauthenticated", "switched"])("destroys hidden drafts on %s and never resurrects them without a page registration", async status => {
  const result = await setup(); route(result, "/explore");
  if (status === "switched") mocks.session.data.user.id = "member-b";
  else mocks.session.status = status;
  result.rerender(<App />);
  expect(screen.queryByTitle("frameTitle")).not.toBeInTheDocument();
  mocks.session = { status: "authenticated", data: { user: { id: "member-a" } } }; result.rerender(<App />);
  expect(screen.queryByTitle("frameTitle")).not.toBeInTheDocument();
  route(result, "/workflows/toonflow");
  const frame = await screen.findByTitle("frameTitle");
  expect(frame).not.toBe(result.frame);
});
it("re-registers the same authenticated route after revalidation without reusing the old frame", async () => {
  const result = await setup(); mocks.session.status = "loading"; result.rerender(<App />);
  expect(screen.queryByTitle("frameTitle")).not.toBeInTheDocument();
  mocks.session.status = "authenticated"; result.rerender(<App />);
  await waitFor(() => expect(screen.getByTitle("frameTitle")).not.toBe(result.frame));
});

it("closes a portal discard dialog on native departure without reopening it on return", async () => {
  const result = await setup();
  message(result.frame, { type: "ans.toonflow.state", version: 1, nonce: result.nonce, status: "unavailable" });
  fireEvent.click(screen.getByRole("button", { name: "discardReconnect" }));
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  route(result, "/explore");
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(screen.getByTitle("frameTitle")).toBe(result.frame);
  route(result, "/workflows/toonflow");
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(screen.getByTitle("frameTitle")).toBe(result.frame);
});
