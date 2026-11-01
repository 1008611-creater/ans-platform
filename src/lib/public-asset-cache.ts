/** Only bundled public renderer files; never apply these headers to pages or APIs.
 * Stable filenames deliberately use a bounded TTL, not immutable year-long caching.
 */
export const PUBLIC_RENDERER_CACHE_CONTROL = "public, max-age=3600, s-maxage=3600";
export const PUBLIC_RENDERER_CACHE_SOURCES = [
  "/mascot/3d/:asset(.*\\.(?:glb|js|mjs|css))",
  "/showcase/ans-3d/:asset(.*\\.(?:glb|js|mjs|css))",
];

/** Media under public/ (images, fonts, audio, video, models). Without this Next sends
 * `max-age=0`, so the Tencent CDN edge goes back to origin for every request.
 * Filenames are stable, so the TTL stays bounded: browsers keep 1 day, the CDN keeps
 * 7 days and serves stale while it revalidates. Replacing a file in place needs a CDN
 * URL purge. sw.js, html, json, txt, js and css are left out on purpose.
 */
export const PUBLIC_MEDIA_CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";
export const PUBLIC_MEDIA_CACHE_SOURCE =
  "/:asset((?!_next/|api/).*\\.(?:webp|avif|png|jpe?g|gif|svg|ico|woff2?|ttf|otf|mp3|mp4|webm|glb|gltf|bin|hdr|ktx2))";

export function publicRendererCacheHeaders() {
  return [
    // Listed first so the narrower renderer rules below win on overlapping paths.
    { source: PUBLIC_MEDIA_CACHE_SOURCE, headers: [{ key: "Cache-Control", value: PUBLIC_MEDIA_CACHE_CONTROL }] },
    ...PUBLIC_RENDERER_CACHE_SOURCES.map(source => ({
      source, headers: [{ key: "Cache-Control", value: PUBLIC_RENDERER_CACHE_CONTROL }],
    })),
  ];
}
