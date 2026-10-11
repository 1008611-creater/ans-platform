// @vitest-environment node
import { expect, it } from "vitest";
import zh from "../../../messages/product/zh.json";
import en from "../../../messages/product/en.json";
it("ships readable Chinese credits copy and matching English keys", () => {
 for (const section of ["quotaAdmin", "quotaHistory"] as const) {
  const check = (value: unknown): void => { if (typeof value === "string") { expect(value).not.toContain("?"); expect(value).not.toContain("\uFFFD"); } else if (value && typeof value === "object") Object.values(value).forEach(check); };
  check(zh[section]); expect(Object.keys(zh[section]).sort()).toEqual(Object.keys(en[section]).sort());
 }
 expect(zh.quotaAdmin.title).toBe("\u79ef\u5206\u7ba1\u7406");
 expect(zh.quotaHistory.title).toBe("\u79ef\u5206\u8d26\u5355");
});
