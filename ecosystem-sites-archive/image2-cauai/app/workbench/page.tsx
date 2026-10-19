import type { Metadata } from "next";
import { headers } from "next/headers";
import { Image2Workbench } from "@/components/image2-workbench";
import { Image2SocialCommerceRouteFocus } from "@/components/image2-social-commerce-route-focus";
import { Image2SocialCommerceSite } from "@/components/image2-social-commerce-site";
import { PictureStudio } from "@/components/picture-studio";
import { loadPublicImage2WorkbenchData } from "@/lib/image2-workbench-data";

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
      title: "AI创作工作台 - 场景引擎 AI",
      description: "上传商品图，选择场景参数，生成主图、详情页、小红书和短视频首帧可用的卖货场景图。"
    };
  }
  if (pictureHosts.has(host)) {
    return {
      title: "AI 制图台",
      description: "手机友好的公开制图工具，支持文字生成、参考图生成、放大预览和下载。"
    };
  }

  return {
    title: "Image2 作图中控台",
    description: "Image2 公开作图台，用于提示词、素材矩阵和首帧生产。"
  };
}

export default async function WorkbenchPage() {
  const host = await getRequestHost();
  if (sceneHosts.has(host)) {
    return (
      <>
        <Image2SocialCommerceRouteFocus section="workbench" />
        <Image2SocialCommerceSite activeSection="workbench" mode="workbench" />
      </>
    );
  }
  if (pictureHosts.has(host)) {
    return <PictureStudio />;
  }

  const data = await loadPublicImage2WorkbenchData();
  return <Image2Workbench initialData={data} />;
}
