import { describe, expect, it } from "vitest";
import { GenerationRequestSchema, SceneDocumentSchema, canTransition, validJobTransitions } from "./contracts";
import { starterScene } from "./demo-data";
import { createGenerationRequest, generationAdapter, sceneAdapter, storageAdapter } from "./adapters";

describe("versioned scene contract and mock adapters", () => {
  it("accepts the versioned starter scene and rejects unsupported versions", () => {
    expect(SceneDocumentSchema.parse(starterScene).schemaVersion).toBe("1.1.0");
    expect(() => SceneDocumentSchema.parse({ ...starterScene, schemaVersion: "2.0.0" })).toThrow();
  });
  it("loads a clearly identified demo scene", async () => {
    const scene = await sceneAdapter.loadDemoScene("alpine");
    expect(scene.id).toBe("demo-alpine");
    expect(scene.provenance.kind).toBe("demo");
  });
  it("returns demo outputs without claiming a real media file", async () => {
    const job = await generationAdapter.submit("image", starterScene);
    expect(job.demo).toBe(true);
    expect(job.outputs[0].mediaType).toBe("image/mock");
  });
  it("validates local demo draft saves", async () => {
    await expect(storageAdapter.saveDraft(starterScene)).resolves.toEqual({ saved: true, mode: "memory-only" });
  });
  it("keeps terminal job transitions explicit", () => {
    expect(validJobTransitions.queued).toContain("running");
    expect(validJobTransitions.succeeded).toEqual([]);
    expect(validJobTransitions.failed).toContain("queued");
    expect(canTransition("queued", "running")).toBe(true);
    expect(canTransition("succeeded", "queued")).toBe(false);
  });
  it("keeps provider payloads behind a versioned internal request", () => {
    const request = createGenerationRequest("video", starterScene, starterScene.shots[0]?.id);
    expect(GenerationRequestSchema.parse(request).output.format).toBe("mp4");
    expect(request.provenance.license).toBe("project-generated");
  });
  it("simulates retryable failure and idempotency without real media", async () => {
    const request = createGenerationRequest("image", starterScene, "shot-1");
    const first = await generationAdapter.submit(request, "failed");
    const failed = await generationAdapter.status(first.id);
    const failedFinal = await generationAdapter.status(failed.id);
    expect(failedFinal.status).toBe("failed");
    expect(failedFinal.error?.retryable).toBe(true);
    const retry = await generationAdapter.retry(failedFinal.id);
    expect(retry.status).toBe("queued");
    const duplicate = await generationAdapter.submit(request, "success");
    expect(duplicate.id).toBe(first.id);
  });
  it("supports no-result and cancellation states explicitly", async () => {
    const noResultRequest = { ...createGenerationRequest("image", starterScene), idempotencyKey: "no-result-test" };
    const noResult = await generationAdapter.submit(noResultRequest, "no-result");
    const running = await generationAdapter.status(noResult.id);
    const done = await generationAdapter.status(running.id);
    expect(done.status).toBe("succeeded");
    expect(done.outputs).toHaveLength(0);
    const pending = await generationAdapter.submit(createGenerationRequest("video", starterScene), "success");
    const canceled = await generationAdapter.cancel(pending.id);
    expect(canceled.status).toBe("canceled");
  });
});
