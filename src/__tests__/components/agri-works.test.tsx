import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AgriWorks } from "@/components/competitions/agri-works";
import type { AgriStageDetail, AgriStageList, AgriSubmissionHistoryItem } from "@/contracts/agri-submissions";
import messages from "../../../messages/product/zh.json";
const mocks = vi.hoisted(() => ({ session: { status: "authenticated", data: { user: { id: "actor-a" } } }, update: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ ...mocks.session, update: mocks.update }) }));
vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: () => {
  const lookup = (key: string) => key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, messages.agriWorks);
  const t = (key: string, values?: Record<string, string | number>) => { let result = String(lookup(key) ?? key); for (const [name, value] of Object.entries(values ?? {})) result = result.replace("{" + name + "}", String(value)); return result; }; t.has = (key: string) => typeof lookup(key) === "string"; return t;
} }));
vi.mock("@/components/competitions/agri-record-summary", () => ({ AgriRecordSummary: ({ actorId, submissionId }: { actorId: string; submissionId: string }) => <section aria-label="Exact record summary">{actorId}:{submissionId}</section> }));
const copy = messages.agriWorks; const api = "/api/competitions/agrihackathon/submissions";
const envelope = (data: unknown) => new Response(JSON.stringify({ ok: true, data }));
const rejected = (code: string) => new Response(JSON.stringify({ ok: false, error: { code } }), { status: 403 });
function page(team = "Fixture team", nextCursor: string | null = null): AgriStageList {
  return { competitionId: "fixture-edition", stages: [{ id: team, teamId: "team", teamName: team, teamCompetitionId: "entry", stage: "PRELIMINARY", revision: 3, currentSubmissionId: "submission", frozenSubmissionId: null }], nextCursor, canExport: true, hasPrivateMaterials: true };
}
function item(sequence = 2): AgriSubmissionHistoryItem {
  return { id: "submission-" + sequence, entryStageId: "Fixture team", sequence, ruleVersionId: "rule", acceptedAt: "2026-10-08T00:00:00Z", content: { projectId: "project", artifactVersionId: "version", summary: "PRIVATE_SUBMITTED", repository: null, demoUrl: null, materials: { schemaVersion: 1, items: [] } } };
}
function detail(): AgriStageDetail {
  return { competitionId: "fixture-edition", id: "Fixture team", teamCompetitionId: "entry", stage: "PRELIMINARY", revision: 3, frozenSubmissionId: null, workspaceEnabled: true, hasPrivateMaterials: true,
    draft: { projectId: "project", artifactVersionId: null, summary: "PRIVATE_DRAFT_NEVER_SHOWN", repository: null, demoUrl: null, materials: { schemaVersion: 1, items: [] } }, current: item(), history: [item()], nextBeforeSequence: 2, publishedRule: null, windowState: "RULES_PENDING", serverNow: "2026-10-08T00:00:00Z" };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
let fetchMock: ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>>;
beforeEach(() => {
  mocks.session = { status: "authenticated", data: { user: { id: "actor-a" } } }; vi.clearAllMocks();
  fetchMock = vi.fn(async url => url.startsWith(api + "?") ? envelope(page()) : envelope(detail())); vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function open() { const view = render(<AgriWorks />); await screen.findByRole("heading", { name: "Fixture team" }); return view; }
async function openDetail() { await open(); fireEvent.click(screen.getByRole("button", { name: "查看Fixture team的初赛材料与版本" })); await screen.findByText(copy.privateVisible); }
describe("internal works permission and request boundaries", () => {
  it("requests staff scope and applies search/stage/status on the server, ignoring a late old response", async () => {
    const late = deferred<Response>(); fetchMock.mockReturnValueOnce(late.promise); render(<AgriWorks />);
    fireEvent.change(screen.getByLabelText(copy.searchLabel), { target: { value: "  Other  " } }); fireEvent.change(screen.getByLabelText(copy.stageLabel), { target: { value: "FINAL" } }); fireEvent.change(screen.getByLabelText(copy.statusLabel), { target: { value: "SUBMITTED" } });
    fetchMock.mockResolvedValueOnce(envelope(page("Other"))); fireEvent.click(screen.getByRole("button", { name: copy.search })); await screen.findByRole("heading", { name: "Other" });
    const query = new URL(fetchMock.mock.calls[1][0], "http://fixture.invalid").searchParams;
    expect(Object.fromEntries(query)).toEqual({ q: "Other", stage: "FINAL", status: "SUBMITTED", scope: "staff" });
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual({ "x-ans-submission-actor": "actor-a" });
    await act(async () => late.resolve(envelope(page("Stale")))); expect(screen.queryByRole("heading", { name: "Stale" })).not.toBeInTheDocument();
  });
  it("appends server cursor pages without duplicates and clears stale results on permission failure", async () => {
    fetchMock.mockResolvedValueOnce(envelope(page("Fixture team", "cursor-one"))); await open();
    fetchMock.mockResolvedValueOnce(envelope({ ...page("Next"), stages: [...page().stages, ...page("Next").stages] })); fireEvent.click(screen.getByRole("button", { name: copy.more }));
    await screen.findByRole("heading", { name: "Next" }); expect(screen.getAllByRole("heading", { name: "Fixture team" })).toHaveLength(1);
    expect(new URL(fetchMock.mock.calls[1][0], "http://fixture.invalid").searchParams.get("cursor")).toBe("cursor-one");
    fetchMock.mockResolvedValueOnce(rejected("AGRI_SCOPE_REQUIRED")); fireEvent.click(screen.getByRole("button", { name: copy.refresh }));
    await screen.findByRole("alert"); expect(screen.queryByRole("heading", { name: "Next" })).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: copy.exportMetadata })).not.toBeInTheDocument();
  });
  it("shows only submitted snapshots and returns keyboard focus to the detail trigger", async () => {
    await openDetail(); expect(screen.queryByText("PRIVATE_DRAFT_NEVER_SHOWN")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fixture team · 初赛" })).toHaveFocus(); fireEvent.click(screen.getByRole("button", { name: copy.close }));
    expect(screen.getByRole("button", { name: "查看Fixture team的初赛材料与版本" })).toHaveFocus();
  });
  it("drops old private history when a subsequent page revokes private materials", async () => {
    await openDetail(); expect(screen.getAllByText("PRIVATE_SUBMITTED")).toHaveLength(2);
    const next = detail(); const older = item(1); delete older.content; const current = item(); delete current.content;
    fetchMock.mockResolvedValueOnce(envelope({ ...next, hasPrivateMaterials: false, draft: null, current, history: [older], nextBeforeSequence: null }));
    fireEvent.click(screen.getByRole("button", { name: copy.moreHistory })); await screen.findByText(copy.metadataOnly);
    expect(screen.queryByText("PRIVATE_SUBMITTED")).not.toBeInTheDocument(); expect(screen.getByText("提交记录：submission-1")).toBeInTheDocument(); expect(screen.getAllByText("提交记录：submission-2")).toHaveLength(2);
  });
  it("unmounts private details on account switch and refuses to apply the previous account response", async () => {
    const view = await open(); const late = deferred<Response>(); fetchMock.mockReturnValueOnce(late.promise); fireEvent.click(screen.getByRole("button", { name: "查看Fixture team的初赛材料与版本" }));
    mocks.session = { status: "authenticated", data: { user: { id: "actor-b" } } }; fetchMock.mockResolvedValueOnce(envelope(page("New account"))); view.rerender(<AgriWorks />);
    await screen.findByRole("heading", { name: "New account" }); await act(async () => late.resolve(envelope(detail())));
    expect(screen.queryByText("PRIVATE_SUBMITTED")).not.toBeInTheDocument(); expect(fetchMock.mock.calls.at(-1)?.[1]?.headers).toEqual({ "x-ans-submission-actor": "actor-b" });
  });
  it("exports the applied full range rather than unsent filters or the current cursor", async () => {
    fetchMock.mockResolvedValueOnce(envelope(page("Fixture team", "cursor"))); await open();
    fireEvent.change(screen.getByLabelText(copy.searchLabel), { target: { value: "Unapplied" } });
    const create = vi.fn(() => "blob:fixture"); const revoke = vi.fn(); const NativeURL = URL; vi.stubGlobal("URL", class extends NativeURL { static createObjectURL = create; static revokeObjectURL = revoke; });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(new Response("fixture CSV", { headers: { "content-type": "text/csv; charset=utf-8" } })); fireEvent.click(screen.getByRole("button", { name: copy.exportMaterials }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce()); const query = new URL(fetchMock.mock.calls.at(-1)![0], "http://fixture.invalid").searchParams;
    expect(Object.fromEntries(query)).toEqual({ q: "", status: "ANY", mode: "materials" }); expect(document.querySelector('a[download]')).toBeNull(); expect(create).toHaveBeenCalledOnce();
  });
  it("uses explicit server capabilities and shows a clear failure when staff access is missing", async () => {
    fetchMock.mockResolvedValueOnce(envelope({ ...page(), canExport: false, hasPrivateMaterials: false })); await open();
    expect(screen.getByRole("button", { name: copy.exportMetadata })).toBeDisabled(); expect(screen.getByRole("button", { name: copy.exportMaterials })).toBeDisabled();
    fetchMock.mockResolvedValueOnce(rejected("AGRI_SCOPE_REQUIRED")); fireEvent.click(screen.getByRole("button", { name: copy.refresh })); expect(await screen.findByRole("alert")).toHaveTextContent(copy.errors.AGRI_SCOPE_REQUIRED);
  });
  it("opens the exact summary for the chosen historical submission and clears it on closing details", async () => {
    fetchMock.mockResolvedValueOnce(envelope(page()));
    fetchMock.mockResolvedValueOnce(envelope({ ...detail(), history: [item(2), item(1)] }));
    await openDetail();
    expect(screen.queryByRole("region", { name: "Exact record summary" })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: copy.reviewVersion.replace("{number}", "2") })[0]);
    expect(screen.getByRole("region", { name: "Exact record summary" })).toHaveTextContent("actor-a:submission-2");
    fireEvent.click(screen.getByRole("button", { name: copy.reviewVersion.replace("{number}", "1") }));
    expect(screen.getByRole("region", { name: "Exact record summary" })).toHaveTextContent("actor-a:submission-1");
    fireEvent.click(screen.getByRole("button", { name: copy.close }));
    expect(screen.queryByRole("region", { name: "Exact record summary" })).not.toBeInTheDocument();
  });
});
