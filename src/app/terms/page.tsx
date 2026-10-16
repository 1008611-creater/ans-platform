import Link from "next/link";
import { getLocale } from "next-intl/server";

export const metadata = {
  title: "Terms of Service · 服务条款 - ANS",
  description: "Terms of Service for ANS Platform",
};

export default async function TermsPage() {
  const locale = await getLocale();
  const isEn = locale.toLowerCase().startsWith("en");

  if (isEn) {
    return (
      <main className="container max-w-3xl py-10">
        <h1 className="mb-3 text-2xl font-bold">Terms of Service</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Effective date: October 2026 · ANS Platform
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using ANS (including Project Square, Knowledge Hubs, Resume Website Studio, Marketplace, Competitions, and Workspace), you agree to abide by these Terms of Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">2. Intellectual Property &amp; License Terms</h2>
            <p className="text-muted-foreground">
              <strong>You retain ownership of your original works:</strong> Resumes, personal portfolios, private workflow outputs, and competition submissions created or uploaded by you remain your intellectual property. When publishing a listing to the Marketplace or Project Square, the license terms you select on the listing govern how others may use that resource.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">3. Accounts, Verification &amp; Compute Points</h2>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>Registration is open to valid email addresses without an invitation code; you are responsible for keeping your credentials secure.</li>
              <li>Cloud workflow executions and metered AI model calls consume compute points according to the transparent cost displayed before each run.</li>
              <li>Automated scraping, credential stuffing, or abuse of verification/compute endpoints is strictly prohibited.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">4. Acceptable Use &amp; Community Standards</h2>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>Do not upload illegal, malicious, defamatory, or infringing content.</li>
              <li>Respect competition integrity rules, team rosters, and fair voting mechanisms.</li>
              <li>Platform moderators may delist or restrict content or accounts that violate security or community guidelines.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">5. Disclaimer &amp; Support</h2>
            <p className="text-muted-foreground">
              AI-generated outputs and community workflows are provided &quot;as is&quot; for academic, creative, and engineering exploration. Please review exported code and documents before external deployment. For assistance, visit our{" "}
              <Link href="/support" className="underline hover:text-foreground">
                Support page
              </Link>.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-3xl py-10">
      <h1 className="mb-3 text-2xl font-bold">服务条款</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        生效日期：2026 年 10 月 · ANS 平台
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">一、服务说明与条款确认</h2>
          <p className="text-muted-foreground">
            欢迎使用 ANS 平台（涵盖项目广场、知识中心 Hub、个人简历网页工作台、赛事中心、创作者市场及个人空间）。访问或使用本平台即表示您同意遵守本服务条款。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">二、知识产权与内容授权</h2>
          <p className="text-muted-foreground">
            <strong>您的原创成果归您所有：</strong>您在平台编写或生成的个人简历网页、私有工作流产出、团队参赛作品与代码归您本人或所属团队所有。当您主动将工作流或资源上架至「市场」或发布至「项目广场」时，将按您在发布时指定的授权条款（License Terms）向其他用户开放使用。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">三、账户管理与算力计费规则</h2>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>平台支持开放邮箱验证注册（无需邀请码），请妥善保管您的账户凭证。</li>
            <li>本地浏览器预览与单文件 HTML 导出免费可用；需要调用云端大模型或托管工作流的功能，将在运行前明确展示预计消耗的算力积分。</li>
            <li>严禁使用自动化脚本恶意刷取验证码、滥用算力接口或干扰平台正常服务。</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">四、社区规范与赛事诚信</h2>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>严禁发布违法违规、侵犯他人知识产权、含有恶意代码或虚假误导的内容。</li>
            <li>参与平台赛事及作品墙互动时，须遵守赛事组委会规则，严禁刷票或冒用他人成果。</li>
            <li>对于违反社区规范的内容或异常账号，平台管理员有权采取下架、限制展示或封禁处理。</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">五、免责声明与帮助支持</h2>
          <p className="text-muted-foreground">
            AI 模型生成内容仅供学习、科研与工程实践参考，请在正式投递或部署前自行核对准确性。如需帮助或问题反馈，请访问{" "}
            <Link href="/support" className="underline hover:text-foreground">
              帮助与支持中心
            </Link>。
          </p>
        </section>
      </div>
    </main>
  );
}
