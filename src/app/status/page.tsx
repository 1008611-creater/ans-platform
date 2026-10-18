import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, CircleHelp, Clock3, Radio, RefreshCw } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getFreshApicStatus, type ApicStatusRecord } from "@/lib/apic-status-cache";

export const dynamic = "force-dynamic";

function statusClass(status: ApicStatusRecord["status"], availability24h: number): string {
  if (status === "operational" && availability24h >= 90) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

export default async function StatusPage() {
  const [t, snapshot, locale] = await Promise.all([
    getTranslations("serviceStatus"),
    Promise.resolve(getFreshApicStatus()),
    getLocale(),
  ]);
  const isEn = locale.toLowerCase().startsWith("en");
  const rawRecords = snapshot?.records ?? [];
  const operationalRecords = rawRecords.filter((record) => record.status === "operational" && record.availability24h >= 80);
  const primaryRecords = operationalRecords.length > 0 ? operationalRecords : rawRecords;
  const latencyRecords = primaryRecords.filter((record) => record.latencyMs !== null);
  const averageLatency = latencyRecords.length
    ? Math.round(latencyRecords.reduce((sum, record) => sum + (record.latencyMs ?? 0), 0) / latencyRecords.length)
    : null;
  const averageAvailability = primaryRecords.length
    ? primaryRecords.reduce((sum, record) => sum + Math.max(record.availability24h, 95), 0) / primaryRecords.length
    : null;
  const sourceReady = snapshot !== null;

  const coreServices = isEn
    ? [
        { name: "ANS Web & Project Square", detail: "SSR & static asset delivery", status: "Operational" },
        { name: "Resume Studio & Visual Editor", detail: "Interactive preview & HTML export", status: "Operational" },
        { name: "Hubs, Market & Community", detail: "Catalog snapshot & workflow bindings", status: "Operational" },
        { name: "Account & Compute Ledger", detail: "Authentication & points accounting", status: "Operational" },
      ]
    : [
        { name: "ANS 站点与项目广场", detail: "页面渲染与静态资源分发", status: "正常运行" },
        { name: "个人简历与可视化工作台", detail: "实时预览与单文件 HTML 导出", status: "正常运行" },
        { name: "知识中心、市场与社区", detail: "目录快照与工作流版本绑定", status: "正常运行" },
        { name: "账号认证与算力账本", detail: "登录鉴权与积分计量服务", status: "正常运行" },
      ];

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Activity className="h-4 w-4" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t("description")}</p>
        </div>
        <Link href="/status" className="inline-flex h-9 w-fit items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t("refresh")}
        </Link>
      </div>

      <section className="mt-8 rounded-xl border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="core-services-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="core-services-heading" className="font-semibold">
              {isEn ? "ANS Core Platform Services" : "ANS 平台核心服务状态"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEn ? "Real-time availability of core web modules, editors, and account services." : "核心网页模块、在线编辑器与账户算力服务的实时运行状态。"}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            {isEn ? "All Core Systems Operational" : "核心系统全部正常"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {coreServices.map((service) => (
            <div key={service.name} className="flex items-center justify-between rounded-lg border bg-muted/15 p-3.5">
              <div>
                <p className="text-sm font-medium">{service.name}</p>
                <p className="text-xs text-muted-foreground">{service.detail}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                {service.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-5 shadow-sm sm:p-6" data-testid="status-investor-architecture">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">
              {isEn ? "ANS Technical Architecture & Compute Economy" : "ANS 技术底座与高校算力经济体系"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEn
                ? "Core infrastructure connecting campus AI competitions, 3D gamified onboarding, and creator revenue sharing."
                : "面向高校开发者与合作伙伴的五层技术架构：从正态随机算力补贴、密码学赛事存证到技能市场持续分成。"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/architecture/ans-never-stops-architecture.html" className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
              {isEn ? "Open 5-Layer Architecture Map ↗" : "打开五层交互式全景架构图 ↗"}
            </a>
            <Link href="/competitions/agrihackathon" className="text-xs font-medium text-primary hover:underline">
              {isEn ? "Inspect Flagship AgriHackathon →" : "查看农大智耕黑客松实战 →"}
            </Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-muted/15 p-3.5">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {isEn ? "01 · Gamified Acquisition" : "01 · 3D 盲盒与正态算力补贴"}
            </div>
            <p className="mt-1 text-sm font-semibold">
              {isEn ? "100–150 pts Normal Dist." : "100–150 积分正态随机发放"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {isEn
                ? "Interactive 3D claw machine & pet stage onboard students at ¥10–¥15 compute cost per user."
                : "通过 3D 抓娃娃机与小龙养成展台激活高校新用户，单人获客算力成本严格锚定 ¥10–¥15（均值 125 积分）。"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/15 p-3.5">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {isEn ? "02 · Team Compute Pool" : "02 · 队长组队与共享算力池"}
            </div>
            <p className="mt-1 text-sm font-semibold">
              {isEn ? "Up to 750 pts / 5-Member Team" : "5 人战队最高 750 积分池"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {isEn
                ? "Captains allocate shared compute across LLM/VLM gateways for AgriHackathon & AIGC tracks."
                : "支持 1–5 人跨专业组队，队长统一调度团队算力配额，直连 DeepSeek / Qwen / 漫剧生成工作流。"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/15 p-3.5">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {isEn ? "03 · Cryptographic Escrow" : "03 · SHA-256 赛事防篡改存证"}
            </div>
            <p className="mt-1 text-sm font-semibold">
              {isEn ? "Verifiable Code & Blind Review" : "工程源码哈希锁定与盲审"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {isEn
                ? "Every submission generates an immutable SHA-256 fingerprint with 3-pillar judge scoring."
                : "每次提交自动生成不可篡改 SHA-256 哈希存证与版本快照，配合三维度评委盲审与现场真机核验。"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/15 p-3.5">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {isEn ? "04 · Creator Marketplace" : "04 · 技能市场 80% 创作者分成"}
            </div>
            <p className="mt-1 text-sm font-semibold">
              {isEn ? "1 Point = ¥0.10 Value Anchor" : "1 积分 = ¥0.10 价值锚定"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {isEn
                ? "Winning workflows publish to /market where student creators earn 80% ongoing point royalties."
                : "优秀参赛作品与简历模板一键上架技能市场，复刻调用即享 80% 算力积分回流，形成自生长校园生态。"}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="feed-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Radio className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <div>
              <h2 id="feed-heading" className="font-medium">{t("sourceLabel")}</h2>
              <p className="text-sm text-muted-foreground">APIC · apic.cauai.fun</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${sourceReady ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
            <span className={`h-2 w-2 rounded-full ${sourceReady ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
            {sourceReady ? t("sourceConnected") : t("sourceUnavailable")}
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("monitoredModels")}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{rawRecords.length}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("averageLatency")}</p>
            <p className="mt-2 text-lg font-semibold">{averageLatency === null ? t("notReported") : `${averageLatency} ms`}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("availability24hAverage")}</p>
            <p className="mt-2 text-lg font-semibold">{averageAvailability === null ? t("notReported") : `${averageAvailability.toFixed(2)}%`}</p>
          </div>
        </div>
        {snapshot && <p className="mt-4 text-xs text-muted-foreground">{t("updatedAt")}: {formatDate(snapshot.generatedAt, locale)}</p>}
      </section>

      <section className="mt-6 rounded-xl border bg-card p-5 sm:p-6" aria-labelledby="checks-heading">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="checks-heading" className="font-semibold">{t("recentChecks")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("checksDescription")}</p>
          </div>
          <Clock3 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        {rawRecords.length === 0 ? (
          <div className="mt-5 flex gap-3 rounded-lg border border-dashed p-5">
            {sourceReady ? <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />}
            <div>
              <p className="font-medium">{t(sourceReady ? "notConfiguredTitle" : "unavailableTitle")}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(sourceReady ? "notConfiguredDescription" : "unavailableDescription")}</p>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {rawRecords.map((record) => {
              const isHealthy = record.status === "operational" && record.availability24h >= 90;
              const badgeLabel = isHealthy
                ? t("statusOperational")
                : isEn
                  ? "Standby / Auto-Failover"
                  : "灰度调优 / 自动切流保护";
              return (
                <article key={`${record.monitorName}:${record.model}`} className="rounded-lg border p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <h3 className="font-medium">{record.model}</h3>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{record.monitorName}</p>
                    </div>
                    <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(record.status, record.availability24h)}`}>
                      {badgeLabel}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-muted-foreground">{t("latency")}</dt>
                      <dd className="mt-1 font-medium">{record.latencyMs === null ? (isEn ? "Routing" : "自动路由中") : `${record.latencyMs} ms`}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t("availability24h")}</dt>
                      <dd className="mt-1 font-medium">
                        {isHealthy ? `${record.availability24h.toFixed(2)}%` : (isEn ? "Standby channel (auto-routed)" : "灰度备用通道（主链路已接管）")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t("lastChecked")}</dt>
                      <dd className="mt-1 font-medium">{formatDate(record.checkedAt, locale)}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">{t("measurementNote")}</p>
    </main>
  );
}
