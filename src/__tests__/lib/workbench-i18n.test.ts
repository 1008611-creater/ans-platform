// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import en from "../../../messages/workbench/en.json";
import zh from "../../../messages/workbench/zh.json";

const hasChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

function flatten(source: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") Object.assign(out, flatten(value, path));
    else out[path] = String(value);
  }
  return out;
}

const zhFlat = flatten(zh);
const enFlat = flatten(en);

it("工作模式中英词条一一对应", () => {
  expect(Object.keys(zhFlat).length).toBeGreaterThanOrEqual(96);
  expect(Object.keys(enFlat).sort()).toEqual(Object.keys(zhFlat).sort());
});

it("英文词条非空且不残留中文", () => {
  const empty = Object.entries(enFlat).filter(([, value]) => !value.trim()).map(([key]) => key);
  const chinese = Object.entries(enFlat).filter(([, value]) => hasChinese(value)).map(([key]) => key);
  expect(empty).toEqual([]);
  expect(chinese).toEqual([]);
});

it("中文词条保留原文（英文是新增词条，不替换原文）", () => {
  // 绝大多数词条应当是中文原文；少数是纯格式串（如 "[{p1}] {p2} · +{p3} -{p4}"、"[agent.write_artifact] {p1} …"），
  // 它们的中文部分由引用的子词条提供，本身不含汉字。
  const entries = Object.entries(zhFlat);
  const chinese = entries.filter(([, value]) => hasChinese(value));
  expect(chinese.length / entries.length).toBeGreaterThan(0.9);
  expect(entries.filter(([, value]) => !value.trim())).toEqual([]);
});

it("组件里用到的每一个 workbench 词条都能解析到（含嵌套路径）", () => {
  const source = readFileSync(join(process.cwd(), "src/components/workspace/display-name-editor.tsx"), "utf8");
  // 只认独立的 w("…") 调用，别把 pickWorkflow("code") 这类以 w 结尾的函数名也算进来。
  const used = [...new Set([...source.matchAll(/(?<![\w.$])w\("([^"]+)"\)/g)].map(match => match[1]))].sort();
  expect(used.length).toBeGreaterThanOrEqual(90);
  const unresolvedZh = used.filter(key => !(key in zhFlat));
  const unresolvedEn = used.filter(key => !(key in enFlat));
  expect(unresolvedZh).toEqual([]);
  expect(unresolvedEn).toEqual([]);
});
