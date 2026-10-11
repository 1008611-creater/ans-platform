import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export function updateVibeProvenance() {
  const root = process.cwd();
  const data = path.join(root, "src/data/vibehub");
  const destination = path.join(data, "provenance.json");
  const previous = fs.existsSync(destination) ? JSON.parse(fs.readFileSync(destination, "utf8")) : { source: "https://vibe-hub.org" };
  function files(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? files(target) : [target];
    });
  }
  const all = [...files(data).filter(file => file.endsWith(".json") && file !== destination), ...files(path.join(root, "public/vibe-hub/source")), ...files(path.join(root, "src/app/vibe-hub/official"))].sort();
  const catalog = JSON.parse(fs.readFileSync(path.join(data, "catalog.json"), "utf8"));
  const practiceCount = files(path.join(data, "lessons/en")).filter(file => JSON.parse(fs.readFileSync(file, "utf8")).data?.lessonPractice).length;
  const hashes = Object.fromEntries(all.map(file => [path.relative(root, file).replaceAll("\\", "/"), createHash("sha256").update(fs.readFileSync(file)).digest("hex")]));
  fs.writeFileSync(destination, JSON.stringify({ ...previous, assembledAt: new Date().toISOString(), termCount: catalog.entries.length, practiceCount, files: hashes, note: "Public official content snapshot. Original illustrations, pronunciation recordings, and reviewed React presentation logic are preserved; ANS owns routing, content APIs, and favorites. The missing upstream /assets/logo.png reference uses the official VibeHub logo." }));
  return { terms: catalog.entries.length, practiceCount, files: all.length };
}