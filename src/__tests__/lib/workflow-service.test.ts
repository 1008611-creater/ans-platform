// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    workflow: { create: vi.fn(), upsert: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    workflowVersion: { create: vi.fn() },
    workflowRun: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    workflowNodeRun: { createMany: vi.fn() },
    project: { findFirst: vi.fn() },
    quotaLedger: { create: vi.fn() },
    auditLog: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import {
  WorkflowServiceError,
  ensureOfficialWorkflow,
  createWorkflow,
  createWorkflowVersion,
  createWorkflowRun,
  getWorkflowRun,
  listWorkflowRuns,
  getPublishedWorkflow,
  publishWorkflow,
  recheckWorkflowReview,
  reviewWorkflow,
  submitWorkflowForReview,
} from "@/server/workflows/service";

const definition = {
  version: 1,
  maxNodes: 20,
  nodes: [
    { id: "draft", type: "prompt", label: "草稿", config: { prompt: "写 {{input.topic}}" } },
    { id: "final", type: "output", label: "输出", config: {} },
  ],
  edges: [{ id: "draft-final", from: "draft", to: "final", mapping: {} }],
};

const cyclicDefinition = {
  ...definition,
  edges: [
    { id: "ab", from: "draft", to: "final", mapping: {} },
    { id: "ba", from: "final", to: "draft", mapping: {} },
  ],
};

const author = { id: "author1", role: "USER", emailVerified: new Date(), deletedAt: null, flagged: false };
const admin = { id: "admin1", role: "ADMIN", emailVerified: new Date(), deletedAt: null, flagged: false };

const passReview = {
  verdict: "PASS",
  source: "AI",
  pass: true,
  scores: { compliance: 92, quality: 88, intent: 90 },
  reason: "内容合规，变量说明充分。",
  model: "review-model",
  checkedAt: "2026-09-21T00:00:00.000Z",
};

const blockedReview = { ...passReview, verdict: "BLOCKED", pass: false, reason: "存在诱导交出凭证的内容。" };

const unavailableReview = {
  verdict: "UNAVAILABLE",
  source: "AI",
  reason: "AI 初审未配置，保持待审，不能发布",
  unavailableReason: "NOT_CONFIGURED",
  checkedAt: "2026-09-21T00:00:00.000Z",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.user.findUnique.mockResolvedValue({ ...author });
  mocks.db.user.findFirst.mockResolvedValue({ id: "admin1" });
  mocks.db.auditLog.create.mockResolvedValue({ id: "audit1" });
  mocks.db.workflow.create.mockResolvedValue({
    id: "w1",
    slug: "weekly",
    status: "DRAFT",
    authorId: "author1",
    versions: [{ version: 1 }],
  });
  mocks.db.workflow.update.mockResolvedValue({
    id: "w1",
    status: "PUBLISHED",
    publishedVersion: 1,
    title: "周报工作流",
    summary: null,
    description: null,
  });
  mocks.db.workflow.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.workflowVersion.create.mockResolvedValue({ id: "v2", version: 2 });
  mocks.db.workflowRun.create.mockResolvedValue({ id: "run1" });
  mocks.db.workflowRun.findUniqueOrThrow.mockResolvedValue({ id: "run1", nodeRuns: [] });
  mocks.db.workflowNodeRun.createMany.mockResolvedValue({ count: 2 });
  mocks.db.user.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.user.findUniqueOrThrow.mockResolvedValue({ quotaPoints: 7 });
  mocks.db.quotaLedger.create.mockResolvedValue({ id: "ledger1" });
});

