import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "@/lib/auth/safe-callback-url";

describe("safeCallbackUrl", () => {
  it("allows same-site relative paths with a query string", () => {
    expect(safeCallbackUrl("/api/oidc/authorize?client_id=x&state=y")).toBe("/api/oidc/authorize?client_id=x&state=y");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/login?callbackUrl=/login", undefined])(
    "rejects unsafe callback %s",
    (value) => expect(safeCallbackUrl(value)).toBe("/"),
  );
});
