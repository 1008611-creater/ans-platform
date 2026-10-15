import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "use-intl/core";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import zh from "../../../messages/product/zh.json";
import en from "../../../messages/product/en.json";
const mocks = vi.hoisted(() => ({ session: vi.fn(), fetch: vi.fn(), locale: "zh" }));
vi.mock("next-auth/react", () => ({ useSession: mocks.session }));
vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => createTranslator({ locale: mocks.locale, messages: mocks.locale === "en" ? en : zh, namespace: "computeDelivery" }),
}));
import { ComputeDeliveryStatus } from "@/components/workspace/compute-delivery-status";
const props = { userId: "owner-a", taskId: "compute-task-a", unit: "image" as const };
const artifact = { relativePath: "作品/" + "长名称".repeat(50) + ".png", sha256: "a".repeat(64), mimeType: "image/png", sizeBytes: 1024 };
const now = "2026-10-14T00:00:00.000Z";
function receipt(state: "PENDING" | "FAILED" | "AVAILABLE" | "UNAVAILABLE", taskId = props.taskId) {
  const saved = state === "AVAILABLE" || state === "UNAVAILABLE";
  return { version: 1, deliveryId: "b".repeat(64), computeTaskId: taskId, state, revision: saved ? 2 : 1,
    artifact: saved ? { ...artifact } : null, failureCode: state === "FAILED" || state === "UNAVAILABLE" ? "ARTIFACT_MISSING" : null,
    createdAt: now, updatedAt: now, availableAt: saved ? now : null };
}
function payload(delivery: ReturnType<typeof receipt> | null, taskId = props.taskId) {
  return { ok: true, data: { computeTaskId: taskId, delivery }, requestId: "70641000-e8b0-4d12-9318-ec582fa74918" };
}
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
const view = () => fireEvent.click(screen.getByRole("button", { name: zh.computeDelivery.view }));
beforeEach(() => {
  vi.resetAllMocks(); mocks.locale = "zh";
  mocks.session.mockReturnValue({ status: "authenticated", data: { user: { id: props.userId } } });
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("owner media file status", () => {
  it("only reads on demand using the server actor and no-store, with no generation or polling", async () => {
    mocks.fetch.mockResolvedValue(response(payload(null)));
    render(<ComputeDeliveryStatus {...props} />); expect(mocks.fetch).not.toHaveBeenCalled();
    view(); await screen.findByText(zh.computeDelivery.noRecord);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledWith("/api/workspace/compute/compute-task-a/delivery", expect.objectContaining({
      method: "GET", cache: "no-store", credentials: "same-origin", signal: expect.any(AbortSignal),
      headers: { "x-ans-compute-actor": "owner-a", "Accept": "application/json" },
    }));
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it.each(["PENDING", "FAILED", "UNAVAILABLE", "AVAILABLE"] as const)("shows honest %s without inventing a download or receipt", async state => {
    mocks.fetch.mockResolvedValue(response(payload(receipt(state)))); render(<ComputeDeliveryStatus {...props} />); view();
    await screen.findByText(zh.computeDelivery.states[state]);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    if (state === "AVAILABLE" || state === "UNAVAILABLE") {
      expect(screen.getByText(artifact.relativePath)).toBeInTheDocument();
      expect(screen.getByText("image/png")).toBeInTheDocument(); expect(screen.getByText("1,024 字节")).toBeInTheDocument();
      expect(screen.getByText(artifact.relativePath).parentElement).toHaveClass("break-all");
    } else expect(screen.queryByText(artifact.relativePath)).not.toBeInTheDocument();
    const button = screen.getByRole("button"); expect(button).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(button.getAttribute("aria-controls")!)).toHaveAttribute("aria-busy", "false");
  });
  it("renders English copy and exact media metadata", async () => {
    mocks.locale = "en"; mocks.fetch.mockResolvedValue(response(payload(receipt("AVAILABLE"))));
    render(<ComputeDeliveryStatus {...props} />); fireEvent.click(screen.getByRole("button", { name: en.computeDelivery.view }));
    await screen.findByText(en.computeDelivery.states.AVAILABLE); expect(screen.getByText("1,024 bytes")).toBeInTheDocument();
  });
  it.each([401, 409, 404, 500])("redacts an HTTP %s and allows explicit retry", async status => {
    mocks.fetch.mockResolvedValueOnce(response({ error: "PRIVATE_DIAGNOSTIC" }, status)).mockResolvedValueOnce(response(payload(null)));
    render(<ComputeDeliveryStatus {...props} />); view();
    const reason = status === 401 ? "sessionExpired" : status === 409 ? "accountChanged" : "failed";
    await screen.findByText(zh.computeDelivery[reason]); expect(document.body.textContent).not.toContain("PRIVATE_DIAGNOSTIC");
    fireEvent.click(screen.getByRole("button", { name: zh.computeDelivery.retry })); await screen.findByText(zh.computeDelivery.noRecord);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it.each(["unknownField", "inconsistentState", "taskMismatch", "nestedTaskMismatch", "unsafePath", "mediaMismatch"])("rejects invalid %s instead of presenting a saved file", async kind => {
    const item = receipt("AVAILABLE"); const body = payload(item);
    if (kind === "unknownField") Object.assign(item, { downloadUrl: "https://untrusted.invalid" });
    if (kind === "inconsistentState") item.availableAt = null;
    if (kind === "taskMismatch") body.data.computeTaskId = "compute-other-task";
    if (kind === "nestedTaskMismatch") item.computeTaskId = "compute-other-task";
    if (kind === "unsafePath") item.artifact!.relativePath = "/internal/file.png";
    if (kind === "mediaMismatch") item.artifact!.mimeType = "video/mp4";
    mocks.fetch.mockResolvedValue(response(body)); render(<ComputeDeliveryStatus {...props} />); view();
    await screen.findByText(zh.computeDelivery.failed);
    expect(screen.queryByText(zh.computeDelivery.states.AVAILABLE)).not.toBeInTheDocument(); expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("aborts and discards a late response when task changes before a new task is read", async () => {
    const pending = deferred<Response>(); mocks.fetch.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response(payload(null, "compute-task-b")));
    const ui = render(<ComputeDeliveryStatus {...props} />); view();
    const signal = mocks.fetch.mock.calls[0][1].signal as AbortSignal;
    ui.rerender(<ComputeDeliveryStatus {...props} taskId="compute-task-b" />); expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve(response(payload(receipt("AVAILABLE")))));
    expect(screen.queryByText(artifact.relativePath)).not.toBeInTheDocument(); expect(mocks.fetch).toHaveBeenCalledTimes(1);
    view(); await screen.findByText(zh.computeDelivery.noRecord);
    expect(mocks.fetch.mock.calls[1][0]).toContain("compute-task-b");
  });
  it("drops previous private metadata and aborts an in-flight JSON response when the session account changes", async () => {
    const json = deferred<unknown>(); mocks.fetch.mockResolvedValueOnce({ ok: true, json: () => json.promise });
    const ui = render(<ComputeDeliveryStatus {...props} />); view(); await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    const signal = mocks.fetch.mock.calls[0][1].signal as AbortSignal;
    mocks.session.mockReturnValue({ status: "authenticated", data: { user: { id: "owner-b" } } }); ui.rerender(<ComputeDeliveryStatus {...props} />);
    expect(signal.aborted).toBe(true); expect(screen.queryByRole("button")).not.toBeInTheDocument();
    await act(async () => json.resolve(payload(receipt("AVAILABLE")))); expect(screen.queryByText(artifact.relativePath)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(zh.computeDelivery.accountChanged);
    mocks.fetch.mockResolvedValueOnce(response(payload(null)));
    ui.rerender(<ComputeDeliveryStatus {...props} userId="owner-b" />); view(); await screen.findByText(zh.computeDelivery.noRecord);
    expect(mocks.fetch.mock.calls[1][1].headers["x-ans-compute-actor"]).toBe("owner-b");
  });
  it("clears a loaded receipt immediately after account or task replacement", async () => {
    mocks.fetch.mockResolvedValue(response(payload(receipt("AVAILABLE")))); const ui = render(<ComputeDeliveryStatus {...props} />);
    view(); await screen.findByText(artifact.relativePath); ui.rerender(<ComputeDeliveryStatus {...props} taskId="compute-task-b" />);
    expect(screen.queryByText(artifact.relativePath)).not.toBeInTheDocument(); expect(screen.getByRole("button")).toHaveTextContent(zh.computeDelivery.view);
  });
  it("hides already loaded private metadata immediately when the session account changes", async () => {
    mocks.fetch.mockResolvedValue(response(payload(receipt("AVAILABLE")))); const ui = render(<ComputeDeliveryStatus {...props} />);
    view(); await screen.findByText(artifact.relativePath);
    mocks.session.mockReturnValue({ status: "authenticated", data: { user: { id: "owner-b" } } });
    ui.rerender(<ComputeDeliveryStatus {...props} />);
    expect(screen.queryByText(artifact.relativePath)).not.toBeInTheDocument(); expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(zh.computeDelivery.accountChanged); expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("accepts genuine video metadata on a seconds-based task", async () => {
    const item = receipt("AVAILABLE"); item.artifact = { ...artifact, relativePath: "assets/output.mp4", mimeType: "video/mp4" };
    mocks.fetch.mockResolvedValue(response(payload(item))); render(<ComputeDeliveryStatus {...props} unit="second" />); view();
    await screen.findByText(zh.computeDelivery.states.AVAILABLE); expect(screen.getByText("video/mp4")).toBeInTheDocument();
    expect(screen.getByText("assets/output.mp4")).toBeInTheDocument(); expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("blocks reads while identity is loading or unauthenticated", () => {
    for (const status of ["loading", "unauthenticated"]) {
      mocks.session.mockReturnValue({ status, data: null }); const ui = render(<ComputeDeliveryStatus {...props} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument(); expect(mocks.fetch).not.toHaveBeenCalled(); ui.unmount();
    }
  });
  it("times out safely, accepts an explicit retry and ignores the abandoned response", async () => {
    vi.useFakeTimers(); const pending = deferred<Response>(); mocks.fetch.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response(payload(null)));
    render(<ComputeDeliveryStatus {...props} />); view(); const signal = mocks.fetch.mock.calls[0][1].signal as AbortSignal;
    await act(async () => { vi.advanceTimersByTime(20_000); }); expect(signal.aborted).toBe(true); expect(screen.getByRole("alert")).toHaveTextContent(zh.computeDelivery.failed);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: zh.computeDelivery.retry })); });
    expect(screen.getByText(zh.computeDelivery.noRecord)).toBeInTheDocument();
    await act(async () => pending.resolve(response(payload(receipt("AVAILABLE"))))); expect(screen.queryByText(artifact.relativePath)).not.toBeInTheDocument();
  });
  it("prevents repeated clicks and aborts on unmount without further polling", async () => {
    const pending = deferred<Response>(); mocks.fetch.mockReturnValue(pending.promise); const ui = render(<ComputeDeliveryStatus {...props} />);
    view(); const button = screen.getByRole("button"); expect(button).toBeDisabled(); fireEvent.click(button); expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const signal = mocks.fetch.mock.calls[0][1].signal as AbortSignal; ui.unmount(); expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve(response(payload(receipt("AVAILABLE"))))); expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("offers the server task URL only for a verified available receipt", async () => {
    const resultUrl = "https://toonflow.cauai.fun/compute/result?taskId=compute-task-a";
    mocks.fetch.mockResolvedValue(response(payload(receipt("AVAILABLE"))));
    const ui = render(<ComputeDeliveryStatus {...props} resultUrl={resultUrl} />); view();
    const link = await screen.findByRole("link", { name: zh.computeDelivery.openResult });
    expect(link).toHaveAttribute("href", resultUrl);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("status")).toHaveTextContent(zh.computeDelivery.availableToOpen);
    mocks.session.mockReturnValue({ status: "authenticated", data: { user: { id: "owner-b" } } });
    ui.rerender(<ComputeDeliveryStatus {...props} resultUrl={resultUrl} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it.each(["PENDING", "FAILED", "UNAVAILABLE"] as const)("never links a %s receipt", async state => {
    mocks.fetch.mockResolvedValue(response(payload(receipt(state))));
    render(<ComputeDeliveryStatus {...props} resultUrl="https://toonflow.cauai.fun/compute/result?taskId=compute-task-a" />); view();
    await screen.findByText(zh.computeDelivery.states[state]);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

});