describe("createWorkflow", () => {
  it("rejects a payload that fails the contract", async () => {
    await expect(createWorkflow("author1", { title: "缺少 slug" })).rejects.toBeInstanceOf(WorkflowServiceError);
    expect(mocks.db.workflow.create).not.toHaveBeenCalled();
  });

  it("rejects a cyclic graph before writing", async () => {
    const error = await createWorkflow("author1", {
      slug: "weekly",
      title: "周报",
      definition: cyclicDefinition,
    }).catch((thrown) => thrown);

    expect(error).toBeInstanceOf(WorkflowServiceError);
    expect((error as WorkflowServiceError).code).toBe("INVALID_GRAPH");
    expect(mocks.db.workflow.create).not.toHaveBeenCalled();
  });

  it("rejects a flagged author", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ ...author, flagged: true });

    const error = await createWorkflow("author1", {
      slug: "weekly",
      title: "周报",
      definition,
    }).catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("FORBIDDEN");
    expect(mocks.db.workflow.create).not.toHaveBeenCalled();
  });

  it("creates a draft with an immutable v1 and audits it", async () => {
    const workflow = await createWorkflow("author1", {
      slug: "weekly",
      title: "周报工作流",
      summary: "汇总并润色",
      estimatedCost: 5,
      definition,
    });

    expect(workflow.id).toBe("w1");
    expect(mocks.db.workflow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "weekly",
          authorId: "author1",
          estimatedCost: 5,
          versions: { create: expect.objectContaining({ version: 1, createdById: "author1" }) },
        }),
      }),
    );
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "WORKFLOW_CREATED" }) }),
    );
  });

  it("maps a unique violation to a 409 slug conflict", async () => {
    mocks.db.workflow.create.mockRejectedValue(new Error("Unique constraint failed on the fields: (`slug`)"));

    const error = await createWorkflow("author1", {
      slug: "weekly",
      title: "周报",
      definition,
    }).catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("SLUG_EXISTS");
    expect((error as WorkflowServiceError).status).toBe(409);
  });
});

describe("createWorkflowVersion", () => {
  it("returns 404 for an unknown slug", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue(null);

    const error = await createWorkflowVersion("missing", "author1", { definition }).catch((thrown) => thrown);

    expect((error as WorkflowServiceError).status).toBe(404);
  });

  it("blocks a non-author from appending a version", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "someone-else",
      status: "DRAFT",
      versions: [{ version: 1 }],
    });

    const error = await createWorkflowVersion("weekly", "author1", { definition }).catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("FORBIDDEN");
    expect(mocks.db.workflowVersion.create).not.toHaveBeenCalled();
  });

  it("appends the next version number and keeps published status", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "PUBLISHED",
      versions: [{ version: 4 }],
    });

    await createWorkflowVersion("weekly", "author1", { definition });

    expect(mocks.db.workflowVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: 5, workflowId: "w1" }) }),
    );
    expect(mocks.db.workflow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PUBLISHED", reviewNote: null, reviewedAt: null }),
      }),
    );
  });

  it("clears the previous AI verdict so a new definition cannot reuse it", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "DRAFT",
      versions: [{ version: 1 }],
    });

    await createWorkflowVersion("weekly", "author1", { definition });

    const updateCall = mocks.db.workflow.update.mock.calls[0][0];
    expect(updateCall.data.reviewScore).toBeDefined();
    expect(updateCall.data.reviewScore).not.toBe(passReview);
    expect(updateCall.data.reviewNote).toBeNull();
    expect(updateCall.data.reviewedAt).toBeNull();
  });

  it("lets an admin append a version on behalf of the author", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ ...admin });
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "DRAFT",
      versions: [],
    });

    await createWorkflowVersion("weekly", "admin1", { definition });

    expect(mocks.db.workflowVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: 1 }) }),
    );
  });
});

