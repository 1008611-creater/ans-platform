// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { callModelTextWithUsage, type ModelTarget } from "@/server/integrations/model-client";

const target: ModelTarget = {
  baseUrl: "https://gateway.example.test/v1",
  apiKey: "test-secret",
  upstream: "provider/model",
  label: "test-model",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("model response usage", () => {
  it("returns provider token usage from a non-stream response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      choices: [{ message: { content: "draft" } }],
      usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callModelTextWithUsage({ target, prompt: "write" })).resolves.toEqual({
      text: "draft",
      usage: { inputTokens: 11, outputTokens: 7, totalTokens: 18 },
    });
  });

  it("reads token usage from the final SSE frame after gateway fallback", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response([
        `data: ${JSON.stringify({ choices: [{ delta: { content: "draft" } }] })}`,
        `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } })}`,
        "data: [DONE]",
        "",
      ].join("\n"), { status: 200, headers: { "Content-Type": "text/event-stream" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callModelTextWithUsage({ target, prompt: "write" })).resolves.toEqual({
      text: "draft",
      usage: { inputTokens: 5, outputTokens: 3, totalTokens: 8 },
    });
    const streamRequest = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(streamRequest.stream_options).toEqual({ include_usage: true });
  });

  it("keeps usage unknown when the gateway does not report it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: "draft" } }] })));
    await expect(callModelTextWithUsage({ target, prompt: "write" })).resolves.toEqual({ text: "draft", usage: null });
  });
});
