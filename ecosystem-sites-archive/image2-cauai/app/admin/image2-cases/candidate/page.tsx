import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { Image2AdminConsole } from "@/components/image2-admin-console";
import blockedStyles from "@/components/image2-admin-preview-blocked.module.css";
import { readImage2AdminCatalog } from "@/lib/image2-admin-catalog";
import { getImage2AdminPreviewAccess } from "@/lib/image2-admin-preview-access";

export const metadata: Metadata = {
  title: "Image2 本地运营后台候选",
  description: "本地受限的 Image2 案例库运营 UI 候选。"
};

// The preview gate must run for every request; a pre-rendered page could
// otherwise preserve local-preview content after a production deployment.
export const dynamic = "force-dynamic";

export default async function Image2AdminCandidatePage() {
  const access = getImage2AdminPreviewAccess();
  if (!access.allowed) {
    return (
      <main className={blockedStyles.blocked}>
        <section>
          <ShieldAlert aria-hidden="true" />
          <span>Image2 Admin Candidate</span>
          <h1>本地候选后台未启用</h1>
          <p>{access.reason}</p>
          <a href="/image2-cases">返回公开案例库</a>
        </section>
      </main>
    );
  }

  const catalog = await readImage2AdminCatalog();
  return <Image2AdminConsole catalog={catalog} accessReason={access.reason} />;
}
