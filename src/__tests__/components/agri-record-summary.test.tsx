import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgriRecordSummary, AgriRecordSummaryContents } from "@/components/competitions/agri-record-summary";
import type { AgriRecordSummary as Summary } from "@/contracts/agri-record-summary";
import messages from "../../../messages/product/en.json";
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => {
  const lookup = (key: string) => key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, messages.agriSummary);
  const t = (key: string, values?: Record<string, string | number>) => { let result = String(lookup(key) ?? key); for (const [name, value] of Object.entries(values ?? {})) result = result.replace("{" + name + "}", String(value)); return result; };
  t.has = (key: string) => typeof lookup(key) === "string"; return t;
} }));
vi.mock("@/components/providers/workspace-navigation", () => ({ WorkspaceLink: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
import { withSyntheticRecordDetails } from "./fixtures/agri-record-summary";
const copy = messages.agriSummary;
const invalidate = vi.fn();
function summary(privateScope = false, internalScope = false, submissionId = "submission-a"): Summary {
  const submission = { id: submissionId, entryStageId: "stage", stage: "FINAL" as const, sequence: 2, artifactVersionId: "artifact", artifactVersion: 4, ruleVersionId: "rule", acceptedAt: "2026-10-08T06:25:00Z", isCurrent: true, isFrozen: false };
  return { schemaVersion: 1, source: "ANS_AGRI_LIVE_RECORD_SUMMARY", generatedAt: "2026-10-08T06:25:00Z", competitionId: "edition", teamCompetitionId: "entry", teamName: "Synthetic team", submission, rule: { id: "rule", version: 1, confirmedAt: "2026-10-01T00:00:00Z" }, selection: { includePrivate: privateScope, includeInternal: internalScope }, limits: { maxPerCollection: 100, complete: true }, stageHistory: [submission], technicalChecks: [], demoChecks: [], issues: [], issueEvents: [], ...(privateScope ? { content: { projectId: "project", artifactVersionId: "artifact", summary: "PRIVATE_RECORD_MARKER", repository: null, demoUrl: null, materials: { schemaVersion: 1 as const, items: [] } } } : {}) };
}
const envelope = (value: Summary) => new Response(JSON.stringify({ ok: true, data: value }), { headers: { "Content-Type": "application/json" } });
const exportResponse = (value: Summary) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
const rejection = (code: string) => new Response(JSON.stringify({ ok: false, error: { code } }), { status: 403 });
function deferred() { let resolve!: (value: Response) => void; const promise = new Promise<Response>(done => { resolve = done; }); return { promise, resolve }; }
let fetcher: ReturnType<typeof vi.fn<(url: string, init: RequestInit) => Promise<Response>>>;
const objectUrl = vi.fn(() => "blob:synthetic-export"), revokeUrl = vi.fn(), click = vi.fn();
beforeEach(() => { vi.clearAllMocks(); fetcher = vi.fn(async () => envelope(summary())); vi.stubGlobal("fetch", fetcher); vi.stubGlobal("URL", class extends URL { static createObjectURL = objectUrl; static revokeObjectURL = revokeUrl; }); vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const mount = (actorId = "actor-a", submissionId = "submission-a") => render(<AgriRecordSummary actorId={actorId} submissionId={submissionId} invalidate={invalidate} />);
async function open() { fireEvent.click(screen.getByRole("button", { name: copy.open })); await screen.findByText(copy.notArchive); }
describe("live summary privacy and exact-source boundary", () => {
  it("does not fetch until opened, then explicitly requests metadata for this actor and source", async () => { mount(); expect(fetcher).not.toHaveBeenCalled(); await open(); const [url, init] = fetcher.mock.calls[0]; expect(url).toContain("/records/submission-a/summary?"); expect(Object.fromEntries(new URL(url, "http://fixture.invalid").searchParams)).toEqual({ includePrivate: "false", includeInternal: "false", mode: "view" }); expect(init).toMatchObject({ cache: "no-store", headers: { "x-ans-submission-actor": "actor-a" } }); expect(screen.queryByText("PRIVATE_RECORD_MARKER")).toBeNull(); });
  it("clears private results immediately on scope downgrade and explicitly reloads metadata", async () => { mount(); await open(); fireEvent.click(screen.getByLabelText(copy.includePrivate)); fetcher.mockResolvedValueOnce(envelope(summary(true))); fireEvent.click(screen.getByRole("button", { name: copy.refresh })); await screen.findByText("PRIVATE_RECORD_MARKER"); fireEvent.click(screen.getByLabelText(copy.includePrivate)); expect(screen.queryByText("PRIVATE_RECORD_MARKER")).toBeNull(); expect(screen.getByText(copy.changed)).toBeInTheDocument(); expect(fetcher).toHaveBeenCalledTimes(2); });
  it("a late private response cannot restore data after scope changes", async () => { mount(); await open(); const late = deferred(); fireEvent.click(screen.getByLabelText(copy.includePrivate)); fetcher.mockReturnValueOnce(late.promise); fireEvent.click(screen.getByRole("button", { name: copy.refresh })); fireEvent.click(screen.getByLabelText(copy.includePrivate)); await act(async () => late.resolve(envelope(summary(true)))); expect(screen.queryByText("PRIVATE_RECORD_MARKER")).toBeNull(); expect(screen.getByText(copy.changed)).toBeInTheDocument(); });
  it("switching account closes the panel and drops the previous account projection", async () => { const view = mount(); await open(); fireEvent.click(screen.getByLabelText(copy.includePrivate)); fetcher.mockResolvedValueOnce(envelope(summary(true))); fireEvent.click(screen.getByRole("button", { name: copy.refresh })); await screen.findByText("PRIVATE_RECORD_MARKER"); view.rerender(<AgriRecordSummary actorId="actor-b" submissionId="submission-a" invalidate={invalidate} />); expect(screen.queryByText("PRIVATE_RECORD_MARKER")).toBeNull(); expect(screen.getByRole("button", { name: copy.open })).toHaveAttribute("aria-expanded", "false"); });
  it("rejects a successful envelope for a different source instead of rendering it", async () => { fetcher.mockResolvedValueOnce(envelope(summary(true, false, "submission-other"))); mount(); fireEvent.click(screen.getByRole("button", { name: copy.open })); await screen.findByText(copy.errors.INTERNAL_ERROR); expect(screen.queryByText("PRIVATE_RECORD_MARKER")).toBeNull(); });
  it("read permission failure clears results and does not silently downgrade scope", async () => { mount(); await open(); fireEvent.click(screen.getByLabelText(copy.includePrivate)); fetcher.mockResolvedValueOnce(rejection("AGRI_SCOPE_REQUIRED")); fireEvent.click(screen.getByRole("button", { name: copy.refresh })); await screen.findByText(copy.errors.AGRI_SCOPE_REQUIRED); expect(screen.getByLabelText(copy.includePrivate)).toBeChecked(); expect(screen.queryByText(copy.notArchive)).toBeNull(); });
  it("an account change invokes the enclosing session boundary", async () => { fetcher.mockResolvedValueOnce(rejection("ACCOUNT_CHANGED")); mount(); fireEvent.click(screen.getByRole("button", { name: copy.open })); await screen.findByText(copy.errors.ACCOUNT_CHANGED); expect(invalidate).toHaveBeenCalledOnce(); });
  it("export makes a fresh scoped request and cannot reuse cached view on revoked export permission", async () => { mount(); await open(); fetcher.mockResolvedValueOnce(rejection("AGRI_SCOPE_REQUIRED")); fireEvent.click(screen.getByRole("button", { name: copy.export })); await screen.findByText(copy.errors.AGRI_SCOPE_REQUIRED); const url = fetcher.mock.calls[1][0]; expect(new URL(url, "http://fixture.invalid").searchParams.get("mode")).toBe("exportJSON"); expect(objectUrl).not.toHaveBeenCalled(); expect(click).not.toHaveBeenCalled(); });
  it("scope changes during export prevent a late download of private data", async () => { mount(); await open(); const late = deferred(); fireEvent.click(screen.getByLabelText(copy.includePrivate)); fetcher.mockReturnValueOnce(late.promise); fireEvent.click(screen.getByRole("button", { name: copy.export })); fireEvent.click(screen.getByLabelText(copy.includePrivate)); await act(async () => late.resolve(exportResponse(summary(true)))); expect(objectUrl).not.toHaveBeenCalled(); expect(click).not.toHaveBeenCalled(); });
  it("unmounting the account panel prevents an in-flight download", async () => { const view = mount(); await open(); const late = deferred(); fetcher.mockReturnValueOnce(late.promise); fireEvent.click(screen.getByRole("button", { name: copy.export })); view.unmount(); await act(async () => late.resolve(exportResponse(summary()))); expect(objectUrl).not.toHaveBeenCalled(); });
  it("a fresh authorized JSON export downloads and remains clearly a live summary", async () => { mount(); await open(); fetcher.mockResolvedValueOnce(exportResponse(summary())); fireEvent.click(screen.getByRole("button", { name: copy.export })); await screen.findByText(copy.notArchive); expect(objectUrl).toHaveBeenCalledOnce(); expect(click).toHaveBeenCalledOnce(); });
  it("closing clears optional scopes and requests metadata next time", async () => { mount(); await open(); fireEvent.click(screen.getByLabelText(copy.includePrivate)); fireEvent.click(screen.getByRole("button", { name: copy.close })); await open(); expect(screen.getByLabelText(copy.includePrivate)).not.toBeChecked(); expect(fetcher.mock.calls[1][0]).toContain("includePrivate=false"); });
});


describe("saved record details rendering", () => {
  it("renders exact materials, versions, individual checks and fallback/recheck details without fetching", () => {
    render(<AgriRecordSummaryContents data={withSyntheticRecordDetails(summary())} />);
    for (const value of ["SAVED_SUMMARY_MARKER", "SAVED_REPOSITORY_CHECK", "SAVED_DEMO_CHECK", "SAVED_VIDEO_CHECK", "SAVED_FEEDBACK_MARKER", "SAVED_INTERNAL_MARKER", "SAVED_DEMO_DESCRIPTION", "SAVED_DEVICE_CHECK", "SAVED_COMPATIBILITY_CHECK", "SAVED_NETWORK_CHECK", "SAVED_AUDIO_CHECK", "SAVED_BACKUP_CHECK", "synthetic-artifact-version", "synthetic-backup-version", "a".repeat(40)]) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText("SAVED_TEXT_MARKER <script>alert(1)</script>")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText(/synthetic-slides-version/)).toBeInTheDocument();
    for (const url of ["https://github.com/example/synthetic-record", "https://demo.example.invalid/saved-demo", "https://video.example.invalid/saved-video", "https://backup.example.invalid/saved-demo"]) {
      expect(screen.getByRole("link", { name: url + " " + copy.details.newTab })).toHaveAttribute("href", url);
    }
    expect(screen.getByText(/Demo check 2.*Rechecks record demo-synthetic-previous/)).toBeInTheDocument();
    expect(screen.getByText("Fallback plan \u00b7 Not tested")).toBeInTheDocument();
    expect(screen.getByText(/Tentative.*9 Oct 2026, 08:30.*Beijing time/)).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([false, true])("never renders private details in metadata scope (internal scope %s)", internal => {
    const data = withSyntheticRecordDetails(summary());
    data.selection = { includePrivate: false, includeInternal: internal };
    render(<AgriRecordSummaryContents data={data} />);
    expect(screen.queryByText(/SAVED_/)).toBeNull();
    expect(screen.queryByText("a".repeat(40))).toBeNull();
    expect(screen.queryByRole("link", { name: /https:/ })).toBeNull();
  });
  it("renders internal metadata notes only with the internal selection", () => {
    const data = withSyntheticRecordDetails(summary());
    data.selection = { includePrivate: false, includeInternal: true };
    data.technicalChecks[0].basis = "METADATA";
    const view = render(<AgriRecordSummaryContents data={data} />);
    expect(screen.getByText("SAVED_INTERNAL_MARKER")).toBeInTheDocument();
    expect(screen.queryByText("SAVED_REPOSITORY_CHECK")).toBeNull();
    data.selection = { includePrivate: true, includeInternal: false };
    view.rerender(<AgriRecordSummaryContents data={data} />);
    expect(screen.queryByText("SAVED_INTERNAL_MARKER")).toBeNull();
    expect(screen.getByText("SAVED_REPOSITORY_CHECK")).toBeInTheDocument();
  });
  it("keeps missing historical fields and unknown dates explicit", () => {
    const data = withSyntheticRecordDetails(summary());
    delete data.technicalChecks[0].checklist;
    data.content!.repository = null;
    data.content!.demoUrl = null;
    data.content!.materials.items = [];
    data.demoChecks[0].demo!.recheckDue = { state: "UNKNOWN", at: null };
    const view = render(<AgriRecordSummaryContents data={data} />);
    expect(screen.getByText(copy.details.notIncluded)).toBeInTheDocument();
    expect(screen.getAllByText(copy.details.notRecorded)).toHaveLength(3);
    expect(screen.getByText(copy.details.noMaterials)).toBeInTheDocument();
    expect(screen.getByText(copy.details.dateState.UNKNOWN)).toBeInTheDocument();
    expect(screen.queryByText(/Tentative.*Beijing time/)).toBeNull();
    data.content!.repository = { url: "https://github.com/example/synthetic-record", ref: { kind: "TAG", value: "v1-saved" } };
    view.rerender(<AgriRecordSummaryContents data={data} />);
    expect(screen.getByText("v1-saved")).toBeInTheDocument();
    expect(screen.getByText("Tag:")).toBeInTheDocument();
  });
  it.each(["javascript:alert(1)", "https://user:secret@example.invalid/private", "https://example.invalid/video?token=secret", "https://example.invalid/video#secret", "http://example.invalid/video"])("does not turn an invalid saved address into a link: %s", value => {
    const data = withSyntheticRecordDetails(summary());
    data.content!.repository!.url = value;
    data.content!.demoUrl = value;
    data.content!.materials.items = [{ key: "video", kind: "LINK", url: value }];
    data.demoChecks[0].demo!.backup.url = value;
    render(<AgriRecordSummaryContents data={data} />);
    expect(screen.queryByRole("link", { name: /opens in a new tab/ })).toBeNull();
    expect(screen.getAllByText(copy.details.invalidLink, { exact: false })).toHaveLength(4);
  });
});
