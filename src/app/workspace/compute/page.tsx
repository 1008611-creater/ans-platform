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

const GUEST_EMPTY_HISTORY: Awaited<ReturnType<typeof readComputeHistory>> = {
  summary: {
    availablePoints: 0,
    reservedPoints: 0,
    consumedPoints: 0,
    refundedPoints: 0,
    taskCount: 0,
  },
  nextCursor: null,
  tasks: [],
};

const SAMPLE_COMPUTE_TASKS = [
  {
    taskId: "sample-canvas-4k",
    badge: "📖 范例 #1 · 差额退还",
    modelId: "CAUAI-Canvas · 4K 无限画布多模态渲染",
    authorizedPoints: 60,
    settledPoints: 48,
    refundedPoints: 12,
    note: "预授权冻结 60 点 → 实际生成 10 张结算 48 点 → 自动退回 12 点",
  },
  {
    taskId: "sample-agri-uav",
    badge: "📖 范例 #2 · 按秒计费",
    modelId: "Agri-UAV · 农田多光谱病虫害推理节点",
    authorizedPoints: 15,
    settledPoints: 9,
    refundedPoints: 6,
    note: "预授权冻结 15 点 → 实际推理耗时结算 9 点 → 自动退回 6 点",
  },
  {
    taskId: "sample-academic-site",
    badge: "📖 范例 #3 · 网页构建",
    modelId: "ANS-Studio · 学术主页静态构建与视觉生成",
    authorizedPoints: 30,
    settledPoints: 22,
    refundedPoints: 8,
    note: "预授权冻结 30 点 → 实际生成 4 张配图结算 22 点 → 自动退回 8 点",
  },
];

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
    return (
      <div className="space-y-0" data-testid="compute-guest-preview">
        <div className="border-b border-primary/20 bg-primary/5 px-4 py-3" data-testid="compute-guest-banner">
          <div className="ans-product-container flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">
              <strong className="font-semibold text-foreground">当前未登录（真实可用算力 0 点）：</strong>
              登录后可查看你的真实算力预授权、实耗结算与差额退回记录。
            </p>
            <div className="flex items-center gap-2">
              <Button asChild size="sm">
                <Link href="/login?callbackUrl=%2Fworkspace%2Fcompute">登录查看真实算力账单</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/workspace/models">浏览可用模型列表</Link>
              </Button>
            </div>
          </div>
        </div>
        <ComputeHistory
          userId="guest-preview"
          history={GUEST_EMPTY_HISTORY}
          filter={filter}
          paged={false}
        />
        <div className="ans-product-container pb-12">
          <details className="group rounded-xl border bg-card p-5">
            <summary className="cursor-pointer list-none font-semibold flex items-center justify-between">
              <span>📖 算力预授权与实耗退差账单范例（3 条）</span>
              <span className="text-xs font-normal text-muted-foreground group-open:hidden">▾</span>
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {SAMPLE_COMPUTE_TASKS.map((sample) => (
                <div key={sample.taskId} className="rounded-xl border bg-muted/20 p-4 space-y-2">
                  <span className="inline-block rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium">
                    {sample.badge}
                  </span>
                  <h3 className="text-sm font-semibold">{sample.modelId}</h3>
                  <p className="text-xs text-muted-foreground">{sample.note}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
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
