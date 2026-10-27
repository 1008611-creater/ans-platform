import type { Metadata } from "next";
import { FirstVisitMascotPreview } from "./preview-client";

/** 首访引导·吉祥物格的验收预览。只在 /preview 下，不进导航、不被收录。 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function FirstVisitMascotPreviewPage() {
  return <FirstVisitMascotPreview />;
}
