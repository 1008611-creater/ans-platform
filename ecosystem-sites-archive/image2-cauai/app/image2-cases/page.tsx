import { resolveImage2SiteUrl } from "@/lib/image2-site-target";
import type { Metadata } from "next";
import { Image2CaseLibrary } from "@/components/image2-case-library";

export const metadata: Metadata = {
  metadataBase: new URL(resolveImage2SiteUrl()),
  title: "Image2 案例灵感库 - 搜索、拆解与复用提示词",
  description: "浏览可追溯的 Image2 案例，按用途、风格与来源筛选，复制提示词、保存收藏并继续生成。",
  alternates: { canonical: "/image2-cases" },
  openGraph: {
    type: "website",
    url: "/image2-cases",
    siteName: "Image2",
    title: "Image2 案例灵感库",
    description: "从真实案例中拆解主体、构图、光线与风格，得到能继续生产的提示词结构。",
    images: [{ url: "/image2/hero/case-20243-fashion.jpg", width: 900, height: 1200, alt: "Image2 案例灵感库" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Image2 案例灵感库",
    description: "搜索、拆解并复用 Image2 提示词。",
    images: ["/image2/hero/case-20243-fashion.jpg"]
  }
};

export default function Image2CasesPage() {
  return <Image2CaseLibrary />;
}
