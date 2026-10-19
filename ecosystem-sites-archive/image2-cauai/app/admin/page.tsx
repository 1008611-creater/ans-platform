import type { Metadata } from "next";
import { BarChart3, Clapperboard, Images, LayoutGrid, Sparkles, UsersRound } from "lucide-react";
import { AdminSessionGate } from "@/components/admin-session-gate";

export const metadata: Metadata = {
  title: "Image2 后台入口",
  description: "进入 Image2 案例库运营入口，或打开旧 Seedance 视频制作后台。"
};

export default function AdminPage() {
  return (
    <AdminSessionGate returnTo="/admin">
      <main className="admin-hub">
        <section className="admin-hub-panel" aria-label="后台入口">
        <span className="admin-hub-kicker">
          <Sparkles aria-hidden="true" />
          Image2 后台
        </span>
        <h1>选择要进入的运营后台</h1>
        <p>当前主线是 Image2 案例库、作图中控台和同款抽卡。旧视频制作后台仍保留在单独入口。</p>

        <div className="admin-hub-grid">
          <a className="admin-hub-card primary" href="/admin/image2-cases">
            <LayoutGrid aria-hidden="true" />
            <span>Image2 主线</span>
            <strong>案例库运营入口</strong>
            <small>检查公开案例库、作图中控台、同款抽卡和后续案例运营任务。</small>
          </a>
          <a className="admin-hub-card" href="/admin/users">
            <UsersRound aria-hidden="true" />
            <span>统一账号</span>
            <strong>用户管理后台</strong>
            <small>查看邮箱/手机号登录用户、最近登录、图片余额和认证事件。</small>
          </a>
          <a className="admin-hub-card" href="/admin/picture">
            <Images aria-hidden="true" />
            <span>AI 制图台</span>
            <strong>制图台管理</strong>
            <small>查看公开作图站的注册账号、生成记录、服务状态和图片预览。</small>
          </a>
          <a className="admin-hub-card" href="/admin/seedance">
            <Clapperboard aria-hidden="true" />
            <span>旧视频后台</span>
            <strong>Seedance 制作后台</strong>
            <small>保留原视频队列、成片回填和通道健康检查。</small>
          </a>
        </div>

        <a className="admin-hub-return" href="/image2-cases">
          <BarChart3 aria-hidden="true" />
          返回 Image2 案例库
        </a>
        </section>
      </main>
    </AdminSessionGate>
  );
}
