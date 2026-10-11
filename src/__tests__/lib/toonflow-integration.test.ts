import { afterEach, expect, it, vi } from "vitest";
import { getToonflowEmbedConfig } from "@/server/integrations/toonflow";
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