describe("publishWorkflow", () => {
  it("refuses to publish a workflow with no version", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "DRAFT",
      reviewScore: passReview,
      versions: [],
    });

    const error = await publishWorkflow("weekly", "author1").catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("NO_VERSION");
  });

  it("refuses to publish without an AI review verdict", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "DRAFT",
      reviewScore: null,
      versions: [{ version: 1, definition }],
    });

    const error = await publishWorkflow("weekly", "author1").catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("REVIEW_REQUIRED");
    expect((error as WorkflowServiceError).status).toBe(409);
    expect(mocks.db.workflow.update).not.toHaveBeenCalled();
  });

  it("refuses to publish when the AI review blocked the workflow", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "DRAFT",
      reviewScore: blockedReview,
      versions: [{ version: 1, definition }],
    });

    const error = await publishWorkflow("weekly", "author1").catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("REVIEW_REQUIRED");
    expect(mocks.db.workflow.update).not.toHaveBeenCalled();
  });

  it("allows publish when AI review never ran because the server has no reviewer configured", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "DRAFT",
      reviewScore: unavailableReview,
      versions: [{ version: 1, definition }],
    });

    await publishWorkflow("weekly", "author1");

    expect(mocks.db.workflow.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "PUBLISHED", publishedVersion: 1 } }),
    );
  });

  it("keeps the workflow locked when the reviewer service failed", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "DRAFT",
      reviewScore: { ...unavailableReview, unavailableReason: "TIMEOUT" },
      versions: [{ version: 1, definition }],
    });

    const error = await publishWorkflow("weekly", "author1").catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("REVIEW_REQUIRED");
  });

  it("publishes the requested version and records the transition", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "PENDING",
      reviewScore: passReview,
      versions: [
        { version: 3, definition },
        { version: 2, definition },
      ],
    });

    await publishWorkflow("weekly", "author1", 2);

    expect(mocks.db.workflow.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "PUBLISHED", publishedVersion: 2 } }),
    );
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "WORKFLOW_PUBLISHED",
          before: { status: "PENDING" },
          after: { status: "PUBLISHED", publishedVersion: 2 },
        }),
      }),
    );
  });

  it("returns 404 when the requested version does not exist", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "DRAFT",
      reviewScore: passReview,
      versions: [{ version: 1, definition }],
    });

    const error = await publishWorkflow("weekly", "author1", 9).catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("NO_VERSION");
    expect((error as WorkflowServiceError).status).toBe(404);
  });
});

