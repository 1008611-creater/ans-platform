// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildInfiniteCanvasSsoUrl, getEaselEmbedConfig, PAI_VIDEO_CANVAS_MODELS } from "@/server/integrations/easel";
afterEach(() => vi.unstubAllEnvs());
describe("Easel opt-in & Infinite Canvas SSO", () => {
  it("stays off without a verified deployment", () => { vi.stubEnv("ANS_EASEL_ENABLED", "0"); expect(getEaselEmbedConfig("user-a")).toBeNull(); });
  it("only builds HTTPS links to a separate origin with the server's user ID", () => {
    vi.stubEnv("ANS_EASEL_ENABLED", "1"); vi.stubEnv("ANS_EASEL_ORIGIN", "https://easel.example.test"); vi.stubEnv("AUTH_URL", "https://ans.example.test");
    expect(getEaselEmbedConfig("user/a&b")).toEqual({ origin: "https://easel.example.test", src: "https://easel.example.test/ans/embed?expected=user%2Fa%26b", loginUrl: "https://easel.example.test/ans/oidc/start?expected=user%2Fa%26b" });
  });
  it.each(["http://easel.example.test", "https://easel.example.test/", "https://u:p@easel.example.test", "https://easel.example.test/path", "https://*.example.test", "https://ans.example.test"])("rejects unsafe deployment address %s", address => {
    vi.stubEnv("ANS_EASEL_ENABLED", "1"); vi.stubEnv("ANS_EASEL_ORIGIN", address); vi.stubEnv("AUTH_URL", "https://ans.example.test"); expect(getEaselEmbedConfig("user-a")).toBeNull();
  });
  it("builds signed unified SSO redirect URL for authenticated ANS users and plain origin for guests", () => {
    expect(buildInfiniteCanvasSsoUrl(null)).toBe("https://hb.cauai.fun/");
    const sso = buildInfiniteCanvasSsoUrl({ id: "u-1", email: "creator@ans.local" });
    expect(sso).toContain("https://hb.cauai.fun/api/auth/unified?assertion=");
    expect(sso).toContain("&redirect=1");
    expect(PAI_VIDEO_CANVAS_MODELS.map(m => m.id)).toContain("pixverse-v6");
    expect(PAI_VIDEO_CANVAS_MODELS.map(m => m.id)).toContain("pai-seedance-2.5");
  });
});
