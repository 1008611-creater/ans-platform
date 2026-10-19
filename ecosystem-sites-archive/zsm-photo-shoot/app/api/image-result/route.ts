import { NextResponse } from "next/server";
import {
  getDeliveryExpiry,
  getDeliveryFallbackContentType,
  getDeliverySource,
  lookupDelivery,
  MAX_DELIVERY_BYTES,
} from "../../lib/server/result-registry";

export const runtime = "nodejs";

function responseHeaders(contentType: string, download: boolean, token: string): Headers {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Content-Type": contentType,
  });
  if (download) headers.set("Content-Disposition", `attachment; filename="zsm-result-${token.slice(0, 8)}.webp"`);
  return headers;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  const download = url.searchParams.get("download") === "1";
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return NextResponse.json({ error: { code: "INVALID_RESULT_TOKEN", message: "结果链接无效。" } }, { status: 400 });
  }

  const lookup = lookupDelivery(token);
  if (lookup.state !== "ready") {
    return NextResponse.json({ error: { code: "RESULT_EXPIRED", message: "结果链接已过期或服务已重启，请重新生成。" } }, { status: 410 });
  }
  if (getDeliveryExpiry(lookup.record) <= Date.now()) {
    return NextResponse.json({ error: { code: "RESULT_EXPIRED", message: "结果链接已过期，请重新生成。" } }, { status: 410 });
  }

  const source = getDeliverySource(lookup.record);
  if (source.kind === "base64") {
    const bytes = Buffer.from(source.value, "base64");
    if (bytes.byteLength > MAX_DELIVERY_BYTES) {
      return NextResponse.json({ error: { code: "RESULT_TOO_LARGE", message: "结果文件超过临时交付大小限制。" } }, { status: 413 });
    }
    return new Response(bytes, { headers: responseHeaders(getDeliveryFallbackContentType(lookup.record), download, token) });
  }

  try {
    const upstream = await fetch(source.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: { code: "RESULT_UNAVAILABLE", message: "临时图片已失效，请重新生成。" } }, { status: 502 });
    }
    const length = Number(upstream.headers.get("content-length") || 0);
    if (length > MAX_DELIVERY_BYTES) {
      return NextResponse.json({ error: { code: "RESULT_TOO_LARGE", message: "结果文件超过临时交付大小限制。" } }, { status: 413 });
    }
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    if (bytes.byteLength > MAX_DELIVERY_BYTES) {
      return NextResponse.json({ error: { code: "RESULT_TOO_LARGE", message: "结果文件超过临时交付大小限制。" } }, { status: 413 });
    }
    const contentType = upstream.headers.get("content-type")?.split(";", 1)[0] || getDeliveryFallbackContentType(lookup.record);
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: { code: "RESULT_UNAVAILABLE", message: "上游返回的不是可交付图片。" } }, { status: 502 });
    }
    return new Response(bytes, { headers: responseHeaders(contentType, download, token) });
  } catch {
    return NextResponse.json({ error: { code: "RESULT_UNAVAILABLE", message: "临时图片暂时无法读取，请重新生成。" } }, { status: 502 });
  }
}
