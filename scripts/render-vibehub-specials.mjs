import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { updateVibeProvenance } from "./update-vibehub-provenance.mjs";
const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
// The upstream changelog URL currently serves the frontend catalog as its SSR
// fallback. Render the reviewed local presentation instead of indexing that
// unrelated homepage as changelog content. No upstream runtime is executed.
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "ans-vibehub-specials-"));
try {
  const file = path.join(temporary, "changelog.cjs");
  await build({ entryPoints: ["src/app/vibe-hub/official/changelog.js"], bundle: true, platform: "node", format: "cjs", outfile: file, external: ["react", "react/jsx-runtime"], logLevel: "silent" });
  // Resolve React from this repository even though the temporary bundle lives
  // outside node_modules. The bundle is generated entirely from local sources.
  const Module = require("node:module");
  const compiled = new Module(file); compiled.filename = file; compiled.paths = Module._nodeModulePaths(process.cwd());
  compiled._compile(fs.readFileSync(file, "utf8"), file);
  const { ChangelogView } = compiled.exports;
  for (const locale of ["en", "zh"]) {
    const html = renderToStaticMarkup(React.createElement(ChangelogView, {locale, onOpenTerm() {}, onGoHome() {}}));
    if (!html.includes('class="changelog-page"') || html.includes('class="catalog-directory-page"')) throw new Error("Invalid changelog presentation");
    fs.writeFileSync(`src/data/vibehub/specials/${locale}/changelog.json`, JSON.stringify({ title: locale === "en" ? "Changelog" : "更新日志", html, sourceUrl: `https://vibe-hub.org${locale === "en" ? "/en" : ""}/changelog`, presentation: "Rendered from reviewed official ChangelogView; upstream SSR route returned the catalog fallback.", data: JSON.parse(fs.readFileSync("src/data/vibehub/updates.json", "utf8")) }));
  }
} finally {
  for (const entry of fs.readdirSync(temporary)) fs.unlinkSync(path.join(temporary, entry));
  fs.rmdirSync(temporary);
}
console.log("Rendered both official changelog snapshots.", updateVibeProvenance());
