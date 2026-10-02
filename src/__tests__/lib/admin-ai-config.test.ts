import { describe, expect, it, beforeEach } from "vitest";
import {
  buildPublicAiConfig,
  normalizeModelList,
  validateAiBaseUrl,
} from "@/server/admin/ai-config";
import { encryptCredential } from "@/server/integrations/credential-crypto";

describe("admin AI configuration", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-for-ai-config";
  });

  it("normalizes model IDs while preserving order", () => {
    expect(normalizeModelList([" model-a ", "model-a", "", 42, "model-b"])).toEqual(["model-a", "model-b"]);
  });

  it("accepts an OpenAI-compatible base URL and rejects embedded credentials", () => {
    expect(validateAiBaseUrl("https://models.example.com/v1/")).toBe("https://models.example.com/v1");
    expect(() => validateAiBaseUrl("https://user:pass@models.example.com/v1")).toThrow();
    expect(() => validateAiBaseUrl("https://models.example.com/v1?key=secret")).toThrow();
  });

  it("only returns a masked API key", () => {
    const encryptedApiKey = encryptCredential("sk-super-secret-value");
    const result = buildPublicAiConfig({
      baseUrl: "https://models.example.com/v1",
      encryptedApiKey,
      apiKeyLast4: "alue",
      selectedModel: "model-a",
      availableModels: ["model-a"],
      reasoningEffort: "high",
      timeoutMs: 30_000,
      enabled: true,
      updatedAt: new Date("2026-10-02T00:00:00.000Z"),
    });
    expect(result?.apiKey).toBe("********alue");
    expect(result?.apiKey).not.toContain("super-secret");
  });
});
