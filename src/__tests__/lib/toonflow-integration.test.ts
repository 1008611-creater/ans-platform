import { afterEach, expect, it, vi } from "vitest";
import { getToonflowEmbedConfig, getToonflowResultUrl } from "@/server/integrations/toonflow";
const mocks = vi.hoisted(() => ({ url: "https://toonflow.cauai.fun" }));
vi.mock("@/lib/aigc/cluster", () => ({ AIGC_CONNECTORS: [{ id: "toonflow", get url() { return mocks.url; } }] }));
afterEach(() => { vi.unstubAllEnvs(); mocks.url = "https://toonflow.cauai.fun"; });
it("stays disabled until the compatible deployment is explicitly enabled", () => {
  vi.stubEnv("ANS_TOONFLOW_EMBED_ENABLED", "0"); expect(getToonflowEmbedConfig()).toBeNull();
  vi.stubEnv("ANS_TOONFLOW_EMBED_ENABLED", "true"); expect(getToonflowEmbedConfig()).toBeNull();
});
it("returns only public origin and entry points without identity or credentials", () => {
  vi.stubEnv("ANS_TOONFLOW_EMBED_ENABLED", "1");
  expect(getToonflowEmbedConfig()).toEqual({ origin: "https://toonflow.cauai.fun", src: "https://toonflow.cauai.fun/?ans_embed=1", loginUrl: "https://toonflow.cauai.fun/api/auth/oidc/start?return_to=%2F" });
});
it.each(["http://toonflow.cauai.fun", "https://user:password@toonflow.cauai.fun", "https://toonflow.cauai.fun/private", "https://toonflow.cauai.fun/?token=private", "https://toonflow.cauai.fun/#token", "bad url"])("fails closed on invalid configured URL %s", url => {
  vi.stubEnv("ANS_TOONFLOW_EMBED_ENABLED", "1"); mocks.url = url; expect(getToonflowEmbedConfig()).toBeNull();
});

it("only exposes owned task entry points after both deployments are enabled", () => {
  vi.stubEnv("ANS_TOONFLOW_EMBED_ENABLED", "1");
  expect(getToonflowResultUrl("compute-task-0001")).toBeNull();
  vi.stubEnv("ANS_TOONFLOW_RESULTS_ENABLED", "1");
  expect(getToonflowResultUrl("compute-task-0001")).toBe("https://toonflow.cauai.fun/compute/result?taskId=compute-task-0001");
  vi.stubEnv("ANS_TOONFLOW_EMBED_ENABLED", "0");
  expect(getToonflowResultUrl("compute-task-0001")).toBeNull();
});
it.each(["", "tiny", "../private/file", "https://evil.invalid", "task-id?userId=other", "task-id#private", "a".repeat(161)])("rejects a task URL/path injection %s", taskId => {
  vi.stubEnv("ANS_TOONFLOW_EMBED_ENABLED", "1"); vi.stubEnv("ANS_TOONFLOW_RESULTS_ENABLED", "1");
  expect(getToonflowResultUrl(taskId)).toBeNull();
});
