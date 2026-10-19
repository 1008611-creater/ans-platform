/**
 * Image2 站点目标地址解析。
 *
 * 只做一件事：把 NEXT_PUBLIC_IMAGE2_SITE_URL 解析成 URL 对象，配置缺失或非法时
 * 回退到默认新域。代理层与页面元信息都走这里，避免一个写错的环境变量让整站 500。
 *
 * 背景：本模块原先叫 legacy-storage-migration.ts，除地址解析外还带着一整套
 * 浏览器本地数据迁移工具（旧域导出 localStorage → 新域合并导入）。2026-10-06
 * 旧域整条迁移线作废、/migrate 页面撤除后，那套工具已无任何调用方（全仓库仅
 * proxy.ts 引用 resolveImage2SiteTarget），故只保留仍在使用的最小部分。
 */

export const DEFAULT_IMAGE2_SITE_URL = "https://image2.cauai.fun";

export function resolveImage2SiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_IMAGE2_SITE_URL;
  const raw = typeof configured === "string" && configured.trim() ? configured.trim() : DEFAULT_IMAGE2_SITE_URL;
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
      return DEFAULT_IMAGE2_SITE_URL;
    }
    return url.origin;
  } catch {
    return DEFAULT_IMAGE2_SITE_URL;
  }
}

export function resolveImage2SiteTarget(): URL {
  try {
    return new URL(resolveImage2SiteUrl());
  } catch {
    return new URL(DEFAULT_IMAGE2_SITE_URL);
  }
}
