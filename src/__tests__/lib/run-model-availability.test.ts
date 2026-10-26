// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { availableRunModelOptions, getAvailableRunModel, getRunModel, pausedRunModels } from "@/lib/run-models";
import { resolveGatewayModel } from "@/server/integrations/chat-completions-gateway";
import { validateCodexPayload } from "@/server/integrations/codex-gateway";
import { runModelPlaygroundViaPi } from "@/server/companion/pi-agent";

afterEach(() => { vi.unstubAllEnvs(); });

describe("ANS_RUN_MODELS_PAUSED", () => {
  it("parses known keys only and keeps every model when unset", () => {
    expect(pausedRunModels({})).toEqual([]);
    expect(pausedRunModels({ ANS_RUN_MODELS_PAUSED: " gpt-6-astra , gpt-6.1-sol,unknown " })).toEqual(["gpt-6-astra", "gpt-6.1-sol"]);
    expect(availableRunModelOptions(["gpt-6-astra", "gpt-6.1-sol"]).map(model => model.key)).toEqual(["deepseek-v4.1-flash"]);
  });

  it("never pauses the default model that every fallback lands on", () => {
    expect(pausedRunModels({ ANS_RUN_MODELS_PAUSED: "deepseek-v4.1-flash,gpt-6-astra" })).toEqual(["gpt-6-astra"]);
  });

  it("changes nothing while unset: every model stays callable", () => {
    for (const key of ["deepseek-v4.1-flash", "gpt-6-astra", "gpt-6.1-sol"]) {
      expect(getAvailableRunModel(key, pausedRunModels())?.key).toBe(key);
      expect(() => validateCodexPayload({ model: key, input: "hi" })).not.toThrow("MODEL_UNAVAILABLE");
    }
    expect(resolveGatewayModel("gpt-4o")).toBe("gpt-6.1-sol");
  });

  it("refuses new calls to a paused model on every server entry while labels still resolve", async () => {
    vi.stubEnv("ANS_RUN_MODELS_PAUSED", "gpt-6.1-sol");
    expect(getAvailableRunModel("gpt-6.1-sol", pausedRunModels())).toBeUndefined();
    expect(getRunModel("gpt-6.1-sol")?.label).toBe("GPT-6.1 Sol");
    expect(getAvailableRunModel("deepseek-v4.1-flash", pausedRunModels())?.key).toBe("deepseek-v4.1-flash");
    // gpt-4o is an alias of gpt-6.1-sol, so it is refused too.
    expect(resolveGatewayModel("gpt-4o")).toBeNull();
    expect(resolveGatewayModel("gpt-6.1-sol")).toBeNull();
    expect(resolveGatewayModel("deepseek-chat")).toBe("deepseek-v4.1-flash");
    expect(() => validateCodexPayload({ model: "gpt-6.1-sol", input: "hi" })).toThrow("MODEL_UNAVAILABLE");
    const playground = await runModelPlaygroundViaPi("user-1", "hi", "gpt-6.1-sol");
    expect(playground).toMatchObject({ ok: false, error: "MODEL_UNAVAILABLE", pointsDelta: 0 });
  });
});
