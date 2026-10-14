import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AgriTaskSessionBoundary, clearAgriRecoveries, readAgriRecovery } from "@/components/competitions/agri-task-recovery";
import { AgriTimetable } from "@/components/competitions/agri-timetable";
import { agriTaskTemplates } from "@/domain/competitions/agri-task-templates";
import type { AgriTaskView, AgriTaskDetail } from "@/contracts/agri-tasks";
import messages from "../../../messages/product/zh.json";
const mocks = vi.hoisted(() => ({ update: vi.fn(async () => null), session: { status: "authenticated", data: { user: { id: "owner-a" } } } }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ ...mocks.session, update: mocks.update }) }));
vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: () => {
  const lookup = (key: string) => key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, messages.agriTasks);
  const t = (key: string, values?: Record<string, string | number>) => { let result = String(lookup(key) ?? key); for (const [name, value] of Object.entries(values ?? {})) result = result.replace("{" + name + "}", String(value)); return result; };
  t.has = (key: string) => typeof lookup(key) === "string"; return t;
} }));
const copy = messages.agriTasks;
const api = "/api/competitions/agrihackathon/tasks";
const original: AgriTaskView = { ...agriTaskTemplates("zh")[0].task, id: "task-a", ownerId: "owner-a", competitionId: "edition", revision: 1, templateKey: "fixture", access: "OWNER", dueState: "UNDATED", completedAt: null, createdAt: "2026-10-07T00:00:00Z", updatedAt: "2026-10-07T00:00:00Z" };
let task: AgriTaskView; let detail: AgriTaskDetail; let fetchMock: Mock<(url: string, init?: RequestInit) => Promise<Response>>;
const envelope = (data: unknown, status = 200) => new Response(JSON.stringify({ ok: true, data }), { status });
function list() { return { competitionId: "edition", tasks: [task], nextCursor: null, serverNow: "2026-10-07T00:00:00Z", sharingLimit: 30 }; }
beforeEach(() => {
  clearAgriRecoveries(); mocks.update.mockClear();
  mocks.session = { status: "authenticated", data: { user: { id: "owner-a" } } }; task = structuredClone(original); detail = { task, history: [], shares: [], historyTruncated: false };
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") { const command = JSON.parse(init.body as string); if (command.action === "initialize") return envelope({ task: null, duplicate: false, appliedRevision: null, createdTaskCount: 6 }); task = { ...task, ...command.task, revision: command.action === "create" ? 1 : task.revision + 1 }; detail = { ...detail, task }; return envelope({ task, appliedRevision: task.revision, duplicate: false, createdTaskCount: null }); }
    return envelope(url === api ? list() : detail);
  }); vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function open() { render(<AgriTimetable />); fireEvent.click(await screen.findByRole("button", { name: copy.edit })); await screen.findByLabelText(copy.titleField); }
