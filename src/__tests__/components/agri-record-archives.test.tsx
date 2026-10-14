import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, webcrypto } from "node:crypto";
import { AgriRecordArchives } from "@/components/competitions/agri-record-archives";
import { syncAgriArchiveActor } from "@/components/competitions/agri-record-archive-recovery";
import { canonicalAgriArchiveJSON, type AgriRecordArchiveDetail } from "@/contracts/agri-record-archive";
import type { AgriRecordSummary } from "@/contracts/agri-record-summary";
import messages from "../../../messages/product/en.json";
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: (namespace: string) => {
  const root = namespace === "product.agriArchives" ? messages.agriArchives : namespace === "product.agriIssues" ? messages.agriIssues : messages.agriSummary;
  const lookup = (key: string) => key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, root);
  const t = (key: string, values?: Record<string, string | number>) => { let value = String(lookup(key) ?? key); for (const [name, item] of Object.entries(values ?? {})) value = value.replace("{" + name + "}", String(item)); return value; };
  t.has = (key: string) => typeof lookup(key) === "string"; return t;
} }));
vi.mock("@/components/providers/workspace-navigation", () => ({ WorkspaceLink: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
import { withSyntheticRecordDetails, withSyntheticIssueMetadata } from "./fixtures/agri-record-summary";
const copy = messages.agriArchives;
const invalidate = vi.fn(), click = vi.fn(), objectUrl = vi.fn(() => "blob:synthetic-archive");
function detail(privateScope = false, submissionId = "submission-a", id = "archive-a"): AgriRecordArchiveDetail {
  const submission = { id: submissionId, entryStageId: "stage", stage: "FINAL" as const, sequence: 2, artifactVersionId: "artifact", artifactVersion: 4, ruleVersionId: "rule", acceptedAt: "2026-10-08T06:25:00Z", isCurrent: true, isFrozen: false };
  const record: AgriRecordSummary = { schemaVersion: 1, source: "ANS_AGRI_LIVE_RECORD_SUMMARY", generatedAt: "2026-10-08T06:25:00Z", competitionId: "edition", teamCompetitionId: "entry", teamName: "Synthetic team", submission, rule: { id: "rule", version: 1, confirmedAt: "2026-10-01T00:00:00Z" }, selection: { includePrivate: privateScope, includeInternal: false }, limits: { maxPerCollection: 100, complete: true }, stageHistory: [submission], technicalChecks: [], demoChecks: [], issues: [], issueEvents: [], ...(privateScope ? { content: { projectId: "project", artifactVersionId: "artifact", summary: "PRIVATE_ARCHIVE_MARKER", repository: null, demoUrl: null, materials: { schemaVersion: 1 as const, items: [] } } } : {}) };
  const snapshot: AgriRecordArchiveDetail["snapshot"] = { schemaVersion: 1, source: "ANS_AGRI_SAVED_RECORD_ARCHIVE", includesOnsite: false, archiveId: id, sequence: 1, previousArchiveId: null, createdById: "actor-a", collectedAt: "2026-10-08T06:25:00Z", record };
  const canonical = canonicalAgriArchiveJSON(snapshot);
  return { snapshot, archive: { id, competitionId: "edition", submissionId, entryStageId: "stage", artifactVersionId: "artifact", ruleVersionId: "rule", sequence: 1, previousArchiveId: null, createdById: "actor-a", collectedAt: snapshot.collectedAt, selection: record.selection, snapshotSchemaVersion: 1, includesOnsite: false, sha256: createHash("sha256").update(canonical).digest("hex"), byteLength: Buffer.byteLength(canonical) } };
}
function listing(value = detail(), canCreate = true, nextCursor: string | null = null) { return { competitionId: "edition", submissionId: value.archive.submissionId, workspaceEnabled: true, canCreate, items: [value.archive], nextCursor }; }
const envelope = (data: unknown) => new Response(JSON.stringify({ ok: true, data }), { headers: { "Content-Type": "application/json" } });
const denied = (code: string, status = 403) => new Response(JSON.stringify({ ok: false, error: { code } }), { status });
function deferred() { let resolve!: (value: Response) => void; const promise = new Promise<Response>(done => { resolve = done; }); return { promise, resolve }; }
let fetcher: ReturnType<typeof vi.fn<(url: string, init: RequestInit) => Promise<Response>>>;
beforeEach(() => { vi.clearAllMocks(); syncAgriArchiveActor(null); syncAgriArchiveActor("actor-a"); fetcher = vi.fn(async () => envelope(listing())); vi.stubGlobal("fetch", fetcher); vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("URL", class extends URL { static createObjectURL = objectUrl; static revokeObjectURL = vi.fn(); }); vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click); });
afterEach(() => { cleanup(); syncAgriArchiveActor(null); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const mount = () => render(<AgriRecordArchives actorId="actor-a" submissionId="submission-a" invalidate={invalidate} />);
async function open() { fireEvent.click(screen.getByRole("button", { name: copy.open })); await screen.findByRole("button", { name: "View v1" }); }
async function save() { fireEvent.click(screen.getByRole("button", { name: copy.save })); fireEvent.click(screen.getByRole("button", { name: copy.confirmSave })); }
describe("saved archives: exact source, immutable scopes and unknown saves", () => {
  it("loads only on open, sends the actor and makes onsite exclusion clear", async () => { mount(); expect(fetcher).not.toHaveBeenCalled(); await open(); expect(fetcher.mock.calls[0]).toMatchObject(["/api/competitions/agrihackathon/records/submission-a/archives", { headers: { "x-ans-submission-actor": "actor-a" }, cache: "no-store" }]); expect(screen.getByText(copy.onsiteHint)).toBeInTheDocument(); });
  it("shows a verified private snapshot without describing it as a live report", async () => { fetcher.mockResolvedValueOnce(envelope(listing(detail(true)))); mount(); await open(); fetcher.mockResolvedValueOnce(envelope(detail(true))); fireEvent.click(screen.getByRole("button", { name: "View v1" })); await screen.findByText("PRIVATE_ARCHIVE_MARKER"); expect(screen.queryByText(messages.agriSummary.notArchive)).toBeNull(); });
  it("renders full saved materials and check details from the verified snapshot without a live refresh", async () => {
    const value = detail(true);
    value.snapshot.record = withSyntheticRecordDetails(value.snapshot.record);
    value.archive.selection = value.snapshot.record.selection;
    const canonical = canonicalAgriArchiveJSON(value.snapshot);
    value.archive.sha256 = createHash("sha256").update(canonical).digest("hex");
    value.archive.byteLength = Buffer.byteLength(canonical);
    fetcher.mockResolvedValueOnce(envelope(listing(value)));
    mount(); await open();
    fetcher.mockResolvedValueOnce(envelope(value));
    fireEvent.click(screen.getByRole("button", { name: "View v1" }));
    await screen.findByText("SAVED_SUMMARY_MARKER");
    expect(screen.getByText("SAVED_REPOSITORY_CHECK")).toBeInTheDocument();
    expect(screen.getByText("SAVED_BACKUP_CHECK")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /https:\/\/github.com\/example\/synthetic-record/ })).toHaveAttribute("href", "https://github.com/example/synthetic-record");
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/competitions/agrihackathon/records/submission-a/archives",
      "/api/competitions/agrihackathon/archives/archive-a?mode=view",
    ]);
  });
  it("reads issue metadata and tentative deadlines from the immutable verified archive", async () => {
    const value = detail();
    value.snapshot.record = withSyntheticIssueMetadata(value.snapshot.record);
    value.snapshot.record.issues[0].dueState = "TENTATIVE";
    delete value.snapshot.record.issues[0].completedAt;
    const canonical = canonicalAgriArchiveJSON(value.snapshot);
    value.archive.sha256 = createHash("sha256").update(canonical).digest("hex");
    value.archive.byteLength = Buffer.byteLength(canonical);
    fetcher.mockResolvedValueOnce(envelope(listing(value)));
    mount(); await open();
    fetcher.mockResolvedValueOnce(envelope(value));
    fireEvent.click(screen.getByRole("button", { name: "View v1" }));
    await screen.findByText(messages.agriIssues.typeOptions.ENVIRONMENT);
    const field = (label: string) => screen.getByText(label).nextElementSibling;
    expect(field(messages.agriIssues.severity)).toHaveTextContent(messages.agriIssues.severityOptions.HIGH);
    expect(field(messages.agriIssues.visibility)).toHaveTextContent(messages.agriIssues.visibilityOptions.TEAM);
    expect(field(messages.agriIssues.basis)).toHaveTextContent(messages.agriIssues.basisOptions.METADATA);
    expect(field(messages.agriIssues.dueState)).toHaveTextContent(messages.agriIssues.dueStateOptions.TENTATIVE);
    expect(field(messages.agriIssues.dueAt)).toHaveTextContent("9 Oct 2026, 09:30");
    expect(field(messages.agriSummary.issueDates.created)).toHaveTextContent("8 Oct 2026, 09:00 (Beijing time)");
    expect(field(messages.agriSummary.issueDates.updated)).toHaveTextContent("8 Oct 2026, 11:00 (Beijing time)");
    expect(field(messages.agriSummary.issueDates.completed)).toHaveTextContent(messages.agriSummary.details.notRecorded);
    expect(screen.queryByText(/PRIVATE_ARCHIVE_MARKER/)).toBeNull();
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/competitions/agrihackathon/records/submission-a/archives",
      "/api/competitions/agrihackathon/archives/archive-a?mode=view",
    ]);
  });
  it("rejects tampered content before rendering or downloading", async () => { mount(); await open(); const value = detail(true); value.snapshot.record.content!.summary = "TAMPERED_PRIVATE_MARKER"; fetcher.mockResolvedValueOnce(envelope(value)); fireEvent.click(screen.getByRole("button", { name: "View v1" })); await screen.findByText(copy.errors.AGRI_ARCHIVE_INTEGRITY_FAILED); expect(screen.queryByText("TAMPERED_PRIVATE_MARKER")).toBeNull(); expect(objectUrl).not.toHaveBeenCalled(); });
  it.each(["competitionId", "entryStageId", "artifactVersionId", "ruleVersionId", "previousArchiveId", "createdById", "collectedAt"])("rejects contradictory %s provenance before downloading", async field => { mount(); await open(); const value = detail(); Object.assign(value.archive, { [field]: "other" }); fetcher.mockResolvedValueOnce(new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } })); fireEvent.click(screen.getByRole("button", { name: "Download v1 JSON" })); await screen.findByText(copy.errors.AGRI_ARCHIVE_INTEGRITY_FAILED); expect(click).not.toHaveBeenCalled(); });
  it("refuses a different submission even when the snapshot hash is valid", async () => { mount(); await open(); fetcher.mockResolvedValueOnce(envelope(detail(true, "submission-other"))); fireEvent.click(screen.getByRole("button", { name: "View v1" })); await screen.findByText(copy.errors.INTERNAL_ERROR); expect(screen.queryByText("PRIVATE_ARCHIVE_MARKER")).toBeNull(); });
  it("fails closed on another source's list", async () => { fetcher.mockResolvedValueOnce(envelope(listing(detail(false, "submission-other")))); mount(); fireEvent.click(screen.getByRole("button", { name: copy.open })); await screen.findByText(copy.errors.INTERNAL_ERROR); expect(screen.queryByRole("button", { name: "View v1" })).toBeNull(); });
  it("requires an explicit save confirmation and freezes the chosen scope", async () => { mount(); await open(); fireEvent.click(screen.getByLabelText(copy.includePrivate)); fireEvent.click(screen.getByRole("button", { name: copy.save })); expect(fetcher).toHaveBeenCalledTimes(1); fetcher.mockResolvedValueOnce(envelope({ archiveId: "archive-new", sequence: 2, sha256: "a".repeat(64), duplicate: false })).mockResolvedValueOnce(envelope(listing())); fireEvent.click(screen.getByRole("button", { name: copy.confirmSave })); await screen.findByText("Archive version 2 saved."); const command = JSON.parse(String(fetcher.mock.calls[1][1].body)); expect(command).toMatchObject({ action: "createArchive", submissionId: "submission-a", selection: { includePrivate: true, includeInternal: false } }); expect(command.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/); });
  it("does not offer save to a reader", async () => { fetcher.mockResolvedValueOnce(envelope(listing(detail(), false))); mount(); await open(); expect(screen.queryByRole("button", { name: copy.save })).toBeNull(); });
  it("an interrupted save survives remount and retries the identical request", async () => { const view = mount(); await open(); fireEvent.click(screen.getByLabelText(copy.includePrivate)); fetcher.mockRejectedValueOnce(new Error("lost response")); await save(); await screen.findByText(copy.errors.INTERNAL_ERROR); const first = fetcher.mock.calls[1][1].body; view.unmount(); mount(); await open(); expect(screen.getByText(copy.pending)).toBeInTheDocument(); expect(screen.queryByRole("button", { name: copy.save })).toBeNull(); fetcher.mockResolvedValueOnce(envelope({ archiveId: "archive-new", sequence: 2, sha256: "a".repeat(64), duplicate: true })).mockResolvedValueOnce(envelope(listing())); fireEvent.click(screen.getByRole("button", { name: copy.retry })); await screen.findByText("Archive version 2 saved."); expect(fetcher.mock.calls[3][1].body).toBe(first); });
  it("retains the original save after a 429 response", async () => { mount(); await open(); fetcher.mockResolvedValueOnce(denied("RATE_LIMITED", 429)); await save(); await screen.findByText(copy.errors.RATE_LIMITED); expect(screen.getByRole("button", { name: copy.retry })).toBeInTheDocument(); });
  it.each(["AGRI_SCOPE_REQUIRED", "AGRI_WORKSPACE_DISABLED"])("keeps an already uncertain request when retry returns %s", async code => { mount(); await open(); fetcher.mockRejectedValueOnce(new Error("lost response")); await save(); await screen.findByText(copy.errors.INTERNAL_ERROR); const original = fetcher.mock.calls[1][1].body; fetcher.mockResolvedValueOnce(denied(code, code === "AGRI_WORKSPACE_DISABLED" ? 409 : 403)); fireEvent.click(screen.getByRole("button", { name: copy.retry })); await screen.findByText(copy.errors[code as keyof typeof copy.errors]); expect(fetcher.mock.calls[2][1].body).toBe(original); expect(screen.getByRole("button", { name: copy.retry })).toBeInTheDocument(); expect(screen.queryByRole("button", { name: copy.save })).toBeNull(); });
  it("a definitive denied save does not keep an unknown request", async () => { mount(); await open(); fetcher.mockResolvedValueOnce(denied("AGRI_SCOPE_REQUIRED")); await save(); await screen.findByText(copy.errors.AGRI_SCOPE_REQUIRED); expect(screen.queryByRole("button", { name: copy.retry })).toBeNull(); });
  it("export rechecks permission and clears earlier private content on denial", async () => { fetcher.mockResolvedValueOnce(envelope(listing(detail(true)))); mount(); await open(); fetcher.mockResolvedValueOnce(envelope(detail(true))); fireEvent.click(screen.getByRole("button", { name: "View v1" })); await screen.findByText("PRIVATE_ARCHIVE_MARKER"); fetcher.mockResolvedValueOnce(denied("AGRI_SCOPE_REQUIRED")); fireEvent.click(screen.getByRole("button", { name: "Download v1 JSON" })); expect(screen.queryByText("PRIVATE_ARCHIVE_MARKER")).toBeNull(); await screen.findByText(copy.errors.AGRI_SCOPE_REQUIRED); expect(click).not.toHaveBeenCalled(); expect(fetcher.mock.calls[2][0]).toBe("/api/competitions/agrihackathon/archives/archive-a?mode=exportJSON"); });
  it("downloads a freshly authorized and verified version", async () => { mount(); await open(); fetcher.mockResolvedValueOnce(new Response(JSON.stringify(detail()), { headers: { "Content-Type": "application/json" } })); fireEvent.click(screen.getByRole("button", { name: "Download v1 JSON" })); await vi.waitFor(() => expect(click).toHaveBeenCalledOnce()); expect(objectUrl).toHaveBeenCalledOnce(); });
  it("account changes prevent a late private export", async () => { const view = mount(); await open(); const late = deferred(); fetcher.mockReturnValueOnce(late.promise); fireEvent.click(screen.getByRole("button", { name: "Download v1 JSON" })); syncAgriArchiveActor("actor-b"); view.rerender(<AgriRecordArchives actorId="actor-b" submissionId="submission-a" invalidate={invalidate} />); await act(async () => late.resolve(new Response(JSON.stringify(detail(true)), { headers: { "Content-Type": "application/json" } }))); expect(click).not.toHaveBeenCalled(); expect(screen.queryByText("PRIVATE_ARCHIVE_MARKER")).toBeNull(); });
  it("drops pending requests on logout rather than carrying them to another actor", async () => { const view = mount(); await open(); fetcher.mockRejectedValueOnce(new Error("lost response")); await save(); await screen.findByText(copy.errors.INTERNAL_ERROR); syncAgriArchiveActor(null); syncAgriArchiveActor("actor-a"); view.unmount(); mount(); await open(); expect(screen.queryByText(copy.pending)).toBeNull(); });
  it("appends authorized older versions without duplicating the first page", async () => { fetcher.mockResolvedValueOnce(envelope(listing(detail(), true, "cursor-a"))); mount(); await open(); const second = detail(false, "submission-a", "archive-b"); second.archive.sequence = 2; fetcher.mockResolvedValueOnce(envelope({ ...listing(), items: [detail().archive, second.archive] })); fireEvent.click(screen.getByRole("button", { name: copy.more })); await screen.findByRole("button", { name: "View v2" }); expect(screen.getAllByRole("button", { name: "View v1" })).toHaveLength(1); expect(fetcher.mock.calls[1][0]).toContain("cursor=cursor-a"); });
  it("an account error invokes the surrounding session boundary", async () => { fetcher.mockResolvedValueOnce(denied("ACCOUNT_CHANGED")); mount(); fireEvent.click(screen.getByRole("button", { name: copy.open })); await screen.findByText(copy.errors.ACCOUNT_CHANGED); expect(invalidate).toHaveBeenCalledOnce(); });
});