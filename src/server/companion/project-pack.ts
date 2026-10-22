import type { AgentLink } from "@/contracts/companion-agent";

/** 与 PiActionResult 结构兼容，但 toolUsed 取本工具自己的名字（不改 pi-agent 的联合类型）。 */
export interface ProjectPackResult {
  ok: boolean;
  error?: string;
  toolUsed: "run_project_pack";
  replyZh: string;
  replyEn: string;
  trace?: string[];
  traceEn?: string[];
  data?: unknown;
  links: AgentLink[];
}

const ARTIFACT_LINK = (projectId: string): AgentLink => ({
  href: `/projects/${projectId}`,
  title: "看产物",
  detail: "简历条目 / README / 一页介绍",
  titleEn: "View artifacts",
  detailEn: "Resume entry / README / One-page intro",
  icon: "project",
});

/**
 * 让 Agent 替用户把项目的三份产物一次跑完（简历条目 / README / 一页介绍）。
 *
 * 价值判断：这是「替用户走完一步」——本来要他自己找到三张卡、逐个点「生成草稿」。
 * 约束：
 *  - 只在项目详情页可用（projectId 从 pathname 取，Agent 不能指定别的项目）；
 *  - 会真实扣积分，必须由用户的明确短句确认（isExplicitChargeConfirmation）才执行；
 *  - 归属由 runProjectPack 内部 loadOwned 强制校验。
 */
export async function runProjectPackViaPi(actor: string, projectId: string | null, userConfirmed: boolean): Promise<ProjectPackResult> {
  const toolUsed = "run_project_pack" as const;
  if (!projectId) {
    return {
      ok: false,
      error: "NOT_ON_PROJECT",
      toolUsed,
      replyZh: "这个动作要在项目详情页里做：先打开一个项目，再说「把这三份产物跑出来」。",
      replyEn: "Open a project first, then ask me to generate its three artifacts.",
      links: [],
    };
  }
  if (!userConfirmed) {
    return {
      ok: false,
      error: "CONFIRM_REQUIRED",
      toolUsed,
      replyZh: "这一步会**真实生成 3 份产物**（简历条目 / README / 一页介绍），并按实际用量扣积分。确认的话回一句「**可以**」或「**执行**」。",
      replyEn: "This creates 3 real artifacts and charges by actual usage. Reply ok or go to confirm.",
      links: [],
    };
  }
  try {
    const { runProjectPack } = await import("@/server/projects/service");
    const res = await runProjectPack(projectId, actor, {});
    const done = res.artifacts.length;
    const failed = res.failures.length;
    const failedCodes = res.failures.map((item) => item.code).join(", ");
    const replyZh = res.status === "succeeded"
      ? `✅ 已经替你跑完 **${done} 份产物**（简历条目 / README / 一页介绍）。回项目页就能下载，账单按实际用量结算。`
      : res.status === "partial"
        ? `⚠️ 跑完 **${done} 份**，还有 ${failed} 份没成（${failedCodes}）。可以先看已完成的部分，稍后再补。`
        : `没能生成产物（${failedCodes}）。没有产出就不会按产出扣费，可以稍后重试。`;
    return {
      ok: res.status !== "failed",
      ...(res.status === "failed" ? { error: "WORKFLOW_FAILED" } : {}),
      toolUsed,
      trace: [
        "[1/3] agent.project_pack · 校验项目归属与事实完整度",
        `[2/3] agent.workflow_runner · 生成 3 份产物（成功 ${done} / 失败 ${failed}）`,
        "[3/3] agent.billing · 按实际用量结算",
      ],
      traceEn: [
        "[1/3] agent.project_pack · verified ownership and fact completeness",
        `[2/3] agent.workflow_runner · generated 3 artifacts (ok ${done} / failed ${failed})`,
        "[3/3] agent.billing · settled by actual usage",
      ],
      replyZh,
      replyEn: res.status === "succeeded"
        ? `Done — ${done} artifacts are ready. Open the project page to download them; billing is settled by actual usage.`
        : res.status === "partial"
          ? `${done} artifacts finished, ${failed} failed. Use what is ready and retry the rest later.`
          : "No artifact was produced, so nothing is charged for output. You can retry later.",
      data: { status: res.status, artifacts: done, failures: res.failures },
      links: [ARTIFACT_LINK(projectId)],
    };
  } catch (error) {
    const mod = await import("@/server/projects/service").catch(() => null);
    const code = mod && error instanceof mod.ProjectServiceError ? error.code : "WORKFLOW_FAILED";
    const detail = error instanceof Error ? error.message : "生成失败，请稍后重试。";
    return { ok: false, error: code, toolUsed, replyZh: `没能跑起来：${detail}`, replyEn: `Could not start: ${detail}`, data: { code }, links: [] };
  }
}
