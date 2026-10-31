import { describe, expect, it } from "vitest";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import {
  PUBLIC_MEDIA_CACHE_CONTROL,
  PUBLIC_MEDIA_CACHE_SOURCE,
  PUBLIC_RENDERER_CACHE_CONTROL,
  publicRendererCacheHeaders,
} from "@/lib/public-asset-cache";

// Same matcher Next uses for `headers()` sources.
const matches = (source: string, path: string) =>
  Boolean(getPathMatch(source, { removeUnnamedParams: true, strict: true })(path));

describe("public asset cache headers", () => {
  it("lets the CDN cache public media", () => {
    for (const path of ["/og.png", "/vibe-hub/a/b.webp", "/kids-music.mp3", "/videos/guide.mp4", "/favicon/favicon.ico", "/catalog/gitglow-v1/x.svg"]) {
      expect(matches(PUBLIC_MEDIA_CACHE_SOURCE, path), path).toBe(true);
    }
  });

  it("never touches pages, APIs, Next build output or the service worker", () => {
    for (const path of ["/", "/explore", "/sw.js", "/robots.txt", "/api/og.png", "/_next/static/media/a.woff2", "/visual-portfolio/scene.mjs"]) {
      expect(matches(PUBLIC_MEDIA_CACHE_SOURCE, path), path).toBe(false);
    }
  });

  it("keeps the shorter renderer TTL on overlapping 3D paths", () => {
    const rules = publicRendererCacheHeaders().filter(rule => matches(rule.source, "/mascot/3d/ans-dino.glb"));
    expect(rules.map(rule => rule.headers[0].value)).toEqual([PUBLIC_MEDIA_CACHE_CONTROL, PUBLIC_RENDERER_CACHE_CONTROL]);
  });
});
