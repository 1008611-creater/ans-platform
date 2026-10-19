import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { ComputeError } from "@/server/compute/policy";
import { readComputeHistory, type ComputeHistoryFilter } from "@/server/compute/member-history";
import { ComputeHistory } from "@/components/workspace/compute-history";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("product.computeHistory");
  return { title: t("title"), description: t("description"), robots: { index: false, follow: false } };
}

const GUEST_COMPUTE_HISTORY: Awaited<ReturnType<typeof readComputeHistory>> = {
  summary: {
    availablePoints: 125,
    reservedPoints: 15,
    consumedPoints: 340,
    refundedPoints: 20,
    taskCount: 3,
  },
  nextCursor: null,
  tasks: [
    {
      taskId: "compute-demo-canvas-4k-a800",
      modelId: "CAUAI-Canvas · 4K 无限画布多模态渲染集群 (A800 × 2)",
      state: "SETTLED",
      revision: 3,
      authorizedPoints: 60,
      settledPoints: 48,
      refundedPoints: 12,
      maxUnits: 12,
      units: 10,
      unit: "image",
      outcome: "SUCCEEDED",
      policyVersion: "v1",
      createdAt: "2026-10-18T03:20:00.000Z",
      startedAt: "2026-10-18T03:20:02.000Z",
      finishedAt: "2026-10-18T03:20:41.000Z",
    },
    {
      taskId: "compute-demo-agri-uav-infer",
      modelId: "Agri-UAV · 农田多光谱病虫害实时推理节点",
      state: "RUNNING",
      revision: 2,
      authorizedPoints: 15,
      settledPoints: null,
      refundedPoints: 0,
      maxUnits: 30,
      units: null,
      unit: "second",
      outcome: null,
      policyVersion: "v1",
      createdAt: "2026-10-18T04:45:00.000Z",
      startedAt: "2026-10-18T04:45:03.000Z",
      finishedAt: null,
    },
    {
      taskId: "compute-demo-academic-site-gen",
      modelId: "ANS-Studio · 学术主页静态构建与视觉生成流水线",
      state: "SETTLED",
      revision: 2,
      authorizedPoints: 30,
      settledPoints: 22,
      refundedPoints: 8,
      maxUnits: 6,
      units: 4,
      unit: "image",
      outcome: "SUCCEEDED",
      policyVersion: "v1",
      createdAt: "2026-10-17T14:10:00.000Z",
      startedAt: "2026-10-17T14:10:01.000Z",
      finishedAt: "2026-10-17T14:10:25.000Z",
    },
  ],
};

export default async function ComputeHistoryPage({ searchParams }: {
  searchParams?: Promise<{ filter?: string | string[]; cursor?: string | string[] }>;
}) {
  const session = await auth();
  const t = await getTranslations("product.computeHistory");
  const query = await searchParams ?? {};
  const filters: ComputeHistoryFilter[] = ["all", "active", "settled", "released"];
  const filter = typeof query.filter === "string" && filters.includes(query.filter as ComputeHistoryFilter)
    ? query.filter as ComputeHistoryFilter : "all";
  const cursor = typeof query.cursor === "string" ? query.cursor : undefined;
  const userId = session?.user?.id ?? "guest-preview";
  const isGuest = !session?.user?.id;

  if (isGuest) {
    const filteredTasks = GUEST_COMPUTE_HISTORY.tasks.filter((task) => {
      if (filter === "active") return task.state === "AUTHORIZED" || task.state === "RUNNING" || task.state === "UNCERTAIN";
      if (filter === "settled") return task.state === "SETTLED";
      if (filter === "released") return task.state === "RELEASED";
      return true;
    });
    return (
      <div className="space-y-0" data-testid="compute-guest-preview">
        <div className="border-b border-primary/20 bg-primary/5 px-4 py-3" data-testid="compute-guest-banner">
          <div className="ans-product-container flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">
              <strong className="font-semibold text-foreground">算力兑换与结算沙盒预览：</strong>
              当前展示平台「预授权冻结 → 实耗结算 → 差额秒退」的 GPU 算力调度账单样例；登录后可查看你的真实算力任务与推理回执。
            </p>
            <div className="flex items-center gap-2">
              <Button asChild size="sm">
                <Link href="/login?callbackUrl=%2Fworkspace%2Fcompute">登录同步真实算力账单</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/workspace/models">浏览可用模型列表</Link>
              </Button>
            </div>
          </div>
        </div>
        <ComputeHistory
          userId="guest-preview"
          history={{ ...GUEST_COMPUTE_HISTORY, tasks: filteredTasks }}
          filter={filter}
          paged={false}
        />
      </div>
    );
  }

  let history;
  let failed = false;
  let invalidCursor = Array.isArray(query.cursor);
  if (!invalidCursor) {
    try { history = await readComputeHistory(userId, { filter, cursor }); }
    catch (error) {
      if (error instanceof ComputeError && error.code === "COMPUTE_ACCOUNT_UNAVAILABLE") redirect("/login?callbackUrl=%2Fworkspace%2Fcompute");
      invalidCursor = error instanceof ComputeError && error.code === "COMPUTE_CURSOR_INVALID";
      failed = !invalidCursor;
    }
  }
  if (!history) return <div className="ans-product-shell"><div className="ans-product-container space-y-6 py-12">
    <Button asChild variant="ghost"><Link href="/workspace">{t("back")}</Link></Button>
    <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
    <div role="alert" className="max-w-2xl rounded-[var(--radius)] border p-6">
      <p className="font-medium">{t(failed ? "unavailableTitle" : "cursorTitle")}</p>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{t(failed ? "unavailableBody" : "cursorBody")}</p>
      <Button asChild variant="outline" className="mt-5"><a href={`/workspace/compute?filter=${filter}`}>{t("reload")}</a></Button>
    </div>
  </div></div>;
  return <ComputeHistory userId={userId} history={history} filter={filter} paged={!!cursor} />;
}
