import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { ToonflowHostProvider } from "@/components/providers/toonflow-host";
import { WorkspaceNavigationProvider } from "@/components/providers/workspace-navigation";
import { ToonflowWorkspace } from "@/components/workspace/toonflow-workspace";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(), fetch: vi.fn(), error: vi.fn(), logout: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() },
  translate: (key: string) => key,
}));
type AuthState = { status: "authenticated" | "unauthenticated" | "loading"; data: { user: { id: string; username: string; name: string; role: string } } | null };
const alice: AuthState = { status: "authenticated", data: { user: { id: "member-a", username: "alice", name: "Alice", role: "USER" } } };
const anonymous: AuthState = { status: "unauthenticated", data: null };
const AuthContext = createContext<AuthState>(alice);
let setAuth!: (next: AuthState) => void;
vi.mock("next-auth/react", () => ({ useSession: () => useContext(AuthContext), signOut: mocks.signOut }));
vi.mock("next/navigation", () => ({ usePathname: () => "/workflows/toonflow", useRouter: () => mocks.router }));
vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: (namespace?: string) => namespace ? (key: string) => `${namespace}.${key}` : mocks.translate }));
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));
vi.mock("@/lib/analytics", () => ({ analyticsAuth: { logout: mocks.logout }, analyticsSettings: { changeLanguage: vi.fn(), changeTheme: vi.fn() } }));
vi.mock("@/lib/i18n/client", () => ({ setLocale: vi.fn() }));
vi.mock("@/components/providers/branding-provider", () => ({ useBranding: () => ({ name: "ANS", logo: "", useCloneBranding: true }) }));
// Settings has its own regression suite; keep this fixture focused on the strict logout boundary.
vi.mock("@/components/settings/site-settings", () => ({ SiteSettings: () => null }));
vi.mock("@/components/layout/notification-bell", () => ({ NotificationBell: () => null }));
vi.mock("@/components/layout/bilingual-toggle", () => ({ BilingualToggle: () => null }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: ({ children, onNavigate: _navigate, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { onNavigate?: unknown }) => <a {...props} onClick={() => void _navigate}>{children}</a> }));
vi.mock("next/dynamic", async () => {
  const { lazy } = await import("react");
  return { default: (loader: () => Promise<React.ComponentType>) => lazy(async () => ({ default: await loader() })) };
});
vi.mock("@/components/ui/dropdown-menu", () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Item = ({ children, disabled, onClick, asChild }: { children?: ReactNode; disabled?: boolean; onClick?: () => void; asChild?: boolean }) => asChild ? <>{children}</> : <button disabled={disabled} onClick={onClick}>{children}</button>;
  return { DropdownMenu: Container, DropdownMenuContent: Container, DropdownMenuItem: Item, DropdownMenuLabel: Container, DropdownMenuSeparator: () => null, DropdownMenuTrigger: Container, DropdownMenuSub: Container, DropdownMenuSubTrigger: Container, DropdownMenuSubContent: Container };
});
vi.mock("@/components/ui/sheet", () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return { Sheet: Container, SheetContent: Container, SheetDescription: Container, SheetTitle: Container, SheetTrigger: Container };
});
vi.mock("@/components/ui/context-menu", () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return { ContextMenu: Container, ContextMenuContent: Container, ContextMenuItem: Container, ContextMenuTrigger: Container };
});
const origin = "https://toonflow.example.test";
function App() {
  const [auth, updateAuth] = useState<AuthState>(alice);
  useEffect(() => { setAuth = updateAuth; }, []);
  return <AuthContext.Provider value={auth}><WorkspaceNavigationProvider><ToonflowHostProvider>
    <Header />
    <ToonflowWorkspace origin={origin} src={origin + "/?ans_embed=1"} loginUrl={origin + "/login"} userId="member-a" />
  </ToonflowHostProvider></WorkspaceNavigationProvider></AuthContext.Provider>;
}
async function setup() {
  render(<App />);
  const frame = await screen.findByTitle("product.toonflow.embed.frameTitle") as HTMLIFrameElement;
  const send = vi.spyOn(frame.contentWindow!, "postMessage");
  fireEvent.load(frame);
  const nonce = send.mock.calls.at(-1)![0].nonce;
  act(() => window.dispatchEvent(new MessageEvent("message", { origin, source: frame.contentWindow, data: { type: "ans.toonflow.state", version: 1, nonce, status: "connected", capability: "workspace-v1" } })));
  const unload = new Event("beforeunload", { cancelable: true });window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  return { frame };
}
function deferred() {
  let resolve!: (value: { url: string }) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<{ url: string }>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.signOut.mockReset();mocks.router.replace.mockReset();mocks.router.refresh.mockReset();
  mocks.fetch.mockReset();mocks.fetch.mockResolvedValue({ ok: true, json: async () => null });
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup();vi.restoreAllMocks();vi.unstubAllGlobals(); });

