import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CommunityPanel } from "@/components/community/community-panel";

export const metadata = {
  title: "社区成长 · ANS",
  description: "每日签到、经验记录与社区贡献榜。等级仅作纪念称号。",
};

export default async function CommunityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/community");

  return (
    <div className="container max-w-6xl py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight">社区成长</h1><p className="mt-2 text-muted-foreground">记录每一次参与，见证共同成长。</p></div>
        <Link href="/workspace" className="text-sm underline underline-offset-4">返回工作台</Link>
      </header>
      <CommunityPanel />
    </div>
  );
}
