import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WorkspaceNavigationProvider, useWorkspaceNavigation } from "@/components/providers/workspace-navigation";
import { AgriSubmissions } from "@/components/competitions/agri-submissions";
import { clearSubmissionRecoveries, AgriSubmissionSessionBoundary } from "@/components/competitions/agri-submission-recovery";
import type { AgriStageDetail } from "@/contracts/agri-submissions";
import wallMessages from "../../../messages/agri-wall/zh.json";
import messages from "../../../messages/product/zh.json";
const mocks = vi.hoisted(() => ({ session: { status: "authenticated", data: { user: { id: "actor-a" } } }, update: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ ...mocks.session, update: mocks.update }) }));
vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: (namespace: string) => {
  const lookup = (key: string) => key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, namespace === "agriWall" ? wallMessages : messages.agriSubmissions);
  const t = (key: string, values?: Record<string, string | number>) => { let result = String(lookup(key) ?? key); for (const [name, value] of Object.entries(values ?? {})) result = result.replace("{" + name + "}", String(value)); return result; }; t.has = (key: string) => typeof lookup(key) === "string"; return t;
} }));
const copy = messages.agriSubmissions; const api = "/api/competitions/agrihackathon/submissions";
const envelope = (data: unknown) => new Response(JSON.stringify({ ok: true, data }));
const rejection = (code: string, status = 409) => new Response(JSON.stringify({ ok: false, error: { code } }), { status });
let detail: AgriStageDetail;
let fetchMock: ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>>;
beforeEach(() => {
  clearSubmissionRecoveries(); mocks.session = { status: "authenticated", data: { user: { id: "actor-a" } } };
  detail = { officialMemberChoices: [{ userId: "actor-a", username: "actor-a", name: null }], competitionId: "competition", id: "stage", teamCompetitionId: "entry", stage: "PRELIMINARY", revision: 1,
    wall: { id: "wall", listingId: "listing", projectId: "project", artifactVersionId: "version", published: true, synchronized: true, isOwner: true, href: "/market/fixture" },
    frozenSubmissionId: null, workspaceEnabled: true, hasPrivateMaterials: true, draft: null, current: null, history: [], nextBeforeSequence: null,
    publishedRule: { id: "rule", guidanceMarkdown: "Fixture guidance", requirements: { schemaVersion: 1, repositoryRequired: false, repositoryRefRequired: false, demoRequired: false, materials: [] },
      window: { stage: "PRELIMINARY", state: "CONFIRMED", opensAt: "2026-10-07T00:00:00Z", closesAt: "2027-01-01T00:00:00Z", includesDeadline: false, confirmedById: "staff", confirmedAt: "2026-10-06T00:00:00Z" } }, windowState: "OPEN", serverNow: "2026-10-08T00:00:00Z" };
  fetchMock = vi.fn(async (url, init) => {
    if (init?.method === "POST") {
      const command = JSON.parse(init.body as string);
      if (command.action === "prepareStage") return envelope({ entryStageId: "stage" });
      detail = { ...detail, revision: detail.revision + 1, draft: command.draft ?? null }; return envelope({ appliedRevision: detail.revision });
    }
    if (url === api + "/entries") return envelope({ competitionId: "competition", workspaceEnabled: true, entries: [{ id: "entry", teamId: "team", competitionId: "competition", teamName: "Fixture team", role: "OWNER" }] });
    if (url.startsWith(api + "?stage=")) return envelope({ stages: [], nextCursor: null });
    if (url.includes("/versions")) return envelope({ versions: [{ id: "version", projectId: "project", projectTitle: "Fixture project", artifactTitle: "Fixture work", version: 1 }], nextCursor: null });
    return envelope(detail);
  }); vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function open() { const view = render(<WorkspaceNavigationProvider><AgriSubmissions /></WorkspaceNavigationProvider>); fireEvent.click(await screen.findByRole("button", { name: copy.open })); await screen.findByLabelText(copy.version); await screen.findByText("Fixture project · Fixture work · v1"); return view; }
function fill() { fireEvent.change(screen.getByLabelText(copy.version), { target: { value: "version" } }); fireEvent.change(screen.getByLabelText(copy.summary), { target: { value: "My introduction" } }); }
describe("stage submission recovery and consent", () => {
  it("intercepts shared navigation and cancelling retains unsaved inputs without writes", async () => {
    const next = vi.fn();
    function Navigate() { const navigation = useWorkspaceNavigation(); return <button onClick={() => navigation.run(next)}>Other page</button>; }
    render(<WorkspaceNavigationProvider><Navigate /><AgriSubmissions /></WorkspaceNavigationProvider>);
    fireEvent.click(await screen.findByRole("button", { name: copy.open })); await screen.findByLabelText(copy.version); fill();
    fireEvent.click(screen.getByRole("button", { name: "Other page" }));
    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(copy.leaveTitle); expect(next).not.toHaveBeenCalled();
    expect(screen.getByText(copy.leaveUnsaved)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.leaveStay }));
    expect(screen.getByLabelText(copy.summary)).toHaveValue("My introduction"); expect(next).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Other page" })); fireEvent.click(screen.getByRole("button", { name: copy.leaveContinue }));
    expect(next).toHaveBeenCalledTimes(1); expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
  it("does not show a leave dialog after an acknowledged draft save", async () => {
    await open(); fill(); fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByText(copy.saved);
    // Acknowledgement precedes the readback and navigation-guard cleanup.
    await waitFor(() => expect(screen.getByRole("button", { name: copy.save })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: copy.chooseTeam })); await screen.findByRole("button", { name: copy.open });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("requires explicit confirmation and sends only the selected fixed version and rules", async () => {
    await open(); fill(); expect(screen.getByRole("button", { name: copy.submit })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(copy.confirm)); fireEvent.click(screen.getByRole("button", { name: copy.submit }));
    await screen.findByText(copy.submitted);
    const command = fetchMock.mock.calls.map(([,init]) => init?.body ? JSON.parse(String(init.body)) : null).find(row => row?.action === "submit");
    expect(command).toMatchObject({ expectedRevision: 1, expectedRuleVersionId: "rule", content: { projectId: "project", artifactVersionId: "version" } });
    expect(command.content).not.toHaveProperty("ownerId");
  });
  it("editing any content invalidates the formal confirmation", async () => {
    await open(); fill(); fireEvent.click(screen.getByLabelText(copy.confirm)); expect(screen.getByRole("button", { name: copy.submit })).toBeEnabled();
    fireEvent.change(screen.getByLabelText(copy.summary), { target: { value: "Changed" } }); expect(screen.getByRole("button", { name: copy.submit })).toBeDisabled();
  });
  it("retains the exact unknown command across navigation and a throttled retry", async () => {
    await open(); fill(); const normal = fetchMock.getMockImplementation()!; const commands: unknown[] = [];
    fetchMock.mockImplementation(async (url, init) => { if (init?.method === "POST" && JSON.parse(String(init.body)).action === "saveDraft") { commands.push(JSON.parse(String(init.body))); if (commands.length === 1) throw new TypeError("lost response"); if (commands.length === 2) return rejection("RATE_LIMITED",429); } return normal(url,init); });
    fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByRole("button", { name: copy.retry });
    fireEvent.click(screen.getByRole("button", { name: copy.chooseTeam })); fireEvent.click(await screen.findByRole("button", { name: copy.leaveContinue })); fireEvent.click(await screen.findByRole("button", { name: copy.open }));
    fireEvent.click(await screen.findByRole("button", { name: copy.retry })); await screen.findByText(copy.errors.RATE_LIMITED);
    expect(screen.getByRole("button", { name: copy.save })).toBeDisabled(); fireEvent.click(screen.getByRole("button", { name: copy.retry })); await screen.findByText(copy.saved);
    expect(commands).toHaveLength(3); expect(commands[1]).toEqual(commands[0]); expect(commands[2]).toEqual(commands[0]);
  });
  it("adopts a conflict revision only after acknowledgement without losing input", async () => {
    await open(); fill(); const normal = fetchMock.getMockImplementation()!; let reject = true;
    fetchMock.mockImplementation(async (url,init) => { if (init?.method === "POST" && JSON.parse(String(init.body)).action === "saveDraft" && reject) { reject=false; detail={...detail,revision:7}; return rejection("AGRI_REVISION_CONFLICT"); } return normal(url,init); });
    fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByText(copy.conflict);
    expect(screen.getByRole("button", { name: copy.reloadPreserve })).toBeDisabled(); fireEvent.click(screen.getByLabelText(copy.adoptRevision)); fireEvent.click(screen.getByRole("button", { name: copy.reloadPreserve }));
    await waitFor(() => expect(screen.getByRole("button", { name: copy.save })).toBeEnabled()); expect(screen.getByLabelText(copy.summary)).toHaveValue("My introduction");
    fireEvent.click(screen.getByRole("button", { name: copy.save })); await screen.findByText(copy.saved);
    expect(fetchMock.mock.calls.map(([,init])=>init?.body ? JSON.parse(String(init.body)):null).filter(row=>row?.action==="saveDraft").at(-1)).toMatchObject({expectedRevision:7});
  });
  it("does not resubmit an acknowledged write whose detail reload failed", async () => {
    await open(); fill(); const normal=fetchMock.getMockImplementation()!; let failRead=false;
    fetchMock.mockImplementation(async(url,init)=>{ if(init?.method==="POST"&&JSON.parse(String(init.body)).action==="saveDraft"){const result=await normal(url,init);failRead=true;return result;} if(failRead&&url===api+"/stage"){failRead=false;throw new TypeError("read failed");}return normal(url,init); });
    fireEvent.click(screen.getByRole("button",{name:copy.save}));await screen.findByText(copy.stale);expect(screen.queryByRole("button",{name:copy.retry})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:copy.refresh}));await waitFor(()=>expect(screen.queryByText(copy.stale)).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.filter(([,init])=>init?.body&&JSON.parse(String(init.body)).action==="saveDraft")).toHaveLength(1);
  });
  it("preserves unsaved input within the same account and clears it on account changes", async () => {
    const view=render(<WorkspaceNavigationProvider><AgriSubmissionSessionBoundary/><AgriSubmissions/></WorkspaceNavigationProvider>);fireEvent.click(await screen.findByRole("button",{name:copy.open}));await screen.findByLabelText(copy.summary);
    fireEvent.change(screen.getByLabelText(copy.summary),{target:{value:"Private A draft"}}); fireEvent.click(screen.getByRole("button",{name:copy.chooseTeam}));fireEvent.click(await screen.findByRole("button",{name:copy.leaveContinue}));fireEvent.click(await screen.findByRole("button",{name:copy.open}));expect(await screen.findByLabelText(copy.summary)).toHaveValue("Private A draft");
    mocks.session={status:"authenticated",data:{user:{id:"actor-b"}}};view.rerender(<WorkspaceNavigationProvider><AgriSubmissionSessionBoundary/><AgriSubmissions/></WorkspaceNavigationProvider>);fireEvent.click(await screen.findByRole("button",{name:copy.open}));expect(await screen.findByLabelText(copy.summary)).toHaveValue("");
  });
  it("ignores an unmounted account's delayed error", async () => {
    let settle!: (response:Response)=>void; const delayed=new Promise<Response>(resolve=>{settle=resolve;});const normal=fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url,init)=>new Headers(init?.headers).get("x-ans-submission-actor")==="actor-a"?delayed:normal(url,init));
    const view=render(<WorkspaceNavigationProvider><AgriSubmissions/></WorkspaceNavigationProvider>);mocks.session={status:"authenticated",data:{user:{id:"actor-b"}}};view.rerender(<WorkspaceNavigationProvider><AgriSubmissions/></WorkspaceNavigationProvider>);await screen.findByRole("button",{name:copy.open});
    await act(async()=>{settle(rejection("ACCOUNT_CHANGED"));await delayed;});expect(screen.queryByText(copy.errors.ACCOUNT_CHANGED)).not.toBeInTheDocument();
  });
  it("lets a regular member inspect existing stages without preparing or writing one", async () => {
    const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init) => url === api + "/entries" ? envelope({ competitionId: "competition", workspaceEnabled: true, entries: [{ id: "entry", teamName: "Fixture team", role: "MEMBER" }] }) : url === api + "?stage=PRELIMINARY" ? envelope({ stages: [{ id: "stage", teamCompetitionId: "entry" }], nextCursor: null }) : normal(url, init));
    render(<WorkspaceNavigationProvider><AgriSubmissions /></WorkspaceNavigationProvider>); fireEvent.click(await screen.findByRole("button", { name: copy.open })); await screen.findByLabelText(copy.summary);
    expect(screen.getByText(copy.readOnlyMaterials)).toBeInTheDocument(); expect(screen.queryByText(copy.ownVersions)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.save })).toBeDisabled(); expect(fetchMock.mock.calls.some(([,init]) => init?.method === "POST")).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => url.includes("/versions"))).toBe(false);
  });
  it("preserves outdated materials and requires an explicit removal when rules change", async () => {
    detail = { ...detail, draft: { projectId: "project", artifactVersionId: "version", repository: null, demoUrl: null, summary: "Preserved", materials: { schemaVersion: 1, items: [{ key: "old_proof", kind: "TEXT", text: "Old private proof" }] } } };
    await open(); fireEvent.click(screen.getByLabelText(copy.confirm)); expect(screen.getByRole("button", { name: copy.submit })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: copy.removeMaterial.replace("{key}", "old_proof") }));
    expect(screen.getByLabelText(copy.confirm)).not.toBeChecked(); fireEvent.click(screen.getByLabelText(copy.confirm)); expect(screen.getByRole("button", { name: copy.submit })).toBeEnabled();
  });
  it("keeps final submission closed and supports preparing a draft without invented eligibility", async () => {
    detail={...detail,stage:"FINAL",windowState:"RULES_PENDING"};await open();fill();fireEvent.click(screen.getByLabelText(copy.confirm));expect(screen.getByRole("button",{name:copy.submit})).toBeDisabled();expect(screen.getByRole("button",{name:copy.save})).toBeEnabled();expect(screen.getByText(copy.finalPending)).toBeInTheDocument();
  });
});

