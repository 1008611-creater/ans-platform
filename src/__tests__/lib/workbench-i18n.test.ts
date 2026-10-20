// @vitest-environment node
import { expect, it } from "vitest";
import en from "../../../messages/workbench/en.json";
import zh from "../../../messages/workbench/zh.json";

const hasChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

it("工作模式中英词条一一对应", () => {
  const zhKeys = Object.keys(zh).sort();
  const enKeys = Object.keys(en).sort();
  expect(zhKeys.length).toBeGreaterThanOrEqual(96);
  expect(enKeys).toEqual(zhKeys);
});

it("英文词条非空且不残留中文", () => {
  const empty = Object.entries(en).filter(([, value]) => !String(value).trim()).map(([key]) => key);
  const chinese = Object.entries(en).filter(([, value]) => hasChinese(String(value))).map(([key]) => key);
  expect(empty).toEqual([]);
  expect(chinese).toEqual([]);
});

it("中文词条保留原文（英文是新增词条，不替换原文）", () => {
  const chinese = Object.entries(zh).filter(([, value]) => hasChinese(String(value))).map(([key]) => key);
  expect(chinese).toEqual(Object.keys(zh));
});
