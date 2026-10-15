import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgriEvidence } from "@/components/competitions/agri-evidence";
import copy from "../../../messages/product/en.json";
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => { const read = (key: string) => key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], copy.agriEvidence); const t = (key: string, args: Record<string, unknown> = {}) => String(read(key) ?? key).replace(/\{(\w+)\}/g, (_, k) => String(args[k] ?? k)); t.has = (key: string) => read(key) !== undefined; return t; } }));
const response = (data: unknown) => Promise.resolve(new Response(JSON.stringify({ ok: true, data }), { headers: { "content-type": "application/json" } }));
const listing = (staff = false) => ({ competitionId: "fixture", submissionId: "submission", entryStageId: "stage", enabled: true, canWrite: true, canArchive: staff, canVerify: false, target: { projectId: "project", artifactVersionId: "version", repository: null, demoUrl: null }, requests: [], manifest: null, nextCursor: null });
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => { fetcher = vi.fn(() => response(listing())); vi.stubGlobal("fetch", fetcher); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("private evidence panel", () => {
    it("loads only on open and binds requests to the rendered account", async () => { render(<AgriEvidence actorId="actor" submissionId="submission" invalidate={() => { }}/>); expect(fetcher).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: copy.agriEvidence.open })); await screen.findByText(copy.agriEvidence.empty); expect(fetcher.mock.calls[0][1].headers).toMatchObject({ "x-ans-submission-actor": "actor" }); expect(screen.queryByRole("button", { name: copy.agriEvidence.archive })).toBeNull(); });
    it("shows fixed-archive controls only for staff capability and remains responsive", async () => { fetcher.mockImplementation(() => response(listing(true))); render(<AgriEvidence actorId="staff" submissionId="submission" invalidate={() => { }}/>); fireEvent.click(screen.getByRole("button", { name: copy.agriEvidence.open })); await screen.findByRole("button", { name: copy.agriEvidence.archive }); expect(screen.getByRole("button", { name: copy.agriEvidence.archive })).toBeDisabled(); });
    it("separates manual cutoff verification from archive capability", async () => {
        const object = { id: "object", fileName: "fixture.txt", sha256: "a".repeat(64), byteLength: 8, capturedAt: "2026-10-15T00:00:00Z", deadlineAt: "2026-10-14T00:00:00Z", temporalStatus: "CAPTURED_AFTER_DEADLINE", sourceTiming: "UNVERIFIED_SOURCE", coverage: "UPLOADED_ORIGINAL", resolvedSha: null };
        const withFile = { ...listing(true), requests: [{ id: "request", fileName: "fixture.txt", kind: "SUPPORTING_FILE", state: "STORED", createdAt: object.capturedAt, attempt: 1, maxAttempts: 3, object }] };
        fetcher.mockImplementation(() => response(withFile));
        const view = render(<AgriEvidence actorId="archive-only" submissionId="submission" invalidate={() => { }}/>);
        fireEvent.click(screen.getByRole("button", { name: copy.agriEvidence.open }));
        await screen.findByText("fixture.txt");
        expect(screen.queryByText(copy.agriEvidence.verify)).toBeNull();
        fetcher.mockImplementation(() => response({ ...withFile, canArchive: false, canVerify: true }));
        view.rerender(<AgriEvidence actorId="notes-reviewer" submissionId="submission" invalidate={() => { }}/>);
        fireEvent.click(screen.getByRole("button", { name: copy.agriEvidence.open }));
        await screen.findAllByText(copy.agriEvidence.verify);
        expect(screen.queryByRole("button", { name: copy.agriEvidence.archive })).toBeNull();
    });
    it("unmounts private contents on account change and rejects late earlier-account results", async () => { let done!: (r: Response) => void; fetcher.mockImplementationOnce(() => new Promise<Response>(r => { done = r; })); const view = render(<AgriEvidence actorId="old" submissionId="submission" invalidate={() => { }}/>); fireEvent.click(screen.getByRole("button", { name: copy.agriEvidence.open })); view.rerender(<AgriEvidence actorId="new" submissionId="submission" invalidate={() => { }}/>); done(new Response(JSON.stringify({ ok: true, data: { ...listing(), requests: [{ id: "x", fileName: "PRIVATE_OLD_ACCOUNT" }] } }))); await Promise.resolve(); expect(screen.queryByText("PRIVATE_OLD_ACCOUNT")).toBeNull(); expect(screen.getByRole("button", { name: copy.agriEvidence.open })).toBeInTheDocument(); });
    it("fixes the draft repository ref before a submission exists and adopts only the exact current ref", async () => {
        const repository = { url: "https://github.com/fixture/repo", ref: { kind: "TAG" as const, value: "v1" } }, prepared = vi.fn();
        const resolved = { id: "fixed-ref", submissionId: null, fileName: "repository.tar.gz", kind: "REPOSITORY", mode: "GITHUB_ARCHIVE", state: "RESOLVED", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString(), attempt: 1, maxAttempts: 3, canManage: true, resolution: { repositoryUrl: repository.url, originalRef: repository.ref, sha: "a".repeat(40), resolvedAt: new Date().toISOString() }, object: null };
        let hasResolved = false;
        fetcher.mockImplementation((_url, init) => {
            if (init?.method === "POST") { hasResolved = true; return response({ requestId: "fixed-ref" }); }
            return response({ ...listing(), submissionId: null, target: null, requests: hasResolved ? [resolved] : [] });
        });
        const view = render(<AgriEvidence actorId="owner" entryStageId="stage" projectId="project" artifactVersionId="version" repository={repository} invalidate={() => {}} onPrepared={prepared} />);
        fireEvent.click(screen.getByRole("button", { name: copy.agriEvidence.open }));
        fireEvent.click(await screen.findByRole("button", { name: copy.agriEvidence.resolveRef }));
        await screen.findByText("a".repeat(40));
        const post = fetcher.mock.calls.find((call: unknown[]) => (call[1] as RequestInit)?.method === "POST")!;
        expect(JSON.parse(post[1].body)).toMatchObject({ submissionId: null, mode: "GITHUB_ARCHIVE", originalRef: repository.ref, projectId: "project", artifactVersionId: "version" });
        await waitFor(() => expect(prepared).toHaveBeenLastCalledWith(["fixed-ref"]));
        view.rerender(<AgriEvidence actorId="owner" entryStageId="stage" projectId="project" artifactVersionId="version" repository={{ ...repository, ref: { kind: "TAG", value: "v2" } }} invalidate={() => {}} onPrepared={prepared} />);
        fireEvent.click(screen.getByRole("button", { name: copy.agriEvidence.open }));
        await screen.findByText("a".repeat(40));
        expect(prepared).toHaveBeenLastCalledWith([]);
    });

});
