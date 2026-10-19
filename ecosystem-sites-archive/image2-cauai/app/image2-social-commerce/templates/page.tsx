import type { Metadata } from "next";
import { Image2SocialCommerceRouteFocus } from "@/components/image2-social-commerce-route-focus";
import { Image2SocialCommerceSite } from "@/components/image2-social-commerce-site";

export const metadata: Metadata = {
  title: "场景模板 - 场景引擎 AI",
  description: "浏览高保存率电商场景模板，用成熟卖货配方快速生成商品场景图。"
};

export default function Image2SocialCommerceTemplatesPage() {
  return (
    <>
      <Image2SocialCommerceRouteFocus section="templates" />
      <Image2SocialCommerceSite activeSection="templates" mode="templates" />
    </>
  );
}
