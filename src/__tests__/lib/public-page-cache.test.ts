// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PUBLIC_PAGE_CACHE_CONTROL, PUBLIC_PAGE_PATHS, publicPageCacheHeaders } from "@/lib/public-page-cache";

describe("publicPageCacheHeaders", () => {
  it("adds nothing unless the edge has been set up to bypass session and locale cookies", () => {
    expect(publicPageCacheHeaders({})).toEqual([]);
    expect(publicPageCacheHeaders({ ANS_PUBLIC_PAGE_CACHE: "true" })).toEqual([]);
  });

  it("covers exactly the six public entries, never a sub-path", () => {
    const rules = publicPageCacheHeaders({ ANS_PUBLIC_PAGE_CACHE: "1" });
    expect([...new Set(rules.map(rule => rule.source))]).toEqual([...PUBLIC_PAGE_PATHS]);
    expect(rules.every(rule => !rule.source.includes(":"))).toBe(true);
    expect(rules.every(rule => rule.headers[0].value === PUBLIC_PAGE_CACHE_CONTROL)).toBe(true);
    expect(PUBLIC_PAGE_CACHE_CONTROL).toContain("max-age=0");
  });

  it("skips signed-in, English, Flight, prefetch and server-action requests", () => {
    for (const rule of publicPageCacheHeaders({ ANS_PUBLIC_PAGE_CACHE: "1" })) {
      const missing = rule.missing.map(condition => `${condition.type}:${condition.key}`);
      for (const key of ["cookie:authjs.session-token", "cookie:__Secure-authjs.session-token", "cookie:__Secure-authjs.session-token.0", "header:rsc", "header:next-router-prefetch", "header:next-action", "query:_rsc"]) {
        expect(missing).toContain(key);
      }
      // Either no locale cookie at all, or the default locale only.
      const locale = rule.has?.find(condition => condition.key === "NEXT_LOCALE");
      expect(locale ? locale.value === "zh" : missing.includes("cookie:NEXT_LOCALE")).toBe(true);
    }
  });
});
