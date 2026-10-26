import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ actor: "member-a", pageActor: "member-a", status: "authenticated", refresh: vi.fn(), push: vi.fn(), updateSession: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: m.actor } }, status: m.status, update: m.updateSession }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: m.push }), redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("next-intl", () => {
  const dict: Record<string, string> = {
    "aria.nicknameInput": "\u65b0\u6635\u79f0",
    "label.editNickname": "\u6539\u6635\u79f0",
    "label.save": "\u4fdd\u5b58",
  };
  const t = (key: string) => dict[key] ?? key;
  return { useTranslations: () => t };
});
vi.mock("sonner", () => ({ toast: { success: m.success, error: m.error } }));
vi.mock("@/lib/analytics", () => ({ analyticsProfile: { updateProfile: vi.fn(), updateAvatar: vi.fn() } }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: m.pageActor } }) }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: async () => ({ id: m.pageActor, name: "legacy", username: m.pageActor.replace("-", "_"), email: `${m.pageActor}@example.test`, avatar: null, verified: false, apiKey: null, mcpPromptsPublicByDefault: false, bio: `bio-${m.pageActor}`, customLinks: [] }) } } }));
vi.mock("@/server/credentials/service", () => ({ listCredentials: async () => [] }));
vi.mock("@/../prompts.config", () => ({ default: { features: { mcp: true } } }));
import SettingsPage from "@/app/(full)/settings/page";
import { DisplayNameEditor } from "@/components/workspace/display-name-editor";
const fetchMock = vi.fn();
const reply = (data: unknown) => ({ ok: true, json: async () => data });
function deferred() { let resolve!: (value: unknown) => void; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
async function loaded() { await waitFor(() => expect(screen.getByLabelText("\u6635\u79f0")).toHaveValue(`nickname-${m.pageActor}`)); }

beforeEach(() => {
  vi.clearAllMocks(); m.actor = "member-a"; m.pageActor = "member-a"; m.status = "authenticated";
  fetchMock.mockReset().mockImplementation(async (url, options) => url === "/api/user/profile" ? reply({ nickname: `nickname-${options.headers["x-ans-actor"]}` }) : reply({ apiKey: "synthetic-generated-key-a" }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("settings page private state belongs to its rendered account", () => {
  it("clears profile, generated plaintext and BYOK drafts on a cross-tab account change", async () => {
    const view = render(await SettingsPage()); await loaded();
    expect(screen.getByText("profileUrl: /@member_a")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "generate" }));
    await screen.findByText("synthetic-generated-key-a");
    fireEvent.change(screen.getByLabelText("API Key *"), { target: { value: "synthetic-byok-draft-a" } });
    m.actor = "member-b"; view.rerender(await SettingsPage());
    expect(screen.getByRole("alert")).toHaveTextContent("changed");
    expect(screen.queryByText("synthetic-generated-key-a")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("synthetic-byok-draft-a")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("member-a@example.test")).not.toBeInTheDocument();
    m.pageActor = "member-b"; view.rerender(await SettingsPage()); await loaded();
    expect(screen.getByLabelText("API Key *")).toHaveValue("");
    expect(screen.queryByText("synthetic-generated-key-a")).not.toBeInTheDocument();
    for (const [, options] of fetchMock.mock.calls) expect(options).toMatchObject({ cache: "no-store", credentials: "same-origin", headers: { "x-ans-actor": expect.any(String) } });
  });

  it.each(["fetch", "json"])("ignores a generated key whose %s finishes after switching accounts", async stage => {
    const view = render(await SettingsPage()); await loaded();
    const late = deferred();
    fetchMock.mockImplementationOnce(() => stage === "fetch" ? late.promise : Promise.resolve({ ok: true, json: () => late.promise }));
    fireEvent.click(screen.getByRole("button", { name: "generate" }));
    await act(async () => {});
    const options = fetchMock.mock.calls.at(-1)![1]; expect(options.headers["x-ans-actor"]).toBe("member-a");
    m.actor = "member-b"; m.pageActor = "member-b"; view.rerender(await SettingsPage()); await loaded();
    expect(options.signal.aborted).toBe(true);
    await act(async () => late.resolve(stage === "fetch" ? reply({ apiKey: "late-synthetic-key" }) : { apiKey: "late-synthetic-key" }));
    expect(screen.queryByText("late-synthetic-key")).not.toBeInTheDocument();
    expect(m.success).not.toHaveBeenCalled(); expect(m.error).not.toHaveBeenCalled();
  });

  it("does not replace the new nickname with a late profile read", async () => {
    const late = deferred(); fetchMock.mockReturnValueOnce(late.promise);
    const view = render(await SettingsPage()); const options = fetchMock.mock.calls[0][1];
    m.actor = "member-b"; m.pageActor = "member-b"; view.rerender(await SettingsPage()); await loaded();
    expect(options.signal.aborted).toBe(true);
    await act(async () => late.resolve(reply({ nickname: "old-late-nickname" })));
    expect(screen.getByLabelText("\u6635\u79f0")).toHaveValue("nickname-member-b"); expect(m.error).not.toHaveBeenCalled();
  });

  it("ignores a late profile save and does not refresh or redirect the new account", async () => {
    const view = render(await SettingsPage()); await loaded(); const late = deferred(); fetchMock.mockReturnValueOnce(late.promise);
    fireEvent.change(screen.getByLabelText("username"), { target: { value: "new_username" } });
    fireEvent.click(screen.getByRole("button", { name: "saveChanges" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init.method === "PATCH")).toBe(true));
    const options = fetchMock.mock.calls.at(-1)![1];
    m.actor = "member-b"; m.pageActor = "member-b"; view.rerender(await SettingsPage()); await loaded();
    await act(async () => late.resolve(reply({ username: "new_username" })));
    expect(options.signal.aborted).toBe(true); expect(m.updateSession).not.toHaveBeenCalled();
    expect(m.refresh).not.toHaveBeenCalled(); expect(m.push).not.toHaveBeenCalled(); expect(m.success).not.toHaveBeenCalled();
  });

  it("ignores a late BYOK creation and keeps the new account empty", async () => {
    const view = render(await SettingsPage()); await loaded(); const late = deferred(); fetchMock.mockReturnValueOnce(late.promise);
    fireEvent.change(screen.getByLabelText("\u540d\u79f0 *"), { target: { value: "private-provider-a" } });
    fireEvent.change(screen.getByLabelText("\u63a5\u53e3\u5730\u5740 *"), { target: { value: "https://example.test/v1" } });
    fireEvent.change(screen.getByLabelText("API Key *"), { target: { value: "synthetic-byok-draft-a" } });
    fireEvent.click(screen.getByRole("button", { name: "\u7ed1\u5b9a" }));
    const options = fetchMock.mock.calls.at(-1)![1]; expect(options.headers["x-ans-actor"]).toBe("member-a");
    m.actor = "member-b"; m.pageActor = "member-b"; view.rerender(await SettingsPage()); await loaded();
    expect(options.signal.aborted).toBe(true);
    await act(async () => late.resolve(reply({ data: { credential: { id: "private-a", label: "private-provider-a", keyMasked: "masked-a", baseUrl: "https://example.test/v1", active: true } } })));
    expect(screen.queryByText("private-provider-a")).not.toBeInTheDocument(); expect(screen.getByLabelText("API Key *")).toHaveValue("");
    expect(m.refresh).not.toHaveBeenCalled(); expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it.each(["loading", "unauthenticated"])("does not mount any private settings when session is %s", async status => {
    m.status = status; render(await SettingsPage());
    expect(screen.queryByLabelText("email")).not.toBeInTheDocument(); expect(screen.queryByLabelText("API Key *")).not.toBeInTheDocument(); expect(fetchMock).not.toHaveBeenCalled();
  });
});


describe("workspace nickname editor preserves the profile actor contract", () => {
  it.each(["GET", "PATCH"])("discards late %s after changing accounts", async stage => {
    const late = deferred();
    if (stage === "GET") fetchMock.mockReturnValueOnce(late.promise);
    else fetchMock.mockResolvedValueOnce(reply({ name: "old", username: "member_a" })).mockReturnValueOnce(late.promise);
    const view = render(<DisplayNameEditor actorId="member-a" current="old" />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp("\u6539\u6635\u79f0|label\\.editNickname") }));
    fireEvent.change(screen.getByLabelText("\u65b0\u6635\u79f0"), { target: { value: "updated-nickname" } });
    fireEvent.click(screen.getByRole("button", { name: new RegExp("\u4fdd\u5b58|label\\.save") }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(stage === "GET" ? 1 : 2));
    for (const [, init] of fetchMock.mock.calls) expect(init.headers["x-ans-actor"]).toBe("member-a");
    m.actor = "member-b"; view.rerender(<DisplayNameEditor actorId="member-a" current="old" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    await act(async () => late.resolve(reply({ name: "old", username: "member_a" })));
    expect(fetchMock).toHaveBeenCalledTimes(stage === "GET" ? 1 : 2);
    expect(m.success).not.toHaveBeenCalled(); expect(m.error).not.toHaveBeenCalled();
  });
});
