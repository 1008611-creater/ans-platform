import { resolveImage2SiteUrl } from "@/lib/image2-site-target";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Image2PublicHome } from "@/components/image2-public-home";
import { Image2SocialCommerceRouteFocus } from "@/components/image2-social-commerce-route-focus";
import { Image2SocialCommerceSite } from "@/components/image2-social-commerce-site";
import { PictureStudio } from "@/components/picture-studio";
import { loadImage2PublicHomeData } from "@/lib/image2-workbench-data";

const sceneHosts = new Set(["scene.lsb0713.online"]);
const pictureHosts = new Set([
  "picture.lsb0713.online",
  "picture.localhost",
  ...(/^(1|true|yes|on)$/i.test(process.env.PICTURE_LOCAL_PREVIEW ?? "") ? ["localhost", "127.0.0.1"] : [])
]);

export const dynamic = "force-dynamic";

const getRequestHost = async () => {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "";
  return host.split(":")[0].toLowerCase();
};

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  if (sceneHosts.has(host)) {
    return {
      metadataBase: new URL("https://scene.lsb0713.online"),
      title: "场景引擎 AI - 白底商品图转卖货场景图",
      description: "上传一张白底商品图，生成主图、详情页、小红书封面和短视频首帧可用的电商场景图。",
      robots: { index: true, follow: true }
    };
  }
  if (pictureHosts.has(host)) {
    return {
      metadataBase: new URL("https://picture.lsb0713.online"),
      title: "AI 制图台",
      description: "手机友好的公开制图工具，支持文字生成、参考图生成、放大预览和下载。",
      robots: { index: true, follow: true }
    };
  }

  const description = "查找真实 Image2 案例，阅读提示词结构，保存变体并继续进入作图工作流。";
  return {
    metadataBase: new URL(resolveImage2SiteUrl()),
    title: "Image2 案例库 - 把好图拆成能复用的提示词",
    description,
    keywords: ["Image2", "提示词", "AI 图片案例", "GPT Image 2", "提示词案例库"],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: "Image2",
      title: "Image2 案例库 - 把好图拆成能复用的提示词",
      description,
      images: [{ url: "/image2/hero/case-30001-vr.jpg", width: 1200, height: 800, alt: "Image2 案例库" }]
    },
    twitter: {
      card: "summary_large_image",
      title: "Image2 案例库",
      description,
      images: ["/image2/hero/case-30001-vr.jpg"]
    },
    robots: { index: true, follow: true }
  };
}

export default async function Page() {
  const host = await getRequestHost();
  if (sceneHosts.has(host)) {
    return (
      <>
        <Image2SocialCommerceRouteFocus section="home" />
        <Image2SocialCommerceSite activeSection="home" mode="landing" />
      </>
    );
  }
  if (pictureHosts.has(host)) {
    return <PictureStudio />;
  }

  const data = await loadImage2PublicHomeData();
  return <Image2PublicHome initialData={data} />;
}