describe("submitWorkflowForReview", () => {
  it("moves a draft to PENDING and records an AI pre-review", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "DRAFT",
      title: "周报工作流",
      summary: null,
      description: null,
      versions: [{ version: 1, definition }],
    });
    mocks.db.workflow.update.mockResolvedValue({
      id: "w1",
      status: "PENDING",
      title: "周报工作流",
      summary: null,
      description: null,
    });

    await submitWorkflowForReview("weekly", "author1");

    expect(mocks.db.workflow.updateMany).toHaveBeenCalledWith({
      where: { id: "w1", status: "DRAFT" },
      data: { status: "PENDING" },
    });
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "WORKFLOW_SUBMITTED" }) }),
    );
    // 未配置 WORKFLOW_REVIEW_* / TEMPLATE_REVIEW_* 时应落到 NOT_CONFIGURED，
    // 而不是抛错或静默留下空结论。
    expect(mocks.db.workflow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "w1" },
        data: {
          reviewScore: expect.objectContaining({
            verdict: "UNAVAILABLE",
            unavailableReason: "NOT_CONFIGURED",
          }),
        },
      }),
    );
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "WORKFLOW_AI_REVIEWED" }) }),
    );
  });

  it("does not rerun AI review when a submission is already pending", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "PENDING",
      title: "test workflow",
      summary: null,
      description: null,
      versions: [{ version: 1, definition }],
    });

    const submitted = await submitWorkflowForReview("weekly", "author1");

    expect(submitted.status).toBe("PENDING");
    expect(mocks.db.workflow.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.db.workflow.update).not.toHaveBeenCalled();
  });

  it("treats a concurrent submission as already accepted without running AI review twice", async () => {
    mocks.db.workflow.findUnique
      .mockResolvedValueOnce({
        id: "w1",
        authorId: "author1",
        status: "DRAFT",
        title: "test workflow",
        summary: null,
        description: null,
        versions: [{ version: 1, definition }],
      })
      .mockResolvedValueOnce({ status: "PENDING" });
    mocks.db.workflow.updateMany.mockResolvedValueOnce({ count: 0 });

    const submitted = await submitWorkflowForReview("weekly", "author1");

    expect(submitted.status).toBe("PENDING");
    expect(mocks.db.workflow.updateMany).toHaveBeenCalledTimes(1);
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.db.workflow.update).not.toHaveBeenCalled();
  });

  it("still submits when the AI reviewer is unreachable", async () => {
    process.env.WORKFLOW_REVIEW_MODEL = "review-model";
    process.env.WORKFLOW_REVIEW_BASE_URL = "https://review.invalid/v1";
    process.env.WORKFLOW_REVIEW_API_KEY = "review-key";
    const fetchMock = vi.fn().mockRejectedValue(new Error("gateway down"));
    vi.stubGlobal("fetch", fetchMock);
    try {
      mocks.db.workflow.findUnique.mockResolvedValue({
        id: "w1",
        authorId: "author1",
        status: "DRAFT",
        title: "周报工作流",
        summary: null,
        description: null,
        versions: [{ version: 1, definition }],
      });
      mocks.db.workflow.update.mockResolvedValue({
        id: "w1",
        status: "PENDING",
        title: "周报工作流",
        summary: null,
        description: null,
      });

      const submitted = await submitWorkflowForReview("weekly", "author1");

      expect(submitted.status).toBe("PENDING");
      expect(mocks.db.workflow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            reviewScore: expect.objectContaining({
              verdict: "UNAVAILABLE",
              unavailableReason: "REQUEST_FAILED",
            }),
          },
        }),
      );
    } finally {
      vi.unstubAllGlobals();
      delete process.env.WORKFLOW_REVIEW_MODEL;
      delete process.env.WORKFLOW_REVIEW_BASE_URL;
      delete process.env.WORKFLOW_REVIEW_API_KEY;
    }
  });
});

describe("reviewWorkflow", () => {
  it("requires a review note", async () => {
    const error = await reviewWorkflow("weekly", "admin1", { action: "publish", note: "  " }).catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("INVALID_INPUT");
    expect(mocks.db.workflow.findUnique).not.toHaveBeenCalled();
  });

  it("refuses to let the author review their own workflow", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "admin1",
      status: "PENDING",
      reviewScore: passReview,
      versions: [{ version: 1, definition }],
    });


    const error = await reviewWorkflow("weekly", "admin1", { action: "publish", note: "通过" }).catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("SELF_REVIEW_FORBIDDEN");
    expect((error as WorkflowServiceError).status).toBe(403);
    expect(mocks.db.workflow.update).not.toHaveBeenCalled();
  });

  it("refuses to review a workflow that is not pending", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "DRAFT",
      reviewScore: passReview,
      versions: [{ version: 1, definition }],
    });

    const error = await reviewWorkflow("weekly", "admin1", { action: "publish", note: "通过" }).catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("INVALID_STATE");
    expect((error as WorkflowServiceError).status).toBe(409);
  });

  it("approves and pins the latest version", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "PENDING",
      reviewScore: passReview,
      versions: [{ version: 2, definition }],
    });

    await reviewWorkflow("weekly", "admin1", { action: "publish", note: "内容合规" });

    expect(mocks.db.workflow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PUBLISHED",
          publishedVersion: 2,
          reviewNote: "内容合规",
          reviewedAt: expect.any(Date),
        }),
      }),
    );
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "WORKFLOW_APPROVED" }) }),
    );
  });

  it("refuses to publish before the AI review passed", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "PENDING",
      reviewScore: null,
      versions: [{ version: 2, definition }],
    });

    const error = await reviewWorkflow("weekly", "admin1", { action: "publish", note: "先发布" }).catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("REVIEW_REQUIRED");
    expect((error as WorkflowServiceError).status).toBe(409);
    expect(mocks.db.workflow.update).not.toHaveBeenCalled();
  });

  it("refuses to publish a workflow the AI review blocked", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "PENDING",
      reviewScore: blockedReview,
      versions: [{ version: 2, definition }],
    });

    const error = await reviewWorkflow("weekly", "admin1", { action: "publish", note: "放行" }).catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("REVIEW_REQUIRED");
  });

  it("keeps the workflow pending when the reviewer service failed", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "PENDING",
      reviewScore: { ...unavailableReview, unavailableReason: "INVALID_RESPONSE" },
      versions: [{ version: 2, definition }],
    });

    const error = await reviewWorkflow("weekly", "admin1", { action: "publish", note: "放行" }).catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("REVIEW_REQUIRED");
  });

  it("lets a human publish when the server never configured an AI reviewer", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "PENDING",
      reviewScore: unavailableReview,
      versions: [{ version: 2, definition }],
    });

    await reviewWorkflow("weekly", "admin1", { action: "publish", note: "人工把关" });

    expect(mocks.db.workflow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PUBLISHED", publishedVersion: 2 }),
      }),
    );
  });

  it("rejects without pinning a version", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "PENDING",
      reviewScore: blockedReview,
      versions: [{ version: 2, definition }],
    });

    await reviewWorkflow("weekly", "admin1", { action: "reject", note: "缺少来源说明" });

    expect(mocks.db.workflow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REJECTED", reviewNote: "缺少来源说明" }),
      }),
    );
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "WORKFLOW_REJECTED" }) }),
    );
  });
});