describe("entry-point selection and read-only stage history", () => {
  it("preselects the linked team and FINAL stage without writes on navigation", async () => {
    render(<WorkspaceNavigationProvider><AgriSubmissions initialSelection={{ teamCompetitionId: "entry", stage: "FINAL" }} /></WorkspaceNavigationProvider>);
    await screen.findByRole("button", { name: copy.open });
    expect(screen.getByLabelText(copy.team)).toHaveValue("entry");
    expect(screen.getByLabelText(copy.stageField)).toHaveValue("FINAL");
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });
  it("honors a new stage link when the same route receives updated selection props", async () => {
    const ui = render(<WorkspaceNavigationProvider><AgriSubmissions initialSelection={{ teamCompetitionId: "entry", stage: "PRELIMINARY" }} /></WorkspaceNavigationProvider>);
    await screen.findByRole("button", { name: copy.open });
    expect(screen.getByLabelText(copy.stageField)).toHaveValue("PRELIMINARY");
    ui.rerender(<WorkspaceNavigationProvider><AgriSubmissions initialSelection={{ teamCompetitionId: "entry", stage: "FINAL" }} /></WorkspaceNavigationProvider>);
    await screen.findByRole("button", { name: copy.open });
    expect(screen.getByLabelText(copy.stageField)).toHaveValue("FINAL");
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });
  it("does not silently switch to another team when a linked entry is inaccessible", async () => {
    render(<WorkspaceNavigationProvider><AgriSubmissions initialSelection={{ teamCompetitionId: "foreign-entry", stage: "FINAL" }} /></WorkspaceNavigationProvider>);
    const openButton = await screen.findByRole("button", { name: copy.open });
    expect(screen.getByLabelText(copy.team)).toHaveValue(""); expect(openButton).toBeDisabled();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });
  it("reads an existing manager stage without preparing it, including a disabled workspace", async () => {
    const normal = fetchMock.getMockImplementation()!;
    detail.workspaceEnabled = false;
    fetchMock.mockImplementation(async (url, init) => {
      if (url === api + "/entries") return envelope({ competitionId: "competition", workspaceEnabled: false, entries: [{ id: "entry", teamName: "Fixture team", role: "OWNER" }] });
      if (url === api + "?stage=PRELIMINARY") return envelope({ stages: [{ id: "stage", teamCompetitionId: "entry" }], nextCursor: null });
      return normal(url, init);
    });
    render(<WorkspaceNavigationProvider><AgriSubmissions /></WorkspaceNavigationProvider>);
    fireEvent.click(await screen.findByRole("button", { name: copy.open }));
    expect(await screen.findByLabelText(copy.version)).toBeDisabled();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });
});


