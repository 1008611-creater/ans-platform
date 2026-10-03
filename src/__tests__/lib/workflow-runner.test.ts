// @vitest-environment node
import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    workflowRun: { findFirst: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    workflowNodeRun: { updateMany: vi.fn() },
    userModelCredential: { findFirst: vi.fn() },
    user: { update: vi.fn() },
    quotaLedger: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { executePersistedWorkflow, interpolate, createWorkflowHandlers } from "@/server/workflows/runner";
import { encryptCredential } from "@/server/integrations/credential-crypto";
import { CredentialServiceError } from "@/server/credentials/service";
import type { WorkflowNodeContext } from "@/domain/workflows/executor";

const SECRET = "runner-test-credential-secret";
const BYOK_KEY = "sk-byok-0000111122223333";

const definition = {
  version: 1 as const,
  maxNodes: 20,
  nodes: [
    { id: "draft", type: "prompt" as const, label: "草稿", config: { prompt: "写 {{input.topic}}" }, timeoutMs: 1000, maxRetries: 0 },
    { id: "final", type: "output" as const, label: "输出", config: {}, timeoutMs: 1000, maxRetries: 0 },
  ],
  edges: [{ id: "draft-final", from: "draft", to: "final", mapping: {} }],
};

const run = {
  id: "run1",
  userId: "user1",
  status: "QUEUED",
  costPoints: 3,
  input: { topic: "校园 AI" },
  version: { definition },
  nodeRuns: [],
  workflow: { title: "测试工作流" },
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("MODEL_CREDENTIAL_SECRET", SECRET);
  vi.stubEnv("RUN_BASE_URL", "https://run.example.test/v1");
  vi.stubEnv("RUN_API_KEY", "platform-key");

  mocks.db.workflowRun.findFirst.mockResolvedValue({ ...run });
  mocks.db.workflowRun.updateMany.mockImplementation(
    async ({ where }: { where: { status?: string | { in?: string[] } } }) => {
      const status = typeof where?.status === "string" ? where.status : undefined;
      if (status === "QUEUED") return { count: 1 };
      if (status === "RUNNING") return { count: 1 };
      return { count: 1 };
    },
  );
  mocks.db.workflowNodeRun.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.user.update.mockResolvedValue({ quotaPoints: 13 });
  mocks.db.quotaLedger.create.mockResolvedValue({ id: "ledger1" });
  mocks.db.auditLog.create.mockResolvedValue({ id: "audit1" });
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("executePersistedWorkflow", () => {
  it("returns null when the run does not belong to the user", async () => {
    mocks.db.workflowRun.findFirst.mockResolvedValue(null);

    expect(await executePersistedWorkflow("run1", "user1")).toBeNull();
    expect(mocks.db.workflowRun.updateMany).not.toHaveBeenCalled();
  });

  it("runs the workflow, persists node results and audits success", async () => {
    const result = await executePersistedWorkflow("run1", "user1", {
      handlers: {
        prompt: ({ node, input }) => `${node.label}:${JSON.stringify(input)}`,
        output: ({ dependencyOutputs }) => dependencyOutputs.draft,
      },
    });

    expect(result?.status).toBe("succeeded");
    expect(result?.output).toBe("草稿:{\"topic\":\"校园 AI\"}");
    expect(mocks.db.workflowNodeRun.updateMany).toHaveBeenCalledTimes(2);
    expect(mocks.db.workflowRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SUCCEEDED", error: null }) }),
    );
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "WORKFLOW_RUN_SUCCEEDED" }) }),
    );
    expect(mocks.db.user.update).not.toHaveBeenCalled();
    expect(mocks.db.quotaLedger.create).not.toHaveBeenCalled();
  });

  it("persists JSON null separately from a missing workflow output", async () => {
    const result = await executePersistedWorkflow("run1", "user1", {
      handlers: { prompt: () => "ok", output: () => null },
    });

    expect(result?.status).toBe("succeeded");
    expect(result?.output).toBeNull();
    expect(mocks.db.workflowRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "RUNNING" }), data: expect.objectContaining({ status: "SUCCEEDED", output: Prisma.JsonNull }) }),
    );
    expect(mocks.db.workflowNodeRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { runId: "run1", nodeId: "final" }, data: expect.objectContaining({ output: Prisma.JsonNull }) }),
    );
  });

  it("finalizes and refunds when execution planning throws", async () => {
    mocks.db.workflowRun.findFirst.mockResolvedValue({
      ...run,
      version: {
        definition: {
          ...definition,
          edges: [{ id: "broken", from: "missing", to: "final", mapping: {} }],
        },
      },
    });

    const result = await executePersistedWorkflow("run1", "user1", {
      handlers: { prompt: () => "ok", output: ({ dependencyOutputs }) => dependencyOutputs.draft },
    });

    expect(result?.status).toBe("failed");
    expect(result?.error).toBe("Workflow definition is invalid.");
    expect(mocks.db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quotaPoints: { increment: 3 } } }),
    );
    expect(mocks.db.quotaLedger.create).toHaveBeenCalledTimes(1);
  });
  it("refunds exactly once when the workflow fails", async () => {
    const result = await executePersistedWorkflow("run1", "user1", {
      handlers: {
        prompt: () => {
          throw new Error("模型不可用");
        },
      },
    });

    expect(result?.status).toBe("failed");
    expect(result?.error).toContain("模型不可用");
    expect(mocks.db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quotaPoints: { increment: 3 } } }),
    );
    expect(mocks.db.quotaLedger.create).toHaveBeenCalledTimes(1);
    expect(mocks.db.quotaLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 3, reason: "REFUND" }) }),
    );
    expect(mocks.db.workflowRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "RUNNING" }), data: expect.objectContaining({ status: "FAILED", output: Prisma.DbNull }) }),
    );
    expect(mocks.db.workflowNodeRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", output: Prisma.DbNull }) }),
    );
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "WORKFLOW_RUN_FAILED" }) }),
    );
  });

  it("rolls back success and refunds quota when saving a successful workflow artifact fails", async () => {
    const onSucceeded = vi.fn().mockRejectedValue(new Error("artifact write failed"));

    const result = await executePersistedWorkflow("run1", "user1", {
      handlers: { prompt: () => "ok", output: () => "ok" },
      onSucceeded,
    });

    expect(result?.status).toBe("failed");
    expect(result?.error).toContain("artifact write failed");
    expect(onSucceeded).toHaveBeenCalledTimes(1);
    expect(mocks.db.workflowRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }),
    );
    expect(mocks.db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quotaPoints: { increment: 3 } } }),
    );
    expect(mocks.db.quotaLedger.create).toHaveBeenCalledTimes(1);
  });

  it("does not report success or save an artifact after cancellation wins finalization", async () => {
    mocks.db.workflowRun.updateMany.mockImplementation(
      async ({ where }: { where: { status?: string } }) =>
        where?.status === "QUEUED" ? { count: 1 } : { count: 0 },
    );
    const onSucceeded = vi.fn();

    const result = await executePersistedWorkflow("run1", "user1", {
      handlers: { prompt: () => "ok", output: () => "ok" },
      onSucceeded,
    });

    expect(result).toBeNull();
    expect(onSucceeded).not.toHaveBeenCalled();
    expect(mocks.db.workflowNodeRun.updateMany).not.toHaveBeenCalled();
  });

  it("aborts an active model node when the persisted run is cancelled", async () => {
    const modelDefinition = {
      version: 1 as const,
      maxNodes: 20,
      nodes: [
        { id: "draft", type: "model" as const, label: "Draft", config: { prompt: "Write" }, timeoutMs: 5000, maxRetries: 0 },
        { id: "final", type: "output" as const, label: "Output", config: {}, timeoutMs: 1000, maxRetries: 0 },
      ],
      edges: [{ id: "draft-final", from: "draft", to: "final", mapping: {} }],
    };
    mocks.db.workflowRun.findFirst
      .mockResolvedValueOnce({ ...run, version: { definition: modelDefinition } })
      .mockResolvedValue({ status: "CANCELLED" });
    mocks.db.workflowRun.updateMany.mockImplementation(
      async ({ where }: { where: { status?: string } }) =>
        where?.status === "QUEUED" ? { count: 1 } : { count: 0 },
    );
    let modelSignal: AbortSignal | undefined;

    const execution = executePersistedWorkflow("run1", "user1", {
      handlers: {
        model: ({ signal }) => new Promise((_, reject) => {
          modelSignal = signal;
          signal.addEventListener("abort", () => reject(new Error("provider request aborted")), { once: true });
        }),
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 650));
    const result = await execution;

    expect(modelSignal?.aborted).toBe(true);
    expect(result).toBeNull();
    expect(mocks.db.user.update).not.toHaveBeenCalled();
    expect(mocks.db.workflowNodeRun.updateMany).not.toHaveBeenCalled();
  });

  it("does not refund when another worker already finalized the run", async () => {
    mocks.db.workflowRun.updateMany.mockImplementation(
      async ({ where }: { where: { status?: string } }) =>
        where?.status === "RUNNING" ? { count: 0 } : { count: 1 },
    );

    await executePersistedWorkflow("run1", "user1", {
      handlers: { prompt: () => "ok", output: () => "ok" },
    });

    expect(mocks.db.user.update).not.toHaveBeenCalled();
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
  });

  it("records provider model and token usage in the workflow audit", async () => {
    const modelDefinition = {
      version: 1 as const,
      maxNodes: 20,
      nodes: [
        { id: "draft", type: "model" as const, label: "Draft", config: { prompt: "Write {{input.topic}}" }, timeoutMs: 1000, maxRetries: 0 },
        { id: "final", type: "output" as const, label: "Output", config: {}, timeoutMs: 1000, maxRetries: 0 },
      ],
      edges: [{ id: "draft-final", from: "draft", to: "final", mapping: {} }],
    };
    mocks.db.workflowRun.findFirst.mockResolvedValue({ ...run, version: { definition: modelDefinition } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      choices: [{ message: { content: "Generated draft" } }],
      usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
    })));

    const result = await executePersistedWorkflow("run1", "user1");

    expect(result?.status).toBe("succeeded");
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          modelCalls: 1,
          tokenUsage: { inputTokens: 11, outputTokens: 7, totalTokens: 18 },
        }),
      }),
    }));
  });

  it("forwards and audits the selected reasoning effort", async () => {
    const modelDefinition = {
      version: 1 as const,
      maxNodes: 20,
      nodes: [
        { id: "draft", type: "model" as const, label: "Draft", config: { prompt: "Write {{input.topic}}" }, timeoutMs: 1000, maxRetries: 0 },
        { id: "final", type: "output" as const, label: "Output", config: {}, timeoutMs: 1000, maxRetries: 0 },
      ],
      edges: [{ id: "draft-final", from: "draft", to: "final", mapping: {} }],
    };
    mocks.db.workflowRun.findFirst.mockResolvedValue({ ...run, version: { definition: modelDefinition } });
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: "Generated" } }] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executePersistedWorkflow("run1", "user1", { reasoningEffort: "high" });

    expect(result?.status).toBe("succeeded");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).reasoning_effort).toBe("high");
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ metadata: expect.objectContaining({ reasoningEffort: "high" }) }),
    }));
  });

  it("records BYOK provider and token usage in the workflow audit", async () => {
    const modelDefinition = {
      version: 1 as const,
      maxNodes: 20,
      nodes: [
        { id: "draft", type: "model" as const, label: "Draft", config: { prompt: "Write {{input.topic}}" }, timeoutMs: 1000, maxRetries: 0 },
        { id: "final", type: "output" as const, label: "Output", config: {}, timeoutMs: 1000, maxRetries: 0 },
      ],
      edges: [{ id: "draft-final", from: "draft", to: "final", mapping: {} }],
    };
    mocks.db.workflowRun.findFirst.mockResolvedValue({ ...run, version: { definition: modelDefinition } });
    mocks.db.userModelCredential.findFirst.mockResolvedValue({
      id: "cred1",
      userId: "user1",
      label: "Private gateway",
      baseUrl: "https://byok.example.test/v1",
      encryptedKey: encryptCredential(BYOK_KEY),
      keyLast4: BYOK_KEY.slice(-4),
      active: true,
    });
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      choices: [{ message: { content: "Generated with BYOK" } }],
      usage: { prompt_tokens: 13, completion_tokens: 9, total_tokens: 22 },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executePersistedWorkflow("run1", "user1", { credentialId: "cred1" });

    expect(result?.status).toBe("succeeded");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://byok.example.test/v1/chat/completions");
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe(`Bearer ${BYOK_KEY}`);
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          models: ["gpt-5.6-terra"],
          modelCalls: 1,
          tokenUsage: { inputTokens: 13, outputTokens: 9, totalTokens: 22 },
        }),
      }),
    }));
    expect(JSON.stringify(mocks.db.auditLog.create.mock.calls)).not.toContain(BYOK_KEY);
  });

  it("refuses a credential that belongs to someone else", async () => {
    mocks.db.userModelCredential.findFirst.mockResolvedValue(null);

    await expect(
      executePersistedWorkflow("run1", "user1", { credentialId: "cred-of-other-user" }),
    ).rejects.toBeInstanceOf(CredentialServiceError);
    expect(mocks.db.workflowRun.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a model that is not on the allowlist before claiming the run", async () => {
    await expect(
      executePersistedWorkflow("run1", "user1", { modelKey: "gpt-999-bad" }),
    ).rejects.toBeInstanceOf(CredentialServiceError);
    expect(mocks.db.workflowRun.updateMany).not.toHaveBeenCalled();
  });
});