describe("recheckWorkflowReview", () => {
  it("clears the stale verdict before asking the AI again", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "PENDING",
      title: "周报工作流",
      summary: null,
      description: null,
      versions: [{ version: 3, definition }],
    });

    await recheckWorkflowReview("weekly", "admin1");

    // 先清空再重跑，避免旧 PASS 在请求期间被拿去发布。
    expect(mocks.db.workflow.update).toHaveBeenNthCalledWith(1, {
      where: { id: "w1" },
      data: { reviewScore: expect.anything() },
    });
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "WORKFLOW_AI_RECHECK_REQUESTED" }),
      }),
    );
  });

  it("refuses to let the author-admin recheck their own workflow", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "admin1",
      status: "PENDING",
      title: "周报工作流",
      summary: null,
      description: null,
      versions: [{ version: 3, definition }],
    });

    const error = await recheckWorkflowReview("weekly", "admin1").catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("SELF_REVIEW_FORBIDDEN");
    expect((error as WorkflowServiceError).status).toBe(403);
    expect(mocks.db.workflow.update).not.toHaveBeenCalled();
  });

  it("refuses to recheck a workflow that already left the queue", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "w1",
      authorId: "author1",
      status: "PUBLISHED",
      title: "周报工作流",
      summary: null,
      description: null,
      versions: [{ version: 3, definition }],
    });

    const error = await recheckWorkflowReview("weekly", "admin1").catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("INVALID_STATE");
  });
});

