import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLevelProgress, formatLevel } from "@/lib/level";
import { DisplayNameEditor } from "@/components/workspace/display-name-editor";
import { MobileAboutLinks } from "@/components/layout/mobile-about-links";

export async function generateMetadata() {
  const t = await getTranslations("product.workspace");
  return { title: t("metaTitle"), description: t("description") };
}

type WorkspacePageProps = {
  searchParams?: Promise<{ runsCursor?: string | string[]; prompt?: string | string[] }>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const t = await getTranslations("product.workspace");
  const locale = await getLocale();
  const query = searchParams ? await searchParams : {};
  const rawPrompt = Array.isArray(query.prompt) ? query.prompt[0] : query.prompt;
  const initialPrompt = rawPrompt && rawPrompt.length <= 2000 ? rawPrompt : "";

  const user = userId
    ? await db.user.findUnique({
        where: { id: userId },
        select: { xp: true, quotaPoints: true, nickname: true },
      })
    : null;

  const xp = user?.xp ?? 0;
  const progress = getLevelProgress(xp);
  const displayName = user?.nickname?.trim() || (userId ? t("anonymous") : locale === "zh" ? "访客创作者" : "Guest Creator");
  const currentPoints = Number(user?.quotaPoints ?? 0);
  const levelName = locale === "zh" ? formatLevel(xp) : progress.level.nameEn;

  return (
    <div className="ans-workspace-page">
      <DisplayNameEditor
        codexWorkbench
        actorId={userId ?? "guest"}
        current={displayName}
        points={currentPoints}
        levelName={levelName}
        initialPrompt={initialPrompt}
      />
      <MobileAboutLinks />
    </div>
  );
}

