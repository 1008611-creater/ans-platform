import type { Metadata } from "next";
import { Image2SocialCommerceSite } from "@/components/image2-social-commerce-site";
import { Image2SocialCommerceRouteFocus } from "@/components/image2-social-commerce-route-focus";

export const metadata: Metadata = {
  title: "场景引擎 AI - 白底商品图转卖货场景图",
  description: "上传一张白底商品图，生成主图、详情页、小红书封面和短视频首帧可用的电商场景图。"
};

export default function Image2SocialCommercePage() {
  return (
    <>
      <Image2SocialCommerceRouteFocus section="home" />
      <Image2SocialCommerceSite activeSection="home" mode="landing" />
    </>
  );
}
