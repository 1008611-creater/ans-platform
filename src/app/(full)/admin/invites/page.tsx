import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { InvitesManagement } from "@/components/admin/invites-management";

export const dynamic = "force-dynamic";
export const metadata = { title: "邀请码管理 · ANS" };

export default async function AdminInvitesPage() {
  const context = await requireAdminPermission("INVITES_MANAGE");
  if (!context) {
    return (
      <div className="container py-10">
        <Link href="/admin" className="text-sm text-primary">返回管理后台</Link>
        <h1 className="mt-2 text-3xl font-bold">邀请码管理</h1>
        <p className="mt-4 text-muted-foreground">你没有 INVITES_MANAGE 权限，无法访问邀请关系审计。</p>
      </div>
    );
  }
  return (
    <div className="container max-w-6xl space-y-6 py-10">
      <Link href="/admin" className="text-sm text-primary">返回管理后台</Link>
      <h1 className="text-3xl font-bold">邀请码管理</h1>
      <p className="text-sm text-muted-foreground">
        邀请关系仅管理员可审计：可生成邀请码并查看发放与核销明细；核销记录含使用者昵称与时间，邮箱仅管理员可见。
      </p>
      <InvitesManagement />
    </div>
  );
}