describe("createWorkflowRun", () => {
  const published = {
    id: "w1",
    title: "周报工作流",
    estimatedCost: 4,
    publishedVersion: 2,
    versions: [
      { id: "v2", version: 2, definition },
      { id: "v1", version: 1, definition },
    ],
  };

  it("returns 404 for an unpublished workflow", async () => {
    mocks.db.workflow.findFirst.mockResolvedValue(null);

    const error = await createWorkflowRun("weekly", "user1", { input: {} }).catch((thrown) => thrown);

    expect((error as WorkflowServiceError).status).toBe(404);
    expect(mocks.db.workflowRun.create).not.toHaveBeenCalled();
  });

  it("debits quota and seeds one node run per node inside one transaction", async () => {
    mocks.db.workflow.findFirst.mockResolvedValue(published);

    await createWorkflowRun("weekly", "user1", { input: { topic: "社团招新" } });

    expect(mocks.db.workflowRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workflowId: "w1",
          versionId: "v2",
          userId: "user1",
          costPoints: 4,
          status: "QUEUED",
        }),
      }),
    );
    expect(mocks.db.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quotaPoints: { decrement: 4 } } }),
    );
    expect(mocks.db.workflowNodeRun.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ nodeId: "draft" })]) }),
    );
    expect(mocks.db.workflow.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { useCount: { increment: 1 } } }),
    );
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "WORKFLOW_RUN_QUEUED" }) }),
    );
  });

  it("requires official workflows to be launched from an owned active project", async () => {
    mocks.db.workflow.findFirst.mockResolvedValue({ ...published, isOfficial: true });

    await expect(createWorkflowRun("weekly", "user1", { input: {} })).rejects.toMatchObject({ code: "PROJECT_LINK_REQUIRED", status: 403 });
    expect(mocks.db.workflowRun.create).not.toHaveBeenCalled();
  });

  it("links official project runs and scopes idempotency to the project and workflow", async () => {
    mocks.db.workflow.findFirst.mockResolvedValue({ ...published, isOfficial: true });
    mocks.db.project.findFirst.mockResolvedValue({ id: "project1" });

    await createWorkflowRun("ans-official-resume-bullets", "user1", {
      input: { projectTitle: "Portfolio", prompt: "Write" },
      idempotencyKey: "resume-12345678",
    }, { projectId: "project1" });

    expect(mocks.db.workflowRun.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        projectId: "project1",
        idempotencyKey: "project/project1/ans-official-resume-bullets/resume-12345678",
      }),
    }));
  });

  it("rejects a project run when the project is not owned and active", async () => {
    mocks.db.workflow.findFirst.mockResolvedValue({ ...published, isOfficial: true });
    mocks.db.project.findFirst.mockResolvedValue(null);

    await expect(createWorkflowRun("ans-official-resume-bullets", "user1", { input: {} }, { projectId: "project1" }))
      .rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(mocks.db.workflowRun.create).not.toHaveBeenCalled();
  });

  it("returns an existing idempotent run without charging twice", async () => {
    mocks.db.workflow.findFirst.mockResolvedValue(published);
    const existing = { id: "run-existing", status: "SUCCEEDED", nodeRuns: [] };
    mocks.db.workflowRun.findFirst.mockResolvedValue(existing);

    await expect(createWorkflowRun("weekly", "user1", { input: {}, idempotencyKey: "weekly-12345678" }))
      .resolves.toEqual(existing);
    expect(mocks.db.workflowRun.create).not.toHaveBeenCalled();
    expect(mocks.db.user.updateMany).not.toHaveBeenCalled();
  });

  it("charges at least one point even when the estimate is zero", async () => {
    mocks.db.workflow.findFirst.mockResolvedValue({ ...published, estimatedCost: 0 });

    await createWorkflowRun("weekly", "user1", { input: {} });

    expect(mocks.db.workflowRun.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ costPoints: 1 }) }),
    );
  });

  it("surfaces insufficient quota as a coded service error without creating a run", async () => {
    mocks.db.workflow.findFirst.mockResolvedValue(published);
    mocks.db.user.findUnique.mockResolvedValue({ id: "user1", quotaPoints: 1, flagged: false, deletedAt: null });

    const error = await createWorkflowRun("weekly", "user1", { input: {} }).catch((thrown) => thrown);

    expect(error).toBeInstanceOf(WorkflowServiceError);
    expect((error as WorkflowServiceError).code).toBe("INSUFFICIENT_QUOTA");
    expect((error as WorkflowServiceError).status).toBe(402);
    expect(mocks.db.quotaLedger.create).not.toHaveBeenCalled();
  });

  it("rejects a flagged account", async () => {
    mocks.db.workflow.findFirst.mockResolvedValue(published);
    mocks.db.user.findUnique.mockResolvedValue({ id: "user1", quotaPoints: 100, flagged: true, deletedAt: null });

    const error = await createWorkflowRun("weekly", "user1", { input: {} }).catch((thrown) => thrown);

    expect((error as WorkflowServiceError).code).toBe("ACCOUNT_UNAVAILABLE");
    expect((error as WorkflowServiceError).status).toBe(403);
  });
});

