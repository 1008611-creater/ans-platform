import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CATALOG_PROJECTS } from "../src/domain/catalog/projects";

type Repository = { full_name: string; html_url: string; archived: boolean; disabled: boolean; pushed_at: string | null; license: { spdx_id: string } | null };
async function main() {
  const outputFlag = process.argv.indexOf("--output");
  const outputPath = outputFlag >= 0 ? process.argv[outputFlag + 1] : undefined;
  if (outputFlag >= 0 && !outputPath) throw new Error("--output requires a path");
  const checkedAt = new Date().toISOString();
  const reports = [];
  // Read-only source review. Never publish, install code, execute a project or alter listings.
  for (const project of CATALOG_PROJECTS.filter(item => item.source === "github" && item.sourceUrl)) {
    const source = new URL(project.sourceUrl!);
    const [owner, name] = source.pathname.split("/").filter(Boolean);
    if (!owner || !name) continue;
    const repositoryUrl = `https://github.com/${owner}/${name.replace(/\.git$/, "")}`;
    try {
      const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "ANS-source-review" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        reports.push({ slug: project.slug, sourceUrl: project.sourceUrl, checkedAt, status: "REVIEW", reasons: [`HTTP_${response.status}`] });
        if (response.status === 403 || response.status === 429) break;
        continue;
      }
      const repo = await response.json() as Repository;
      const reasons = [
        ...(repo.archived ? ["ARCHIVED"] : []),
        ...(repo.disabled ? ["DISABLED"] : []),
        ...(repo.html_url.toLowerCase() !== repositoryUrl.toLowerCase() ? ["SOURCE_MOVED"] : []),
        ...(!repo.license || repo.license.spdx_id === "NOASSERTION" ? ["READ_CUSTOM_LICENSE"] : []),
      ];
      reports.push({ slug: project.slug, sourceUrl: project.sourceUrl, checkedAt, status: reasons.length ? "REVIEW" : "SOURCE_READ", canonicalUrl: repo.html_url, archived: repo.archived, license: repo.license?.spdx_id ?? null, pushedAt: repo.pushed_at, reasons });
    } catch {
      reports.push({ slug: project.slug, sourceUrl: project.sourceUrl, checkedAt, status: "REVIEW", reasons: ["REQUEST_FAILED"] });
    }
  }
  const report = { checkedAt, scope: "Public GitHub metadata only; no installation, runtime, link-interaction or license interpretation", requested: CATALOG_PROJECTS.filter(item => item.source === "github" && item.sourceUrl).length, checked: reports.length, entries: reports };
  const json = JSON.stringify(report, null, 2) + "\n";
  if (outputPath) await writeFile(resolve(outputPath), json, "utf8");
  else process.stdout.write(json);
}
main().catch(() => { console.error("Source review could not finish."); process.exitCode = 1; });
