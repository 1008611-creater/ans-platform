import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { guideHref, guideSelectionForPractice } from "@/domain/vibehub/guide-routing";
import { languageParam } from "../../source-data";
export default async function AnsPracticePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> }) {
  const slug = (await params).slug;
  const selection = guideSelectionForPractice(slug);
  if (!selection) notFound();
  redirect(guideHref(languageParam((await searchParams).lang, await getLocale()), { ...selection, legacyPractice: slug }));
}
