import { webcrypto } from "node:crypto";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MediaGenerator } from "@/components/prompts/media-generator";
vi.mock("@/lib/plugins/media-generators", () => ({ getProviderWebSocketHandler: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => null,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button>,
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
let actorId = "fixture-member-a";
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: actorId } }, status: "authenticated" }) }));
const model = { id: "fixture", name: "Fixture model", provider: "fal", providerName: "Fixture provider", type: "image" };
const accepted = { socketAccessToken: "fixture-private-token", taskSig: "fixture-signature", provider: "fal", webSocketUrl: "" };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const posted: Record<string, unknown>[] = [];
const fetched = vi.fn();
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear(); posted.length = 0; actorId = "fixture-member-a";
  vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("fetch", fetched);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function choose() {
  fireEvent.click(await screen.findByRole("button", { name: "Fixture model" }));
  fireEvent.click(screen.getByRole("button", { name: "startGeneration" }));
}
const setup = (onMediaGenerated = vi.fn()) => render(<MediaGenerator prompt="PRIVATE_USER_PROMPT_FIXTURE" mediaType="IMAGE" onMediaGenerated={onMediaGenerated} onUploadClick={vi.fn()} />);
describe("media request recovery", () => {
  it("offers legacy recovery even when models are disabled, and rejects another media type", async () => {
    const hash = "a".repeat(64), key = "10000000-0000-4000-8000-000000000003";
    sessionStorage.setItem(`ans-media-request-v1:${hash}`, JSON.stringify({ hash, key }));
    fetched.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") { posted.push(JSON.parse(String(options.body))); return response(accepted); }
      if (url.includes("?key=")) return response({ ...accepted, type: "video" });
      return response({ imageModels: [] });
    });
    const onOutput = vi.fn(); setup(onOutput);
    fireEvent.click(await screen.findByRole("button", { name: "resumeGeneration" }));
    await screen.findByText("generationConnectionFailed");
    expect(onOutput).not.toHaveBeenCalled(); expect(posted).toHaveLength(0);
    expect(sessionStorage.getItem(`ans-media-request-v1:${hash}`)).not.toBeNull();
    expect(sessionStorage.getItem(`ans-media-request-v2:${actorId}:IMAGE:${hash}`)).toBeNull();
  });
  it("migrates an owned pending old task and keeps its exact key without another submission", async () => {
    const hash = "b".repeat(64), key = "10000000-0000-4000-8000-000000000004";
    sessionStorage.setItem(`ans-media-request-v1:${hash}`, JSON.stringify({ hash, key }));
    fetched.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") { posted.push(JSON.parse(String(options.body))); return response(accepted); }
      if (url.includes("?key=")) return response({ pending: true, type: "image", requiresReview: true }, 202);
      return response({ imageModels: [] });
    });
    setup(); fireEvent.click(await screen.findByRole("button", { name: "resumeGeneration" }));
    await screen.findByText("generationReviewRequired"); expect(posted).toHaveLength(0);
    expect(sessionStorage.getItem(`ans-media-request-v1:${hash}`)).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(`ans-media-request-v2:${actorId}:IMAGE:${hash}`)!)).toEqual({ hash, key });
  });
  it("does not assign another member's legacy key to the current member or delete it", async () => {
    const input = { prompt: "PRIVATE_USER_PROMPT_FIXTURE", model: model.id, provider: model.provider, type: model.type, resolution: "1K", aspectRatio: "1:1" };
    const hash = Buffer.from(await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input)))).toString("hex");
    const key = "10000000-0000-4000-8000-000000000005";
    sessionStorage.setItem(`ans-media-request-v1:${hash}`, JSON.stringify({ hash, key }));
    fetched.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") { posted.push(JSON.parse(String(options.body))); return response({ pending: true, requiresReview: true }, 202); }
      if (url.includes("?key=")) return response({ error: "TASK_NOT_FOUND" }, 404);
      return response({ imageModels: [model] });
    });
    actorId = "fixture-member-b"; setup(); await choose(); await screen.findByText("generationReviewRequired");
    expect(posted).toHaveLength(1); expect(posted[0].idempotencyKey).not.toBe(key);
    expect(sessionStorage.getItem(`ans-media-request-v1:${hash}`)).not.toBeNull();
  });
  it("ignores legacy ownership confirmation arriving after an account switch", async () => {
    const hash = "c".repeat(64), key = "10000000-0000-4000-8000-000000000006";
    sessionStorage.setItem(`ans-media-request-v1:${hash}`, JSON.stringify({ hash, key }));
    let accept: (reply: Response) => void = () => {};
    fetched.mockImplementation(async (url: string) => {
      if (url.includes("?key=")) return new Promise<Response>(resolve => { accept = resolve; });
      return response({ imageModels: [] });
    });
    const onOutput = vi.fn(), view = setup(onOutput);
    fireEvent.click(await screen.findByRole("button", { name: "resumeGeneration" }));
    await waitFor(() => expect(fetched.mock.calls.some(call => String(call[0]).includes("?key="))).toBe(true));
    actorId = "fixture-member-b"; view.rerender(<MediaGenerator prompt="PRIVATE_USER_PROMPT_FIXTURE" mediaType="IMAGE" onMediaGenerated={onOutput} onUploadClick={vi.fn()} />);
    accept(response({ ...accepted, type: "image" })); await new Promise(resolve => setTimeout(resolve, 50));
    expect(onOutput).not.toHaveBeenCalled(); expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.getItem(`ans-media-request-v1:${hash}`)).not.toBeNull();
  });

  it("recovers a version-one task before considering any new POST", async () => {
    const input = { prompt: "PRIVATE_USER_PROMPT_FIXTURE", model: model.id, provider: model.provider, type: model.type, resolution: "1K", aspectRatio: "1:1" };
    const hash = Buffer.from(await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input)))).toString("hex");
    const key = "10000000-0000-4000-8000-000000000001";
    sessionStorage.setItem(`ans-media-request-v1:${hash}`, JSON.stringify({ hash, key }));
    fetched.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") { posted.push(JSON.parse(String(options.body))); return response(accepted); }
      if (url.includes("?key=")) return response({ ...accepted, type: "image" });
      if (url.includes("/status?")) return response({ status: "completed", outputUrls: ["https://example.invalid/legacy.png"] });
      return response({ imageModels: [model] });
    });
    const onOutput = vi.fn(); setup(onOutput); await choose();
    await waitFor(() => expect(onOutput).toHaveBeenCalledWith("https://example.invalid/legacy.png"));
    expect(posted).toHaveLength(0); expect(sessionStorage.length).toBe(0);
    expect(fetched.mock.calls.some(call => String(call[0]).includes(`?key=${key}`))).toBe(true);
  });
  it("keeps an unverified old task and blocks resubmission if ownership lookup is unavailable", async () => {
    const input = { prompt: "PRIVATE_USER_PROMPT_FIXTURE", model: model.id, provider: model.provider, type: model.type, resolution: "1K", aspectRatio: "1:1" };
    const hash = Buffer.from(await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input)))).toString("hex");
    sessionStorage.setItem(`ans-media-request-v1:${hash}`, JSON.stringify({ hash, key: "10000000-0000-4000-8000-000000000002" }));
    fetched.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") { posted.push(JSON.parse(String(options.body))); return response(accepted); }
      if (url.includes("?key=")) throw new Error("fixture unavailable");
      if (url.includes("/status?")) return response({ status: "completed", outputUrls: ["https://example.invalid/duplicate.png"] });
      return response({ imageModels: [model] });
    });
    setup(); await choose(); await screen.findByText("generationConnectionFailed");
    expect(posted).toHaveLength(0); expect(sessionStorage.getItem(`ans-media-request-v1:${hash}`)).not.toBeNull();
  });

  it("recovers the original task when its provider stops offering models, without a new POST", async () => {
    let enabled = true;
    fetched.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") { posted.push(JSON.parse(String(options.body))); return response({ pending: true, requiresReview: true }, 202); }
      if (url.includes("?key=")) return response(accepted);
      if (url.includes("/status?")) return response({ status: "completed", progress: 100, outputUrls: ["https://example.invalid/recovered.png"] });
      return response({ imageModels: enabled ? [model] : [] });
    });
    const first = setup(); await choose(); await screen.findByText("generationReviewRequired"); first.unmount(); enabled = false;
    const onOutput = vi.fn(); setup(onOutput);
    fireEvent.click(await screen.findByRole("button", { name: "resumeGeneration" }));
    await waitFor(() => expect(onOutput).toHaveBeenCalledWith("https://example.invalid/recovered.png"));
    expect(posted).toHaveLength(1); expect(sessionStorage.length).toBe(0);
  });
  it("preserves recovery instead of claiming success when a completed response lacks an output", async () => {
    fetched.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") { posted.push(JSON.parse(String(options.body))); return response(accepted); }
      if (url.includes("/status?")) return response({ status: "completed", progress: 100, outputUrls: [] });
      return response({ imageModels: [model] });
    });
    const onOutput = vi.fn(); setup(onOutput); await choose();
    await screen.findByRole("button", { name: "resumeGeneration" });
    expect(screen.queryByText("mediaAddedToPrompt")).not.toBeInTheDocument(); expect(onOutput).not.toHaveBeenCalled(); expect(sessionStorage.length).toBe(1);
  });
  it("does not reuse another account's request key after switching accounts in the same tab", async () => {
    fetched.mockImplementation(async (_url: string, options?: RequestInit) => {
      if (options?.method === "POST") { posted.push(JSON.parse(String(options.body))); return response({ pending: true, requiresReview: true }, 202); }
      return response({ imageModels: [model] });
    });
    const first = setup(); await choose(); await screen.findByText("generationReviewRequired"); first.unmount();
    actorId = "fixture-member-b"; setup(); await choose(); await screen.findByText("generationReviewRequired");
    expect(posted).toHaveLength(2); expect(posted[0].idempotencyKey).not.toBe(posted[1].idempotencyKey);
  });
  it("discards an old account's late task result after the current account changes", async () => {
    let accept: (value: Response) => void = () => {};
    fetched.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") { posted.push(JSON.parse(String(options.body))); return new Promise<Response>(resolve => { accept = resolve; }); }
      if (url.includes("/status?")) return response({ status: "completed", progress: 100, outputUrls: ["https://example.invalid/private-a.png"] });
      return response({ imageModels: [model] });
    });
    const onOutput = vi.fn(); const view = setup(onOutput); await choose(); await waitFor(() => expect(posted).toHaveLength(1));
    actorId = "fixture-member-b";
    view.rerender(<MediaGenerator prompt="PRIVATE_USER_PROMPT_FIXTURE" mediaType="IMAGE" onMediaGenerated={onOutput} onUploadClick={vi.fn()} />);
    accept(response(accepted)); await new Promise(resolve => setTimeout(resolve, 50));
    expect(onOutput).not.toHaveBeenCalled();
  });
  it("reuses the saved key after a lost response and never stores private prompt or task token", async () => {
    let first = true;
    fetched.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        posted.push(JSON.parse(String(options.body)));
        if (first) { first = false; throw new Error("lost response"); }
        return response(accepted);
      }
      if (url.includes("?key=")) return response(accepted);
      if (url.includes("/status?")) return response({ status: "completed", progress: 100, outputUrls: ["https://example.invalid/result.png"] });
      return response({ imageModels: [model] });
    });
    const onOutput = vi.fn(); setup(onOutput); await choose();
    fireEvent.click(await screen.findByRole("button", { name: "resumeGeneration" }));
    await waitFor(() => expect(onOutput).toHaveBeenCalledTimes(1));
    expect(posted).toHaveLength(1);
    expect(fetched.mock.calls.some(call => String(call[0]).includes(`?key=${posted[0].idempotencyKey}`))).toBe(true);
    expect(JSON.stringify(sessionStorage)).not.toContain("PRIVATE_USER_PROMPT_FIXTURE");
    expect(JSON.stringify(sessionStorage)).not.toContain("fixture-private-token");
    expect(sessionStorage.length).toBe(0);
  });
  it("uses the same key after the component remounts", async () => {
    fetched.mockImplementation(async (_url: string, options?: RequestInit) => {
      if (options?.method === "POST") { posted.push(JSON.parse(String(options.body))); return response({ pending: true, requiresReview: true }, 202); }
      return response({ imageModels: [model] });
    });
    const first = setup(); await choose();
    await screen.findByText("generationReviewRequired");
    expect(sessionStorage.length).toBe(1); expect(JSON.stringify(sessionStorage)).not.toContain("PRIVATE_USER_PROMPT_FIXTURE");
    first.unmount(); setup(); await choose();
    await waitFor(() => expect(posted).toHaveLength(2));
    expect(posted[0].idempotencyKey).toBe(posted[1].idempotencyKey);
    expect(fetched.mock.calls.some(call => String(call[0]).includes("undefined"))).toBe(false);
  });
  it("reads a pending reservation instead of submitting a second job", async () => {
    fetched.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") { posted.push(JSON.parse(String(options.body))); return response({ pending: true, requiresReview: false }, 202); }
      if (url.includes("?key=")) return response(accepted);
      if (url.includes("/status?")) return response({ status: "completed", progress: 100, outputUrls: ["https://example.invalid/result.png"] });
      return response({ imageModels: [model] });
    });
    const onOutput = vi.fn(); setup(onOutput); await choose();
    await waitFor(() => expect(onOutput).toHaveBeenCalledTimes(1), { timeout: 4000 });
    expect(posted).toHaveLength(1);
    expect(fetched.mock.calls.filter(call => String(call[0]).includes("?key="))).toHaveLength(1);
  });
  it("requires explicit confirmation before a new billable request after a known rejection", async () => {
    fetched.mockImplementation(async (_url: string, options?: RequestInit) => {
      if (options?.method === "POST") { posted.push(JSON.parse(String(options.body))); return response({ error: "MEDIA_SUBMISSION_NOT_ACCEPTED" }, 409); }
      return response({ imageModels: [model] });
    });
    setup(); await choose();
    fireEvent.click(await screen.findByRole("button", { name: "newGeneration" }));
    expect(posted).toHaveLength(1); expect(screen.getByRole("button", { name: "startGeneration" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "startGeneration" }));
    await waitFor(() => expect(posted).toHaveLength(2));
    expect(posted[0].idempotencyKey).not.toBe(posted[1].idempotencyKey);
  });
});
