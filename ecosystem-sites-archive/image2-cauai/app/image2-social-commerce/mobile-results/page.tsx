import type { Metadata } from "next";
import { Image2SocialCommerceRouteFocus } from "@/components/image2-social-commerce-route-focus";
import { Image2SocialCommerceSite } from "@/components/image2-social-commerce-site";

export const metadata: Metadata = {
  title: "移动端结果流预览 - 场景引擎 AI",
  description: "移动端生成结果、保存和额度消耗路径预览。"
};

export default function Image2SocialCommerceMobileResultsPage() {
  return (
    <>
      <Image2SocialCommerceRouteFocus section="results" />
      <Image2SocialCommerceSite activeSection="workbench" mode="workbench" />
    </>
  );
}