it("invalidates the current session and unmounts the private host before SPA navigation, only after signOut resolves", async () => {
  const pending = deferred();mocks.signOut.mockImplementation(() => pending.promise);
  const { frame } = await setup();
  const order: string[] = [];
  mocks.router.replace.mockImplementation(() => {
    expect(screen.queryByTitle("product.toonflow.embed.frameTitle")).not.toBeInTheDocument();
    expect(document.querySelector("[data-toonflow-host]")).toBeNull();
    const unload = new Event("beforeunload", { cancelable: true });window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);order.push("replace");
  });
  mocks.router.refresh.mockImplementation(() => order.push("refresh"));
  fireEvent.click(screen.getByRole("button", { name: "nav.logout" }));
  expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith({ redirect: false, redirectTo: "/" });
  expect(screen.getByRole("button", { name: "product.loggingOut" })).toBeDisabled();
  expect(mocks.router.replace).not.toHaveBeenCalled();expect(frame).toBeInTheDocument();
  act(() => setAuth(anonymous));
  expect(frame).not.toBeInTheDocument();expect(mocks.router.replace).not.toHaveBeenCalled();
  await act(async () => { pending.resolve({ url: "/" });await pending.promise; });
  await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith("/"));
  expect(order).toEqual(["replace", "refresh"]);expect(mocks.logout).toHaveBeenCalledOnce();expect(mocks.error).not.toHaveBeenCalled();
});

it("does not navigate or claim logout on a network rejection and allows a fresh retry", async () => {
  mocks.signOut.mockRejectedValueOnce(new Error("network unavailable"));
  const { frame } = await setup();fireEvent.click(screen.getByRole("button", { name: "nav.logout" }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalledExactlyOnceWith("product.logoutFailed", expect.objectContaining({ action: expect.objectContaining({ label: "product.logoutRetry", onClick: expect.any(Function) }) })));
  expect(frame).toBeInTheDocument();expect(mocks.router.replace).not.toHaveBeenCalled();expect(mocks.router.refresh).not.toHaveBeenCalled();expect(mocks.logout).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "nav.logout" })).not.toBeDisabled();
  mocks.signOut.mockImplementationOnce(async () => { setAuth(anonymous);return { url: "/" }; });
  fireEvent.click(screen.getByRole("button", { name: "nav.logout" }));
  await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith("/"));
  expect(mocks.signOut).toHaveBeenCalledTimes(2);expect(frame).not.toBeInTheDocument();
});

it("rejects a resolved signOut when the current session never became anonymous (session-refresh failure)", async () => {
  mocks.signOut.mockResolvedValue({ url: "/" });
  const { frame } = await setup();fireEvent.click(screen.getByRole("button", { name: "nav.logout" }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalledExactlyOnceWith("product.logoutFailed", expect.objectContaining({ action: expect.objectContaining({ label: "product.logoutRetry", onClick: expect.any(Function) }) })));
  expect(mocks.router.replace).not.toHaveBeenCalled();expect(mocks.router.refresh).not.toHaveBeenCalled();expect(mocks.logout).not.toHaveBeenCalled();
  expect(frame).toBeInTheDocument();expect(screen.getByRole("button", { name: "nav.logout" })).not.toBeDisabled();
});

it("coalesces repeated clicks until the first signOut settles", async () => {
  const pending=deferred();mocks.signOut.mockImplementation(() => pending.promise);await setup();
  const button=screen.getByRole("button", { name: "nav.logout" });fireEvent.click(button);fireEvent.click(button);
  expect(mocks.signOut).toHaveBeenCalledTimes(1);
  await act(async () => { pending.reject(new Error("offline"));await pending.promise.catch(() => {}); });
  expect(screen.getByRole("button", { name: "nav.logout" })).not.toBeDisabled();
});

it.each(["http-error", "still-authenticated", "network-error"])("does not fake success after %s from the explicit session confirmation, even if Auth.js already reported anonymous", async failure => {
  mocks.signOut.mockImplementation(async () => { setAuth(anonymous);return { url: "/" }; });
  if (failure === "network-error") mocks.fetch.mockRejectedValueOnce(new Error("session fetch failed"));
  else mocks.fetch.mockResolvedValueOnce({ ok: failure !== "http-error", json: async () => failure === "still-authenticated" ? alice.data : null });
  const { frame }=await setup();fireEvent.click(screen.getByRole("button", { name: "nav.logout" }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalledOnce());
  expect(mocks.router.replace).not.toHaveBeenCalled();expect(mocks.router.refresh).not.toHaveBeenCalled();expect(mocks.logout).not.toHaveBeenCalled();
  expect(frame).not.toBeInTheDocument();
  expect(mocks.fetch).toHaveBeenCalledWith("/api/auth/session", { cache: "no-store" });
  // The toast can retry even when the local anonymous render removed the user menu.
  const retry=mocks.error.mock.calls[0][1].action.onClick;
  await act(async () => { retry(); });
  await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith("/"));
  expect(mocks.signOut).toHaveBeenCalledTimes(2);
});


it("exposes only two primary destinations and account utilities after language", () => {
  render(<App />);
  const expected = ["/explore", "/market"];
  for (const label of ["a11y.mainNav", "a11y.mobileNav"]) {
    const nav = screen.getByRole("navigation", { name: label });
    expect(Array.from(nav.querySelectorAll("a")).map(link => link.getAttribute("href"))).toEqual(expected);
    expect(nav.textContent).not.toContain("nav.more");
  }
  expect(screen.queryByRole("link", { name: "nav.developers" })).toBeNull();
  expect(screen.queryByRole("link", { name: "nav.prompts" })).toBeNull();
  expect(screen.getByRole("link", { name: "hubs.account.favorites" })).toHaveAttribute("href", "/collection");
  expect(screen.getByRole("link", { name: "hubs.account.compute" })).toHaveAttribute("href", "/workspace/credits");
  const language = screen.getByText("settings.language"), favorites = screen.getByRole("link", { name: "hubs.account.favorites" });
  expect(language.compareDocumentPosition(favorites) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
