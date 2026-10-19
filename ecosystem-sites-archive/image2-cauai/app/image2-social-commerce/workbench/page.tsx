import type { Metadata } from "next";
import { Image2SocialCommerceRouteFocus } from "@/components/image2-social-commerce-route-focus";
import { Image2SocialCommerceSite } from "@/components/image2-social-commerce-site";

export const metadata: Metadata = {
  title: "AI创作工作台 - 场景引擎 AI",
  description: "上传商品图，选择场景参数，生成主图、详情页、小红书和短视频首帧可用的卖货场景图。"
};

export default function Image2SocialCommerceWorkbenchPage() {
  return (
    <>
      <Image2SocialCommerceRouteFocus section="workbench" />
      <Image2SocialCommerceSite activeSection="workbench" mode="workbench" />
    </>
  );
}