describe("getPublishedWorkflow", () => {
  it("returns null when nothing is published", async () => {
    mocks.db.workflow.findFirst.mockResolvedValue(null);
    expect(await getPublishedWorkflow("weekly")).toBeNull();
  });

  it("exposes the pinned published definition, not the newest draft", async () => {
    mocks.db.workflow.findFirst.mockResolvedValue({
      id: "w1",
      slug: "weekly",
      publishedVersion: 1,
      versions: [
        { version: 2, definition: { ...definition, maxNodes: 99 } },
        { version: 1, definition },
      ],
    });

    const workflow = await getPublishedWorkflow("weekly");

    expect(workflow?.publishedDefinition).toEqual(definition);
  });
});


describe("ensureOfficialWorkflow", () => {
  const input = {
    officialId: "resume-bullets",
    slug: "ans-official-resume-bullets",
    title: "Resume bullets",
    summary: "Create factual resume bullets",
    estimatedCost: 2,
    definition,
    actorId: "user1",
  };

  it("registers a published platform-owned immutable version once", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue(null);
    mocks.db.workflow.upsert.mockResolvedValue({
      id: "official1",
      slug: input.slug,
      isOfficial: true,
      status: "PUBLISHED",
      publishedVersion: 1,
      versions: [{ id: "v1" }],
    });

    const result = await ensureOfficialWorkflow(input);

    expect(result).toEqual({ id: "official1", slug: input.slug });
    expect(mocks.db.workflow.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { officialId: input.officialId },
      create: expect.objectContaining({
        officialId: input.officialId,
        isOfficial: true,
        authorId: "admin1",
        status: "PUBLISHED",
        publishedVersion: 1,
        versions: { create: expect.objectContaining({ version: 1 }) },
      }),
    }));
  });

  it("reuses a valid registration without rewriting its version", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue({
      id: "official1",
      slug: input.slug,
      isOfficial: true,
      status: "PUBLISHED",
      publishedVersion: 1,
      versions: [{ id: "v1" }],
    });
    mocks.db.user.findFirst.mockResolvedValue(null);

    await expect(ensureOfficialWorkflow(input)).resolves.toEqual({ id: "official1", slug: input.slug });
    expect(mocks.db.user.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.workflow.upsert).not.toHaveBeenCalled();
  });


  it("reports an occupied slug instead of leaking a database uniqueness error", async () => {
    mocks.db.workflow.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ officialId: null });

    await expect(ensureOfficialWorkflow(input)).rejects.toMatchObject({ code: "OFFICIAL_WORKFLOW_SLUG_CONFLICT", status: 409 });
    expect(mocks.db.workflow.upsert).not.toHaveBeenCalled();
  });

  it("requires a platform administrator for initial registration", async () => {
    mocks.db.user.findFirst.mockResolvedValue(null);

    await expect(ensureOfficialWorkflow(input)).rejects.toMatchObject({ code: "OFFICIAL_WORKFLOW_OWNER_REQUIRED", status: 503 });
    expect(mocks.db.workflow.upsert).not.toHaveBeenCalled();
  });

  it("reserves the official workflow slug namespace", async () => {
    await expect(createWorkflow("author1", {
      slug: "ans-official-resume-bullets",
      title: "Reserved",
      definition,
    })).rejects.toMatchObject({ code: "RESERVED_SLUG", status: 409 });
    expect(mocks.db.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.workflow.create).not.toHaveBeenCalled();
  });
});

