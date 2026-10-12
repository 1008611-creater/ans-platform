import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AgriWorkspaceManager } from "@/components/competitions/agri-workspace-manager";
import { WorkspaceNavigationProvider, useWorkspaceNavigation } from "@/components/providers/workspace-navigation";
import type { AgriDecisionManagementView } from "@/contracts/agri-decisions";
const mocks = vi.hoisted(() => ({ session: { status: "authenticated", data: { user: { id: "actor-initial" } } }, leave: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => mocks.session }));
vi.mock("next-intl", () => ({ useTranslations: () => {
  const t = (key: string, values?: Record<string, unknown>) => key + (values ? ":" + JSON.stringify(values) : "");
  t.has = () => true; return t;
} }));
const endpoint = "/api/competitions/agrihackathon/manage/decisions";
const target = { teamCompetitionId: "entry-a", entryStageId: "stage-a" };
const envelope = (data: unknown) => new Response(JSON.stringify({ ok: true, data }));
const rejected = (code: string) => new Response(JSON.stringify({ ok: false, error: { code } }), { status: 403 });
function decisions(teamCompetitionId = "entry-a", entryStageId: string | null = "stage-a", teamName = "Verified server team"): AgriDecisionManagementView {
  return { competitionId: "edition-a", teamCompetitionId, entryStageId, stageRevision: entryStageId ? 3 : null, currentSubmissionId: entryStageId ? "submission-a" : null, eligibility: [], permits: [], context: { teamName, stage: entryStageId ? "PRELIMINARY" : null } };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function LeaveButton() { const navigation = useWorkspaceNavigation(); return <button onClick={() => navigation.run(mocks.leave)}>leave</button>; }
function View({ selected = target, invalid = false }: { selected?: typeof target; invalid?: boolean }) {
  return <WorkspaceNavigationProvider><AgriWorkspaceManager preselection={selected} invalidPreselection={invalid} /><LeaveButton /></WorkspaceNavigationProvider>;
}
let fetchMock: ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>>;
let testSequence = 0;
beforeEach(() => {
  ++testSequence; mocks.session = { status: "authenticated", data: { user: { id: "actor-" + testSequence } } }; vi.clearAllMocks();
  fetchMock = vi.fn(async url => url.startsWith(endpoint + "?") ? envelope(decisions()) : new Promise<Response>(() => {})); vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const reads = () => fetchMock.mock.calls.filter(([url, init]) => url.startsWith(endpoint) && init?.method !== "POST");
const writes = () => fetchMock.mock.calls.filter(([url, init]) => url === endpoint && init?.method === "POST");
async function propose() {
  fireEvent.change(screen.getByLabelText("decisionReason"), { target: { value: "Verified reviewer decision" } });
  fireEvent.change(screen.getByLabelText("sourceReference"), { target: { value: "Reviewed frozen submission" } });
  fireEvent.click(screen.getByRole("button", { name: "recordEligibility" }));
  await screen.findByRole("alertdialog");
}
describe("decision management selection and safety", () => {
  it("reads the authorized target with actor header and shows only service context without posting", async () => {
    render(<View />); await screen.findByText("Verified server team");
    expect(reads()).toHaveLength(1);
    expect(reads()[0][1]).toMatchObject({ cache: "no-store", headers: { "x-ans-submission-actor": mocks.session.data.user.id } });
    expect(Object.fromEntries(new URL(reads()[0][0], "http://fixture.invalid").searchParams)).toEqual(target);
    expect(screen.getByText("stage.PRELIMINARY")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "decisionsTitle" })).toHaveFocus());
    expect(screen.getByText("manualDecisionTarget").closest("details")).not.toHaveAttribute("open");
    expect(writes()).toHaveLength(0);
  });
  it("does not re-read the same selection just because its object identity changes", async () => {
    const view = render(<View />); await screen.findByText("Verified server team"); view.rerender(<View selected={{ ...target }} />);
    expect(reads()).toHaveLength(1); expect(writes()).toHaveLength(0);
  });
  it("keeps manual lookup available without making any initial decision request", async () => {
    render(<WorkspaceNavigationProvider><AgriWorkspaceManager /></WorkspaceNavigationProvider>);
    expect(reads()).toHaveLength(0);
    expect(screen.getByText("manualDecisionTarget").closest("details")).toHaveAttribute("open");
    fireEvent.change(screen.getByLabelText("entryId"), { target: { value: "entry-a" } });
    fireEvent.change(screen.getByLabelText("stageId"), { target: { value: "stage-a" } });
    fireEvent.click(screen.getByRole("button", { name: "lookupDecisions" }));
    await screen.findByText("Verified server team"); expect(reads()).toHaveLength(1); expect(writes()).toHaveLength(0);
  });
  it("does not interpret an invalid selection as authority or issue a decision GET", async () => {
    render(<View invalid />);
    expect(screen.getByRole("alert")).toHaveTextContent("invalidDecisionTarget");
    expect(reads()).toHaveLength(0); expect(writes()).toHaveLength(0);
    expect(screen.getByText("manualDecisionTarget").closest("details")).toHaveAttribute("open");
  });
  it.each(["entry", "stage"])("rejects a response for a different %s even if it contains a team name", async mismatch => {
    fetchMock.mockImplementation(async url => url.startsWith(endpoint) ? envelope(decisions(mismatch === "entry" ? "wrong-entry" : "entry-a", mismatch === "stage" ? "wrong-stage" : "stage-a", "Never trusted team")) : new Promise<Response>(() => {}));
    render(<View />); expect(await screen.findByRole("alert")).toHaveTextContent("errors.INVALID_INPUT");
    expect(screen.queryByText("Never trusted team")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "recordEligibility" })).not.toBeInTheDocument();
    expect(writes()).toHaveLength(0);
  });
  it("shows a permission error and no team context when the true GET denies access", async () => {
    fetchMock.mockImplementation(async url => url.startsWith(endpoint) ? rejected("AGRI_SCOPE_REQUIRED") : new Promise<Response>(() => {}));
    render(<View />); expect(await screen.findByRole("alert")).toHaveTextContent("errors.AGRI_SCOPE_REQUIRED");
    expect(screen.queryByRole("region", { name: "decisionContextTitle" })).not.toBeInTheDocument(); expect(writes()).toHaveLength(0);
  });
  it("ignores an old target response after another selection is mounted", async () => {
    const old = deferred<Response>(); fetchMock.mockImplementation(async url => url.startsWith(endpoint) ? new URL(url, "http://fixture.invalid").searchParams.get("teamCompetitionId") === "entry-a" ? old.promise : envelope(decisions("entry-b", "stage-b", "Current target team")) : new Promise<Response>(() => {}));
    const view = render(<View />); view.rerender(<View selected={{ teamCompetitionId: "entry-b", entryStageId: "stage-b" }} />);
    await screen.findByText("Current target team"); await act(async () => old.resolve(envelope(decisions())));
    expect(screen.queryByText("Verified server team")).not.toBeInTheDocument(); expect(screen.getByText("Current target team")).toBeInTheDocument(); expect(writes()).toHaveLength(0);
  });
  it("drops the previous actor context and cannot apply its late private response after account switch", async () => {
    const old = deferred<Response>(); const oldActor = mocks.session.data.user.id;
    fetchMock.mockImplementation(async (url, init) => url.startsWith(endpoint) ? (init?.headers as Record<string, string>)["x-ans-submission-actor"] === oldActor ? old.promise : envelope(decisions("entry-a", "stage-a", "New actor team")) : new Promise<Response>(() => {}));
    const view = render(<View />); mocks.session = { status: "authenticated", data: { user: { id: "replacement-" + testSequence } } }; view.rerender(<View />);
    await screen.findByText("New actor team"); await act(async () => old.resolve(envelope(decisions())));
    expect(screen.queryByText("Verified server team")).not.toBeInTheDocument(); expect(reads().at(-1)?.[1]?.headers).toEqual({ "x-ans-submission-actor": mocks.session.data.user.id });
  });
  it("requires explicit confirmation and respects the dirty navigation guard before any POST", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false); render(<View />); await screen.findByText("Verified server team"); await propose();
    expect(writes()).toHaveLength(0); fireEvent.click(screen.getByRole("button", { name: "cancel" })); fireEvent.click(screen.getByRole("button", { name: "leave" }));
    expect(window.confirm).toHaveBeenCalledWith("discardUnsaved"); expect(mocks.leave).not.toHaveBeenCalled(); expect(writes()).toHaveLength(0);
  });
  it("retains an unknown command across target navigation and retries its exact original key and payload", async () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    fetchMock.mockImplementation(async (url, init) => {
      if (url === endpoint && init?.method === "POST") throw new Error("Lost response");
      if (url.startsWith(endpoint + "?")) { const query = new URL(url, "http://fixture.invalid").searchParams; return envelope(decisions(query.get("teamCompetitionId")!, query.get("entryStageId"))); }
      return new Promise<Response>(() => {});
    });
    const view = render(<View />); await screen.findByText("Verified server team"); await propose(); fireEvent.click(screen.getByRole("button", { name: "proceed" }));
    await screen.findByRole("button", { name: "retry" }); expect(writes()).toHaveLength(1);
    const original = writes()[0][1]?.body; const body = JSON.parse(String(original));
    expect(body).toMatchObject({ action: "recordFinalEligibility", teamCompetitionId: "entry-a", expectedSequence: 0, reason: "Verified reviewer decision", sourceReference: "Reviewed frozen submission" });
    expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    fireEvent.click(screen.getByRole("button", { name: "leave" })); expect(window.alert).toHaveBeenCalledWith("pendingLeave"); expect(mocks.leave).not.toHaveBeenCalled();
    view.rerender(<View selected={{ teamCompetitionId: "entry-b", entryStageId: "stage-b" }} />);
    await screen.findByRole("button", { name: "retry" }); expect(writes()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "retry" })); await waitFor(() => expect(writes()).toHaveLength(2));
    expect(writes()[1][1]?.body).toBe(original);
  });
  it("never restores or retries a different actor's pending command", async () => {
    fetchMock.mockImplementation(async (url, init) => url === endpoint && init?.method === "POST" ? Promise.reject(new Error("Lost response")) : url.startsWith(endpoint) ? envelope(decisions()) : new Promise<Response>(() => {}));
    const view = render(<View />); await screen.findByText("Verified server team"); await propose(); fireEvent.click(screen.getByRole("button", { name: "proceed" })); await screen.findByRole("button", { name: "retry" });
    mocks.session = { status: "authenticated", data: { user: { id: "replacement-" + testSequence } } }; view.rerender(<View />); await screen.findByText("Verified server team");
    expect(screen.queryByRole("button", { name: "retry" })).not.toBeInTheDocument(); expect(writes()).toHaveLength(1);
  });
  it("preserves a valid selection in the fixed internal login return URL", async () => {
    mocks.session.data = { user: { id: "" } }; render(<View />);
    const url = new URL(screen.getByRole("link", { name: "login" }).getAttribute("href")!, "https://ans.invalid");
    const callback = new URL(url.searchParams.get("callbackUrl")!, "https://ans.invalid");
    expect(url.pathname).toBe("/login"); expect(callback.origin).toBe("https://ans.invalid"); expect(callback.pathname).toBe("/competitions/agrihackathon/manage");
    expect(Object.fromEntries(callback.searchParams)).toEqual(target); expect(callback.hash).toBe("#agri-decisions"); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not preserve invalid selection input through login", async () => {
    mocks.session.data = { user: { id: "" } }; render(<View invalid />);
    const url = new URL(screen.getByRole("link", { name: "login" }).getAttribute("href")!, "https://ans.invalid");
    expect(url.searchParams.get("callbackUrl")).toBe("/competitions/agrihackathon/manage"); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("reads entry-only decisions and shows the verified ID fallback when server context is unavailable", async () => {
    const result = decisions("entry-a", null); delete result.context;
    fetchMock.mockImplementation(async url => url.startsWith(endpoint) ? envelope(result) : new Promise<Response>(() => {}));
    render(<WorkspaceNavigationProvider><AgriWorkspaceManager preselection={{ teamCompetitionId: "entry-a" }} /></WorkspaceNavigationProvider>);
    await screen.findByText('verifiedDecisionTarget:{"id":"entry-a"}');
    expect(Object.fromEntries(new URL(reads()[0][0], "http://fixture.invalid").searchParams)).toEqual({ teamCompetitionId: "entry-a" });
    expect(screen.queryByText("stage.PRELIMINARY")).not.toBeInTheDocument(); expect(writes()).toHaveLength(0);
  });
  it("keeps distinct entry/stage tuples distinct even when IDs include separator characters", async () => {
    fetchMock.mockImplementation(async url => {
      if (!url.startsWith(endpoint)) return new Promise<Response>(() => {});
      const query = new URL(url, "http://fixture.invalid").searchParams;
      return envelope(decisions(query.get("teamCompetitionId")!, query.get("entryStageId"), query.get("teamCompetitionId")!));
    });
    const view = render(<View selected={{ teamCompetitionId: "entry:a", entryStageId: "stage" }} />); await screen.findByText("entry:a");
    view.rerender(<View selected={{ teamCompetitionId: "entry", entryStageId: "a:stage" }} />);
    await screen.findByText("entry"); expect(screen.queryByText("entry:a")).not.toBeInTheDocument(); expect(reads()).toHaveLength(2); expect(writes()).toHaveLength(0);
  });

});
