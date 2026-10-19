import type { Metadata } from "next";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AdminPictureConsole } from "@/components/admin-picture-console";
import { AdminSessionGate } from "@/components/admin-session-gate";

export const metadata: Metadata = {
  title: "AI 制图台管理 - 后台",
  description: "查看 picture.lsb0713.online 的账号、生成记录和服务状态。"
};

export default function AdminPicturePage() {
  return (
    <AdminSessionGate returnTo="/admin/picture">
      <main className="admin-hub">
      <section className="admin-hub-panel" aria-label="AI 制图台管理入口">
        <span className="admin-hub-kicker">
          <Sparkles aria-hidden="true" />
          AI 制图台
        </span>
        <h1>制图台管理员页面</h1>
        <p>查看公开制图站的注册账号、登录情况、生成记录、图片预览和服务状态。当前版本只读，避免误操作影响用户。</p>
        <a className="admin-hub-return" href="/admin">
          <ArrowLeft aria-hidden="true" />
          返回后台入口
        </a>
      </section>

      <AdminPictureConsole />
      </main>
    </AdminSessionGate>
  );
}
