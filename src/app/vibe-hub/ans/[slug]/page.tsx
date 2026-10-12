import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { guideHref, guideSelectionForPractice } from "@/domain/vibehub/guide-routing";
import { languageParam } from "../../source-data";
import { LegacyGuideRedirect } from "../../legacy-guide-redirect";
import labels from "../../labels.json";

export default async function AnsPracticePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string; step?: string }> }) {
  const slug = (await params).slug;
  const selection = guideSelectionForPractice(slug);
  if (!selection) notFound();
  const search = await searchParams;
  const lang = languageParam(search.lang, await getLocale());
  const href = guideHref(lang, { ...selection, ...(search.step ? { step: search.step } : { legacyPractice: slug }) });
  return <LegacyGuideRedirect href={href} title={labels[lang].guides} loading={labels[lang].loading} />;
}
