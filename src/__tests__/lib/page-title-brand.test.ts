import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The root layout already renders every title through `%s | ANS`. A page that
// appends its own "· ANS" shows "社区成长 · ANS | ANS" in the browser tab.
const ROOT = process.cwd();
const BRAND_SUFFIX = /(?:·|\||-)\s*ANS\s*$/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "vibe-hub" ? [] : sourceFiles(path);
    return /\.(tsx?|mts)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [path] : [];
  });
}

function strings(value: unknown, path: string[] = []): Array<[string, string]> {
  if (typeof value === "string") return [[path.join("."), value]];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, child]) => strings(child, [...path, key]));
  return [];
}

describe("page titles", () => {
  it("never repeat the brand suffix the root title template adds", () => {
    const offenders = sourceFiles(join(ROOT, "src/app")).flatMap(file =>
      readFileSync(file, "utf8").split("\n").flatMap((line, index) =>
        /\btitle\s*:/.test(line) && !/absolute/.test(line) && /·\s*ANS\b/.test(line) ? [`${relative(ROOT, file)}:${index + 1}`] : []));
    expect(offenders).toEqual([]);
  });

  it("keep translated title strings free of the brand suffix", () => {
    const offenders = ["zh", "en"].flatMap(locale =>
      strings(JSON.parse(readFileSync(join(ROOT, "messages", `${locale}.json`), "utf8")))
        .filter(([key, value]) => /title/i.test(key) && BRAND_SUFFIX.test(value))
        .map(([key]) => `${locale}:${key}`));
    expect(offenders).toEqual([]);
  });
});
