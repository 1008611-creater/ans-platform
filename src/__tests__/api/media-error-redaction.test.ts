// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as generate } from "@/app/api/media-generate/route";
import { GET as status } from "@/app/api/media-generate/status/route";
import { POST as upload } from "@/app/api/upload/route";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), transaction: vi.fn(), findUser: vi.fn(), updateUser: vi.fn(), start: vi.fn(), check: vi.fn(), upload: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction, user: { findUnique: mocks.findUser, update: mocks.updateUser } } }));
vi.mock("@/lib/plugins/media-generators", () => ({
  getMediaGeneratorPlugin: () => ({ isEnabled: () => true, startGeneration: mocks.start, checkStatus: mocks.check, getWebSocketUrl: () => "wss://example.test" }),
  getAvailableModels: () => [{ id: "fixture-model", provider: "fixture-provider" }],
  isMediaGenerationAvailable: () => true,
}));
vi.mock("@/lib/media-task-ownership", () => ({ isMediaTaskSigningConfigured: () => true, signMediaTask: () => "signature", verifyMediaTask: () => true }));
vi.mock("@/lib/plugins/registry", () => ({ getStoragePlugin: () => ({ isConfigured: () => true, upload: mocks.upload }) }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "self" } });
  mocks.findUser.mockResolvedValue({ generationCreditsRemaining: 1, flagged: false });
  vi.stubEnv("MODEL_CREDENTIAL_SECRET", "isolated-encryption-fixture");
  vi.stubEnv("ENABLED_STORAGE", "fixture-storage");
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

const privateMarker = "audit_fake_private_media_marker";
const failure = () => new Error(`postgresql://fixture:${privateMarker}@internal-db:5432/private Authorization: Bearer ${privateMarker}`);

async function expectRedacted(response: Response, log: ReturnType<typeof vi.spyOn>, code: string) {
  expect(response.status).toBe(500);
  const body = await response.text();
  expect(JSON.parse(body).error).toBe(code);
  expect(body).not.toContain(privateMarker);
  expect(JSON.stringify(log.mock.calls)).not.toContain(privateMarker);
  expect(body).not.toContain("postgresql://");
}

describe("media boundary error redaction", () => {
  it("rejects a stale browser actor before reserving or contacting a provider", async () => {
    const request = new NextRequest("http://localhost/api/media-generate", { method: "POST", headers: { "Content-Type": "application/json", "sec-fetch-site": "same-origin", "x-ans-actor": "previous-account" }, body: JSON.stringify({ idempotencyKey: "fixture-request-key", prompt: "fixture", model: "fixture-model", provider: "fixture-provider", type: "image" }) });
    const result = await generate(request);
    expect(result.status).toBe(409); expect(await result.json()).toEqual({ error: "MEDIA_ACCOUNT_CHANGED" });
    expect(mocks.transaction).not.toHaveBeenCalled(); expect(mocks.start).not.toHaveBeenCalled();
  });
  it("redacts reservation database failures from responses and ordinary logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.transaction.mockRejectedValue(failure());
    const request = new NextRequest("http://localhost/api/media-generate", { method: "POST", headers: { "Content-Type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ idempotencyKey: "fixture-request-key", prompt: "fixture", model: "fixture-model", provider: "fixture-provider", type: "image" }) });
    await expectRedacted(await generate(request), log, "MEDIA_GENERATION_FAILED");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("redacts provider status failures", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.check.mockRejectedValue(failure());
    await expectRedacted(await status(new NextRequest("http://localhost/api/media-generate/status?provider=fixture-provider&token=fixture-token&sig=signature")), log, "MEDIA_STATUS_FAILED");
  });
  it("redacts storage failures after format validation", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.upload.mockRejectedValue(failure());
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array([0,0,0,12,102,116,121,112,109,112,52,50])], { type: "video/mp4" }), "fixture.mp4");
    await expectRedacted(await upload(new NextRequest("http://localhost/api/upload", { method: "POST", body: form })), log, "MEDIA_UPLOAD_FAILED");
  });
});