const context = (overrides: Partial<WorkflowNodeContext> = {}): WorkflowNodeContext => ({
  node: {
    id: "model",
    type: "model",
    label: "模型节点",
    config: { prompt: "关于 {{input.topic}} 的一段话" },
    timeoutMs: 1000,
    maxRetries: 0,
  },
  input: { topic: "社团招新" },
  dependencyOutputs: {},
  outputs: {},
  signal: new AbortController().signal,
  ...overrides,
});

describe("createWorkflowHandlers", () => {
  it("interpolates node prompts and forwards them to the model client", async () => {
    const callModel = vi.fn().mockResolvedValue("生成的文本");
    const handlers = createWorkflowHandlers({ userId: "user1", runId: "run1", callModel });

    const output = await handlers.model!(context());

    expect(output).toBe("生成的文本");
    expect(callModel).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "关于 社团招新 的一段话",
        target: expect.objectContaining({ apiKey: "platform-key", upstream: "openai/gpt-5.6-terra" }),
      }),
    );
  });

  it("falls back to the run-level modelKey and lets node config win", async () => {
    const callModel = vi.fn().mockResolvedValue("ok");
    const handlers = createWorkflowHandlers({
      userId: "user1",
      runId: "run1",
      modelKey: "glm-5.2",
      callModel,
    });

    await handlers.model!(context());
    expect(callModel.mock.calls[0][0].target.upstream).toBe("zzzz/glm-5.2");

    await handlers.model!(
      context({
        node: { ...context().node, config: { prompt: "hi", modelKey: "deepseek-v4-pro" } },
      }),
    );
    expect(callModel.mock.calls[1][0].target.upstream).toBe("zzzz/deepseek-v4-pro");
  });

  it("uses the decrypted user key for BYOK runs and only exposes a mask", async () => {
    const callModel = vi.fn().mockResolvedValue("ok");
    mocks.db.userModelCredential.findFirst.mockResolvedValue({
      id: "cred1",
      userId: "user1",
      label: "我的网关",
      baseUrl: "https://byok.example.test/v1",
      encryptedKey: encryptCredential(BYOK_KEY),
      keyLast4: BYOK_KEY.slice(-4),
      active: true,
    });
    const handlers = createWorkflowHandlers({
      userId: "user1",
      runId: "run1",
      credentialId: "cred1",
      callModel,
    });

    await handlers.model!(context());
    const target = callModel.mock.calls[0][0].target;

    expect(target.apiKey).toBe(BYOK_KEY);
    expect(target.baseUrl).toBe("https://byok.example.test/v1");
    expect(target.label).toContain("我的网关");
    expect(target.label).not.toContain(BYOK_KEY);
    expect(target.label).toContain("3333");
  });

  it("refuses an inactive credential at execution time", async () => {
    mocks.db.userModelCredential.findFirst.mockResolvedValue(null);
    const handlers = createWorkflowHandlers({
      userId: "user1",
      runId: "run1",
      credentialId: "cred1",
      callModel: vi.fn(),
    });

    await expect(handlers.model!(context())).rejects.toBeInstanceOf(CredentialServiceError);
  });

  it("evaluates condition and output nodes without calling a model", async () => {
    const handlers = createWorkflowHandlers({ userId: "user1", runId: "run1", callModel: vi.fn() });

    expect(
      handlers.condition!(
        context({
          node: { ...context().node, type: "condition", config: { equals: "yes" } },
          dependencyOutputs: { draft: "yes" },
        }),
      ),
    ).toBe(true);
    expect(
      handlers.condition!(
        context({
          node: { ...context().node, type: "condition", config: { equals: "yes" } },
          dependencyOutputs: { draft: "no" },
        }),
      ),
    ).toBe(false);
    expect(
      handlers.output!(
        context({
          node: { ...context().node, type: "output" },
          dependencyOutputs: { draft: "first", polish: "last" },
        }),
      ),
    ).toBe("last");
  });
});

describe("interpolate", () => {
  it("substitutes inputs and dependency outputs while keeping unknown keys", () => {
    const text = interpolate("{{input.topic}} / {{draft}} / {{missing}}", {
      ...context(),
      dependencyOutputs: { draft: { title: "结构" } },
    });

    expect(text).toBe("社团招新 / {\"title\":\"结构\"} / {{missing}}");
  });
});
