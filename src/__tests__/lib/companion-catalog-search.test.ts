// @vitest-environment node
import { expect, it } from "vitest";
import type { CatalogProject } from "@/domain/catalog/projects";
import { publicProjectSummary, searchPublicProjects } from "@/server/companion/catalog-search";
function project(slug: string, title: string, summary = "公开说明", inputs = "提供素材"): CatalogProject {
  return { slug, category: "aigc", subcategory: "image", goal: "portfolio", preview: "site", source: "github",
    content: { zh: { title, summary, inputs, output: "作品", decisions: "选择样式", sample: "参考", model: "外部工具", prompt: "方法", skill: "方法", sourceNote: "来源" } } };
}
it("orders all-keyword title matches ahead of partial results and marks the difference", () => {
  const rows = searchPublicProjects([project("partial", "图像工具"), project("summary", "工具", "图像 开源"), project("title", "图像 开源")], "图像 开源", "zh");
  expect(rows.map(row => row.slug)).toEqual(["title", "summary", "partial"]);
  expect(rows[2].match).toBe("partial"); expect(rows[2].matchedTerms).toEqual(["图像"]);
});
it("normalizes case, fullwidth characters and punctuation-separated keywords", () => {
  expect(searchPublicProjects([project("kit", "GitHub IMAGE")], "ＧＩＴＨＵＢ，image", "en")[0].match).toBe("all_terms");
});
it("searches declared inputs and outputs and does not fabricate an unrelated match", () => {
  const item = project("kit", "修图", "说明", "上传照片");
  expect(searchPublicProjects([item], "照片", "zh")[0].slug).toBe("kit");
  expect(searchPublicProjects([item], "音乐", "zh")).toEqual([]);
});
it("keeps browse order for an empty query, limits results and skips untranslated entries", () => {
  const entries = Array.from({ length: 8 }, (_, index) => project("p-" + index, "素材"));
  expect(searchPublicProjects(entries, "", "zh").map(row => row.slug)).toEqual(["p-0", "p-1", "p-2", "p-3", "p-4"]);
  expect(searchPublicProjects([{ ...entries[0], content: undefined }], "", "zh")).toEqual([]);
});
it("selects English when supplied and bounds the published preparation fields", () => {
  const item = project("kit", "中文", "摘要", "输".repeat(1000));
  item.content!.en = { ...item.content!.zh, title: "English" };
  expect(publicProjectSummary(item, "en")?.title).toBe("English");
  expect(publicProjectSummary(item, "zh")?.input.length).toBe(400);
  expect(publicProjectSummary(item, "zh")?.executable).toBe(false);
});
