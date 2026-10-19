import type { Metadata } from "next";
import { AdminSessionGate } from "@/components/admin-session-gate";
import { Image2AdminConsole } from "@/components/image2-admin-console";
import { readImage2AdminCatalog } from "@/lib/image2-admin-catalog";

export const metadata: Metadata = {
  title: "Image2 案例库运营后台",
  description: "查看 Image2 案例、用户、会员、兑换摘要、内容审核和运营记录。"
};

export const dynamic = "force-dynamic";

export default async function AdminImage2CasesPage() {
  const catalog = await readImage2AdminCatalog();

  return (
    <AdminSessionGate returnTo="/admin/image2-cases">
      <Image2AdminConsole catalog={catalog} />
    </AdminSessionGate>
  );
}
