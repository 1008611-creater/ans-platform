/** Shared-cache policy for the six public entry pages; browsers always revalidate. */
export const PUBLIC_PAGE_CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";
export const PUBLIC_PAGE_PATHS = ["/", "/explore", "/hubs", "/community", "/competitions", "/market"] as const;

type Condition = { type: "header" | "cookie" | "query"; key: string; value?: string };
type HeaderRule = { source: string; has?: Condition[]; missing: Condition[]; headers: { key: string; value: string }[] };

// Anything that can make the HTML differ between visitors, or turn the response into Flight or a redirect.
const PERSONAL_OR_FLIGHT: Condition[] = [
  { type: "cookie", key: "authjs.session-token" },
  { type: "cookie", key: "authjs.session-token.0" },
  { type: "cookie", key: "__Secure-authjs.session-token" },
  { type: "cookie", key: "__Secure-authjs.session-token.0" },
  { type: "header", key: "rsc" },
  { type: "header", key: "next-router-prefetch" },
  { type: "header", key: "next-action" },
  { type: "query", key: "_rsc" },
];

/**
 * next.config header rules that mark anonymous, default-locale documents of the six public entries as
 * shareable. Next still forces no-store on render errors and on every request these rules skip.
 *
 * Off unless ANS_PUBLIC_PAGE_CACHE=1 at build time. A CDN keyed by URL alone would also hand this HTML to
 * signed-in and English visitors, so the edge must first bypass requests carrying a session or NEXT_LOCALE cookie.
 */
export function publicPageCacheHeaders(env: Record<string, string | undefined> = process.env): HeaderRule[] {
  if (env.ANS_PUBLIC_PAGE_CACHE !== "1") return [];
  const headers = [{ key: "Cache-Control", value: PUBLIC_PAGE_CACHE_CONTROL }];
  return PUBLIC_PAGE_PATHS.flatMap(source => [
    { source, missing: [...PERSONAL_OR_FLIGHT, { type: "cookie", key: "NEXT_LOCALE" }], headers },
    { source, has: [{ type: "cookie", key: "NEXT_LOCALE", value: "zh" }], missing: PERSONAL_OR_FLIGHT, headers },
  ]);
}
