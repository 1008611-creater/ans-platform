import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { resolveImage2SiteUrl } from "@/lib/image2-site-target";

export type PublicCase = {
  id: number;
  detailKey: string;
  sourceDetailKey?: string;
  caseCode?: string;
  title: string;
  category: string;
  categoryLabel: string;
  sourceId?: string;
  sourceLabel?: string;
  sourceName?: string;
  imageUrl?: string;
  promptPreview?: string;
  author?: string;
  model?: string;
  modelEvidence?: { status: string; note: string; tested: boolean };
  referenceRequired?: boolean;
  inputCompleteness?: string;
  imageStatus?: string;
  sourceLicense?: string;
  imageRoles?: Array<{ url: string; role: string }>;
  valueScore: number;
  valueTier: string;
  promptFamily?: { primary?: boolean };
  styles?: string[];
  styleLabels?: string[];
  scenes?: string[];
  sceneLabels?: string[];
};
type Catalog = {
  importedAt?: string;
  licenseNote?: string;
  sources?: Array<{ id: string; label: string; licenseNote?: string }>;
  cases: PublicCase[];
};
type PublicDetail = {
  sourceRecord?: Record<string, unknown>;
  sourceRights?: Record<string, unknown>;
  sourceFile?: string;
  sourceSnapshotHash?: string;
  upstreamRevision?: string;
  collectedAt?: string;
  imageRoles?: Array<{ url: string; role: string; label?: string }>;
  prompt?: string;
  sourceUrl?: string;
  githubUrl?: string;
  sourceNote?: string;
  riskNote?: string;
  promptStructure?: Record<string, string>;
  reuseProfile?: Record<string, unknown>;
  replicationGuide?: Record<string, unknown>;
};
const dataRoot = path.join(process.cwd(), "public", "data");
let cached: { revision: string; catalog: Catalog } | undefined;

export async function readPublicCatalog(): Promise<Catalog> {
  const file = path.join(dataRoot, "image2-case-library.index.json");
  const info = await stat(file);
  const revision = `${info.mtimeMs}:${info.size}`;
  if (cached?.revision === revision) return cached.catalog;
  const catalog = JSON.parse((await readFile(file, "utf8")).replace(/^\uFEFF/, "")) as Catalog;
  if (!Array.isArray(catalog.cases)) throw new Error("Public catalog unavailable");
  cached = { revision, catalog };
  return catalog;
}

export function summarizePublicCase(item: PublicCase) {
  const site = resolveImage2SiteUrl();
  return {
    key: item.detailKey, id: item.id, title: item.title,
    category: item.category, categoryLabel: item.categoryLabel,
    sourceId: item.sourceId ?? "canghe", sourceLabel: item.sourceLabel ?? item.sourceName,
    imageUrl: item.imageUrl ? new URL(item.imageUrl, site).toString() : null,
    promptPreview: item.promptPreview ?? "", valueScore: item.valueScore, valueTier: item.valueTier,
    author: item.author ?? null, sourceModel: item.model ?? null, imageStatus: item.imageStatus ?? null,
    caseUrl: `${site}/image2-cases/${encodeURIComponent(item.detailKey)}`,
    packUrl: `${site}/api/integrations/ans/cases/${encodeURIComponent(item.detailKey)}`
  };
}

export async function readAnsCasePack(key: string) {
  // Both syntactic validation and index membership are required before any detail-file access.
  if (!/^[a-zA-Z0-9_-]{1,180}$/.test(key)) return null;
  const catalog = await readPublicCatalog();
  const item = catalog.cases.find((entry) => entry.detailKey === key || entry.sourceDetailKey === key || entry.caseCode === key || String(entry.id) === key);
  if (!item) return null;
  let detail: PublicDetail;
  try {
    detail = JSON.parse((await readFile(path.join(dataRoot, "image2-cases", `${item.detailKey}.json`), "utf8")).replace(/^\uFEFF/, "")) as PublicDetail;
  } catch { throw new Error("Published case detail unavailable"); }
  const source = catalog.sources?.find((entry) => entry.id === (item.sourceId ?? "canghe"));
  return {
    schemaVersion: "ans.image2-case.v1",
    kind: "image2-case-reference",
    catalogImportedAt: catalog.importedAt ?? null,
    case: summarizePublicCase(item),
    prompt: { original: detail.prompt ?? "", structure: detail.promptStructure ?? {}, rewritten: null },
    provenance: {
      sourceUrl: detail.sourceUrl ?? null, repositoryUrl: detail.githubUrl ?? null,
      sourceNote: detail.sourceNote ?? null, riskNote: detail.riskNote ?? null,
      sourceRecord: detail.sourceRecord ?? null, sourceRights: detail.sourceRights ?? null,
      sourceFile: detail.sourceFile ?? null, sourceSnapshotHash: detail.sourceSnapshotHash ?? null,
      upstreamRevision: detail.upstreamRevision ?? null, collectedAt: detail.collectedAt ?? null,
      promptProvenance: (item as PublicCase & { promptProvenance?: string }).promptProvenance ?? "unknown",
      licenseNote: item.sourceLicense ?? source?.licenseNote ?? catalog.licenseNote ?? "授权范围以原始来源为准"
    },
    referenceImages: (detail.imageRoles ?? item.imageRoles ?? []).filter(image => image.role === 'reference'),
    outputImages: (detail.imageRoles ?? item.imageRoles ?? []).filter(image => image.role === 'output'),
    comparisonImages: (detail.imageRoles ?? item.imageRoles ?? []).filter(image => image.role === 'comparison'),
    modelEvidence: item.modelEvidence ?? { status: 'not-confirmed', tested: false },
    inputRequirements: { required: item.referenceRequired ?? null, completeness: item.inputCompleteness ?? 'unknown' },
    reuseProfile: detail.reuseProfile ?? {},
    replicationGuide: detail.replicationGuide ?? {},
    generationPreference: { provider: "McGrox", model: "gpt-image-2.5-sunburst", verified: false },
    review: { status: "candidate", inspectedOriginal: false },
    importBehavior: { visibility: "private", executeGeneration: false }
  };
}

export function publicCatalogResponse(request: Request, value: unknown, filename?: string) {
  const body = `${JSON.stringify(value)}\n`;
  const etag = `"${createHash("sha256").update(body).digest("hex")}"`;
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600", ETag: etag
  });
  if (filename) headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  if (request.headers.get("if-none-match")?.split(",").some((value) => value.trim().replace(/^W\//, "") === etag || value.trim() === "*")) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { headers });
}

export function publicCatalogError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
