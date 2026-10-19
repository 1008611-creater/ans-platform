import { localizedCaseText } from "@/lib/image2-language";
import { publicCatalogError, publicCatalogResponse, readPublicCatalog, summarizePublicCase } from "@/lib/image2-public-catalog";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  const source = params.get("source");
  const category = params.get("category");
  const limitRaw = params.get("limit") ?? "24";
  const offsetRaw = params.get("offset") ?? "0";
  const limit = Number(limitRaw);
  const offset = Number(offsetRaw);
  if (q.length > 160 || (source?.length ?? 0) > 80 || (category?.length ?? 0) > 80 ||
      !/^\d+$/.test(limitRaw) || !/^\d+$/.test(offsetRaw) ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) {
    return publicCatalogError("参数无效：limit 为 1–50，offset 为 0–100000，搜索词最多 160 字符", 400);
  }
  try {
    const catalog = await readPublicCatalog();
    const tokens = q.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const cases = catalog.cases.filter((item) => {
      if (source && (item.sourceId ?? "canghe") !== source) return false;
      if (category && item.category !== category) return false;
      if (params.get("includeVariants") !== "1" && item.promptFamily?.primary === false) return false;
      const localized = localizedCaseText({ ...item, promptPreview: item.promptPreview ?? "" }, "zh");
      const text = [localized.title, localized.promptPreview, item.detailKey, item.title, item.categoryLabel, item.sourceLabel, item.sourceName,
        item.promptPreview, ...(item.styles ?? []), ...(item.styleLabels ?? []), ...(item.scenes ?? []), ...(item.sceneLabels ?? [])].join(" ").toLocaleLowerCase();
      return tokens.every((token) => text.includes(token));
    }).sort((a, b) => b.valueScore - a.valueScore || b.id - a.id);
    return publicCatalogResponse(request, {
      schemaVersion: "ans.image2-catalog.v1", total: cases.length, offset, limit,
      nextOffset: offset + limit < cases.length ? offset + limit : null,
      sources: catalog.sources ?? [],
      items: cases.slice(offset, offset + limit).map(summarizePublicCase)
    });
  } catch { return publicCatalogError("案例目录暂时不可用，请稍后重试", 503); }
}
