import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { MarketWorkflowRun } from "@/components/marketplace/workflow-run";

const m = vi.hoisted(() => ({ request: vi.fn(), refresh: vi.fn(), actor: "buyer-1", status: "authenticated" }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: m.actor } }, status: m.status }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/marketplace/request", async original => ({ ...await original<typeof import("@/components/marketplace/request")>(), marketRequest: m.request }));
const privateInput = "PRIVATE PERSONAL FACTS MUST NOT BE STORED";
const endpoint = "/api/market/listings/listing-one/run";
const slot = (actor = "buyer-1", url = endpoint, version = 3) => `ans:workflow-confirmation:${actor}:${url}:${version}`;
const details = { recipe: null, variables: [{ key: "topic", label: "Your input", required: true }], estimatedCost: 2, version: 1 };
const posts = () => m.request.mock.calls.filter(call => call[1] === "POST");
function mount({ actor = "buyer-1", listingId = "listing-one", version = 3, workflowSlug }: { actor?: string; listingId?: string; version?: number; workflowSlug?: string } = {}) {
  return render(<MarketAccountBoundary actorId={actor}><MarketWorkflowRun listingId={listingId} version={version} workflowSlug={workflowSlug} details={workflowSlug ? { ...details, recipe: "resume-website-v1", variables: [] } : details} /></MarketAccountBoundary>);
}
function enterInput(text = privateInput, recipe = false) {
  if (recipe) {
    for (const [label, value] of [["profile.fullName", "Own author"], ["profile.headline", "Own work"], ["profile.about", text], ["project.name", "Own project"], ["project.description", "Own contribution"]]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
  } else fireEvent.change(screen.getByLabelText("Your input *"), { target: { value: text } });
}
function confirm() { fireEvent.click(screen.getByRole("checkbox", { name: "acknowledge" })); fireEvent.submit(screen.getByRole("checkbox").closest("form")!); }
function deferred<T>() { let resolve: (value: T) => void = () => {}; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => {
  vi.clearAllMocks(); m.actor = "buyer-1"; m.status = "authenticated";
  sessionStorage.clear(); vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("TextEncoder", TextEncoder);
  m.request.mockImplementation(async (_url: string, method: string) => method === "GET" ? { runs: [] } : { run: { id: "run-one" } });
});
afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals(); });

