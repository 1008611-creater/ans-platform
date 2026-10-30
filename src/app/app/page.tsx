import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { MobileAppInstaller } from "@/components/mobile/mobile-app-installer";
import { formatApkSize, readAndroidRelease } from "@/lib/mobile-app/android-release";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isEn = locale === "en";
  return {
    title: isEn ? "Mobile App" : "手机 App",
    description: isEn
      ? "Get the ANS (AI Never Stops) app on Android or add it to your iPhone home screen. On a computer, use the website."
      : "安卓下载 ANS (AI Never Stops) App，iPhone 添加到主屏幕；电脑上直接用网页版。",
  };
}

export default async function MobileAppPage() {
  const release = await readAndroidRelease();
  return (
    <div className="container py-6 sm:py-10">
      <MobileAppInstaller
        androidRelease={
          release ? { versionName: release.versionName, sizeLabel: formatApkSize(release.sizeBytes) } : null
        }
      />
    </div>
  );
}
