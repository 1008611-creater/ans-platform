import { describe, expect, it } from "vitest";
import { assertNicknameChangeAllowed, assertValidNickname, DisplayNameError, nicknameRemainingCooldown, NICKNAME_COOLDOWN_MS } from "@/lib/display-name";

describe("公开昵称验证", () => {
  it.each(["昵称", "a".repeat(40), "  昵称  "])("接受合法昵称 %j", (value) => {
    expect(assertValidNickname(value)).toBe(value.trim());
  });
  it.each(["", "一", "a".repeat(41), "a\u0000b", "\tab", "ab\n", "a\u007fb", "a\u0085b", "a\u200bb", "a\u202eb", "a@example.com", "  a@example.com  "])("拒绝非法昵称 %j", (value) => {
    expect(() => assertValidNickname(value)).toThrow(DisplayNameError);
    try { assertValidNickname(value); } catch (error) {
      expect(error).toMatchObject({ status: 400, code: "validation_error" });
    }
  });
  it("按 Unicode 码点计数而非 UTF-16 单元", () => {
    const letter = "\u{20000}";
    expect(() => assertValidNickname(letter)).toThrow(DisplayNameError);
    expect(assertValidNickname(letter.repeat(40))).toBe(letter.repeat(40));
    expect(() => assertValidNickname(letter.repeat(41))).toThrow(DisplayNameError);
  });
});

describe("昵称 30 天冷却边界", () => {
  const now = new Date("2026-09-07T00:00:00Z");
  it("未设置没有冷却", () => {
    expect(nicknameRemainingCooldown(null, now)).toBe(0);
    expect(nicknameRemainingCooldown(undefined, now)).toBe(0);
  });
  it("正好满 30 天可以修改", () => {
    const setAt = new Date(now.getTime() - NICKNAME_COOLDOWN_MS);
    expect(nicknameRemainingCooldown(setAt, now)).toBe(0);
    expect(() => assertNicknameChangeAllowed(setAt, now)).not.toThrow();
  });
  it("差 1 毫秒仍拒绝并向上取整 Retry-After", () => {
    expect(() => assertNicknameChangeAllowed(new Date(now.getTime() - NICKNAME_COOLDOWN_MS + 1), now))
      .toThrow(expect.objectContaining({ status: 429, code: "nickname_cooldown", retryAfter: 1 }));
  });
});