describe("personal timetable interaction", () => {
  it("loads stage and visibility filters from the server and shows a specific empty state", async () => {
    const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init) => url.startsWith(api + "?") ? envelope({ ...list(), tasks: [] }) : normal(url, init));
    render(<AgriTimetable />); await screen.findByRole("button", { name: copy.edit });
    fireEvent.change(screen.getByLabelText(copy.stageField), { target: { value: "FINAL" } });
    await screen.findByText(copy.filteredEmpty);
    expect(fetchMock).toHaveBeenCalledWith(api + "?stage=FINAL", expect.anything());
    fireEvent.change(screen.getByLabelText(copy.visibilityField), { target: { value: "shared" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(api + "?scope=shared&stage=FINAL", expect.anything()));
    await screen.findByText(copy.filteredEmpty);
    expect(screen.queryByText(copy.empty)).not.toBeInTheDocument();
  });
  it("ignores an older filter response and starts pagination again for the new filters", async () => {
    let settle!: (response: Response) => void;
    const delayed = new Promise<Response>(resolve => { settle = resolve; });
    const normal = fetchMock.getMockImplementation()!;
    const filteredTask = { ...task, id: "final-task", title: "Final filtered task", stage: "FINAL" as const };
    fetchMock.mockImplementation(async (url, init) => url === api + "?stage=PRELIMINARY" ? delayed : url === api + "?stage=FINAL" ? envelope({ ...list(), tasks: [filteredTask], nextCursor: "filter-cursor" }) : url === api + "?cursor=filter-cursor&stage=FINAL" ? envelope({ ...list(), tasks: [], nextCursor: null }) : normal(url, init));
    render(<AgriTimetable />); await screen.findByRole("button", { name: copy.edit });
    fireEvent.change(screen.getByLabelText(copy.stageField), { target: { value: "PRELIMINARY" } });
    fireEvent.change(screen.getByLabelText(copy.stageField), { target: { value: "FINAL" } });
    await screen.findByText(filteredTask.title);
    await act(async () => { settle(envelope({ ...list(), tasks: [{ ...task, title: "Late preliminary task" }] })); await delayed; });
    expect(screen.queryByText("Late preliminary task")).not.toBeInTheDocument();
    expect(screen.getByText(filteredTask.title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.more }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(api + "?cursor=filter-cursor&stage=FINAL", expect.anything()));
  });
  it.each(["list", "open", "initialize", "reload", "mutate", "followup"] as const)("ignores an unmounted actor's late %s error without clearing the new actor's draft", async operation => {
    const view = render(<><AgriTaskSessionBoundary /><AgriTimetable /></>);
    if (operation !== "list") await screen.findByRole("button", { name: copy.edit });
    if (["reload", "mutate", "followup"].includes(operation)) {
      fireEvent.click(await screen.findByRole("button", { name: copy.edit }));
      await screen.findByLabelText(copy.titleField);
    }
    const normal = fetchMock.getMockImplementation()!;
    let settle!: (response: Response) => void;
    const delayed = new Promise<Response>(resolve => { settle = resolve; });
    let intercepted = false;
    fetchMock.mockImplementation(async (url, init) => {
      const oldActor = new Headers(init?.headers).get("x-ans-task-actor") === "owner-a";
      const matching = operation === "followup" ? !init?.method && url !== api : operation === "initialize" || operation === "mutate" ? init?.method === "POST" : !init?.method;
      if (oldActor && matching && !intercepted) { intercepted = true; return delayed; }
      return normal(url, init);
    });
    if (operation === "list") {
      // The first list may already be in flight; use a fresh A instance for a controlled delayed load.
      view.unmount();
    } else if (operation === "open") fireEvent.click(screen.getByRole("button", { name: copy.edit }));
    else if (operation === "initialize") fireEvent.click(screen.getByRole("button", { name: copy.initialize }));
    else if (operation === "reload") fireEvent.click(screen.getByRole("button", { name: copy.refreshDetail }));
    else {
      fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "A submitted draft" } });
      fireEvent.click(screen.getByRole("button", { name: copy.save }));
    }
    const active = operation === "list" ? render(<><AgriTaskSessionBoundary /><AgriTimetable /></>) : view;
    await waitFor(() => expect(intercepted).toBe(true));
    mocks.session = { status: "authenticated", data: { user: { id: "owner-b" } } };
    active.rerender(<><AgriTaskSessionBoundary /><AgriTimetable /></>);
    fireEvent.click(await screen.findByRole("button", { name: copy.add }));
    fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "B private unsaved draft" } });
    await waitFor(() => expect(readAgriRecovery("owner-b", "edition")?.editor?.draft.title).toBe("B private unsaved draft"));
    await act(async () => { settle(new Response(JSON.stringify({ ok: false, error: { code: "ACCOUNT_CHANGED" } }), { status: 409 })); await delayed; });
    expect(screen.getByLabelText(copy.titleField)).toHaveValue("B private unsaved draft");
    expect(readAgriRecovery("owner-b", "edition")?.editor?.draft.title).toBe("B private unsaved draft");
    expect(screen.queryByText(copy.errors.ACCOUNT_CHANGED)).not.toBeInTheDocument();
  });
  it("sends one write for two synchronous form submissions", async () => {
    await open(); fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Double submit" } });
    const form = screen.getByRole("button", { name: copy.save }).closest("form")!;
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    await screen.findByText(copy.saved);
    expect(fetchMock.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(1);
  });
  it("unlocks latest-version recovery when an uncertain retry is rejected after receipt lookup", async () => {
    await open(); fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Keep until confirmed conflict" } });
    const normal = fetchMock.getMockImplementation()!; let attempts = 0;
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "POST") { attempts++; if (attempts === 1) throw new TypeError("lost response"); return new Response(JSON.stringify({ ok: false, error: { code: "AGRI_REVISION_CONFLICT" } }), { status: 409 }); }
      return normal(url, init);
    });
    fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByText(copy.pending);
    fireEvent.click(screen.getByRole("button", { name: copy.retry })); await screen.findByText(copy.errors.AGRI_REVISION_CONFLICT);
    expect(screen.queryByRole("button", { name: copy.retry })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.latest })).not.toBeDisabled();
    expect(screen.getByLabelText(copy.titleField)).toHaveValue("Keep until confirmed conflict");
  });

  it("requires login and never reads private tasks anonymously", () => {
    mocks.session = { status: "unauthenticated", data: null } as unknown as typeof mocks.session;
    render(<AgriTimetable />); expect(screen.getByRole("link", { name: copy.login })).toHaveAttribute("href", "/login?callbackUrl=%2Fcompetitions%2Fagrihackathon%2Ftasks"); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("shows edition configuration failure without a fake empty list or write controls", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: false, error: { code: "AGRI_EDITION_NOT_CONFIGURED" } }), { status: 503 })); render(<AgriTimetable />);
    expect(await screen.findByRole("alert")).toHaveTextContent(copy.errors.AGRI_EDITION_NOT_CONFIGURED); expect(screen.getByRole("button", { name: copy.add })).toBeDisabled(); expect(screen.queryByText(copy.empty)).not.toBeInTheDocument();
  });
  it("requires explicit initialization and does not mutate merely by visiting", async () => {
    render(<AgriTimetable />); await screen.findByRole("button", { name: copy.edit }); expect(fetchMock.mock.calls.every(call => call[1]?.method !== "POST")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: copy.initialize })); await screen.findByText(copy.initialized.replace("{count}", "6"));
    const writes = fetchMock.mock.calls.filter(call => call[1]?.method === "POST"); expect(writes).toHaveLength(1); expect(JSON.parse(writes[0][1]!.body as string)).toMatchObject({ action: "initialize", locale: "zh" });
  });
  it("preserves input and retries the exact frozen request after lost save response", async () => {
    await open(); fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "保留这份输入" } });
    const normal = fetchMock.getMockImplementation()!; let failed = false;
    fetchMock.mockImplementation(async (url, init) => { if (init?.method === "POST" && !failed) { failed = true; throw new TypeError("network"); } return normal(url, init); });
    fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByText(copy.pending);
    expect(screen.getByLabelText(copy.titleField)).toHaveValue("保留这份输入"); expect(screen.getByLabelText(copy.titleField)).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: copy.retry })); await screen.findByText(copy.saved);
    const writes = fetchMock.mock.calls.filter(call => call[1]?.method === "POST"); expect(writes).toHaveLength(2); expect(writes[0][1]!.body).toBe(writes[1][1]!.body); expect(screen.getByLabelText(copy.titleField)).not.toBeDisabled();
  });
  it("keeps a creation request frozen through a lost response and a rate-limited retry", async () => {
    render(<AgriTimetable />); fireEvent.click(await screen.findByRole("button", { name: copy.add }));
    fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Original creation" } });
    fireEvent.change(screen.getByLabelText(copy.acceptance), { target: { value: "Verify the actual result" } });
    const normal = fetchMock.getMockImplementation()!; let attempts = 0;
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "POST") { attempts++; if (attempts === 1) throw new TypeError("lost response"); if (attempts === 2) return new Response(JSON.stringify({ ok: false, error: { code: "RATE_LIMITED" } }), { status: 429 }); }
      return normal(url, init);
    });
    fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByText(copy.pending);
    fireEvent.click(screen.getByRole("button", { name: copy.retry })); await screen.findByText(copy.errors.RATE_LIMITED);
    expect(screen.getByLabelText(copy.titleField)).toBeDisabled(); expect(screen.getByRole("button", { name: copy.save })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: copy.retry })); await screen.findByText(copy.saved);
    const bodies = fetchMock.mock.calls.filter(call => call[1]?.method === "POST").map(call => call[1]!.body);
    expect(bodies).toHaveLength(3); expect(new Set(bodies).size).toBe(1); expect(JSON.parse(bodies[0] as string).action).toBe("create");
  });
  it("retains initialization identity across an uncertain response and 429", async () => {
    render(<AgriTimetable />); await screen.findByRole("button", { name: copy.edit });
    const normal = fetchMock.getMockImplementation()!; let attempts = 0;
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "POST") { attempts++; if (attempts === 1) throw new TypeError("network"); if (attempts === 2) return new Response(JSON.stringify({ ok: false, error: { code: "RATE_LIMITED" } }), { status: 429 }); }
      return normal(url, init);
    });
    fireEvent.click(screen.getByRole("button", { name: copy.initialize })); await screen.findByText(copy.operationPending);
    fireEvent.click(screen.getByRole("button", { name: copy.retry })); await screen.findByText(copy.errors.RATE_LIMITED);
    expect(screen.getByRole("button", { name: copy.add })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: copy.retry })); await screen.findByText(copy.initialized.replace("{count}", "6"));
    const bodies = fetchMock.mock.calls.filter(call => call[1]?.method === "POST").map(call => call[1]!.body);
    expect(bodies).toHaveLength(3); expect(new Set(bodies).size).toBe(1);
  });
  it("quarantines an old-tab draft when the server detects a cookie account switch", async () => {
    render(<AgriTimetable />); fireEvent.click(await screen.findByRole("button", { name: copy.add }));
    fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Account A private draft" } });
    fireEvent.change(screen.getByLabelText(copy.acceptance), { target: { value: "Verify the actual result" } });
    const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init) => init?.method === "POST" ? new Response(JSON.stringify({ ok: false, error: { code: "ACCOUNT_CHANGED" } }), { status: 409 }) : normal(url, init));
    fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByText(copy.errors.ACCOUNT_CHANGED);
    expect(screen.queryByLabelText(copy.titleField)).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: copy.add })).not.toBeInTheDocument();
    const write = fetchMock.mock.calls.find(call => call[1]?.method === "POST")!;
    expect(new Headers(write[1]!.headers).get("x-ans-task-actor")).toBe("owner-a");
    fireEvent.click(screen.getByRole("button", { name: copy.refresh })); await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    await screen.findByRole("button", { name: copy.add }); expect(screen.queryByRole("button", { name: copy.resumeDraft })).not.toBeInTheDocument();
  });
  it("shows confirmed sharing and lets details refresh without repeating the write", async () => {
    await open(); fireEvent.change(screen.getByLabelText(copy.recipient), { target: { value: "reader-b" } });
    const normal = fetchMock.getMockImplementation()!; let failRead = true;
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "POST") { const response = await normal(url, init); detail = { ...detail, shares: [{ userId: "reader-b", sharedAt: "2026-10-07T00:00:00Z", expiresAt: null }] }; return response; }
      if (url !== api && failRead) throw new TypeError("read failed");
      return normal(url, init);
    });
    fireEvent.click(screen.getByRole("button", { name: copy.grant })); await screen.findByText(copy.shareSaved); await screen.findByText(copy.detailStale);
    failRead = false; fireEvent.click(screen.getByRole("button", { name: copy.refreshDetail })); await screen.findByRole("button", { name: copy.revoke });
    expect(screen.queryByText(copy.detailStale)).not.toBeInTheDocument(); expect(fetchMock.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(1);
  });
  it("recovers the same pending creation after SPA unmount and explicit resume", async () => {
    const first = render(<AgriTimetable />); fireEvent.click(await screen.findByRole("button", { name: copy.add }));
    fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Navigate and resume" } });
    fireEvent.change(screen.getByLabelText(copy.acceptance), { target: { value: "Verify the actual result" } });
    const normal = fetchMock.getMockImplementation()!; let lose = true;
    fetchMock.mockImplementation(async (url, init) => { if (init?.method === "POST" && lose) { lose = false; throw new TypeError("unknown"); } return normal(url, init); });
    fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByText(copy.pending); first.unmount();
    render(<AgriTimetable />); fireEvent.click(await screen.findByRole("button", { name: copy.resumeDraft }));
    expect(screen.getByLabelText(copy.titleField)).toHaveValue("Navigate and resume"); expect(screen.getByRole("button", { name: copy.save })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: copy.retry })); await screen.findByText(copy.saved);
    const writes = fetchMock.mock.calls.filter(call => call[1]?.method === "POST"); expect(writes).toHaveLength(2); expect(writes[0][1]!.body).toBe(writes[1][1]!.body);
  });
  it("never offers another actor's recovered draft and clears memory on account switch", async () => {
    const first = render(<><AgriTaskSessionBoundary /><AgriTimetable /></>); fireEvent.click(await screen.findByRole("button", { name: copy.edit }));
    fireEvent.change(await screen.findByLabelText(copy.titleField), { target: { value: "Private actor A" } }); first.unmount();
    mocks.session = { status: "authenticated", data: { user: { id: "owner-b" } } };
    const second = render(<><AgriTaskSessionBoundary /><AgriTimetable /></>); await screen.findByRole("button", { name: copy.edit });
    expect(screen.queryByRole("button", { name: copy.resumeDraft })).not.toBeInTheDocument(); second.unmount();
    mocks.session = { status: "authenticated", data: { user: { id: "owner-a" } } };
    render(<AgriTimetable />); await screen.findByRole("button", { name: copy.edit }); expect(screen.queryByRole("button", { name: copy.resumeDraft })).not.toBeInTheDocument();
  });
  it("blocks a cancelled same-tab navigation while preserving edited input", async () => {
    await open(); fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Unsaved" } });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const anchor = document.createElement("a"); anchor.href = "/workspace"; document.body.append(anchor);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true }); anchor.dispatchEvent(click); anchor.remove();
    expect(click.defaultPrevented).toBe(true); expect(window.confirm).toHaveBeenCalledWith(copy.confirmLeave); expect(screen.getByLabelText(copy.titleField)).toHaveValue("Unsaved");
  });
  it("keeps a conflicted draft until the owner explicitly replaces it with the latest version", async () => {
    await open(); fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "我的未保存版本" } });
    const normal = fetchMock.getMockImplementation()!; fetchMock.mockImplementation(async (url, init) => init?.method === "POST" ? new Response(JSON.stringify({ ok: false, error: { code: "AGRI_REVISION_CONFLICT" } }), { status: 409 }) : normal(url, init));
    fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByRole("button", { name: copy.latest }); expect(screen.getByLabelText(copy.titleField)).toHaveValue("我的未保存版本");
    detail = { ...detail, task: { ...task, title: "服务器新版本", revision: 2 } }; vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: copy.latest })); await waitFor(() => expect(screen.getByLabelText(copy.titleField)).toHaveValue("服务器新版本"));
  });
  it("requires actual completion evidence and an explicit acceptance decision", async () => {
    await open(); fireEvent.change(screen.getByLabelText(copy.statusField), { target: { value: "DONE" } }); fireEvent.change(screen.getByLabelText(copy.complete), { target: { value: "实际交付已核对" } });
    fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByText(copy.validation); expect(fetchMock.mock.calls.some(call => call[1]?.method === "POST")).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: copy.acknowledge })); fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByText(copy.saved);
    const command = JSON.parse(fetchMock.mock.calls.find(call => call[1]?.method === "POST")![1]!.body as string); expect(command.task).toMatchObject({ status: "DONE", completionResult: "实际交付已核对" }); expect(command.task.completedById).toBeUndefined();
  });
  it("shared readers see no editing, sharing or owner history controls", async () => {
    task.access = "SHARED_READONLY"; render(<AgriTimetable />); fireEvent.click(await screen.findByRole("button", { name: copy.inspect })); await screen.findByText(copy.readonly);
    expect(screen.getByLabelText(copy.titleField)).toBeDisabled(); expect(screen.queryByRole("button", { name: copy.save })).not.toBeInTheDocument(); expect(screen.queryByRole("heading", { name: copy.share })).not.toBeInTheDocument(); expect(screen.queryByRole("heading", { name: copy.history })).not.toBeInTheDocument();
  });
  it("destroys the private editor as soon as the session changes", async () => {
    const view = render(<AgriTimetable />); fireEvent.click(await screen.findByRole("button", { name: copy.edit })); await screen.findByLabelText(copy.titleField);
    mocks.session = { status: "loading", data: { user: { id: "owner-a" } } }; view.rerender(<AgriTimetable />); expect(screen.queryByLabelText(copy.titleField)).not.toBeInTheDocument();
    mocks.session = { status: "unauthenticated", data: null } as unknown as typeof mocks.session; view.rerender(<AgriTimetable />); expect(screen.getByRole("link", { name: copy.login })).toBeInTheDocument();
  });
  it.each([null, {}])("keeps initialization identity after malformed successful payload %j", async invalidData => {
    render(<AgriTimetable />); await screen.findByRole("button", { name: copy.edit });
    const normal = fetchMock.getMockImplementation()!; let attempts = 0;
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "POST" && attempts++ === 0) return envelope(invalidData);
      return normal(url, init);
    });
    fireEvent.click(screen.getByRole("button", { name: copy.initialize }));
    await screen.findByText(copy.operationPending);
    expect(readAgriRecovery("owner-a", "edition")?.initialization).toMatchObject({ action: "initialize" });
    expect(screen.queryByText(copy.initialized.replace("{count}", "0"))).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    await screen.findByText(copy.initialized.replace("{count}", "6"));
    const writes = fetchMock.mock.calls.filter(call => call[1]?.method === "POST");
    expect(writes).toHaveLength(2); expect(writes[0][1]!.body).toBe(writes[1][1]!.body);
  });
  it.each(["emptyTask", "wrongTask", "wrongEdition", "readonlyTask", "revisionBehind", "wrongBranch", "wrongAppliedRevision"] as const)("retains input and frozen retry after invalid save acknowledgement: %s", async variant => {
    await open(); fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Must retain this draft" } });
    const normal = fetchMock.getMockImplementation()!; let attempts = 0;
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "POST" && attempts++ === 0) {
        const command = JSON.parse(init.body as string);
        const returned = { ...task, ...command.task, revision: 2 };
        const invalidData = variant === "wrongBranch" ? { task: null, duplicate: false, appliedRevision: null, createdTaskCount: 6 }
          : { task: variant === "emptyTask" ? {} : { ...returned, ...(variant === "wrongTask" ? { id: "other-task" } : {}), ...(variant === "wrongEdition" ? { competitionId: "other-edition" } : {}), ...(variant === "readonlyTask" ? { access: "SHARED_READONLY" } : {}), ...(variant === "revisionBehind" ? { revision: 1 } : {}) }, duplicate: false, appliedRevision: variant === "wrongAppliedRevision" ? 1 : 2, createdTaskCount: null };
        return envelope(invalidData);
      }
      return normal(url, init);
    });
    fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByText(copy.pending);
    expect(screen.queryByText(copy.saved)).not.toBeInTheDocument();
    expect(screen.getByLabelText(copy.titleField)).toHaveValue("Must retain this draft");
    expect(readAgriRecovery("owner-a", "edition")?.editor?.pending?.action).toBe("update");
    fireEvent.click(screen.getByRole("button", { name: copy.retry })); await screen.findByText(copy.saved);
    const writes = fetchMock.mock.calls.filter(call => call[1]?.method === "POST");
    expect(writes).toHaveLength(2); expect(writes[0][1]!.body).toBe(writes[1][1]!.body);
  });
  it("accepts a valid initialization replay that creates zero new tasks", async () => {
    const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init) => init?.method === "POST" ? envelope({ task: null, duplicate: true, appliedRevision: null, createdTaskCount: 0 }) : normal(url, init));
    render(<AgriTimetable />); fireEvent.click(await screen.findByRole("button", { name: copy.initialize }));
    await screen.findByText(copy.initialized.replace("{count}", "0"));
    expect(screen.queryByText(copy.operationPending)).not.toBeInTheDocument();
    expect(readAgriRecovery("owner-a", "edition")?.initialization).toBeUndefined();
  });

  it("accepts a valid late replay without replacing the member's draft", async () => {
    await open(); fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Original requested change" } });
    const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "POST") {
        task = { ...task, title: "Later confirmed server edit", revision: 3 }; detail = { ...detail, task };
        return envelope({ task, duplicate: true, appliedRevision: 2, createdTaskCount: null });
      }
      return normal(url, init);
    });
    fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByText(copy.recoveredLater);
    expect(screen.getByLabelText(copy.titleField)).toHaveValue("Original requested change");
    expect(screen.queryByRole("button", { name: copy.retry })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.latest })).not.toBeDisabled();
  });

});

