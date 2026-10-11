import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HypitWorkspace } from "@/components/workspace/hypit-workspace";

const state = vi.hoisted(() => ({
  session: { status: "authenticated", data: { user: { id: "admin-a", role: "ADMIN" } } } as { status: string; data: { user: { id: string; role: string } } | null },
  register: vi.fn(), translate: (key: string) => key,
}));
vi.mock("next-auth/react", () => ({ useSession: () => state.session }));
vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: () => state.translate }));
vi.mock("next/link", () => ({ default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
vi.mock("@/components/providers/workspace-navigation", () => ({ useWorkspaceNavigation: () => ({ register: state.register }) }));
const fixture = {
  id: "private-a", title: "Owner A private video", brief: "Private facts", template: "chat", updatedAt: "2026-10-11T00:00:00Z",
  revision: 1, source: "<svml />", sourceHash: "original-sha", canRender: true, artifactAvailable: false, job: null,
};
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  state.session = { status: "authenticated", data: { user: { id: "admin-a", role: "ADMIN" } } };
  state.register.mockReset(); state.register.mockReturnValue(() => {});
  fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith("/projects") ? { projects: [fixture] } : fixture }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function openFixture() {
  fireEvent.click(await screen.findByRole("button", { name: /Owner A private video/ }));
  await screen.findByDisplayValue("Private facts");
}
it("does not mount private APIs while loading or signed out, and returns to the native login flow", () => {
  state.session = { status: "loading", data: null };
  const view = render(<HypitWorkspace />); expect(fetchMock).not.toHaveBeenCalled();
  state.session = { status: "unauthenticated", data: null }; view.rerender(<HypitWorkspace />);
  expect(screen.getByRole("link", { name: "login" })).toHaveAttribute("href", "/login?callbackUrl=%2Fworkflows%2Fhypit");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("does not expose the internal workspace to ordinary members", () => {
  state.session.data!.user.role = "USER"; render(<HypitWorkspace />);
  expect(screen.getByRole("status")).toHaveTextContent("restricted"); expect(fetchMock).not.toHaveBeenCalled();
});
it("clears private fields and aborts old requests on account change", async () => {
  const view = render(<HypitWorkspace />); await openFixture();
  let oldResponse!: (value: unknown) => void;
  fetchMock.mockImplementationOnce(() => new Promise(resolve => { oldResponse = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "refresh" }));
  const pendingSignal = fetchMock.mock.calls.at(-1)![1].signal as AbortSignal;
  state.session.data = { user: { id: "admin-b", role: "ADMIN" } };
  fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ projects: [] }) }));
  view.rerender(<HypitWorkspace />);
  expect(screen.queryByDisplayValue("Private facts")).not.toBeInTheDocument(); expect(pendingSignal.aborted).toBe(true);
  await act(async () => oldResponse({ ok: true, json: async () => ({ projects: [fixture] }) }));
  expect(screen.queryByText("Owner A private video")).not.toBeInTheDocument();
  await screen.findByText("empty");
});
it("submits revision and source hash, and preserves local edits after a server conflict", async () => {
  render(<HypitWorkspace />); await openFixture();
  fireEvent.change(screen.getByDisplayValue("Private facts"), { target: { value: "Keep my new draft" } });
  fetchMock.mockImplementation(async (_url: string, options: RequestInit) => options?.method === "PUT" ? { ok: false, json: async () => ({ error: "Source changed in Studio" }) } : { ok: true, json: async () => fixture });
  fireEvent.click(screen.getByRole("button", { name: "save" }));
  await screen.findByRole("alert");
  expect(screen.getByDisplayValue("Keep my new draft")).toBeInTheDocument();
  const [, options] = fetchMock.mock.calls.find(call => call[1]?.method === "PUT")!;
  expect(options.headers["X-ANS-Owner"]).toBe("admin-a");
  expect(JSON.parse(options.body)).toMatchObject({ revision: 1, expectedSourceHash: "original-sha", brief: "Keep my new draft" });
});
it("blocks paid template Studio and rendering while retaining editing and validation", async () => {
  fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.endsWith("/projects") ? { projects: [fixture] } : { ...fixture, template: "podcast", canRender: false } }));
  render(<HypitWorkspace />); await openFixture();
  expect(screen.getByRole("button", { name: "studio" })).toBeDisabled(); expect(screen.getByRole("button", { name: "render" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "check" })).not.toBeDisabled();
});
it("uses the existing navigation guard to preserve an unsaved draft", async () => {
  render(<HypitWorkspace />); await openFixture();
  fireEvent.change(screen.getByDisplayValue("Private facts"), { target: { value: "Unsaved private draft" } });
  await waitFor(() => expect(state.register).toHaveBeenCalled());
  const proceed = vi.fn(), cancel = vi.fn(); const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  act(() => state.register.mock.calls.at(-1)![0](proceed, cancel));
  expect(cancel).toHaveBeenCalledOnce(); expect(proceed).not.toHaveBeenCalled(); expect(confirm).toHaveBeenCalledWith("discard");
  expect(screen.getByDisplayValue("Unsaved private draft")).toBeInTheDocument();
});
it("collapses creation after opening a project and restores the unfinished new-project form", async () => {
  render(<HypitWorkspace />);
  fireEvent.change(screen.getByLabelText("name"), { target: { value: "Unfinished next project" } });
  await openFixture();
  expect(document.getElementById("hypit-new-project")).not.toBeVisible();
  expect(screen.getByRole("heading", { name: fixture.title })).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "newProject" }));
  expect(screen.getByDisplayValue("Unfinished next project")).toBeVisible();
});
it("explains unsaved output and keeps the draft when project loading fails", async () => {
  render(<HypitWorkspace />); await openFixture();
  fireEvent.change(screen.getByDisplayValue("Private facts"), { target: { value: "My unsaved composition" } });
  expect(screen.getByText("workspace.unsaved")).toBeVisible();
  expect(screen.getByText("workspace.draftHelp")).toBeVisible();
  fetchMock.mockImplementation(async () => ({ ok: false, json: async () => ({ error: "Could not read projects" }) }));
  fireEvent.click(screen.getByRole("button", { name: "refresh" }));
  await screen.findByText("workspace.listError");
  expect(screen.getByDisplayValue("My unsaved composition")).toBeInTheDocument();
});
it("hides outdated video and its download after editing a rendered project", async () => {
  fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.endsWith("/projects") ? { projects: [fixture] } : { ...fixture, artifactAvailable: true } }));
  render(<HypitWorkspace />); await openFixture();
  expect(screen.getByLabelText("workspace.videoLabel")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "download" })).toBeVisible();
  fireEvent.change(screen.getByDisplayValue("Private facts"), { target: { value: "New brief" } });
  expect(screen.queryByLabelText("workspace.videoLabel")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "download" })).not.toBeInTheDocument();
});
