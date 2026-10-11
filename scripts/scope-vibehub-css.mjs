import { updateVibeProvenance } from "./update-vibehub-provenance.mjs";
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

const directory = path.join(process.cwd(), "public/vibe-hub/source");
const files = fs.readdirSync(directory).filter((name) => name.endsWith(".css") && name !== "scoped.css");
const ordered = JSON.parse(fs.readFileSync(path.join(directory, "stylesheets.json"), "utf8"));
const names = [...new Set([...ordered.filter((name) => files.includes(name)), ...files.sort()])];
const scope = ".vibehub-source";
const output = [];
const localizeUrl = async (value) => {
  const urls = [...value.matchAll(/url\(\s*["']?([^\)"']+)["']?\s*\)/g)];
  for (const match of urls) {
    const original = match[1];
    if (!original.startsWith("/") && !original.startsWith("https://")) continue;
    const url = new URL(original, "https://vibe-hub.org");
    if (url.hostname !== "vibe-hub.org") continue;
    const name = path.basename(url.pathname);
    const target = path.join(directory, "media", name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Asset request failed: ${url.pathname} (${response.status})`);
      fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    }
    value = value.replace(match[0], `url("/vibe-hub/source/media/${name}")`);
  }
  return value;
};

for (const name of names) {
  const root = postcss.parse(fs.readFileSync(path.join(directory, name), "utf8"));
  const declarations = [];
  root.walkDecls((declaration) => { if (declaration.value.includes("url(")) declarations.push(declaration); });
  for (const declaration of declarations) declaration.value = await localizeUrl(declaration.value);
  root.walkRules((rule) => {
    let parent = rule.parent;
    while (parent) {
      if (parent.type === "atrule" && /keyframes$/i.test(parent.name)) return;
      parent = parent.parent;
    }
    rule.selector = selectorParser((selectors) => {
      selectors.each((selector) => {
        let scoped = false;
        selector.walk((node) => {
          if ((node.type === "pseudo" && node.value === ":root") || (node.type === "tag" && ["html", "body"].includes(node.value))) {
            node.replaceWith(selectorParser.className({ value: "vibehub-source" }));
            scoped = true;
          }
        });
        if (!scoped) {
          selector.prepend(selectorParser.combinator({ value: " " }));
          selector.prepend(selectorParser.className({ value: "vibehub-source" }));
        }
      });
    }).processSync(rule.selector);
  });
  output.push(root.toString());
}
fs.writeFileSync(path.join(directory, "scoped.css"), (output.join("\n") + "\n" + fs.readFileSync(path.join(process.cwd(), "src/app/vibe-hub/vibe-hub.css"), "utf8")).replaceAll("\r\n", "\n").replace(/[ \t]+$/gm, ""));
console.log(`Scoped ${names.length} upstream stylesheets and localized their media URLs.`);

updateVibeProvenance();
