import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { MobileAppInstaller } from "@/components/mobile/mobile-app-installer";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isEn = locale === "en";
  return {
    title: isEn ? "Mobile App" : "手机端 App 安装",
    description: isEn
      ? "Install the ANS (AI Never Stops) mobile App to your phone home screen for full-screen access, while using the web workspace on desktop."
      : "将 ANS (AI Never Stops) 安装到手机桌面开启全屏独立 App 体验；电脑端直接使用网页工作台。",
  };
}

export default function MobileAppPage() {
  return (
    <div className="container py-6 sm:py-10">
      <MobileAppInstaller />
    </div>
  );
}
