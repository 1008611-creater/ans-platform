// @vitest-environment node
import { expect, it } from "vitest";
import { SHOWCASE_MOOD_PRESETS } from "@/components/mascot/companion-sanctuary-presets";

const presets = Object.entries(SHOWCASE_MOOD_PRESETS);
const hasChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

it("每个心情/互动预设都带英文台词与英文状态小标", () => {
  expect(presets.length).toBeGreaterThanOrEqual(41);
  const missing = presets.filter(([, preset]) => !preset.textEn || !preset.subEn).map(([key]) => key);
  expect(missing).toEqual([]);
});

it("英文台词不残留中文（emoji 与符号允许）", () => {
  const bad = presets
    .filter(([, preset]) => hasChinese(preset.textEn ?? "") || hasChinese(preset.subEn ?? ""))
    .map(([key]) => key);
  expect(bad).toEqual([]);
});

it("中文原文仍然保留（英文是新增字段，不替换原文）", () => {
  const chinese = presets.filter(([, preset]) => hasChinese(preset.text)).length;
  expect(chinese).toBe(presets.length);
});