describe("official roster and final baseline", () => {
  it("includes the explicit selected real-account roster in the first formal command", async () => {
    await open(); fill();
    expect(screen.getByLabelText(/actor-a @actor-a/)).toBeChecked();
    fireEvent.click(screen.getByLabelText(copy.confirm)); fireEvent.click(screen.getByRole("button", { name: copy.submit }));
    await screen.findByText(copy.submitted);
    const command = fetchMock.mock.calls.map(([, init]) => init?.body ? JSON.parse(String(init.body)) : null).find(row => row?.action === "submit");
    expect(command.officialMemberIds).toEqual(["actor-a"]);
  });
  it("requires the submitting manager and invalidates consent when the roster changes", async () => {
    await open(); fill(); fireEvent.click(screen.getByLabelText(copy.confirm));
    fireEvent.click(screen.getByLabelText(/actor-a @actor-a/));
    expect(screen.getByLabelText(copy.confirm)).not.toBeChecked();
    fireEvent.click(screen.getByLabelText(copy.confirm)); expect(screen.getByRole("button", { name: copy.submit })).toBeDisabled();
  });
  it("blocks official actions on historical entries with no confirmed roster", async () => {
    detail.legacyRosterRequired = true; await open(); fill(); fireEvent.click(screen.getByLabelText(copy.confirm));
    expect(screen.getByRole("button", { name: copy.submit })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(copy.errors.AGRI_LEGACY_ROSTER_REQUIRED);
  });
  it("keeps a qualified final closed without a frozen preliminary baseline", async () => {
    detail.stage = "FINAL"; detail.finalEligibility = { state: "ELIGIBLE", sourceId: "decision" };
    detail.officialRoster = { id: "roster", projectId: "project", confirmedById: "actor-a", confirmedAt: detail.serverNow,
      members: [{ userId: "actor-a", username: "actor-a", name: null }] };
    await open(); fill(); fireEvent.click(screen.getByLabelText(copy.confirm));
    expect(screen.getByRole("button", { name: copy.submit })).toBeDisabled();
    expect(screen.getByText(copy.errors.AGRI_PRELIMINARY_BASELINE_REQUIRED)).toBeInTheDocument();
  });
});


describe("private stage submission", () => {
  it("keeps a valid private project selectable when an older wall points elsewhere", async () => {
    detail.wall = { ...detail.wall!, projectId: "other-project", artifactVersionId: "other-version" };
    await open();
    expect(screen.getByRole("option", { name: /Fixture project/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(copy.version), { target: { value: "version" } });
    expect(screen.getByLabelText(copy.version)).toHaveValue("version");
  });
  it("accepts a private unbound project without publishing it", async () => {
    detail.wall = null;
    await open(); fill(); fireEvent.click(screen.getByLabelText(copy.confirm));
    expect(screen.getByRole("button", { name: copy.submit })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: copy.submit }));
    await screen.findByText(copy.submitted);
    const commands = fetchMock.mock.calls.filter(([,init]) => init?.body).map(([,init]) => JSON.parse(String(init!.body)));
    expect(commands.find(row => row.action === "submit")).not.toHaveProperty("syncToAgriWall");
    expect(screen.queryByRole("checkbox", { name: /同步公开|sync.*public/i })).not.toBeInTheDocument();
  });
  it("can reuse an already published imported version", async () => {
    await open();
    expect(screen.getByLabelText(copy.version)).toHaveValue("version");
    expect(screen.getByRole("link", { name: wallMessages.viewProject })).toBeInTheDocument();
  });
  it("does not make public-wall ownership a private submission permission", async () => {
    detail.wall = { ...detail.wall!, synchronized: false, isOwner: false };
    await open(); fill(); fireEvent.click(screen.getByLabelText(copy.confirm));
    expect(screen.getByRole("button", { name: copy.submit })).toBeEnabled();
  });
});
