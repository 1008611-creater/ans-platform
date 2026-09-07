import { describe, expect, it } from "vitest";
import { LEVELS, LEVEL_PERKS, getLevelPerks, getLevelProgress, checkInBonus } from "@/lib/level";

describe("社区等级仅作纪念展示", () => {
  it("每一级perks只有纪念称号说明，不包含发布、审核或管理能力", () => {
    for (const level of LEVELS) {
      expect(LEVEL_PERKS[level.index].length).toBeGreaterThan(0);
      expect(LEVEL_PERKS[level.index].join(" ")).toContain("纪念称号");
      expect(LEVEL_PERKS[level.index].join(" ")).not.toMatch(/解锁|权限|发布|审核|管理|评审/);
    }
    expect(getLevelPerks(7)).toHaveLength(8);
  });
  it.each(LEVELS)("保持$nameZh阈值不变", ({ minXp, index }) => {
    expect(getLevelProgress(minXp).level.index).toBe(index);
  });
  it.each([[1, 0], [2, 0], [3, 2], [6, 2], [7, 5], [13, 5], [14, 7], [29, 7], [30, 10], [99, 10]])("连续%d天bonus为%d", (streak, bonus) => {
    expect(checkInBonus(streak)).toBe(bonus);
  });
});
