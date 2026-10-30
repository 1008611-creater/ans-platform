// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clientMessagePaths, isCovered } from "../../../scripts/client-message-paths.mjs";
import { PUBLIC_PAGE_MESSAGE_PATHS, SITE_FRAME_MESSAGE_PATHS, pickMessages } from "@/i18n/client-messages";

const repoRoot = path.resolve(__dirname, "../../..");
const appRoot = path.join(repoRoot, "src/app");
const ROUTE_FILES = new Set(["page.tsx", "layout.tsx", "error.tsx", "not-found.tsx", "loading.tsx", "template.tsx", "default.tsx"]);
const ROOT_LAYOUT = path.join(appRoot, "layout.tsx");
const relative = (file: string) => path.relative(repoRoot, file).split(path.sep).join("/");
type Messages = { [key: string]: Messages | string };

/** Messages exactly as src/i18n/request.ts assembles them. */
function loadMessages(locale: "zh" | "en"): Messages {
  const request = fs.readFileSync(path.join(repoRoot, "src/i18n/request.ts"), "utf8");
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(repoRoot, "messages", file), "utf8")) as Messages;
  const messages = read(`${locale}.json`);
  for (const [, namespace, directory] of request.matchAll(/(\w+): \(await import\(`@\/\.\.\/messages\/([\w-]+)\/\$\{/g)) messages[namespace] = read(`${directory}/${locale}.json`);
  return messages;
}

function exists(messages: Messages, dotted: string) {
  let node: Messages | string | undefined = messages;
  for (const key of dotted.split(".")) node = typeof node === "object" ? node[key] : undefined;
  return node !== undefined;
}

function routeFiles(directory = appRoot): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "api" ? [] : routeFiles(full);
    return ROUTE_FILES.has(entry.name) && full !== ROOT_LAYOUT ? [full] : [];
  });
}

/**
 * Whether a layout gives its whole subtree every message: it re-exports the full-messages layout,
 * or its only return starts with <RouteMessages> (no paths). A layout that mentions RouteMessages any
 * other way could render client components outside the provider, so it is rejected outright.
 */
function providesAllMessages(layout: string) {
  const source = fs.readFileSync(layout, "utf8");
  if (!source.includes("@/components/providers/route-messages")) return false;
  if (/^export \{ default \} from "@\/components\/providers\/route-messages";\s*$/.test(source)) return true;
  const returns = source.match(/\breturn\b/g) ?? [];
  if (returns.length === 1 && /\breturn\s*\(?\s*<RouteMessages>/.test(source)) return true;
  throw new Error(`${relative(layout)}: wrap the whole layout in <RouteMessages> or re-export route-messages`);
}

/** The message provider that renders this route file: a full-messages layout, a page wrapper, or the site frame. */
function providedPaths(file: string): readonly string[] | "all" {
  for (let directory = path.dirname(file); directory !== appRoot; directory = path.dirname(directory)) {
    const layout = path.join(directory, "layout.tsx");
    if (fs.existsSync(layout) && providesAllMessages(layout)) return "all";
  }
  const page = fs.readFileSync(file, "utf8").match(/PUBLIC_PAGE_MESSAGE_PATHS\.(\w+)/);
  if (page) return PUBLIC_PAGE_MESSAGE_PATHS[page[1] as keyof typeof PUBLIC_PAGE_MESSAGE_PATHS];
  return SITE_FRAME_MESSAGE_PATHS;
}

describe("client message subsets", () => {
  const locales = [loadMessages("zh"), loadMessages("en")];

  it("lists only message paths that exist in both locales", () => {
    const listed = [...SITE_FRAME_MESSAGE_PATHS, ...Object.values(PUBLIC_PAGE_MESSAGE_PATHS).flat()];
    const missing = listed.filter(entry => locales.some(messages => !exists(messages, entry)));
    expect(missing).toEqual([]);
  });

  it("gives the site frame every message its client components read", () => {
    const needed = clientMessagePaths(["src/app/layout.tsx"]);
    const uncovered = [...needed].filter(([entry]) => !isCovered(entry, SITE_FRAME_MESSAGE_PATHS)).map(([entry, file]) => `${entry || "(all)"} ← ${file}`);
    expect(uncovered).toEqual([]);
  });

  it("gives every route file every message its client components read", () => {
    const uncovered: string[] = [];
    for (const file of routeFiles()) {
      const provided = providedPaths(file);
      if (provided === "all") continue;
      for (const [entry, reader] of clientMessagePaths([file])) {
        if (!isCovered(entry, provided)) uncovered.push(`${relative(file)}: ${entry || "(all)"} ← ${reader}`);
      }
    }
    expect(uncovered).toEqual([]);
  });

  it("keeps the public entry pages on trimmed messages", () => {
    const lean = ["page.tsx", "explore/page.tsx", "hubs/page.tsx", "community/page.tsx", "competitions/page.tsx", "market/page.tsx"];
    expect(lean.filter(file => providedPaths(path.join(appRoot, file)) === "all")).toEqual([]);
  });
});

describe("pickMessages", () => {
  it("copies listed dot paths with their nesting and skips unknown ones", () => {
    const messages = { a: { b: "1", c: { d: "2" } }, e: "3", f: { g: "4" } };
    expect(pickMessages(messages, ["a.c", "e", "f.missing", "x.y"])).toEqual({ a: { c: { d: "2" } }, e: "3", f: {} });
    expect(pickMessages(messages, ["a.b", "a.c.d"])).toEqual({ a: { b: "1", c: { d: "2" } } });
  });

  it("never writes into the source messages", () => {
    const messages = { a: { b: "1", c: { d: "2" } } };
    const snapshot = structuredClone(messages);
    pickMessages(messages, ["a", "a.b.x", "a.c.d", "a.c.e.f"]);
    expect(messages).toEqual(snapshot);
  });
});
