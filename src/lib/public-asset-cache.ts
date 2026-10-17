/** Only bundled public renderer files; never apply these headers to pages or APIs.
 * Stable filenames deliberately use a bounded TTL, not immutable year-long caching.
 */
export const PUBLIC_RENDERER_CACHE_CONTROL = "public, max-age=3600, s-maxage=3600";
export const PUBLIC_RENDERER_CACHE_SOURCES = [
  "/mascot/3d/:asset(.*\\.(?:glb|js|mjs|css))",
  "/showcase/ans-3d/:asset(.*\\.(?:glb|js|mjs|css))",
];
export function publicRendererCacheHeaders() {
  return PUBLIC_RENDERER_CACHE_SOURCES.map(source => ({
    source, headers: [{ key: "Cache-Control", value: PUBLIC_RENDERER_CACHE_CONTROL }],
  }));
}