describe("official workflow protection", () => {
  const official = {
    id: "official1",
    slug: "ans-official-resume-bullets",
    authorId: "admin1",
    status: "PENDING",
    isOfficial: true,
    reviewScore: null,
    title: "Official",
    summary: null,
    description: null,
    versions: [{ version: 1, definition }],
  };


  it("cannot be edited through workflow versioning", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue(official);
    await expect(createWorkflowVersion(official.slug, "admin1", { definition })).rejects.toMatchObject({ code: "OFFICIAL_WORKFLOW_LOCKED", status: 403 });
    expect(mocks.db.workflowVersion.create).not.toHaveBeenCalled();
  });

  it("cannot be published through the regular publishing endpoint", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue(official);
    await expect(publishWorkflow(official.slug, "admin1")).rejects.toMatchObject({ code: "OFFICIAL_WORKFLOW_LOCKED", status: 403 });
    expect(mocks.db.workflow.update).not.toHaveBeenCalled();
  });

  it("cannot be submitted for review", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue(official);
    await expect(submitWorkflowForReview(official.slug, "admin1")).rejects.toMatchObject({ code: "OFFICIAL_WORKFLOW_LOCKED", status: 403 });
    expect(mocks.db.workflow.update).not.toHaveBeenCalled();
  });

  it("cannot be rechecked by admins", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue(official);
    await expect(recheckWorkflowReview(official.slug, "admin1")).rejects.toMatchObject({ code: "OFFICIAL_WORKFLOW_LOCKED", status: 403 });
    expect(mocks.db.workflow.update).not.toHaveBeenCalled();
  });

  it("cannot be manually published or rejected through review", async () => {
    mocks.db.workflow.findUnique.mockResolvedValue(official);
    await expect(reviewWorkflow(official.slug, "admin1", { action: "reject", note: "test" })).rejects.toMatchObject({ code: "OFFICIAL_WORKFLOW_LOCKED", status: 403 });
    expect(mocks.db.workflow.update).not.toHaveBeenCalled();
  });
});

describe("workflow run audit metadata", () => {
  const run = {
    id: "run1",
    workflow: { slug: "acceptance", title: "Acceptance" },
    nodeRuns: [],
    output: "done",
    error: null,
    status: "SUCCEEDED",
    costPoints: 1,
  };

  it("exposes model usage from the completion audit log", async () => {
    mocks.db.workflowRun.findFirst.mockResolvedValue(run);
    mocks.db.auditLog.findFirst.mockResolvedValue({
      action: "WORKFLOW_RUN_SUCCEEDED",
      metadata: {
        models: ["openai/gpt-5.6-terra"],
        modelCalls: 2,
        tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        reasoningEffort: "high",
      },
    });

    await expect(getWorkflowRun("run1", "user1")).resolves.toMatchObject({
      id: "run1",
      audit: {
        action: "WORKFLOW_RUN_SUCCEEDED",
        models: ["openai/gpt-5.6-terra"],
        modelCalls: 2,
        tokenUsage: { totalTokens: 30 },
        reasoningEffort: "high",
      },
    });
  });

  it("joins audit metadata for the run history in one query", async () => {
    mocks.db.workflowRun.findMany.mockResolvedValue([run]);
    mocks.db.auditLog.findMany.mockResolvedValue([
      {
        resourceId: "run1",
        action: "WORKFLOW_RUN_SUCCEEDED",
        metadata: { models: ["openai/gpt-5.6-terra"], modelCalls: 1, tokenUsage: { totalTokens: 7 } },
      },
    ]);

    await expect(listWorkflowRuns("user1")).resolves.toMatchObject([
      { id: "run1", audit: { models: ["openai/gpt-5.6-terra"], modelCalls: 1, tokenUsage: { totalTokens: 7 }, reasoningEffort: null } },
    ]);
  });
});
