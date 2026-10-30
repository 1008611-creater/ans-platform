import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/app/download/route";

describe("GET /api/app/download", () => {
  it("returns signed Android APK with vnd.android.package-archive MIME type by default or platform=android", async () => {
    const req = new NextRequest("https://ans.cauai.fun/api/app/download?platform=android", {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/125.0.0.0 Mobile Safari/537.36",
      },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/vnd.android.package-archive");
    expect(res.headers.get("content-disposition")).toContain("ANS-Mobile-v1.2.apk");
    const bytes = new Uint8Array(await res.arrayBuffer());
    // ZIP/APK magic header PK\x03\x04
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("returns iOS WebClip profile with x-apple-aspen-config MIME type on iPhone UA or platform=ios", async () => {
    const req = new NextRequest("https://ans.cauai.fun/api/app/download", {
      headers: {
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Mobile/15E148 Safari/604.1",
      },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/x-apple-aspen-config");
    expect(res.headers.get("content-disposition")).toContain("ANS-iOS-App.mobileconfig");
    const text = await res.text();
    expect(text).toContain("com.apple.webClip.managed");
    expect(text).toContain("https://ans.cauai.fun/explore");
  });
});
