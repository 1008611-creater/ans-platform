import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdminPermission } from "@/lib/admin-permissions";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findUnique: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.findUnique } } }));
beforeEach(() => vi.resetAllMocks());
import { LEVELS, LEVEL_PERKS, getLevelPerks, getLevelProgress, checkInBonus } from "@/lib/level";

describe("社区成长奖励与管理员权限分离", () => {
  it("等级提供称号、装饰和社区积分，不提供发布审核或管理权限", () => {
    for (const level of LEVELS) {
      expect(LEVEL_PERKS[level.index].length).toBeGreaterThan(0);
      expect(LEVEL_PERKS[level.index].join(" ")).not.toMatch(/权限|发布|审核|管理|评审/);
    }
    expect(getLevelPerks(1)).toContain("薄荷头像框与聊天气泡");
    expect(getLevelPerks(1)).toContain("20 社区积分");
    expect(getLevelPerks(7)).toContain("ANS 核心头像框与气泡");
    expect(getLevelPerks(7)).toContain("600 社区积分");
    expect(getLevelPerks(7)).toEqual(Object.values(LEVEL_PERKS).flat());
  });
  it.each(LEVELS)("$nameZh 等级的普通用户不能获得发布审核权限", async ({ minXp }) => {
    mocks.auth.mockResolvedValue({ user: { id: "member", role: "USER", xp: minXp } });
    expect(await requireAdminPermission("PROMPTS_MANAGE")).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("最高等级也不能为受限管理员补充未授予的发布审核权限", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
    mocks.findUnique.mockResolvedValue({ id: "admin", role: "ADMIN", xp: 12000, adminPermissions: [], deletedAt: null, flagged: false });
    expect(await requireAdminPermission("PROMPTS_MANAGE")).toBeNull();
  });

  it.each(LEVELS)("保持$nameZh阈值不变", ({ minXp, index }) => {
    expect(getLevelProgress(minXp).level.index).toBe(index);
  });
  it.each([[1, 0], [2, 0], [3, 2], [6, 2], [7, 5], [13, 5], [14, 7], [29, 7], [30, 10], [99, 10]])("连续%d天bonus为%d", (streak, bonus) => {
    expect(checkInBonus(streak)).toBe(bonus);
  });
});
