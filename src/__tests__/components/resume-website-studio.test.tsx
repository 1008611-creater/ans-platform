import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResumeWebsiteStudio } from "@/components/projects/resume-website-studio";
import type { ResumeWebsiteState } from "@/contracts/resume-website";
import { plainResumeWebsiteCopy, RESUME_WEBSITE_EXAMPLE } from "@/domain/projects/resume-website";
import messages from "../../../messages/product/zh.json";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: () => {
  const lookup = (key: string) => key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, messages.website);
  const t = (key: string, values?: Record<string, string | number>) => { let result = String(lookup(key) ?? key); for (const [name, value] of Object.entries(values ?? {})) result = result.replace("{" + name + "}", String(value)); return result; };
  t.has = (key: string) => typeof lookup(key) === "string"; return t;
} }));
const text = messages.website;
const api = "/api/projects/project-a/website";
const envelope = (data: unknown) => new Response(JSON.stringify({ ok: true, data }), { status: 200 });
const failure = (code = "INTERNAL_ERROR", status = 500) => new Response(JSON.stringify({ ok: false, error: { code } }), { status });
function fixture(): ResumeWebsiteState {
  const input = structuredClone(RESUME_WEBSITE_EXAMPLE);
  return { projectId: "project-a", title: "Portfolio A", archived: false, revision: 1, input, runs: [], versions: [{ id: "version-a", version: 1, createdAt: "2026-10-07T00:00:00Z", snapshot: { recipeVersion: 1, templateVersion: 1, inputRevision: 1, input, copy: plainResumeWebsiteCopy(input), editKind: "generated", sourceWorkflowRunId: "run-old" } }] };
}
function deferred() { let resolve!: (value: Response) => void; const promise = new Promise<Response>(done => { resolve = done; }); return { promise, resolve }; }
let initial: ResumeWebsiteState;
let fetchMock: Mock<(url: string, init?: RequestInit) => Promise<Response>>;
beforeEach(() => {
  initial = fixture(); sessionStorage.clear();
  fetchMock = vi.fn(async () => envelope(initial)); vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
function acknowledge() { fireEvent.click(screen.getByRole("checkbox", { name: text.ack })); }
function preview() { return screen.getByTitle(text.previewTitle).getAttribute("srcdoc") ?? ""; }

describe("resume website output recovery", () => {
  it("sends one write for two synchronous form submissions", async () => {
    const write = deferred();
    fetchMock.mockImplementation(async (_url, init) => init?.method === "PATCH" ? write.promise : envelope(initial));
    render(<ResumeWebsiteStudio initial={initial} />);
    fireEvent.change(screen.getByLabelText(text.fullName), { target: { value: "Updated name" } });
    const form = screen.getByRole("button", { name: text.save }).closest("form")!;
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    const writes = fetchMock.mock.calls.filter(call => call[1]?.method === "PATCH").length;
    await act(async () => { write.resolve(envelope({ revision: 2, input: { ...initial.input!, fullName: "Updated name" } })); await write.promise; });
    expect(writes).toBe(1);
    expect(screen.getByText(text.saved.replace("{revision}", "2"))).toBeInTheDocument();
  });

  it("keeps accepted generation visible when the following read fails", async () => {
    fetchMock.mockImplementation(async (_url, init) => init?.method === "POST" ? envelope({ id: "run-new", status: "QUEUED", costPoints: 2 }) : failure());
    render(<ResumeWebsiteStudio initial={{ ...initial, versions: [] }} />); acknowledge();
    fireEvent.click(screen.getByRole("button", { name: text.generate }));
    await screen.findByText(text.refreshHint);
    expect(screen.getByText(text.accepted)).toBeInTheDocument();
    expect(screen.getByText(text.status.QUEUED)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: text.generate })).toBeDisabled();
    expect(screen.getByRole("button", { name: text.cancel })).toBeInTheDocument();
  });

  it("keeps a confirmed saved version previewable and downloadable after a read failure", async () => {
    const saved = { ...initial.versions[0], id: "version-b", version: 2, snapshot: { ...initial.versions[0].snapshot, editKind: "manual" as const, copy: { ...initial.versions[0].snapshot.copy, summary: "My confirmed edited copy" } } };
    fetchMock.mockImplementation(async (_url, init) => init?.method === "POST" ? envelope(saved) : failure());
    render(<ResumeWebsiteStudio initial={initial} />);
    fireEvent.click(screen.getByRole("button", { name: text.edit }));
    fireEvent.change(screen.getByLabelText(text.summary), { target: { value: saved.snapshot.copy.summary } });
    fireEvent.click(screen.getByRole("button", { name: text.saveCopy }));
    await screen.findByText(text.refreshHint);
    expect(screen.getByText(text.delivered)).toBeInTheDocument();
    expect(preview()).toContain(saved.snapshot.copy.summary);
    expect(screen.getByLabelText(text.versions)).toHaveValue(saved.id);
    expect(screen.getByRole("button", { name: text.download })).not.toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const create = vi.fn(() => "blob:website-result"); const revoke = vi.fn();
    vi.stubGlobal("URL", class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(new Response("<!doctype html><title>Saved result</title>", { headers: { "content-type": "text/html" } }));
    vi.useFakeTimers();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: text.download })); await vi.runAllTimersAsync(); });
    vi.useRealTimers();
    expect(create).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:website-result");
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(api + "/versions/version-b/download");
  });

  it("keeps edits on failed writes instead of claiming they were saved", async () => {
    fetchMock.mockResolvedValue(failure());
    render(<ResumeWebsiteStudio initial={initial} />);
    fireEvent.click(screen.getByRole("button", { name: text.edit }));
    fireEvent.change(screen.getByLabelText(text.summary), { target: { value: "Keep my unsaved work" } });
    fireEvent.click(screen.getByRole("button", { name: text.saveCopy }));
    expect(await screen.findByRole("alert")).toHaveTextContent(text.errors.INTERNAL_ERROR);
    expect(screen.getByLabelText(text.summary)).toHaveValue("Keep my unsaved work");
    expect(screen.queryByText(text.delivered)).not.toBeInTheDocument();
  });

  it("isolates a new project's form and ignores the previous project's late write", async () => {
    const write = deferred(); fetchMock.mockReturnValue(write.promise);
    const view = render(<ResumeWebsiteStudio initial={initial} />);
    fireEvent.change(screen.getByLabelText(text.fullName), { target: { value: "Old project submitted name" } });
    fireEvent.submit(screen.getByRole("button", { name: text.save }).closest("form")!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const next = { ...fixture(), projectId: "project-b", title: "Portfolio B", input: { ...initial.input!, fullName: "New project owner" }, versions: [] };
    view.rerender(<ResumeWebsiteStudio initial={next} />);
    expect(screen.getByLabelText(text.fullName)).toHaveValue("New project owner");
    await act(async () => { write.resolve(envelope({ revision: 2, input: { ...initial.input!, fullName: "Old project submitted name" } })); await write.promise; });
    expect(screen.getByLabelText(text.fullName)).toHaveValue("New project owner");
    expect(screen.queryByText(text.saved.replace("{revision}", "2"))).not.toBeInTheDocument();
  });
  it.each(["generate", "copy"] as const)("submits only one synchronous %s request", async kind => {
    const write = deferred();
    fetchMock.mockImplementation(async (_url, init) => init?.method === "POST" ? write.promise : envelope(initial));
    render(<ResumeWebsiteStudio initial={initial} />);
    if (kind === "copy") fireEvent.click(screen.getByRole("button", { name: text.edit })); else acknowledge();
    const button = screen.getByRole("button", { name: kind === "copy" ? text.saveCopy : text.generate });
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    const writes = fetchMock.mock.calls.filter(call => call[1]?.method === "POST").length;
    await act(async () => { write.resolve(kind === "copy" ? envelope({ ...initial.versions[0], id: "new-version", version: 2 }) : envelope({ id: "new-run", status: "QUEUED", costPoints: 2 })); await write.promise; });
    expect(writes).toBe(1);
  });

  it("retries a lost generation response with the same revision and idempotency key", async () => {
    let attempts = 0;
    fetchMock.mockImplementation(async (_url, init) => {
      if (init?.method === "POST") { attempts++; if (attempts === 1) throw new TypeError("lost response"); return envelope({ id: "same-run", status: "QUEUED", costPoints: 2 }); }
      return envelope({ ...initial, runs: [{ id: "same-run", status: "QUEUED", costPoints: 2, createdAt: "2026-10-07T00:00:00Z", finishedAt: null, requestKey: null }] });
    });
    render(<ResumeWebsiteStudio initial={initial} />); acknowledge();
    fireEvent.click(screen.getByRole("button", { name: text.generate }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: text.generate }));
    await screen.findByText(text.accepted);
    const writes = fetchMock.mock.calls.filter(call => call[1]?.method === "POST").map(call => JSON.parse(call[1]!.body as string));
    expect(writes).toHaveLength(2); expect(writes[1]).toEqual(writes[0]);
  });

  it("recovers an accepted run through polling without another generate request", async () => {
    vi.useFakeTimers(); let reads = 0;
    const completed = { ...initial, runs: [{ id: "run-new", status: "SUCCEEDED" as const, costPoints: 2, createdAt: "2026-10-07T00:00:00Z", finishedAt: "2026-10-07T00:01:00Z", requestKey: null }] };
    fetchMock.mockImplementation(async (_url, init) => {
      if (init?.method === "POST") return envelope({ id: "run-new", status: "QUEUED", costPoints: 2 });
      return ++reads === 1 ? failure() : envelope(completed);
    });
    render(<ResumeWebsiteStudio initial={{ ...initial, versions: [] }} />); acknowledge();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: text.generate })); });
    expect(screen.getByText(text.refreshHint)).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByText(text.status.SUCCEEDED)).toBeInTheDocument();
    expect(screen.queryByText(text.refreshHint)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: text.download })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(1);
  });

  it("ignores a polling read that arrives after confirmed copy saving", async () => {
    vi.useFakeTimers();
    const stale = deferred();
    const running = { ...initial, runs: [{ id: "running", status: "RUNNING" as const, costPoints: 2, createdAt: "2026-10-07T00:00:00Z", finishedAt: null, requestKey: "old-key-123" }] };
    const saved = { ...initial.versions[0], id: "saved-copy", version: 2, snapshot: { ...initial.versions[0].snapshot, copy: { ...initial.versions[0].snapshot.copy, summary: "Latest saved copy" } } };
    let reads = 0;
    fetchMock.mockImplementation(async (_url, init) => init?.method === "POST" ? envelope(saved) : ++reads === 1 ? stale.promise : failure());
    render(<ResumeWebsiteStudio initial={running} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    fireEvent.click(screen.getByRole("button", { name: text.edit }));
    fireEvent.change(screen.getByLabelText(text.summary), { target: { value: saved.snapshot.copy.summary } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: text.saveCopy })); });
    expect(preview()).toContain(saved.snapshot.copy.summary);
    await act(async () => { stale.resolve(envelope(running)); await stale.promise; });
    expect(preview()).toContain(saved.snapshot.copy.summary);
    expect(screen.getByLabelText(text.versions)).toHaveValue(saved.id);
    expect(screen.getByText(text.refreshHint)).toBeInTheDocument();
  });

  it("preserves a version-conflicting edit and offers an explicit rebase", async () => {
    const newest = { ...initial.versions[0], id: "newer", version: 2 };
    fetchMock.mockImplementation(async (_url, init) => init?.method === "POST" ? failure("VERSION_CONFLICT", 409) : envelope({ ...initial, versions: [newest, ...initial.versions] }));
    render(<ResumeWebsiteStudio initial={initial} />);
    fireEvent.click(screen.getByRole("button", { name: text.edit }));
    fireEvent.change(screen.getByLabelText(text.summary), { target: { value: "Keep conflict edit" } });
    fireEvent.click(screen.getByRole("button", { name: text.saveCopy }));
    await screen.findByText(text.errors.VERSION_CONFLICT);
    await screen.findByRole("button", { name: text.rebaseEdit });
    expect(screen.getByLabelText(text.summary)).toHaveValue("Keep conflict edit");
    expect(preview()).toContain("Keep conflict edit");
    expect(screen.queryByText(text.delivered)).not.toBeInTheDocument();
  });

  it("rejects a malformed stored generation key instead of trapping future requests", async () => {
    sessionStorage.setItem("ans-website-attempt/project-a", JSON.stringify({ revision: 1, idempotencyKey: "bad" }));
    fetchMock.mockImplementation(async (_url, init) => init?.method === "POST" ? envelope({ id: "new-run", status: "QUEUED", costPoints: 2 }) : failure());
    render(<ResumeWebsiteStudio initial={initial} />); acknowledge();
    fireEvent.click(screen.getByRole("button", { name: text.generate }));
    await screen.findByText(text.accepted);
    const submitted = JSON.parse(fetchMock.mock.calls.find(call => call[1]?.method === "POST")![1]!.body as string);
    expect(submitted.idempotencyKey).not.toBe("bad");
    expect(submitted.idempotencyKey).toMatch(/^[a-zA-Z0-9_-]{8,80}$/);
  });

  it("keeps the confirmed cancellation notice when its status read fails", async () => {
    const running = { ...initial, runs: [{ id: "running", status: "RUNNING" as const, costPoints: 2, createdAt: "2026-10-07T00:00:00Z", finishedAt: null, requestKey: "old-key-123" }] };
    fetchMock.mockImplementation(async (_url, init) => init?.method === "DELETE" ? envelope({ cancelled: true }) : failure());
    render(<ResumeWebsiteStudio initial={running} />);
    fireEvent.click(screen.getByRole("button", { name: text.cancel }));
    await screen.findByText(text.refreshHint);
    expect(screen.getByText(text.cancelled)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // Acknowledgement is not a fabricated terminal status or a claimed refund.
    expect(screen.getByText(text.status.RUNNING)).toBeInTheDocument();
    expect(screen.queryByText(text.status.CANCELLED)).not.toBeInTheDocument();
  });

  it("recovers the exact generation key after reopening the same project", async () => {
    fetchMock.mockRejectedValue(new TypeError("lost response"));
    const view = render(<ResumeWebsiteStudio initial={initial} />); acknowledge();
    fireEvent.click(screen.getByRole("button", { name: text.generate }));
    await screen.findByRole("alert");
    const first = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    view.unmount();
    fetchMock.mockImplementation(async (_url, init) => init?.method === "POST" ? envelope({ id: "recovered-run", status: "QUEUED", costPoints: 2 }) : failure());
    render(<ResumeWebsiteStudio initial={initial} />); acknowledge();
    fireEvent.click(screen.getByRole("button", { name: text.generate }));
    await screen.findByText(text.accepted);
    const second = JSON.parse(fetchMock.mock.calls.findLast(call => call[1]?.method === "POST")![1]!.body as string);
    expect(second).toEqual(first);
  });

  it("does not start a late download after switching to another project", async () => {
    const result = deferred(); fetchMock.mockReturnValue(result.promise);
    const create = vi.fn(() => "blob:stale-private-result");
    vi.stubGlobal("URL", class extends URL { static createObjectURL = create; });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const view = render(<ResumeWebsiteStudio initial={initial} />);
    fireEvent.click(screen.getByRole("button", { name: text.download }));
    view.rerender(<ResumeWebsiteStudio initial={{ ...fixture(), projectId: "project-b", title: "Portfolio B" }} />);
    await act(async () => { result.resolve(new Response("<!doctype html><title>Old project</title>", { headers: { "content-type": "text/html" } })); await result.promise; });
    expect(create).not.toHaveBeenCalled(); expect(click).not.toHaveBeenCalled();
  });

});
