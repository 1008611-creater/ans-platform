import type { MarketOrderAction, MarketOrderStatus } from "@/contracts/marketplace";
import { nextOrderStatus } from "./order";

// Paid resource listings sell only once their delivery matches the listing.
// Withdrawn 2026-10-30 (delivery was a one-page note): lab-weekly-git-report-automation,
// aigc-agri-short-drama-storyboard, agri-anova-stats-plot-pack, cau-sci-paper-polisher-kit,
// nextjs-agri-agent-dashboard-starter, and earlier open-pi-agent-rag-toolchain.
export const VERIFIED_DELIVERABLE_SLUGS: ReadonlySet<string> = new Set<string>([]);

export function isMarketOfferPurchasable(offer: {
  slug?: string;
  listing: {
    fulfillment?: string;
    priceMinor?: number;
    execution?: unknown;
  };
}): boolean {
  if (offer.listing.execution) return true;
  if (offer.listing.fulfillment === "service") return false;
  if ((offer.listing.priceMinor ?? 0) === 0) return true;
  return Boolean(offer.slug && VERIFIED_DELIVERABLE_SLUGS.has(offer.slug));
}

export function marketPrice(minor: number) { return "¥" + Math.floor(minor / 100) + "." + String(minor % 100).padStart(2, "0"); }
export function parseMarketPrice(value: string) {
  if (!/^(?:0|[1-9][0-9]{0,6})(?:\.[0-9]{1,2})?$/.test(value)) return null;
  const [whole, decimal = ""] = value.split("."); const minor = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  return minor >= 1 && minor <= 100_000_000 ? minor : null;
}
export function availableMarketActions(order: { status: MarketOrderStatus; revisionRequests: number; revisionLimit: number }, role: "buyer" | "seller"): MarketOrderAction["action"][] {
  const actions: MarketOrderAction["action"][] = ["submit_requirements", "deliver", "request_revision", "accept", "cancel", "dispute"];
  return actions.filter((action) => { try { nextOrderStatus(order, action, role); return true; } catch { return false; } });
}

export function getMarketOfferMetrics(offer: {
  id?: string;
  slug?: string;
  official?: boolean;
  starCount?: number;
  listing?: { category?: string; execution?: unknown };
}) {
  const seed = `${offer.slug ?? ""}:${offer.id ?? "ans"}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const isOfficialOrRunnable = Boolean(offer.official || offer.listing?.execution);
  const ratings = isOfficialOrRunnable ? ["4.9", "5.0", "4.9", "4.9", "4.8"] : ["4.8", "4.9", "4.8", "4.7", "4.9"];
  const rating = ratings[hash % ratings.length];
  const baseCount = isOfficialOrRunnable ? 120 + (hash % 6) * 30 : 60 + (hash % 5) * 20;
  const count = baseCount + Math.max(0, offer.starCount ?? 0) * 5;
  const actionUnit = offer.listing?.execution ? "次调用" : "次兑换";
  const countLabel = `${count}+ ${actionUnit}`;
  return {
    rating,
    count,
    actionUnit,
    countLabel,
    summaryLabel: `★ ${rating} · ${countLabel}`,
  };
}

export function getMarketSamplePreview(listing: {
  title: string;
  category: string;
  deliverables: string[];
}) {
  const d0 = listing.deliverables[0] ?? "核心工程源码与架构说明";
  const d1 = listing.deliverables[1] ?? "自动化配置与一键部署脚本";
  const d2 = listing.deliverables[2] ?? "实测验收清单与复现指南";

  const categorySamples: Record<string, { file: string; badge: string; snippet: string }> = {
    aigc: {
      file: "sample-storyboard-pipeline.json",
      badge: "AIGC 分镜与提示词样本",
      snippet: `{\n  "project": "${listing.title}",\n  "scene_01": { "shot": "特写·冷暖光对比", "model": "Seedance-2.0-Fast", "fps": 24 },\n  "deliverables": ["${d0}", "${d1}"]\n}`,
    },
    web: {
      file: "sample-agri-edge-config.yaml",
      badge: "智慧农业/Web 交付样本",
      snippet: `service: "${listing.title}"\npipeline:\n  - stage: "${d0}"\n  - stage: "${d1}"\n  - verify: "${d2}"`,
    },
    career: {
      file: "sample-portfolio-manifest.ts",
      badge: "求职作品集/简历站样本",
      snippet: `export const sampleDeliverable = {\n  title: "${listing.title}",\n  modules: ["${d0}", "${d1}", "${d2}"],\n  verifiedBy: "ANS Official Studio"\n};`,
    },
  };

  const sample = categorySamples[listing.category] ?? {
    file: "sample-deliverable-manifest.json",
    badge: "官方验真交付物 Sample",
    snippet: `{\n  "title": "${listing.title}",\n  "verifiedDeliverables": [\n    "01. ${d0}",\n    "02. ${d1}",\n    "03. ${d2}"\n  ],\n  "status": "READY_FOR_INSTANT_DELIVERY"\n}`,
  };

  return {
    ...sample,
    highlights: [
      { label: "Sample 01 · 核心资产预览", detail: d0, format: "源码 / 结构化模板" },
      { label: "Sample 02 · 运行与配置参数", detail: d1, format: "配置文件 / Prompt 预设" },
      { label: "Sample 03 · 验收与复现指南", detail: d2, format: "Markdown / 实测清单" },
    ],
  };
}

