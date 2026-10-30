import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * 安卓安装包的发版信息，唯一来源是 public/downloads/android-latest.json。
 * App 外壳启动时也读这个文件判断要不要提示升级，所以字段名不要改。
 */
export interface AndroidRelease {
  versionCode: number;
  versionName: string;
  /** 站内静态文件路径，例如 /downloads/ANS-1.3.0.apk */
  file: string;
  sizeBytes: number;
  notes: string;
}

export async function readAndroidRelease(): Promise<AndroidRelease | null> {
  try {
    const raw = await readFile(join(process.cwd(), "public", "downloads", "android-latest.json"), "utf8");
    const data = JSON.parse(raw) as Partial<AndroidRelease>;
    if (
      typeof data.versionCode !== "number" ||
      typeof data.versionName !== "string" ||
      typeof data.file !== "string" ||
      !data.file.startsWith("/downloads/")
    ) {
      return null;
    }
    // 清单写了但安装包没放上来时，当作还没发版，免得下载按钮点出 404。
    await access(join(process.cwd(), "public", data.file));
    return {
      versionCode: data.versionCode,
      versionName: data.versionName,
      file: data.file,
      sizeBytes: typeof data.sizeBytes === "number" ? data.sizeBytes : 0,
      notes: typeof data.notes === "string" ? data.notes : "",
    };
  } catch {
    return null;
  }
}

export function formatApkSize(bytes: number): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
