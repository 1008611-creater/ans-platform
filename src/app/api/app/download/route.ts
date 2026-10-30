import { NextResponse, type NextRequest } from "next/server";
import { readAndroidRelease } from "@/lib/mobile-app/android-release";

// 固定入口：始终跳到当前最新的安卓安装包。旧版 App 和外部海报二维码都指向这里。
// 安装包本身走静态文件，支持断点续传和 CDN 缓存；带版本号的文件名保证换版后不会拿到旧缓存。
// 跳转用相对地址：容器里 request.url 是 0.0.0.0:3000，拼绝对地址会把手机带到打不开的内网地址。
function redirectTo(path: string) {
  return new NextResponse(null, { status: 302, headers: { Location: path } });
}

export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("platform")?.toLowerCase();
  const ua = request.headers.get("user-agent") || "";
  const isIos = platform === "ios" || (!platform && /iPhone|iPad|iPod/i.test(ua));

  // iPhone 没有安装包，回到安装页看「添加到主屏幕」的步骤。
  if (isIos) {
    return redirectTo("/app");
  }

  const release = await readAndroidRelease();
  if (!release) {
    return NextResponse.json({ error: "Android APK is not published yet" }, { status: 404 });
  }
  const response = redirectTo(release.file);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
