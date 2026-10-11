// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_RUN_MODEL, getRunModel, RUN_MODEL_OPTIONS } from "@/lib/run-models";
import { resolvePlatformModel } from "@/server/integrations/model-client";
import { vi, afterEach } from "vitest";
afterEach(() => vi.unstubAllEnvs());
describe("APIC routing", () => {
  it("resolves only the three authorized exact upstream IDs", () => {
    expect(RUN_MODEL_OPTIONS.map(m => m.key)).toEqual(["deepseek-v4.1-flash", "gpt-6-astra", "gpt-6.1-sol"]);
    expect(DEFAULT_RUN_MODEL).toBe("deepseek-v4.1-flash");
    expect(getRunModel("gpt-5.6-terra")).toBeUndefined();
    vi.stubEnv("RUN_BASE_URL", "https://apic.cauai.fun/v1");
    vi.stubEnv("RUN_API_KEY", "test-server-only-key");
    for (const model of RUN_MODEL_OPTIONS) {
      expect(resolvePlatformModel(model.key)).toEqual({baseUrl:"https://apic.cauai.fun/v1",apiKey:"test-server-only-key",upstream:model.key,label:model.key});
    }
    expect(() => resolvePlatformModel("gpt-5.6-terra")).toThrow();
  });
});
