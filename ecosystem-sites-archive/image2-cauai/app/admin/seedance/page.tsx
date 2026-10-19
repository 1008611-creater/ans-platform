import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin-console";
import { AdminSessionGate } from "@/components/admin-session-gate";

export const metadata: Metadata = {
  title: "Seedance 制作后台",
  description: "旧视频制作后台，保留任务队列、成片回填和通道健康检查。"
};

export default function SeedanceAdminPage() {
  return <AdminSessionGate returnTo="/admin/seedance"><AdminConsole /></AdminSessionGate>;
}