describe("real workflow confirmation recovery (HR07)", () => {
  it.each([undefined, "personal-recipe"])("reuses the same confirmation after a refresh and lost response for %s", async workflowSlug => {
    const url = workflowSlug ? `/api/workflows/${workflowSlug}/recipe-run` : endpoint;
    let commands = 0;
    m.request.mockImplementation(async (_url: string, method: string) => {
      if (method === "GET") return { runs: [] };
      if (++commands === 1) throw new Error("Response lost after accepted enqueue");
      return { run: { id: "original-run" } };
    });
    const view = mount({ workflowSlug });
    await screen.findByText("noRuns"); expect(posts()).toHaveLength(0);
    enterInput(privateInput, !!workflowSlug); confirm(); await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("runFailed");
    const firstKey = posts()[0][2].idempotencyKey;
    const pending = JSON.parse(sessionStorage.getItem(slot("buyer-1", url))!);
    expect(Object.keys(pending).sort()).toEqual(["fingerprint", "key"]);
    expect(pending.key).toBe(firstKey); expect(pending.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(sessionStorage.getItem(slot("buyer-1", url))).not.toContain(privateInput);
    view.unmount(); mount({ workflowSlug }); await screen.findByText("noRuns");
    expect(posts()).toHaveLength(1); expect(screen.getByRole("button", { name: "confirmRun" })).toBeDisabled();
    enterInput(privateInput, !!workflowSlug); confirm();
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(posts()[1][2]).toEqual(posts()[0][2]);
    expect(posts()[1][3].actorId).toBe("buyer-1");
    await waitFor(() => expect(sessionStorage.getItem(slot("buyer-1", url))).toBeNull());
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
  it.each(["actor", "endpoint", "version"])("does not reuse an old confirmation across changed %s", async change => {
    m.request.mockImplementation(async (_url: string, method: string) => { if (method === "GET") return { runs: [] }; throw new Error("lost response"); });
    const view = mount(); await screen.findByText("noRuns"); enterInput(); confirm(); await screen.findByRole("alert");
    const oldKey = posts()[0][2].idempotencyKey; const oldSlot = sessionStorage.getItem(slot());
    view.unmount();
    if (change === "actor") m.actor = "buyer-2";
    mount({ actor: m.actor, listingId: change === "endpoint" ? "listing-two" : "listing-one", version: change === "version" ? 4 : 3 });
    await screen.findByText("noRuns"); enterInput(); confirm(); await screen.findByRole("alert");
    expect(posts()).toHaveLength(2); expect(posts()[1][2].idempotencyKey).not.toBe(oldKey);
    expect(posts()[1][3].actorId).toBe(m.actor); expect(sessionStorage.getItem(slot())).toBe(oldSlot);
  });
  it("uses a fresh confirmation after changing personal input following a refresh", async () => {
    m.request.mockImplementation(async (_url: string, method: string) => { if (method === "GET") return { runs: [] }; throw new Error("lost response"); });
    const view = mount(); await screen.findByText("noRuns"); enterInput(); confirm(); await screen.findByRole("alert");
    const oldKey = posts()[0][2].idempotencyKey;
    view.unmount(); mount(); await screen.findByText("noRuns"); enterInput("CHANGED PRIVATE FACTS"); confirm(); await screen.findByRole("alert");
    expect(posts()[1][2].idempotencyKey).not.toBe(oldKey);
    expect(sessionStorage.getItem(slot())).not.toContain("CHANGED PRIVATE FACTS");
  });
  it("history and unacknowledged or missing required input never dispatch a charged command", async () => {
    mount(); await screen.findByText("noRuns"); enterInput();
    fireEvent.submit(screen.getByRole("checkbox").closest("form")!);
    expect(posts()).toHaveLength(0);
    enterInput("   "); confirm(); expect(await screen.findByRole("alert")).toHaveTextContent("inputInvalid");
    expect(posts()).toHaveLength(0); expect(sessionStorage.length).toBe(0);
  });
  it("dispatches at most one command when concurrent submits await the same digest", async () => {
    const digest = deferred<ArrayBuffer>(); const command = deferred<{ run: { id: string } }>();
    vi.stubGlobal("crypto", { randomUUID: () => webcrypto.randomUUID(), subtle: { digest: vi.fn(() => digest.promise) } });
    m.request.mockImplementation((_url: string, method: string) => method === "GET" ? Promise.resolve({ runs: [] }) : command.promise);
    const view = mount(); await screen.findByText("noRuns"); enterInput(); fireEvent.click(screen.getByRole("checkbox"));
    const form = screen.getByRole("checkbox").closest("form")!;
    fireEvent.submit(form); fireEvent.submit(form); expect(posts()).toHaveLength(0);
    await act(async () => digest.resolve(new Uint8Array(32).buffer));
    await waitFor(() => expect(posts()).toHaveLength(1));
    view.unmount(); await act(async () => command.resolve({ run: { id: "only-run" } }));
    expect(posts()).toHaveLength(1);
  });
  it("aborts a pending command on account change and preserves recovery when an old acknowledgement arrives", async () => {
    const command = deferred<{ run: { id: string } }>();
    m.request.mockImplementation((_url: string, method: string) => method === "GET" ? Promise.resolve({ runs: [] }) : command.promise);
    const view = mount(); await screen.findByText("noRuns"); enterInput(); confirm();
    await waitFor(() => expect(posts()).toHaveLength(1));
    const signal = posts()[0][3].signal as AbortSignal; const recovery = sessionStorage.getItem(slot());
    m.actor = "buyer-2";
    view.rerender(<MarketAccountBoundary actorId="buyer-1"><MarketWorkflowRun listingId="listing-one" version={3} details={details} /></MarketAccountBoundary>);
    expect(signal.aborted).toBe(true); expect(screen.getByRole("alert")).toHaveTextContent("changed");
    await act(async () => command.resolve({ run: { id: "old-account-run" } }));
    expect(sessionStorage.getItem(slot())).toBe(recovery); expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(m.request.mock.calls.filter(call => call[1] === "GET")).toHaveLength(1);
  });
});
