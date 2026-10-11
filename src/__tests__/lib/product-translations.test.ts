import { describe, expect, it } from "vitest";
import zh from "../../../messages/product/zh.json";
import en from "../../../messages/product/en.json";

function textEntries(value: unknown, prefix = ""): [string, string][] {
  if (typeof value === "string") return [[prefix, value]];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => textEntries(child, prefix ? `${prefix}.${key}` : key));
}

describe("product translation integrity", () => {
  it("keeps Chinese and English product keys aligned", () => {
    expect(textEntries(zh).map(([key]) => key).sort()).toEqual(textEntries(en).map(([key]) => key).sort());
  });

  it.each([["zh", zh], ["en", en]] as const)("%s has readable copy, not encoding placeholders", (_locale, messages) => {
    for (const [key, value] of textEntries(messages)) {
      expect(value.trim(), key).not.toBe("");
      expect(value, key).not.toMatch(/\?{3,}|\uFFFD/);
    }
  });

  it("keeps interpolation fields consistent across product languages", () => {
    const english = new Map(textEntries(en));
    for (const [key, value] of textEntries(zh)) {
      const fields = (text: string) => [...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)[,}]/g)].map(match => match[1]).sort();
      expect(fields(value), key).toEqual(fields(english.get(key) ?? ""));
    }
  });
});
