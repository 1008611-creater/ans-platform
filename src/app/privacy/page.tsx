import Link from "next/link";
import { getLocale } from "next-intl/server";

export const metadata = {
  title: "Privacy Policy · 隐私政策 - ANS",
  description: "Privacy Policy and Data Protection Guidelines for ANS Platform",
};

export default async function PrivacyPage() {
  const locale = await getLocale();
  const isEn = locale.toLowerCase().startsWith("en");

  if (isEn) {
    return (
      <main className="container max-w-3xl py-10">
        <h1 className="mb-3 text-2xl font-bold">Privacy Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Effective date: October 2026 · ANS Platform (Project Square, Knowledge Hubs, Resume Studio &amp; Creator Workspace)
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">1. Overview &amp; Creator Ownership</h2>
            <p className="text-muted-foreground">
              ANS is an AI-native project discovery, learning hub, workflow execution, competition, and creator workspace platform. Unlike public-domain prompt directories, <strong>your personal resumes, portfolio websites, private workflow inputs, and unpublished competition materials remain strictly your own intellectual property</strong> and are never automatically placed into the public domain.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">2. Information We Collect</h2>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li><strong>Account Info:</strong> Email address (for verification and password recovery), display nickname, and optional profile avatar.</li>
              <li><strong>Workspace &amp; Editor Data:</strong> Resume drafts, workflow run inputs/outputs, favorites, and compute ledger records associated with your account.</li>
              <li><strong>Public Submissions:</strong> Projects, marketplace listings, or community posts that you explicitly choose to publish for public discovery.</li>
              <li><strong>Security &amp; Diagnostics:</strong> Essential session cookies, rate-limiting counters, and anti-abuse human verification signals.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">3. How We Use &amp; Protect Your Data</h2>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>Authenticate your session and protect your account against unauthorized access.</li>
              <li>Execute workflows (such as Resume Website Studio or 3D generation) and store run artifacts in your personal workspace.</li>
              <li>Maintain accurate compute point balances, order histories, and competition team records.</li>
              <li>We do <strong>not</strong> sell your personal information or private workspace files to third parties.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">4. Visibility Controls &amp; Your Rights</h2>
            <p className="text-muted-foreground">
              Local edits in the interactive Resume Website Studio run directly in your browser until you explicitly save or run a cloud workflow. Published marketplace or square items can be updated or withdrawn through your workspace settings.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">5. Contact &amp; Support</h2>
            <p className="text-muted-foreground">
              For privacy questions, data export, or account support, please visit our{" "}
              <Link href="/support" className="underline hover:text-foreground">
                Support Center
              </Link>{" "}
              or submit feedback via our{" "}
              <Link href="https://github.com/1008611-creater/ans-platform/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                GitHub repository
              </Link>.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-3xl py-10">
      <h1 className="mb-3 text-2xl font-bold">隐私政策</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        生效日期：2026 年 10 月 · ANS 平台（项目广场、知识中心、个人简历工作台与创作者空间）
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">一、总则与创作者权益保护</h2>
          <p className="text-muted-foreground">
            ANS 是集项目广场、知识中心（Hub）、工作流运行、赛事协作与创作者市场于一体的 AI 原生实践平台。我们严格保护每位用户的个人数据与创作成果：<strong>您在平台填写的个人简历、作品集草稿、私有工作流输入输出以及非公开参赛材料均归您本人或所属团队所有</strong>，平台绝不会未经您的明确授权将其转入公有领域或对外公开。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">二、我们收集与处理的信息</h2>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li><strong>账户基础信息：</strong>注册邮箱（用于验证码登录与找回密码）、公开展示昵称（无需真实姓名）及可选头像信息。</li>
            <li><strong>工作台与运行记录：</strong>您在使用个人简历网页工作台、工作流运行、收藏夹及算力账本时产生的个人配置与产出记录。</li>
            <li><strong>主动公开内容：</strong>您主动提交至项目广场、创作者市场、社区成长板块或作品墙展示的公开项目信息。</li>
            <li><strong>安全与防滥用日志：</strong>用于保障登录会话安全的必要 Cookie、人机验证状态以及接口防刷计数。</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">三、信息使用方式与安全隔离</h2>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>提供账号鉴权、工作流执行、单文件 HTML 简历导出及 3D 展示等核心产品功能。</li>
            <li>准确核算个人与战队的算力积分发放、消耗与退回明细。</li>
            <li>默认未公开的运行结果与草稿仅对您本人（或授权的赛事评审通道）可见，我们<strong>绝不向第三方出售</strong>您的个人隐私数据。</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">四、数据管理与撤回权利</h2>
          <p className="text-muted-foreground">
            简历网页编辑器中的实时修改与本地导出均在您的浏览器侧即时完成；对于已发布到市场或社区的内容，您可随时在「我的空间」中管理、修订或下架。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">五、联系与支持</h2>
          <p className="text-muted-foreground">
            如对隐私保护、数据更正或账号注销有任何疑问，请前往{" "}
            <Link href="/support" className="underline hover:text-foreground">
              帮助与支持中心
            </Link>{" "}
            或通过{" "}
            <Link href="https://github.com/1008611-creater/ans-platform/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              GitHub Issues
            </Link>{" "}
            与我们联系。
          </p>
        </section>
      </div>
    </main>
  );
}