function historyEvents(highest: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const revision = highest - index;
    return { revision, action: "update", createdAt: "2026-10-14T00:00:00Z", task: {
      ...agriTaskTemplates("zh")[0].task, title: "Historical revision " + revision,
      ...(revision === 2 ? { status: "DONE" as const, completionResult: "Early completion evidence" } : {}),
    } };
  });
}
function seedHistory(highest = 123) {
  task = { ...task, revision: highest }; detail = { ...detail, task, history: historyEvents(highest, 50), historyTruncated: true, historyNextBeforeRevision: highest - 49 };
}
function historyPage(highest: number, count: number, nextBeforeRevision: number | null = null) {
  return { taskId: "task-a", ownerId: "owner-a", competitionId: "edition", history: historyEvents(highest, count), nextBeforeRevision };
}
const historyUrl = api + "/task-a/history";
describe("owner history window", () => {
  it("appends 123 real version snapshots including the old completion without changing an unsaved form", async () => {
    seedHistory(); const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init) => url === historyUrl + "?beforeRevision=74" ? envelope(historyPage(73, 50, 24)) : url === historyUrl + "?beforeRevision=24" ? envelope(historyPage(23, 23)) : normal(url, init));
    await open(); fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "My unsaved current draft" } });
    fireEvent.change(screen.getByLabelText(copy.statusField), { target: { value: "DONE" } });
    fireEvent.change(screen.getByLabelText(copy.complete), { target: { value: "Current accepted delivery" } });
    fireEvent.click(screen.getByRole("checkbox", { name: copy.acknowledge }));
    fireEvent.click(screen.getByRole("button", { name: copy.moreHistory })); await screen.findByText("Historical revision 24");
    fireEvent.click(screen.getByRole("button", { name: copy.moreHistory })); await screen.findByText("Historical revision 1");
    expect(screen.getByText(copy.outcome + ": Early completion evidence")).toBeInTheDocument();
    expect(document.querySelectorAll("details")).toHaveLength(123);
    expect(screen.queryByRole("button", { name: copy.moreHistory })).not.toBeInTheDocument();
    expect(screen.getByLabelText(copy.titleField)).toHaveValue("My unsaved current draft");
    expect(screen.getByLabelText(copy.complete)).toHaveValue("Current accepted delivery");
    expect(screen.getByRole("checkbox", { name: copy.acknowledge })).toBeChecked();
    expect(fetchMock.mock.calls.some(call => call[1]?.method === "POST")).toBe(false);
    for (const call of fetchMock.mock.calls.filter(call => call[0].includes("/history"))) expect(new Headers(call[1]?.headers).get("x-ans-task-actor")).toBe("owner-a");
    fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByText(copy.saved);
    const command = JSON.parse(fetchMock.mock.calls.find(call => call[1]?.method === "POST")![1]!.body as string);
    expect(command.expectedRevision).toBe(123); expect(command.task.title).toBe("My unsaved current draft");
  });
  it("retains history and draft after a network error and retries the exact page", async () => {
    seedHistory(51); const normal = fetchMock.getMockImplementation()!; let attempts = 0;
    fetchMock.mockImplementation(async (url, init) => {
      if (url === historyUrl + "?beforeRevision=2") { if (attempts++ === 0) throw new TypeError("offline"); return envelope(historyPage(1, 1)); }
      return normal(url, init);
    });
    await open(); fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Retain edited title" } });
    fireEvent.click(screen.getByRole("button", { name: copy.moreHistory })); await screen.findByRole("alert");
    expect(screen.getByText("Historical revision 2")).toBeInTheDocument(); expect(document.querySelectorAll("details")).toHaveLength(50);
    expect(screen.getByLabelText(copy.titleField)).toHaveValue("Retain edited title");
    fireEvent.click(screen.getByRole("button", { name: copy.retry })); await screen.findByText("Historical revision 1");
    expect(document.querySelectorAll("details")).toHaveLength(51); expect(attempts).toBe(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("prevents two synchronous pagination clicks from issuing duplicate requests", async () => {
    seedHistory(51); const normal = fetchMock.getMockImplementation()!;
    let settle!: (response: Response) => void; const pending = new Promise<Response>(resolve => { settle = resolve; });
    fetchMock.mockImplementation(async (url, init) => url === historyUrl + "?beforeRevision=2" ? pending : normal(url, init));
    await open(); const button = screen.getByRole("button", { name: copy.moreHistory });
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(fetchMock.mock.calls.filter(call => call[0] === historyUrl + "?beforeRevision=2")).toHaveLength(1);
    expect(button).toBeDisabled();
    await act(async () => { settle(envelope(historyPage(1, 1))); await pending; });
    expect(screen.getByText("Historical revision 1")).toBeInTheDocument();
  });
  it("refreshes only the history window, starts from the newest page and preserves current input", async () => {
    seedHistory(51); const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init) => url === historyUrl + "?beforeRevision=2" ? envelope(historyPage(1, 1)) : url === historyUrl ? envelope(historyPage(52, 50, 3)) : normal(url, init));
    await open(); fireEvent.click(screen.getByRole("button", { name: copy.moreHistory })); await screen.findByText("Historical revision 1");
    fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Keep current input" } });
    fireEvent.click(screen.getByRole("button", { name: copy.refreshHistory })); await screen.findByText("Historical revision 52");
    expect(screen.queryByText("Historical revision 1")).not.toBeInTheDocument(); expect(screen.queryByText("Historical revision 2")).not.toBeInTheDocument();
    expect(document.querySelectorAll("details")).toHaveLength(50); expect(screen.getByLabelText(copy.titleField)).toHaveValue("Keep current input");
    expect(fetchMock.mock.calls.filter(call => call[0] === api + "/task-a")).toHaveLength(1);
  });
  it("drops the old history window on detail refresh and ignores its late successful page", async () => {
    seedHistory(51); const normal = fetchMock.getMockImplementation()!;
    let settle!: (response: Response) => void; const pending = new Promise<Response>(resolve => { settle = resolve; });
    fetchMock.mockImplementation(async (url, init) => url === historyUrl + "?beforeRevision=2" ? pending : normal(url, init));
    await open(); fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Preserved on refresh" } });
    fireEvent.click(screen.getByRole("button", { name: copy.moreHistory }));
    detail = { ...detail, history: historyEvents(52, 50), historyNextBeforeRevision: 3 };
    fireEvent.click(screen.getByRole("button", { name: copy.refreshDetail })); await screen.findByText("Historical revision 52");
    await act(async () => { settle(envelope(historyPage(1, 1))); await pending; });
    expect(screen.queryByText("Historical revision 1")).not.toBeInTheDocument(); expect(document.querySelectorAll("details")).toHaveLength(50);
    expect(screen.getByLabelText(copy.titleField)).toHaveValue("Preserved on refresh");
  });
  it("resets previously appended history even when detail refresh keeps the same task revision", async () => {
    seedHistory(51); const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init) => url === historyUrl + "?beforeRevision=2" ? envelope(historyPage(1, 1)) : normal(url, init));
    await open(); fireEvent.click(screen.getByRole("button", { name: copy.moreHistory })); await screen.findByText("Historical revision 1");
    fireEvent.click(screen.getByRole("button", { name: copy.refreshDetail })); await waitFor(() => expect(screen.queryByText("Historical revision 1")).not.toBeInTheDocument());
    expect(document.querySelectorAll("details")).toHaveLength(50); expect(screen.getByRole("button", { name: copy.moreHistory })).not.toBeDisabled();
  });
  it.each(["owner", "task", "edition", "order", "cursor", "shape"] as const)("rejects a malformed or foreign %s page without replacing any current history or input", async kind => {
    seedHistory(51); const normal = fetchMock.getMockImplementation()!; const page = historyPage(1, 1);
    const invalid = kind === "owner" ? { ...page, ownerId: "other" } : kind === "task" ? { ...page, taskId: "other" } : kind === "edition" ? { ...page, competitionId: "other" } : kind === "order" ? { ...page, history: [...page.history, ...page.history] } : kind === "cursor" ? { ...page, history: historyEvents(2, 1) } : { ...page, nextBeforeRevision: 1 };
    fetchMock.mockImplementation(async (url, init) => url.includes("/history") ? envelope(invalid) : normal(url, init));
    await open(); fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Do not replace" } });
    fireEvent.click(screen.getByRole("button", { name: copy.moreHistory })); await screen.findByRole("alert");
    expect(document.querySelectorAll("details")).toHaveLength(50); expect(screen.getByText("Historical revision 51")).toBeInTheDocument();
    expect(screen.getByLabelText(copy.titleField)).toHaveValue("Do not replace"); expect(screen.getByRole("button", { name: copy.retry })).not.toBeDisabled();
  });
  it("clears inaccessible history on 404 while preserving the private draft", async () => {
    seedHistory(51); const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init) => url.includes("/history") ? new Response(JSON.stringify({ ok: false, error: { code: "NOT_FOUND" } }), { status: 404 }) : normal(url, init));
    await open(); fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Still editable draft" } });
    fireEvent.click(screen.getByRole("button", { name: copy.moreHistory })); await screen.findByRole("alert");
    expect(document.querySelectorAll("details")).toHaveLength(0); expect(screen.queryByRole("button", { name: copy.retry })).not.toBeInTheDocument();
    expect(screen.getByLabelText(copy.titleField)).toHaveValue("Still editable draft"); expect(screen.getByRole("alert")).not.toHaveTextContent(copy.historyLoadError);
  });
  it("ignores old-account history errors without clearing the new account's unsaved draft", async () => {
    seedHistory(51); const normal = fetchMock.getMockImplementation()!;
    let settle!: (response: Response) => void; const pending = new Promise<Response>(resolve => { settle = resolve; });
    fetchMock.mockImplementation(async (url, init) => url.includes("/history") ? pending : normal(url, init));
    const view = render(<><AgriTaskSessionBoundary /><AgriTimetable /></>);
    fireEvent.click(await screen.findByRole("button", { name: copy.edit })); await screen.findByLabelText(copy.titleField);
    fireEvent.click(screen.getByRole("button", { name: copy.moreHistory }));
    mocks.session = { status: "authenticated", data: { user: { id: "owner-b" } } };
    view.rerender(<><AgriTaskSessionBoundary /><AgriTimetable /></>);
    fireEvent.click(await screen.findByRole("button", { name: copy.add }));
    fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "New account input" } });
    await act(async () => { settle(new Response(JSON.stringify({ ok: false, error: { code: "ACCOUNT_CHANGED" } }), { status: 409 })); await pending; });
    expect(screen.getByLabelText(copy.titleField)).toHaveValue("New account input");
    expect(screen.queryByText(copy.errors.ACCOUNT_CHANGED)).not.toBeInTheDocument(); expect(document.querySelectorAll("details")).toHaveLength(0);
  });
});

describe("history refresh recovery", () => {
  it("retries a failed refresh from the newest page rather than continuing the older cursor", async () => {
    seedHistory(51); const normal = fetchMock.getMockImplementation()!; let refreshAttempts = 0;
    fetchMock.mockImplementation(async (url, init) => {
      if (url === historyUrl) { if (refreshAttempts++ === 0) throw new TypeError("offline"); return envelope(historyPage(52, 50, 3)); }
      return normal(url, init);
    });
    await open(); fireEvent.change(screen.getByLabelText(copy.titleField), { target: { value: "Preserve through refresh retry" } });
    fireEvent.click(screen.getByRole("button", { name: copy.refreshHistory })); await screen.findByRole("alert");
    expect(document.querySelectorAll("details")).toHaveLength(50);
    fireEvent.click(screen.getByRole("button", { name: copy.retry })); await screen.findByText("Historical revision 52");
    expect(fetchMock.mock.calls.filter(call => call[0] === historyUrl)).toHaveLength(2);
    expect(fetchMock.mock.calls.filter(call => call[0] === historyUrl + "?beforeRevision=2")).toHaveLength(0);
    expect(screen.getByLabelText(copy.titleField)).toHaveValue("Preserve through refresh retry");
  });
});
