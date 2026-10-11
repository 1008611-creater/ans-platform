import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signMediaTask, verifyMediaTask } from "@/lib/media-task-ownership";

afterEach(() => { vi.unstubAllEnvs(); });
describe("media task signing", () => {
  it("fails closed with no deployment key, including a forged public fallback signature", () => {
    vi.stubEnv("AUTH_SECRET", ""); vi.stubEnv("NEXTAUTH_SECRET", "");
    const sig = createHmac("sha256", "pchat-media-task-fallback-secret").update("4:user|3:fal|5:token").digest("hex");
    expect(verifyMediaTask("user", "fal", "token", sig)).toBe(false);
    expect(() => signMediaTask("user", "fal", "token")).toThrow("MEDIA_SIGNING_NOT_CONFIGURED");
  });
  it("binds signatures to the exact owner, provider and token", () => {
    vi.stubEnv("AUTH_SECRET", "fixture-private-key");
    const sig = signMediaTask("owner", "fal", "token");
    expect(verifyMediaTask("owner", "fal", "token", sig)).toBe(true);
    expect(verifyMediaTask("outsider", "fal", "token", sig)).toBe(false);
    expect(verifyMediaTask("owner", "wiro", "token", sig)).toBe(false);
    expect(verifyMediaTask("owner", "fal", "other", sig)).toBe(false);
    expect(verifyMediaTask("owner", "fal", "token", "0".repeat(64))).toBe(false);
  });
});
