import { resolveImage2SiteUrl } from "@/lib/image2-site-target";
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const image2SiteUrl = resolveImage2SiteUrl();
const sceneHosts = new Set(["scene.lsb0713.online"]);
const pictureHosts = new Set(["picture.lsb0713.online", "picture.localhost"]);

async function requestHost() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "";
  return host.split(":")[0].toLowerCase();
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = await requestHost();
  if (sceneHosts.has(host) || pictureHosts.has(host)) {
    // 同一次部署同时承载 scene 与 picture 两个独立站点：不替它们声明 image2 的站点地图，
    // 保持迁移前“没有 robots 限制”的抓取行为。
    return { rules: [{ userAgent: "*", allow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/migrate"]
      }
    ],
    sitemap: `${image2SiteUrl}/sitemap.xml`
  };
}