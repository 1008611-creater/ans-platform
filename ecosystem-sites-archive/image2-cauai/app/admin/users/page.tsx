import type { Metadata } from "next";
import { ArrowLeft, UsersRound } from "lucide-react";
import { AdminUsersConsole } from "@/components/admin-users-console";
import { AdminSessionGate } from "@/components/admin-session-gate";

export const metadata: Metadata = {
  title: "统一用户管理 - Image2 后台",
  description: "查看 Image2 与场景引擎统一账号、最近登录和图片余额。"
};

export default function AdminUsersPage() {
  return (
    <AdminSessionGate returnTo="/admin/users">
      <main className="admin-hub">
        <section className="admin-hub-panel" aria-label="统一用户管理入口">
          <span className="admin-hub-kicker"><UsersRound aria-hidden="true" />统一账号</span>
          <h1>用户管理后台</h1>
          <p>管理员会话通过服务端角色校验后，集中查看统一账号、最近登录和图片余额；不再使用共享后台口令。</p>
          <a className="admin-hub-return" href="/admin"><ArrowLeft aria-hidden="true" />返回后台入口</a>
        </section>
        <AdminUsersConsole />
      </main>
    </AdminSessionGate>
  );
}
