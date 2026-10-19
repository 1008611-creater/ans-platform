"use client";
import Link from "next/link";
import { AnsPracticeLinks } from "./ans-practice-links";
import { useTranslations } from "next-intl";
import { TermDemo, hasNativeDemo } from "./term-demo";
import { PronunciationButton } from "./pronunciation-button";
import type { OfficialEntry } from "./official/types";
import { SourceContent } from "./source-content";
import { CopyTermButton } from "./copy-term-button";
import { FavoriteButton } from "./favorite-button";
import { LessonQuiz } from "./lesson-quiz";
import { useVibeLanguage } from "./use-vibe-language";
import type { SourcePage, Lesson } from "@/contracts/vibehub-content";
type Adjacent = { slug: string; name: string; zhName: string };

export default function VibeHubTermClient({ slug, content, lesson, detail, previous, next }: { slug: string; content: SourcePage; detail: OfficialEntry | null; lesson: Lesson | null; previous: Adjacent; next: Adjacent }) {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  const markdown = content.markdown || `# ${content.name}\n\n${content.description || ""}\n\n> ${content.quote || ""}\n\n${content.agentPrompt || lesson?.agentPrompt || lesson?.flowLesson?.agentPrompt || ""}\n\n${lesson?.references?.map((item) => `- [${item.title}](${item.url})`).join("\n") || ""}`;

  return <main className="vh-page"><div className="vh-detail-toolbar"><Link href={`/vibe-hub?lang=${lang}`}>← {t("all")}</Link><div className="vh-detail-actions"><FavoriteButton slug={slug} /><CopyTermButton text={markdown} markdown /><CopyTermButton text={content.agentPrompt || lesson?.agentPrompt || lesson?.flowLesson?.agentPrompt || markdown} /><PronunciationButton slug={slug} /></div></div>
    <SourceContent slug={slug} officialEntry={detail} html={content.html} className="vh-detail-content" demo={hasNativeDemo(slug) ? <TermDemo slug={slug} /> : undefined} />
    {lesson?.lessonPractice && <LessonQuiz id={slug} practice={lesson.lessonPractice} />}
    <AnsPracticeLinks termSlug={slug} />
    <nav className="vh-detail-nav" aria-label={t("terms")}><Link href={`/vibe-hub/${previous.slug}?lang=${lang}`} rel="prev">← {lang === "zh" ? previous.zhName : previous.name}</Link><Link href={`/vibe-hub/${next.slug}?lang=${lang}`} rel="next">{lang === "zh" ? next.zhName : next.name} →</Link></nav>
  </main>;
}
