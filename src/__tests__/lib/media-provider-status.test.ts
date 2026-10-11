// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { wiroGeneratorPlugin } from "@/lib/plugins/media-generators/wiro";
import { falGeneratorPlugin } from "@/lib/plugins/media-generators/fal";
import type { WebSocketCallbacks } from "@/lib/plugins/media-generators/types";
const marker = "PRIVATE_PROVIDER_DIAGNOSTIC_FIXTURE";
const callbacks = (): WebSocketCallbacks => ({ setProgress: vi.fn(), setStatus: vi.fn(), setStatusMessage: vi.fn(), setError: vi.fn(), onComplete: vi.fn(), onCleanup: vi.fn() });
const message = (body: unknown) => ({ data: JSON.stringify(body) }) as MessageEvent;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("truthful private media status", () => {
  it("never turns Wiro stage events or repeated chunks into an invented percentage", () => {
    const c = callbacks();
    for (const type of ["task_queue", "task_accept", "task_start", "task_output", "task_output", "task_end"]) wiroGeneratorPlugin.webSocketHandler.handleMessage(message({ type }), c);
    expect(c.setProgress).toHaveBeenCalled();
    expect(vi.mocked(c.setProgress).mock.calls.every(([value]) => value === null)).toBe(true);
  });
  it("terminates a confirmed provider error without logging its private message", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {}); const c = callbacks();
    wiroGeneratorPlugin.webSocketHandler.handleMessage(message({ type: "task_error", message: marker }), c);
    expect(JSON.stringify(log.mock.calls)).not.toContain(marker);
    expect(c.setError).toHaveBeenCalledWith("MEDIA_PROVIDER_FAILED"); expect(c.setStatus).toHaveBeenCalledWith("error"); expect(c.onCleanup).toHaveBeenCalledOnce();
  });
  it("does not expose malformed WebSocket text through parser diagnostics", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {}); const c = callbacks();
    wiroGeneratorPlugin.webSocketHandler.handleMessage({ data: '{"private":"' + marker } as MessageEvent, c);
    expect(JSON.stringify(log.mock.calls)).not.toContain(marker); expect(c.setError).toHaveBeenCalledWith("MEDIA_STATUS_INVALID");
  });
  it("does not announce a successful delivery if a finished event has no usable output", () => {
    const c = callbacks(); wiroGeneratorPlugin.webSocketHandler.handleMessage(message({ type: "task_postprocess_end", message: [{ url: "javascript:alert(1)" }] }), c);
    expect(c.setStatus).not.toHaveBeenCalledWith("completed"); expect(c.onComplete).not.toHaveBeenCalled(); expect(c.setError).toHaveBeenCalledWith("MEDIA_STATUS_INVALID");
  });
  it.each(["IN_QUEUE", "IN_PROGRESS"])("Fal %s reports stage with unknown percentage", async status => {
    vi.stubEnv("FAL_API_KEY", "fixture-not-a-provider-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status }), { status: 200 })));
    const result = await falGeneratorPlugin.checkStatus!("https://queue.fal.run/fixture/status|https://queue.fal.run/fixture/result");
    expect(result.progress).toBeNull(); expect(result.status).toBe(status.toLowerCase());
  });
});
