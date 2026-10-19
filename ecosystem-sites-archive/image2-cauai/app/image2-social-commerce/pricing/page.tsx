import type { Metadata } from "next";
import { Image2SocialCommerceRouteFocus } from "@/components/image2-social-commerce-route-focus";
import { Image2SocialCommerceSite } from "@/components/image2-social-commerce-site";

export const metadata: Metadata = {
  title: "图片额度价格 - 场景引擎 AI",
  description: "按图片额度购买，继续生成、批量变体和高清导出使用同一种额度。"
};

export default function Image2SocialCommercePricingPage() {
  return (
    <>
      <Image2SocialCommerceRouteFocus section="pricing" />
      <Image2SocialCommerceSite activeSection="pricing" mode="pricing" />
    </>
  );
}
