import type { Metadata } from "next";
import { Image2SocialCommerceRouteFocus } from "@/components/image2-social-commerce-route-focus";
import { Image2SocialCommerceSite } from "@/components/image2-social-commerce-site";

export const metadata: Metadata = {
  title: "模板运营台 - 场景引擎 AI",
  description: "管理电商场景模板、查看保存率、生成次数和额度耗尽率等运营指标。"
};

export default function Image2SocialCommerceAdminTemplateOpsPage() {
  return (
    <>
      <Image2SocialCommerceRouteFocus section="ops" />
      <Image2SocialCommerceSite activeSection="ops" mode="ops" />
    </>
  );
}
