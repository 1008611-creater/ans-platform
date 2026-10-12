"use client";
import Link from "next/link";
import { guideHref, guideTaskForPath } from "@/domain/vibehub/guide-routing";
import { ArrowUpRight, Code2, GitBranch } from "lucide-react";
import { useTranslations } from "next-intl";
import chapters from "@/data/vibehub/courses/index.json";
import { useVibeLanguage } from "../use-vibe-language";
const courses = [
  { id: "product-website", key: "websiteCourse", number: "01", icon: Code2, path: "ans-first-website" },
  { id: "git-workflow", key: "gitCourse", number: "02", icon: GitBranch, path: "ans-open-source" },
];
export function CourseDirectory() {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  return <main className="ans-knowledge-container ans-editorial-page"><header className="ans-knowledge-page-heading"><h1>{t("courseDirectoryTitle")}</h1></header>
    <div className="ans-course-directory">{courses.map(({id, key, number, icon: Icon, path}) => {
      const count = chapters.filter(chapter => chapter.course === id).length;
      return <article key={id} className="ans-course-row"><div className="ans-course-identity"><Icon size={28} aria-hidden="true" /><span>{number}</span></div><div><p className="ans-knowledge-eyebrow">{t("courseChapterCount", { count })}</p><h2>{t(`${key}Title`)}</h2><p>{t(`${key}Body`)}</p><nav><Link className="ans-editorial-link" href={`/vibe-hub/courses/${id}?lang=${lang}`}>{t("courseOpen")}<ArrowUpRight size={16} aria-hidden="true" /></Link><Link className="ans-editorial-link ans-editorial-link-secondary" href={guideHref(lang, { task: guideTaskForPath(path) })}>{t("courseOwnPath")}<ArrowUpRight size={16} aria-hidden="true" /></Link></nav></div></article>;
    })}</div>
  </main>;
}
