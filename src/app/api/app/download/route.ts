import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const paramPlatform = request.nextUrl.searchParams.get("platform")?.toLowerCase();
  const ua = request.headers.get("user-agent") || "";

  const isIos =
    paramPlatform === "ios" ||
    (!paramPlatform && /iPhone|iPad|iPod/i.test(ua));

  if (isIos) {
    try {
      const filePath = join(process.cwd(), "public", "downloads", "ans-ios.mobileconfig");
      const buffer = await readFile(filePath);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/x-apple-aspen-config",
          "Content-Disposition": 'attachment; filename="ANS-iOS-App.mobileconfig"',
          "Content-Length": String(buffer.byteLength),
          "Cache-Control": "no-store",
        },
      });
    } catch {
      return NextResponse.json({ error: "iOS installer not found" }, { status: 404 });
    }
  }

  try {
    const filePath = join(process.cwd(), "public", "downloads", "ans-mobile.apk");
    const buffer = await readFile(filePath);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="ANS-Mobile-v1.2.apk"',
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Android APK installer not found" }, { status: 404 });
  }
}
