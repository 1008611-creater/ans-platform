import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CommunityPanel } from "@/components/community/community-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "社区成长 · ANS",
  description: "每日签到、经验记录与社区贡献榜。等级仅作纪念称号。",
};

export default async function CommunityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/community");

  return (
    <div className="ans-product-container ans-page-content ans-community-page">
      <PageHeading title="社区成长" description="记录每一次参与，见证共同成长。"
        actions={<Button asChild variant="outline"><Link href="/workspace">返回工作台</Link></Button>} />
      <AccountContentBoundary actorId={session.user.id}><CommunityPanel actorId={session.user.id} /></AccountContentBoundary>
    </div>
  );
}
