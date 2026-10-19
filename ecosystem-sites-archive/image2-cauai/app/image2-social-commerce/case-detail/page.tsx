import type { Metadata } from "next";
import { Image2SocialCommerceRouteFocus } from "@/components/image2-social-commerce-route-focus";
import { Image2SocialCommerceSite } from "@/components/image2-social-commerce-site";

export const metadata: Metadata = {
  title: "案例详情 - 场景引擎 AI",
  description: "查看白底商品图转卖货场景图的前后对比、提示词配方和同款生成入口。"
};

export default function Image2SocialCommerceCaseDetailPage() {
  return (
    <>
      <Image2SocialCommerceRouteFocus section="case" />
      <Image2SocialCommerceSite activeSection="case" mode="case" />
    </>
  );
}
