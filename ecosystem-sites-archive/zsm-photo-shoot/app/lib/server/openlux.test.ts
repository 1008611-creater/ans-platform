import { describe, expect, it, vi } from "vitest";
import { OpenLuxError, parseOpenLuxResult, requestOpenLux, validateOpenLuxInput } from "./openlux";

const input = {
  model: "gpt-image-2.5-flare" as const,
  prompt: "a travel portrait by the sea",
  n: 1,
  size: "1536x1024",
  quality: "medium",
  format: "webp",
  responseFormat: "url",
};

const enabledEnv = {
  OPENLUX_REAL_CALLS_ENABLED: "true",
  OPENLUX_API_KEY: "test-key",
  OPENLUX_BASE_URL: "https://openlux.test",
  OPENLUX_GENERATION_PATH: "/confirmed-test-path",
} as unknown as NodeJS.ProcessEnv;

describe("OpenLux provider boundary", () => {
  it("does not invoke fetch when real calls are disabled", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    await expect(requestOpenLux(input, fetchMock, {
      OPENLUX_REAL_CALLS_ENABLED: "false",
      OPENLUX_API_KEY: "secret-that-must-not-leak",
      OPENLUX_BASE_URL: "https://example.invalid",
      OPENLUX_GENERATION_PATH: "/unverified",
    } as unknown as NodeJS.ProcessEnv)).rejects.toMatchObject({ code: "UNCONFIGURED", status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a local fake URL response without exposing authorization", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: [{ url: "https://cdn.example/image.webp", width: 1536, height: 1024 }] }), { status: 200 }));
    const result = await requestOpenLux(input, fetchMock, enabledEnv);
    expect(result.outputs[0]).toMatchObject({ mediaType: "image", url: "https://cdn.example/image.webp", width: 1536 });
    expect(JSON.stringify(result)).not.toContain("test-key");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://openlux.test/confirmed-test-path");
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer test-key");
  });

  it("supports a locally verified base64 fixture", () => {
    expect(parseOpenLuxResult({ data: [{ b64_json: "ZmFrZS1pbWFnZQ==" }] }).outputs[0]?.data).toBe("ZmFrZS1pbWFnZQ==");
  });

  it("rejects empty and malformed result payloads", () => {
    expect(() => parseOpenLuxResult({ data: [] })).toThrowError(OpenLuxError);
    expect(() => parseOpenLuxResult({ data: [{ status: "queued" }] })).toThrowError(OpenLuxError);
  });

  it("maps rate limits and validates provider fields", async () => {
    expect(() => validateOpenLuxInput({ ...input, size: "original" })).toThrowError(OpenLuxError);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 429 }));
    await expect(requestOpenLux(input, fetchMock, enabledEnv)).rejects.toMatchObject({ code: "RATE_LIMITED", retryable: true });
  });

  it("rejects an oversized provider response before parsing it", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200, headers: { "content-length": "16000001" } }));
    await expect(requestOpenLux(input, fetchMock, enabledEnv)).rejects.toMatchObject({ code: "MALFORMED_RESPONSE", retryable: false });
  });
});
