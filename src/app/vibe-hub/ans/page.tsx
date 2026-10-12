import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { guideHref } from "@/domain/vibehub/guide-routing";
import { languageParam } from "../source-data";
export default async function AnsPracticesPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  redirect(guideHref(languageParam((await searchParams).lang, await getLocale())));
}
