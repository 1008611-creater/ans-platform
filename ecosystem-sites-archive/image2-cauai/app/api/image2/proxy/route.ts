import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const allowedHosts = new Set([
  "gpt-image2.canghe.ai",
  "raw.githubusercontent.com",
  "cms-assets.youmind.com",
  "morphic.com",
  // morphic.com 的图片会 308 到自己的 CDN，逐跳校验下必须显式放行，
  // 否则该来源 40 条案例的图片全部 404（原实现自动跟随重定向时能显示）。
  "external-cdn.morphic.com",
  "imgv3.fotor.com",
  "cdnblog.picsart.com",
  "github.com",
  // GitHub user-attachments（/user-attachments/assets/*）会 302 到这个 S3 域。
  // 桶名由 GitHub 占用，第三方无法注册同名桶；若 GitHub 更换分片号需同步更新，
  // 否则这批图片会被逐跳校验拒绝（宁可图挂，也不放开任意重定向目标）。
  "github-production-user-asset-6210df.s3.amazonaws.com",
  "user-gen-media-assets.s3.amazonaws.com",
  "api.image2studio.com",
  "pbs.twimg.com",
  "pub-62cf7640cd0f4066b60933bd2e9b85ef.r2.dev"
]);

const maxBytes = 12 * 1024 * 1024;
const fetchTimeoutMs = 15_000;
const maxRedirects = 3;
const imageCacheHeader = "public, max-age=14400, s-maxage=604800, stale-while-revalidate=2592000";

// 只代理栅格图。显式排除 SVG（可内嵌脚本）等非栅格类型。
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif"
]);

// 源站未声明类型或只给通用二进制类型时，允许按扩展名兜底判断；
// 但扩展名无法确认为栅格图时必须拒绝，不能"缺头就假装成 jpeg"。
const unknownMimeTypes = new Set(["", "application/octet-stream", "binary/octet-stream"]);

// 白名单校验：仅 https、仅标准端口、无 userinfo、主机名精确匹配。
// 校验主机名时若不限制端口，`https://host:8443` 会绕过白名单；userinfo 也应拒绝。
function parseAllowedUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port !== "" && url.port !== "443") return null;
  if (!allowedHosts.has(url.hostname.toLowerCase())) return null;
  return url;
}

function extensionContentType(pathname: string): string | null {
  const lower = pathname.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".avif")) return "image/avif";
  return null;
}

// 逐跳校验重定向目标。fetch 默认自动跟随会把请求带到白名单之外的地址（SSRF），
// 所以改为手动模式，每一跳都重新走白名单校验，超出跳数上限即拒绝。
async function fetchImageWithGuard(startUrl: URL): Promise<Response | null> {
  let current = startUrl;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), fetchTimeoutMs);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent": "image2-case-library/1.0"
        },
        cache: "no-store"
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => {});
      if (!location) return null;
      let nextUrl: URL | null;
      try {
        nextUrl = parseAllowedUrl(new URL(location, current).toString());
      } catch {
        nextUrl = null;
      }
      if (!nextUrl) return null;
      current = nextUrl;
      continue;
    }

    return response;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url") ?? "";
  const sourceUrl = parseAllowedUrl(source);
  if (!sourceUrl) {
    return NextResponse.json({ error: "图片来源不可用。" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  let response: Response | null;
  try {
    response = await fetchImageWithGuard(sourceUrl);
  } catch {
    return NextResponse.json({ error: "图片读取超时。" }, { status: 504, headers: { "Cache-Control": "no-store" } });
  }
  if (!response) {
    return NextResponse.json({ error: "图片来源不可用。" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    return NextResponse.json({ error: "图片暂时不可用。" }, { status: response.status === 404 ? 404 : 502, headers: { "Cache-Control": "no-store" } });
  }

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel().catch(() => {});
    // 声明体积已超上限：回退为直连原图，而不是 413（与下方流式超限处理一致）。
    // 这里必须一并改，否则声明了 content-length 的超大图会在读取前就被拦下。
    return NextResponse.redirect(sourceUrl, {
      status: 302,
      headers: { "Cache-Control": "public, max-age=3600" }
    });
  }

  const rawType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  let contentType: string | null;
  if (allowedMimeTypes.has(rawType)) {
    contentType = rawType;
  } else if (unknownMimeTypes.has(rawType)) {
    contentType = extensionContentType(sourceUrl.pathname);
  } else {
    contentType = null;
  }
  if (!contentType) {
    await response.body?.cancel().catch(() => {});
    return NextResponse.json({ error: "图片格式不可用。" }, { status: 415, headers: { "Cache-Control": "no-store" } });
  }

  // 流式读取并即时计数：源站不声明或伪造 content-length 时，不能先把整个响应读进内存再判断。
  const reader = response.body?.getReader();
  if (!reader) {
    return NextResponse.json({ error: "图片暂时不可用。" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  // 读取阶段单独计时：fetch 返回不代表 body 已到齐，源站可以慢速发送把连接挂住。
  let readTimedOut = false;
  const readTimer = setTimeout(() => {
    readTimedOut = true;
    void reader.cancel().catch(() => {});
  }, fetchTimeoutMs);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        // 超过上限时回退为直连原图，而不是返回 413。
        // 413 会让这张图在页面上永久显示不出来（实测：wuyoscar W121 原图 14.7 MiB）。
        // 302 让浏览器自行取原图，代理不再承担这份流量，上限值也不必放宽。
        // 目标仍是我们刚校验过的地址，未新增任何白名单外主机。
        return NextResponse.redirect(sourceUrl, {
          status: 302,
          headers: { "Cache-Control": "public, max-age=3600" }
        });
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => {});
    return NextResponse.json({ error: "图片暂时不可用。" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  } finally {
    clearTimeout(readTimer);
  }

  if (readTimedOut) {
    return NextResponse.json({ error: "图片读取超时。" }, { status: 504, headers: { "Cache-Control": "no-store" } });
  }
  if (total === 0) {
    return NextResponse.json({ error: "图片暂时不可用。" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  const buffer = Buffer.concat(chunks, total);
  return new NextResponse(buffer, {
    headers: {
      "Cache-Control": imageCacheHeader,
      "Content-Length": String(buffer.byteLength),
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff"
    }
  });
}
