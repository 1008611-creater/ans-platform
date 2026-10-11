"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ANS_PRACTICES } from "@/domain/vibehub/ans-practices";
import { useVibeLanguage } from "./use-vibe-language";

// GitGlow MinimalSlate / AngledCanvas / FloatingLayers compositions adapted
// to ANS VibeHub's own content. See public/vibe-hub/covers/LICENSE.gitglow.
const COVERS = [
  { id: "terms", path: "/topics", layout: "feature", source: "terms-source.png", width: 1034, height: 392, template: "minimal-slate" },
  { id: "practice", path: "/ans", layout: "guides", source: "practice-source.png", width: 1150, height: 403, template: "angled-canvas" },
  { id: "interaction", path: "/practice", layout: "interaction", source: "interaction-source.png", width: 506, height: 332, template: "floating-layers" },
] as const;

export function KnowledgeProjectCovers({ termCount }: { termCount: number }) {
  const t = useTranslations("vibehub");
  const lang = useVibeLanguage();
  return (
    <nav className="ans-knowledge-covers" aria-label={t("knowledgeCovers")}>
      <ul className="ans-knowledge-cover-grid">
        {COVERS.map(({ id, path, layout, source, width, height, template }, index) => (
          <li key={id} className={`ans-knowledge-cover-slot ans-knowledge-cover-${layout}`}>
            <Link className="ans-knowledge-cover" href={`/vibe-hub${path}?lang=${lang}`} aria-label={t(`knowledgeCover.${id}.label`)}>
              <div className={`ans-knowledge-cover-image ans-vibe-cover-art ans-vibe-cover-${id}`} data-gitglow-template={template}>
                <span className="ans-vibe-cover-brand" aria-hidden="true">ANS <span>VibeHub</span></span>
                <span className="ans-vibe-cover-index" aria-hidden="true">0{index + 1}</span>
                <div className="ans-vibe-cover-screen" aria-hidden="true">
                  <Image src={`/vibe-hub/covers/${source}`} alt="" width={width} height={height}
                    sizes={index === 0 ? "(max-width: 760px) 65vw, 320px" : "(max-width: 760px) 34vw, 190px"}
                    preload={index === 0} unoptimized />
                </div>
                <div className="ans-vibe-cover-copy" aria-hidden="true">
                  <span className="ans-vibe-cover-title">{t(`knowledgeCover.${id}.first`)}<br /><b>{t(`knowledgeCover.${id}.second`)}</b></span>
                  <span className="ans-vibe-cover-meta">{id === "terms" ? t("knowledgeCoverTermCount", { count: termCount }) : id === "practice" ? t("knowledgeCoverPracticeCount", { count: ANS_PRACTICES.length }) : t("knowledgeCoverInteractionMeta")}</span>
                </div>
              </div>
              <span className="ans-knowledge-cover-caption"><span>{t(`knowledgeCover.${id}.label`)}</span><ArrowUpRight size={15} aria-hidden="true" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
