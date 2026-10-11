import type { ComponentProps, ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { DinoGuide } from "@/components/mascot/dino-guide";
import { DinoTaskProvider, DinoTaskSessionProvider, usePublishDinoTask, type DinoTaskSnapshot } from "@/components/mascot/dino-task-context";
import { ResumeWebsiteStudio } from "@/components/projects/resume-website-studio";
import type { ResumeWebsiteState } from "@/contracts/resume-website";
import { plainResumeWebsiteCopy, RESUME_WEBSITE_EXAMPLE } from "@/domain/projects/resume-website";
import messages from "../../../messages/product/zh.json";

const session = vi.hoisted(() => ({ actor: "actor-a" as string | null, status: "authenticated", pathname: "/projects/project-a/website" }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: session.actor ? { user: { id: session.actor } } : null, status: session.status }) }));
vi.mock("next/navigation", () => ({ usePathname: () => session.pathname }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: (namespace: string) => {
  const source = namespace === "product.mascot" ? messages.mascot : messages.website;
  const lookup = (key: string) => key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, source);
  const t = (key: string, values?: Record<string, string | number>) => { let result = String(lookup(key) ?? key); for (const [name, value] of Object.entries(values ?? {})) result = result.replace("{" + name + "}", String(value)); return result; };
  t.has = (key: string) => typeof lookup(key) === "string"; return t;
} }));
const text = messages.mascot;
const page = messages.website;
const path = "/projects/project-a/website";
const envelope = (data: unknown) => new Response(JSON.stringify({ ok: true, data }), { status: 200 });
const failure = () => new Response(JSON.stringify({ ok: false, error: { code: "INTERNAL_ERROR" } }), { status: 500 });
function fixture(): ResumeWebsiteState {
  return { projectId: "project-a", title: "Private project title", archived: false, revision: 1, input: structuredClone(RESUME_WEBSITE_EXAMPLE), runs: [], versions: [] };
}
function withVersion(state: ResumeWebsiteState): ResumeWebsiteState {
  return { ...state, versions: [{ id: "version-a", version: 1, createdAt: "2026-10-07T00:00:00Z", snapshot: { recipeVersion: 1, templateVersion: 1, inputRevision: 1, input: state.input!, copy: plainResumeWebsiteCopy(state.input!), editKind: "generated" as const, sourceWorkflowRunId: "run-old" } }] };
}
function run(status: ResumeWebsiteState["runs"][number]["status"]) {
  return { id: "run-current", status, costPoints: 2, createdAt: "2026-10-07T00:00:00Z", finishedAt: null, requestKey: null };
}
function Shell({ children, actorId = "actor-a", pathname = path }: { children?: ReactNode; actorId?: string | null; pathname?: string }) {
  return <DinoTaskProvider actorId={actorId} pathname={pathname}>{children}<DinoGuide /></DinoTaskProvider>;
}
function Publisher({ snapshot, pathname = path }: { snapshot: DinoTaskSnapshot; pathname?: string }) {
  usePublishDinoTask(pathname, snapshot); return null;
}
function phase() { return document.querySelector(".ans-dino-guide")?.getAttribute("data-task-state"); }
async function openGuide() { await userEvent.click(screen.getByRole("button", { name: text.taskOpen })); return screen.getByRole("dialog"); }
let initial: ResumeWebsiteState;
let fetchMock: Mock;
beforeEach(() => {
  initial = fixture(); sessionStorage.clear(); session.actor = "actor-a"; session.status = "authenticated"; session.pathname = path;
  fetchMock = vi.fn(async () => envelope(initial)); vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
afterEach(() => { cleanup(); Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView"); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Dino follows the actual portfolio workflow", () => {
  it("keeps navigation available when no task is registered", async () => {
    render(<Shell />); await userEvent.click(screen.getByRole("button", { name: text.open }));
    expect(screen.getByRole("heading", { name: text.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: text.create })).toHaveAttribute("href", "/workflows/toonflow");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("guides to the actual confirmation without checking it or generating", async () => {
    render(<Shell><ResumeWebsiteStudio initial={initial} /></Shell>);
    expect(phase()).toBe("confirm");
    const dialog = await openGuide();
    expect(within(dialog).getByText(text.task.confirm)).toBeInTheDocument();
    expect(within(dialog).getByText(text.taskStep[2]).closest("li")).toHaveAttribute("aria-current", "step");
    expect(dialog).not.toHaveTextContent(initial.title);
    expect(dialog).not.toHaveTextContent(initial.input!.fullName);
    await userEvent.click(within(dialog).getByRole("button", { name: text.taskAction }));
    const confirmation = screen.getByRole("checkbox", { name: page.ack });
    await waitFor(() => expect(confirmation).toHaveFocus());
    expect(confirmation).not.toBeChecked();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("focuses the generation button but requires the user's separate click", async () => {
    fetchMock.mockImplementation(async (_url, init) => init?.method === "POST" ? envelope({ id: "run-current", status: "QUEUED" }) : envelope({ ...initial, runs: [run("QUEUED")] }));
    render(<Shell><ResumeWebsiteStudio initial={initial} /></Shell>);
    fireEvent.click(screen.getByRole("checkbox", { name: page.ack }));
    expect(phase()).toBe("ready");
    const dialog = await openGuide();
    await userEvent.click(within(dialog).getByRole("button", { name: text.taskAction }));
    const generate = screen.getByRole("button", { name: page.generate });
    await waitFor(() => expect(generate).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.click(generate);
    await waitFor(() => expect(phase()).toBe("queued"));
    expect(fetchMock.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(1);
  });

  it("follows input edits, saving and confirmed persistence", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>(done => { resolve = done; }));
    render(<Shell><ResumeWebsiteStudio initial={initial} /></Shell>);
    fireEvent.change(screen.getByLabelText(page.fullName), { target: { value: "My edited details" } });
    expect(phase()).toBe("input");
    fireEvent.submit(screen.getByRole("button", { name: page.save }).closest("form")!);
    expect(phase()).toBe("saving");
    await act(async () => { resolve(envelope({ revision: 2, input: { ...initial.input!, fullName: "My edited details" } })); });
    expect(phase()).toBe("confirm");
  });

  it("keeps response uncertainty distinct from task failure and recovers by polling", async () => {
    let reads = 0;
    const completed = { ...withVersion(initial), runs: [run("SUCCEEDED")] };
    fetchMock.mockImplementation(async (_url, init) => init?.method === "POST" ? envelope({ id: "run-current", status: "QUEUED" }) : ++reads === 1 ? failure() : envelope(completed));
    render(<Shell><ResumeWebsiteStudio initial={initial} /></Shell>);
    fireEvent.click(screen.getByRole("checkbox", { name: page.ack }));
    fireEvent.click(screen.getByRole("button", { name: page.generate }));
    await screen.findByText(page.refreshHint);
    await waitFor(() => expect(phase()).toBe("recovering"));
    const dialog = await openGuide();
    expect(within(dialog).getByText(text.task.recovering)).toBeInTheDocument();
    await waitFor(() => expect(phase()).toBe("review"), { timeout: 2500 });
    expect(within(dialog).getByText(text.task.review)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(1);
  });

  it("does not call a lost submission response a failed run", async () => {
    fetchMock.mockRejectedValue(new TypeError("lost response"));
    render(<Shell><ResumeWebsiteStudio initial={initial} /></Shell>);
    fireEvent.click(screen.getByRole("checkbox", { name: page.ack }));
    fireEvent.click(screen.getByRole("button", { name: page.generate }));
    await screen.findByRole("alert");
    await waitFor(() => expect(phase()).toBe("attention"));
    expect(within(await openGuide()).getByText(text.task.attention)).toBeInTheDocument();
  });

  it.each(["QUEUED", "RUNNING", "FAILED", "CANCELLED"] as const)("uses acknowledged %s state without invented progress", async status => {
    render(<Shell><ResumeWebsiteStudio initial={{ ...initial, runs: [run(status)] }} /></Shell>);
    const expected = ({ QUEUED: "queued", RUNNING: "working", FAILED: "failed", CANCELLED: "cancelled" } as const)[status];
    expect(phase()).toBe(expected);
    const dialog = await openGuide();
    expect(within(dialog).getByText(text.task[expected])).toBeInTheDocument();
    expect(dialog.textContent).not.toMatch(/\d+%/);
    if (status === "QUEUED" || status === "RUNNING") expect(within(dialog).queryByRole("button", { name: text.taskAction })).not.toBeInTheDocument();
  });

  it("keeps copy saving on the review step and only announces the saved version", async () => {
    initial = withVersion(initial);
    let resolve!: (response: Response) => void;
    const saved = { ...initial.versions[0], id: "version-b", version: 2 };
    fetchMock.mockImplementation(async (_url, init) => init?.method === "POST" ? new Promise<Response>(done => { resolve = done; }) : envelope({ ...initial, versions: [saved, ...initial.versions] }));
    render(<Shell><ResumeWebsiteStudio initial={initial} /></Shell>);
    expect(phase()).toBe("review");
    fireEvent.click(screen.getByRole("button", { name: page.edit })); expect(phase()).toBe("editing");
    const dialog = await openGuide();
    fireEvent.click(screen.getByRole("button", { name: page.saveCopy })); expect(phase()).toBe("saving");
    expect(within(dialog).getByText(text.taskStep[3]).closest("li")).toHaveAttribute("aria-current", "step");
    await act(async () => { resolve(envelope(saved)); });
    expect(phase()).toBe("review");
    expect(screen.getByLabelText(page.versions)).toHaveValue("version-b");
  });

  it("closes with Escape without changing or starting the task", async () => {
    render(<Shell><ResumeWebsiteStudio initial={initial} /></Shell>);
    await openGuide();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(phase()).toBe("confirm");
    expect(screen.getByRole("button", { name: text.taskOpen })).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not let a previous project's late acceptance replace the new project's guidance", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>(done => { resolve = done; }));
    const view = render(<Shell><ResumeWebsiteStudio initial={initial} /></Shell>);
    fireEvent.click(screen.getByRole("checkbox", { name: page.ack }));
    fireEvent.click(screen.getByRole("button", { name: page.generate }));
    expect(phase()).toBe("submitting");
    const next = { ...initial, projectId: "project-b", title: "Project B" };
    view.rerender(<Shell pathname="/projects/project-b/website"><ResumeWebsiteStudio initial={next} /></Shell>);
    expect(phase()).toBe("confirm");
    await act(async () => { resolve(envelope({ id: "old-run", status: "QUEUED" })); });
    expect(phase()).toBe("confirm");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not invite execution for an archived project", async () => {
    render(<Shell><ResumeWebsiteStudio initial={{ ...withVersion(initial), archived: true }} /></Shell>);
    expect(phase()).toBe("archived");
    expect(within(await openGuide()).getByText(text.task.archived)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: page.generate })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("task companion registration lifetime", () => {
  const snapshot: DinoTaskSnapshot = { phase: "working", step: 2, costPoints: 2 };
  it("clears the page's task when its editor unmounts", () => {
    const view = render(<Shell><Publisher snapshot={snapshot} /></Shell>);
    expect(phase()).toBe("working"); view.rerender(<Shell />); expect(phase()).toBe("idle");
  });
  it("hides an old page's task as soon as the route changes", () => {
    const view = render(<Shell><Publisher snapshot={snapshot} /></Shell>);
    view.rerender(<Shell pathname="/explore"><Publisher snapshot={snapshot} /></Shell>);
    expect(phase()).toBe("idle");
  });
  it("does not let an old editor republish under a different account", () => {
    const view = render(<Shell><Publisher snapshot={snapshot} /></Shell>);
    view.rerender(<Shell actorId={null}><Publisher snapshot={snapshot} /></Shell>); expect(phase()).toBe("idle");
    view.rerender(<Shell actorId="actor-b"><Publisher snapshot={{ ...snapshot, phase: "queued" }} /></Shell>); expect(phase()).toBe("idle");
    view.rerender(<Shell actorId="actor-b"><Publisher key="fresh-editor-b" snapshot={snapshot} /></Shell>); expect(phase()).toBe("working");
  });
  it("does not let older cleanup erase the replacement task", () => {
    const next: DinoTaskSnapshot = { phase: "confirm", step: 2, costPoints: 2 };
    const view = render(<Shell><Publisher key="old" snapshot={snapshot} /><Publisher key="new" snapshot={next} /></Shell>);
    expect(phase()).toBe("confirm");
    view.rerender(<Shell><Publisher key="new" snapshot={next} /></Shell>); expect(phase()).toBe("confirm");
  });
  it("waits for a resolved authenticated session and hides on logout", () => {
    session.status = "loading";
    const view = render(<DinoTaskSessionProvider><Publisher snapshot={snapshot} /><DinoGuide /></DinoTaskSessionProvider>);
    expect(phase()).toBe("idle");
    session.status = "authenticated"; view.rerender(<DinoTaskSessionProvider><Publisher snapshot={snapshot} /><DinoGuide /></DinoTaskSessionProvider>);
    expect(phase()).toBe("working");
    session.status = "unauthenticated"; session.actor = null; view.rerender(<DinoTaskSessionProvider><Publisher snapshot={snapshot} /><DinoGuide /></DinoTaskSessionProvider>);
    expect(phase()).toBe("idle");
  });
});
