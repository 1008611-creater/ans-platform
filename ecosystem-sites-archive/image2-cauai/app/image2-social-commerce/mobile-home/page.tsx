import type { Metadata } from "next";
import { Image2SocialCommerceRouteFocus } from "@/components/image2-social-commerce-route-focus";
import { Image2SocialCommerceSite } from "@/components/image2-social-commerce-site";

export const metadata: Metadata = {
  title: "移动端首页预览 - 场景引擎 AI",
  description: "移动端白底商品图转卖货场景图首页预览。"
};

export default function Image2SocialCommerceMobileHomePage() {
  return (
    <>
      <Image2SocialCommerceRouteFocus section="home" />
      <Image2SocialCommerceSite activeSection="home" mode="landing" />
    </>
  );
}
