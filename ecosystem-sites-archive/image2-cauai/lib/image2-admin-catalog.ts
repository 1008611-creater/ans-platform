import { readFile } from "fs/promises";
import path from "path";

export type Image2AdminCase = {
  caseKey: string;
  category: string;
  categoryLabel: string;
  featured: boolean;
  id: number;
  promptKind: string;
  promptPreview: string;
  sourceId: string;
  sourceName: string;
  sourceUrl?: string;
  styleLabels: string[];
  styles: string[];
  title: string;
  valueScore: number;
  valueTier: string;
};

export type Image2AdminCount = {
  label: string;
  value: string;
  count: number;
};

export type Image2AdminSource = {
  count: number;
  id: string;
  label: string;
  licenseNote: string;
  repository: string;
  site: string;
};

export type Image2AdminReviewItem = Image2AdminCase & {
  reasons: string[];
};

export type Image2AdminCatalog = {
  categories: Image2AdminCount[];
  cases: Image2AdminCase[];
  featuredCases: Image2AdminCase[];
  importedAt?: string;
  integrity: {
    belowReviewScore: number;
    missingPromptPreview: number;
    sourceRegistryCoverage: number;
    withoutSourceRegistry: number;
  };
  promptKinds: Image2AdminCount[];
  reviewItems: Image2AdminReviewItem[];
  scenes: Image2AdminCount[];
  sourceRadar: Array<{ id: string; label: string; note: string; status: string; url: string }>;
  sources: Image2AdminSource[];
  styles: Image2AdminCount[];
  totalCases: number;
};

type RawCase = {
  caseCode?: string;
  category?: string;
  categoryLabel?: string;
  detailKey?: string;
  featured?: boolean;
  id?: number;
  promptKind?: string;
  promptPreview?: string;
  scenes?: string[];
  sourceId?: string;
  sourceName?: string;
  sourceUrl?: string;
  styleLabels?: string[];
  styles?: string[];
  title?: string;
  valueScore?: number;
  valueTier?: string;
};

type RawCatalog = {
  cases?: RawCase[];
  categories?: Array<{ count?: number; label?: string; value?: string }>;
  importedAt?: string;
  sourceRadar?: Array<{ id?: string; label?: string; note?: string; status?: string; url?: string }>;
  sources?: Array<{
    count?: number;
    id?: string;
    label?: string;
    licenseNote?: string;
    repository?: string;
    site?: string;
  }>;
};

function toCountRows(values: string[], labels = new Map<string, string>()): Image2AdminCount[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const normalized = value.trim();
    if (normalized) counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: labels.get(value) ?? value, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-CN"));
}

function toCase(raw: RawCase): Image2AdminCase {
  const id = Number(raw.id ?? 0);
  const sourceId = raw.sourceId?.trim() || "unattributed";
  return {
    caseKey: raw.detailKey?.trim() || raw.caseCode?.trim() || `${sourceId}-${id}`,
    category: raw.category?.trim() || "Uncategorized",
    categoryLabel: raw.categoryLabel?.trim() || raw.category?.trim() || "未分类",
    featured: Boolean(raw.featured),
    id,
    promptKind: raw.promptKind?.trim() || "未标注",
    promptPreview: raw.promptPreview?.trim() || "",
    sourceId,
    sourceName: raw.sourceName?.trim() || sourceId,
    sourceUrl: raw.sourceUrl,
    styleLabels: raw.styleLabels ?? raw.styles ?? [],
    styles: raw.styles ?? [],
    title: raw.title?.trim() || `未命名案例 ${id}`,
    valueScore: Number(raw.valueScore ?? 0),
    valueTier: raw.valueTier?.trim() || "未分级"
  };
}

function clampPercent(numerator: number, denominator: number) {
  return denominator <= 0 ? 0 : Math.round((numerator / denominator) * 100);
}

export async function readImage2AdminCatalog(): Promise<Image2AdminCatalog> {
  const catalogPath = path.join(process.cwd(), "public", "data", "image2-case-library.index.json");
  const raw = JSON.parse(await readFile(catalogPath, "utf8")) as RawCatalog;
  const cases = (raw.cases ?? []).map(toCase).filter((item) => item.id > 0);
  const categoryLabels = new Map(
    (raw.categories ?? []).flatMap((item) => (item.value ? [[item.value, item.label || item.value] as const] : []))
  );
  const missingPromptPreview = cases.filter((item) => item.promptPreview.length === 0).length;
  const sourceIds = new Set((raw.sources ?? []).map((item) => item.id).filter((id): id is string => Boolean(id)));
  const withoutSourceRegistry = cases.filter((item) => !sourceIds.has(item.sourceId)).length;
  const belowReviewScore = cases.filter((item) => item.valueScore < 60).length;
  const reviewItems = cases
    .map((item) => ({
      ...item,
      reasons: [
        !item.promptPreview ? "索引未提供提示词摘要" : "",
        item.valueScore < 60 ? "价值评分低于本地复核阈值 60" : ""
      ].filter(Boolean)
    }))
    .map((item) => {
      if (!sourceIds.has(item.sourceId)) item.reasons.unshift("来源未映射到当前来源注册表");
      return item;
    })
    .filter((item) => item.reasons.length > 0)
    .sort((left, right) => right.reasons.length - left.reasons.length || left.valueScore - right.valueScore)
    .slice(0, 96);

  return {
    categories:
      raw.categories?.map((item) => ({
        value: item.value || "Uncategorized",
        label: item.label || item.value || "未分类",
        count: Number(item.count ?? 0)
      })) ?? toCountRows(cases.map((item) => item.category), categoryLabels),
    cases: [...cases].sort((left, right) => right.valueScore - left.valueScore || left.title.localeCompare(right.title, "zh-CN")),
    featuredCases: cases
      .filter((item) => item.featured)
      .sort((left, right) => right.valueScore - left.valueScore)
      .slice(0, 12),
    importedAt: raw.importedAt,
    integrity: {
      belowReviewScore,
      missingPromptPreview,
      sourceRegistryCoverage: clampPercent(cases.length - withoutSourceRegistry, cases.length),
      withoutSourceRegistry
    },
    promptKinds: toCountRows(cases.map((item) => item.promptKind)),
    reviewItems,
    scenes: toCountRows((raw.cases ?? []).flatMap((item) => item.scenes ?? [])),
    sourceRadar: (raw.sourceRadar ?? []).map((item) => ({
      id: item.id || "unknown",
      label: item.label || item.id || "未命名来源",
      note: item.note || "未提供来源说明",
      status: item.status || "未标注",
      url: item.url || ""
    })),
    sources: (raw.sources ?? []).map((item) => ({
      id: item.id || "unknown",
      label: item.label || item.id || "未命名来源",
      count: Number(item.count ?? 0),
      licenseNote: item.licenseNote || "未提供授权说明",
      repository: item.repository || "",
      site: item.site || ""
    })),
    styles: toCountRows(cases.flatMap((item) => item.styles)),
    totalCases: cases.length
  };
}
