import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/app/download/route";
import * as androidRelease from "@/lib/mobile-app/android-release";
import { formatApkSize } from "@/lib/mobile-app/android-release";

const manifest = JSON.parse(
  readFileSync(join(process.cwd(), "public", "downloads", "android-latest.json"), "utf8"),
) as { versionCode: number; file: string; downloadUrl: string };

describe("GET /api/app/download", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects Android to the versioned APK listed in android-latest.json", async () => {
    const req = new NextRequest("https://ans.cauai.fun/api/app/download?platform=android", {
      headers: { "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/125.0.0.0 Mobile Safari/537.36" },
    });
    const res = await GET(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(manifest.file);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("sends iPhone visitors back to the install guide instead of a file", async () => {
    const req = new NextRequest("https://ans.cauai.fun/api/app/download", {
      headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Mobile/15E148 Safari/604.1" },
    });
    const res = await GET(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/app");
  });

  it("never leaks the container's internal host into the redirect", async () => {
    const res = await GET(new NextRequest("https://0.0.0.0:3000/api/app/download?platform=android"));
    expect(res.headers.get("location")).toBe(manifest.file);
  });

  it("returns 404 when no Android release is published", async () => {
    vi.spyOn(androidRelease, "readAndroidRelease").mockResolvedValue(null);
    const res = await GET(new NextRequest("https://ans.cauai.fun/api/app/download?platform=android"));
    expect(res.status).toBe(404);
  });
});

describe("android-latest.json", () => {
  it("keeps the fields the App shell reads for update checks", () => {
    expect(Number.isInteger(manifest.versionCode)).toBe(true);
    expect(manifest.file).toMatch(/^\/downloads\/ANS-[\d.]+\.apk$/);
    expect(manifest.downloadUrl).toBe("https://ans.cauai.fun/api/app/download");
  });

  it("formats APK sizes for the download button", () => {
    expect(formatApkSize(0)).toBeNull();
    expect(formatApkSize(300 * 1024)).toBe("300 KB");
    expect(formatApkSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});
