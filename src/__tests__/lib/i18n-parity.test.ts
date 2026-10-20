// @vitest-environment node
import { expect, it } from "vitest";
import zhCompanion from "../../../messages/companion/zh.json";
import enCompanion from "../../../messages/companion/en.json";
import zhProduct from "../../../messages/product/zh.json";
import enProduct from "../../../messages/product/en.json";

/** 把嵌套词条拍平成 path -> 文案。 */
function flatten(value: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, child] of Object.entries((value ?? {}) as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object") {
      for (const [nested, text] of flatten(child, path)) out.set(nested, text);
    } else {
      out.set(path, String(child));
    }
  }
  return out;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

/**
 * 已知且有意的差异：英文不重复中文目录里的 specialQuote（那串数据本身只有中文）。
 * 新增差异必须显式加到这里，并在同一个 PR 里说明原因。
 */
const ALLOWED_PLACEHOLDER_DIFFS = new Map([["bar.wardrobeEquippedItem", "英文刻意不带 {quote}：该字段是中文目录数据"]]);

const namespaces = [
  ["companion", zhCompanion, enCompanion],
  ["product", zhProduct, enProduct],
] as const;

it.each(namespaces)("%s：zh/en 键一一对应", (_name, zh, en) => {
  const zhKeys = flatten(zh);
  const enKeys = flatten(en);
  const missingInEn = [...zhKeys.keys()].filter(key => !enKeys.has(key));
  const missingInZh = [...enKeys.keys()].filter(key => !zhKeys.has(key));
  expect({ missingInEn: missingInEn.slice(0, 10), missingInZh: missingInZh.slice(0, 10) }).toEqual({ missingInEn: [], missingInZh: [] });
});

it.each(namespaces)("%s：同名键的占位符一致（除已登记的有意差异）", (_name, zh, en) => {
  const zhKeys = flatten(zh);
  const enKeys = flatten(en);
  const diffs: string[] = [];
  for (const [key, text] of zhKeys) {
    if (!enKeys.has(key)) continue;
    const a = placeholders(text).join(",");
    const b = placeholders(enKeys.get(key)!).join(",");
    if (a !== b && !ALLOWED_PLACEHOLDER_DIFFS.has(key)) diffs.push(`${key}: zh={{${a}}} en={{${b}}}`);
  }
  expect(diffs.slice(0, 10)).toEqual([]);
});

it("keeps the allowlist honest: every listed key is still a real difference", () => {
  const zhKeys = flatten(zhCompanion);
  const enKeys = flatten(enCompanion);
  for (const key of ALLOWED_PLACEHOLDER_DIFFS.keys()) {
    // 该键可能还没合入当前分支（例如条目先在栈里引入）——那时跳过，等它出现后这条断言会自动生效。
    if (!zhKeys.has(key)) continue;
    expect(placeholders(zhKeys.get(key)!).join(","), `${key} 的占位符已一致，请从 allowlist 删除`).not.toBe(placeholders(enKeys.get(key) ?? "").join(","));
  }
});
