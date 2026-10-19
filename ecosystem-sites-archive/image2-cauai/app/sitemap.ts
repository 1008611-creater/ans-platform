import { resolveImage2SiteUrl } from "@/lib/image2-site-target";
import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const image2SiteUrl = resolveImage2SiteUrl();
const sceneSiteUrl = "https://scene.lsb0713.online";
const pictureSiteUrl = "https://picture.lsb0713.online";
const sceneHosts = new Set(["scene.lsb0713.online"]);
const pictureHosts = new Set(["picture.lsb0713.online", "picture.localhost"]);

async function requestHost() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "";
  return host.split(":")[0].toLowerCase();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = await requestHost();
  const lastModified = new Date();

  if (sceneHosts.has(host)) {
    return [{ url: `${sceneSiteUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 }];
  }

  if (pictureHosts.has(host)) {
    return [{ url: `${pictureSiteUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 }];
  }

  // 案例详情已改为独立可索引页面（app/image2-cases/[code]/page.tsx）。
  // 只收录「有图 + 非可参考」的条目：无图页面内容单薄、低价值层会拉低整站质量判断。
  // 2026-10-06 前此处只收录 2 个入口页，导致 1569 条案例对搜索引擎完全不可见。
  const detailEntries = readIndex()
    .filter((item) => item.imageUrl && item.valueTier !== "可参考")
    .map((item) => ({
      url: `${image2SiteUrl}/image2-cases/${item.detailKey}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: item.featured ? 0.8 : 0.6
    }));

  return [
    { url: `${image2SiteUrl}/`, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${image2SiteUrl}/image2-cases`, lastModified, changeFrequency: "daily", priority: 0.9 },
    ...detailEntries
  ];
}

type SitemapCaseItem = {
  detailKey: string;
  imageUrl?: string;
  valueTier?: string;
  featured?: boolean;
};

function readIndex(): SitemapCaseItem[] {
  const file = path.join(process.cwd(), "public", "data", "image2-case-library.index.json");
  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
    return (parsed.cases || []) as SitemapCaseItem[];
  } catch {
    return [];
  }
}