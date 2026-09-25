/**
 * 真实数据库端到端验收脚本。
 *
 * 目标：在真实 Postgres 上跑通「注册 → 创作 → 审核 → 发布 → 运行 → 收藏 → 复用」
 * 这条北极星循环，并验证额度、审计、权限和 BYOK 的真实落库结果。
 *
 * 运行方式（需要一个已应用全部迁移的库）：
 *   $env:DATABASE_URL='postgresql://user:pass@127.0.0.1:5432/db'
 *   $env:MODEL_CREDENTIAL_SECRET='...'
 *   npx tsx scripts/e2e-acceptance.ts
 *
 * 模型节点不访问外网：脚本用本地假的模型客户端注入，验证的是编排、
 * 落库、额度、审计与权限，不验证上游网关可用性。
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { createWorkflow, createWorkflowRun, publishWorkflow, recheckWorkflowReview, reviewWorkflow, submitWorkflowForReview } from "@/server/workflows/service";
import { executePersistedWorkflow } from "@/server/workflows/runner";
import { addFavorite, listFavorites, removeFavorite } from "@/server/favorites/service";
import { createCredential, listCredentials, resolveCredentialForRun } from "@/server/credentials/service";

const db = new PrismaClient();
const suffix = randomUUID().slice(0, 8);
const results: { name: string; ok: boolean; detail: string }[] = [];

function check(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function expectThrows(name: string, fn: () => Promise<unknown>, expectedCode?: string) {
  try {
    await fn();
    check(name, false, "预期失败但成功了");
  } catch (error) {
    const code = (error as { code?: string }).code;
    check(name, expectedCode === undefined || code === expectedCode, `code=${code ?? "n/a"}`);
  }
}

const definition = {
  version: 1 as const,
  maxNodes: 20,
  nodes: [
    {
      id: "draft",
      type: "prompt" as const,
      label: "整理提纲",
      config: {
        prompt: "请把 {{input.topic}} 整理成三条要点。",
        variables: [{ key: "topic", label: "主题", required: true }],
      },
      timeoutMs: 30_000,
      maxRetries: 1,
    },
    {
      id: "polish",
      type: "model" as const,
      label: "润色",
      config: { prompt: "把下面的内容润色成一句话：{{draft}}" },
      timeoutMs: 30_000,
      maxRetries: 1,
    },
    {
      id: "final",
      type: "output" as const,
      label: "输出",
      config: {},
      timeoutMs: 30_000,
      maxRetries: 0,
    },
  ],
  edges: [
    { id: "e1", from: "draft", to: "polish", mapping: {} },
    { id: "e2", from: "polish", to: "final", mapping: {} },
  ],
};

async function main() {
  console.log("== 0. 准备账号 ==");
  const author = await db.user.create({
    data: {
      email: `author-${suffix}@cau.edu.cn`,
      username: `author-${suffix}`,
      nickname: `作者${suffix}`,
      quotaPoints: 50,
      emailVerified: new Date(),
    },
  });
  const student = await db.user.create({
    data: {
      email: `student-${suffix}@cau.edu.cn`,
      username: `student-${suffix}`,
      nickname: `同学${suffix}`,
      quotaPoints: 20,
      emailVerified: new Date(),
    },
  });
  const reviewer = await db.user.create({
    data: {
      email: `admin-${suffix}@cau.edu.cn`,
      username: `admin-${suffix}`,
      role: "ADMIN",
      quotaPoints: 0,
      emailVerified: new Date(),
    },
  });
  check("创建作者/学生/审核者账号", Boolean(author.id && student.id && reviewer.id));

  console.log("\n== 1. 创作与版本 ==");
  const slug = `acceptance-flow-${suffix}`;
  const workflow = await createWorkflow(author.id, {
    slug,
    title: "端到端验收工作流",
    summary: "验收脚本使用",
    estimatedCost: 3,
    definition,
  });
  check("创建工作流并生成 v1", workflow.versions.length === 1 && workflow.versions[0].version === 1);

  await expectThrows(
    "环检测拦截非法定义",
    () =>
      createWorkflow(author.id, {
        slug: `cyclic-${suffix}`,
        title: "含环工作流",
        definition: {
          ...definition,
          edges: [
            ...definition.edges,
            { id: "e3", from: "final", to: "draft", mapping: {} },
          ],
        },
      }),
    "INVALID_GRAPH",
  );

  await expectThrows(
    "非作者不能提交他人工作流",
    () => submitWorkflowForReview(slug, student.id),
    "FORBIDDEN",
  );

  console.log("\n== 2. 审核与发布 ==");
  await expectThrows(
    "未提交的工作流不能直接发布",
    () => reviewWorkflow(slug, reviewer.id, { action: "publish", note: "越权尝试" }),
    "INVALID_STATE",
  );
  await submitWorkflowForReview(slug, author.id);
  const submitted = await db.workflow.findUniqueOrThrow({ where: { slug } });
  check("提交审核后状态为 PENDING", submitted.status === "PENDING");

  await expectThrows(
    "审核者不能审核自己创建的内容",
    () => reviewWorkflow(slug, author.id, { action: "publish", note: "自审" }),
    "FORBIDDEN",
  );
  const published = await reviewWorkflow(slug, reviewer.id, { action: "publish", note: "内容合规" });
  check("审核通过后发布并钉住版本", published.status === "PUBLISHED" && published.publishedVersion === 1);

  console.log("\n== 2.5 AI 初审把关 ==");
  const gatedSlug = `acceptance-gate-${suffix}`;
  const gated = await createWorkflow(author.id, {
    slug: gatedSlug,
    title: "AI 初审把关工作流",
    estimatedCost: 1,
    definition,
  });
  // 本机没有配置 WORKFLOW_REVIEW_*，提交时应落到 NOT_CONFIGURED，
  // 这样运维侧能区分「没开这个功能」和「服务故障」。
  await submitWorkflowForReview(gatedSlug, author.id);
  const submittedScore = (await db.workflow.findUniqueOrThrow({ where: { id: gated.id } }))
    .reviewScore as { verdict?: string; unavailableReason?: string } | null;
  check(
    "提交即写入 AI 初审结论",
    submittedScore?.verdict === "UNAVAILABLE" && submittedScore?.unavailableReason === "NOT_CONFIGURED",
    `${submittedScore?.verdict ?? "无"}/${submittedScore?.unavailableReason ?? "无"}`,
  );

  // 未配置初审时人工把关是唯一兜底，所以这里应当放行；把结论换成 BLOCKED 就必须拦住。
  await db.workflow.update({
    where: { id: gated.id },
    data: {
      reviewScore: {
        verdict: "BLOCKED",
        source: "AI",
        pass: false,
        scores: { compliance: 40, quality: 40, intent: 40 },
        reason: "验收注入的未通过结论",
        model: "acceptance",
        checkedAt: new Date().toISOString(),
      },
    },
  });
  await expectThrows(
    "AI 初审未通过时人工不能发布",
    () => reviewWorkflow(gatedSlug, reviewer.id, { action: "publish", note: "试图放行" }),
    "REVIEW_REQUIRED",
  );

  await db.workflow.update({
    where: { id: gated.id },
    data: {
      reviewScore: {
        verdict: "PASS",
        source: "AI",
        pass: true,
        scores: { compliance: 95, quality: 90, intent: 90 },
        reason: "验收注入的通过结论",
        model: "acceptance",
        checkedAt: new Date().toISOString(),
      },
    },
  });
  const gatedPublished = await reviewWorkflow(gatedSlug, reviewer.id, {
    action: "publish",
    note: "初审通过后放行",
  });
  const gatedRow = await db.workflow.findUniqueOrThrow({ where: { id: gated.id } });
  check(
    "AI 初审通过后可发布且记录复核人信息",
    gatedPublished.status === "PUBLISHED" &&
      gatedRow.reviewNote === "初审通过后放行" &&
      gatedRow.reviewedAt !== null,
  );

  await expectThrows(
    "管理员不能复审自己创建的工作流",
    () => recheckWorkflowReview(gatedSlug, author.id),
    "FORBIDDEN",
  );

  const recheckSlug = `acceptance-recheck-${suffix}`;
  const recheckWorkflow = await createWorkflow(author.id, {
    slug: recheckSlug,
    title: "复审演练工作流",
    estimatedCost: 1,
    definition,
  });
  await submitWorkflowForReview(recheckSlug, author.id);
  await recheckWorkflowReview(recheckSlug, reviewer.id);
  const recheckRow = await db.workflow.findUniqueOrThrow({ where: { id: recheckWorkflow.id } });
  check(
    "管理员重新发起 AI 初审会刷新结论",
    (recheckRow.reviewScore as { verdict?: string } | null)?.verdict === "UNAVAILABLE",
    String((recheckRow.reviewScore as { verdict?: string } | null)?.verdict ?? "无"),
  );

  console.log("\n== 3. 额度与运行 ==");
  await expectThrows(
    "额度不足时拒绝创建运行",
    () =>
      createWorkflowRun(slug, reviewer.id, { input: { topic: "额度测试" } }),
    "INSUFFICIENT_QUOTA",
  );

  const run = await createWorkflowRun(slug, student.id, { input: { topic: "校园 AI 社区" } });
  const afterDebit = await db.user.findUniqueOrThrow({ where: { id: student.id } });
  check("创建运行即扣除额度", run.costPoints === 3 && afterDebit.quotaPoints === 17, `余额 ${afterDebit.quotaPoints}`);
  check("运行创建时预置全部节点记录", run.nodeRuns.length === definition.nodes.length);

  const executed = await executePersistedWorkflow(run.id, student.id, {
    handlers: {
      prompt: ({ node }) => `要点：${node.label}`,
      model: async ({ dependencyOutputs }) => `润色结果：${Object.values(dependencyOutputs)[0]}`,
      output: ({ dependencyOutputs }) => Object.values(dependencyOutputs).at(-1),
    },
  });
  check("工作流执行成功并产出结果", executed?.status === "succeeded", String(executed?.output ?? ""));

  const persistedRun = await db.workflowRun.findUniqueOrThrow({
    where: { id: run.id },
    include: { nodeRuns: true },
  });
  check(
    "节点状态逐条落库",
    persistedRun.status === "SUCCEEDED" &&
      persistedRun.nodeRuns.every((nodeRun) => nodeRun.status === "SUCCEEDED"),
    persistedRun.nodeRuns.map((n) => `${n.nodeId}:${n.status}`).join(", "),
  );

  await expectThrows(
    "同一运行不能被重复执行",
    async () => {
      const again = await executePersistedWorkflow(run.id, student.id, {});
      if (again === null) throw Object.assign(new Error("already started"), { code: "ALREADY_STARTED" });
    },
    "ALREADY_STARTED",
  );

  await expectThrows(
    "他人不能执行我的运行",
    async () => {
      const foreign = await executePersistedWorkflow(run.id, author.id, {});
      if (foreign === null) throw Object.assign(new Error("not found"), { code: "NOT_FOUND" });
    },
    "NOT_FOUND",
  );

  console.log("\n== 4. 失败退费 ==");
  const failingRun = await createWorkflowRun(slug, student.id, { input: { topic: "失败路径" } });
  const failed = await executePersistedWorkflow(failingRun.id, student.id, {
    handlers: {
      prompt: () => "ok",
      model: () => {
        throw new Error("上游模型不可用");
      },
      output: () => null,
    },
  });
  const afterRefund = await db.user.findUniqueOrThrow({ where: { id: student.id } });
  check("运行失败会退费且只退一次", failed?.status === "failed" && afterRefund.quotaPoints === 17, `余额 ${afterRefund.quotaPoints}`);
  const refunds = await db.quotaLedger.count({
    where: { userId: student.id, reason: "REFUND", refId: failingRun.id },
  });
  check("退费流水唯一", refunds === 1, `refund 流水 ${refunds} 条`);

  console.log("\n== 5. 收藏与复用 ==");
  const favorite = await addFavorite(student.id, "WORKFLOW", workflow.id);
  const again = await addFavorite(student.id, "WORKFLOW", workflow.id);
  check("收藏幂等", favorite.created === true && again.created === false);

  const favorites = await listFavorites(student.id);
  check(
    "收藏列表能解析出标题与链接",
    favorites.length === 1 && favorites[0].href === `/workflows/${slug}`,
    favorites[0]?.title ?? "空",
  );

  await expectThrows(
    "不能收藏未发布内容",
    async () => {
      const draft = await db.workflow.create({
        data: {
          slug: `draft-${suffix}`,
          title: "草稿",
          authorId: author.id,
          versions: { create: { version: 1, definition, createdById: author.id } },
        },
      });
      await addFavorite(student.id, "WORKFLOW", draft.id);
    },
    "TARGET_UNAVAILABLE",
  );

  const rerun = await createWorkflowRun(slug, student.id, { input: { topic: "复用一次" } });
  check("复用：再次运行已发布工作流", rerun.status === "QUEUED");

  await removeFavorite(student.id, "WORKFLOW", workflow.id);
  check("取消收藏生效", (await listFavorites(student.id)).length === 0);

  console.log("\n== 6. BYOK 凭证 ==");
  const credential = await createCredential(student.id, {
    label: "验收 Key",
    baseUrl: "https://api.example.com/v1",
    apiKey: "sk-acceptance-1234567890",
  });
  const stored = await db.userModelCredential.findUniqueOrThrow({ where: { id: credential.id } });
  check("明文 Key 不落库", !stored.encryptedKey.includes("1234567890"), stored.encryptedKey.slice(0, 12));
  check("列表只返回掩码", (await listCredentials(student.id))[0].keyMasked.endsWith("7890"));
  const resolved = await resolveCredentialForRun(student.id, credential.id);
  check("服务端可解密用于运行", resolved.apiKey === "sk-acceptance-1234567890");

  await expectThrows(
    "不能使用他人凭证",
    () => resolveCredentialForRun(author.id, credential.id),
    "CREDENTIAL_UNAVAILABLE",
  );

  console.log("\n== 7. 审计 ==");
  const actions = [
    "WORKFLOW_CREATED",
    "WORKFLOW_SUBMITTED",
    "WORKFLOW_AI_REVIEWED",
    "WORKFLOW_AI_RECHECK_REQUESTED",
    "WORKFLOW_APPROVED",
    "WORKFLOW_RUN_QUEUED",
    "WORKFLOW_RUN_SUCCEEDED",
    "WORKFLOW_RUN_FAILED",
    "FAVORITE_ADDED",
    "FAVORITE_REMOVED",
  ];
  const logged = await db.auditLog.findMany({
    where: { action: { in: actions } },
    select: { action: true },
  });
  const seen = new Set(logged.map((row) => row.action));
  const missing = actions.filter((action) => !seen.has(action));
  check("关键状态变化都有审计记录", missing.length === 0, missing.length ? `缺失 ${missing.join(", ")}` : `${logged.length} 条`);

  const failedRuns = await db.workflowRun.count({ where: { id: failingRun.id, status: "FAILED" } });
  check("失败运行状态落库", failedRuns === 1);

  const failedCount = results.filter((row) => !row.ok).length;
  console.log(`\n== 结果：${results.length - failedCount}/${results.length} 通过 ==`);
  if (failedCount > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("验收脚本异常终止", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
