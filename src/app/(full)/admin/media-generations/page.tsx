import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listMediaSubmissionReviews, MediaGenerationError } from "@/server/media/service";
import { MediaSubmissionReviews } from "@/components/admin/media-submission-reviews";
export const dynamic = "force-dynamic";
export default async function MediaReviewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fadmin%2Fmedia-generations");
  const t = await getTranslations("product.mediaReview");
  let entries;
  try { entries = await listMediaSubmissionReviews(session.user.id); }
  catch (error) {
    if (error instanceof MediaGenerationError && error.code === "FORBIDDEN") return <div className="ans-product-container py-12"><p role="alert">{t("forbidden")}</p></div>;
    console.error("MEDIA_REVIEW_LIST_FAILED");
    return <div className="ans-product-container py-12"><p role="alert">{t("loadFailed")}</p></div>;
  }
  return <div className="ans-product-shell"><div className="ans-product-container py-10 sm:py-14"><header className="mb-8 max-w-3xl"><p className="ans-eyebrow">{t("eyebrow")}</p><h1 className="mt-4 text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-4 leading-8 text-muted-foreground">{t("body")}</p></header><MediaSubmissionReviews initialEntries={entries.map(entry => ({ ...entry, createdAt: entry.createdAt.toISOString(), updatedAt: entry.updatedAt.toISOString() }))} /></div></div>;
}
