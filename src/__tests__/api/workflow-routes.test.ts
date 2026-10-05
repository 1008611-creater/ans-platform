// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireAdminPermission: vi.fn(),
  service: {
    WorkflowServiceError: class WorkflowServiceError extends Error {
      constructor(message: string, public code = "WORKFLOW_ERROR", public status = 400) {
        super(message);
        this.name = "WorkflowServiceError";
      }
    },
    createWorkflow: vi.fn(),
    createWorkflowVersion: vi.fn(),
    listPublishedWorkflows: vi.fn(),
    listOwnWorkflows: vi.fn(),
    listWorkflowQueue: vi.fn(),
    getPublishedWorkflow: vi.fn(),
    getWorkflowForEditor: vi.fn(),
    publishWorkflow: vi.fn(),
    submitWorkflowForReview: vi.fn(),
    reviewWorkflow: vi.fn(),
    recheckWorkflowReview: vi.fn(),
    createWorkflowRun: vi.fn(),
    getWorkflowRun: vi.fn(),
    listWorkflowRuns: vi.fn(),
  },
  runner: {
    executePersistedWorkflow: vi.fn(),
    cancelWorkflowRun: vi.fn(),
  },
  favorites: {
    FavoriteServiceError: class FavoriteServiceError extends Error {
      constructor(message: string, public code = "FAVORITE_ERROR", public status = 400) {
        super(message);
        this.name = "FavoriteServiceError";
      }
    },
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    listFavorites: vi.fn(),
  },
  credentials: {
    CredentialServiceError: class CredentialServiceError extends Error {
      constructor(message: string, public code = "CREDENTIAL_ERROR", public status = 400) {
        super(message);
        this.name = "CredentialServiceError";
      }
    },
    listCredentials: vi.fn(),
    createCredential: vi.fn(),
    updateCredential: vi.fn(),
    deleteCredential: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/admin-permissions", () => ({ requireAdminPermission: mocks.requireAdminPermission }));
vi.mock("@/server/workflows/service", () => mocks.service);
vi.mock("@/server/workflows/runner", () => mocks.runner);
vi.mock("@/server/favorites/service", () => mocks.favorites);
vi.mock("@/server/credentials/service", () => mocks.credentials);

import { GET as listWorkflows, POST as createWorkflowRoute } from "@/app/api/workflows/route";
import { GET as getWorkflow } from "@/app/api/workflows/[slug]/route";
import { POST as publishWorkflowRoute } from "@/app/api/workflows/[slug]/publish/route";
import { POST as submitWorkflowRoute } from "@/app/api/workflows/[slug]/submit/route";
import { POST as runWorkflowRoute } from "@/app/api/workflows/[slug]/run/route";
import { GET as listRuns } from "@/app/api/workflows/runs/route";
import { GET as getRun } from "@/app/api/workflows/runs/[id]/route";
import { POST as executeRun } from "@/app/api/workflows/runs/[id]/execute/route";
import { POST as cancelRun } from "@/app/api/workflows/runs/[id]/cancel/route";
import { GET as listFavoritesRoute, POST as addFavoriteRoute, DELETE as removeFavoriteRoute } from "@/app/api/favorites/route";
import { GET as listCredentialsRoute, POST as createCredentialRoute } from "@/app/api/user/model-credentials/route";
import { PATCH as patchCredentialRoute, DELETE as deleteCredentialRoute } from "@/app/api/user/model-credentials/[id]/route";
import { GET as adminQueueRoute } from "@/app/api/admin/workflows/route";
import { POST as adminReviewRoute } from "@/app/api/admin/workflows/[slug]/review/route";
import { POST as adminRecheckRoute } from "@/app/api/admin/workflows/[slug]/recheck/route";

const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });

const json = (body: unknown) =>
  new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const request = (url = "http://localhost/api/test") => new Request(url);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user1", role: "USER" } });
  mocks.requireAdminPermission.mockResolvedValue({ userId: "admin1", permissions: null });
});

describe("auth guard on workflow routes", () => {
  it("returns 401 for anonymous write endpoints", async () => {
    mocks.auth.mockResolvedValue(null);

    for (const response of [
      await createWorkflowRoute(json({})),
      await publishWorkflowRoute(json({}), params({ slug: "weekly" })),
      await submitWorkflowRoute(request(), params({ slug: "weekly" })),
      await runWorkflowRoute(json({}), params({ slug: "weekly" })),
      await listRuns(request()),
      await getRun(request(), params({ id: "run1" })),
      await executeRun(request(), params({ id: "run1" })),
      await cancelRun(request(), params({ id: "run1" })),
      await addFavoriteRoute(json({})),
      await removeFavoriteRoute(request()),
      await listCredentialsRoute(),
      await createCredentialRoute(json({})),
      await patchCredentialRoute(json({}), params({ id: "cred1" })),
      await deleteCredentialRoute(request(), params({ id: "cred1" })),
    ]) {
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.requestId).toEqual(expect.any(String));
    }
  });

  it("returns 401 for scope=mine without a session", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await listWorkflows(request("http://localhost/api/workflows?scope=mine"));

    expect(response.status).toBe(401);
    expect(mocks.service.listOwnWorkflows).not.toHaveBeenCalled();
  });
});

describe("GET /api/workflows", () => {
  it("lists published workflows without requiring a session", async () => {
    mocks.auth.mockResolvedValue(null);
    mocks.service.listPublishedWorkflows.mockResolvedValue([{ slug: "weekly" }]);

    const response = await listWorkflows(request("http://localhost/api/workflows?q=周报&take=5"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.workflows).toEqual([{ slug: "weekly" }]);
    expect(mocks.service.listPublishedWorkflows).toHaveBeenCalledWith({ query: "周报", take: 5 });
  });

  it("falls back to the default page size for a non-numeric take", async () => {
    mocks.service.listPublishedWorkflows.mockResolvedValue([]);

    await listWorkflows(request("http://localhost/api/workflows?take=abc"));

    expect(mocks.service.listPublishedWorkflows).toHaveBeenCalledWith({ query: undefined, take: 24 });
  });
});

describe("service errors map to the shared envelope", () => {
  it("maps a coded service error to its status and code", async () => {
    mocks.service.createWorkflow.mockRejectedValue(
      new mocks.service.WorkflowServiceError("该工作流标识已经存在。", "SLUG_EXISTS", 409),
    );

    const response = await createWorkflowRoute(json({}));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("SLUG_EXISTS");
    expect(body.error.message).toBe("该工作流标识已经存在。");
  });

  it("maps an unexpected failure to a 500 without leaking the message", async () => {
    mocks.service.listWorkflowRuns.mockRejectedValue(new Error("connection reset by peer"));

    const response = await listRuns(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).not.toContain("connection reset");
  });

  it("maps invalid JSON to a 400", async () => {
    const response = await createWorkflowRoute(
      new Request("http://localhost/api/workflows", { method: "POST", body: "{ not json" }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_JSON");
    expect(mocks.service.createWorkflow).not.toHaveBeenCalled();
  });
});

describe("POST /api/workflows/runs/[id]/execute", () => {
  it("forwards model overrides from the body", async () => {
    mocks.runner.executePersistedWorkflow.mockResolvedValue({ status: "succeeded", output: "ok", executions: [], elapsedMs: 5 });

    const response = await executeRun(
      json({ modelKey: "gpt-5.6-sol", credentialId: "cred1", reasoningEffort: "medium" }),
      params({ id: "run1" }),
    );

    expect(response.status).toBe(200);
    expect(mocks.runner.executePersistedWorkflow).toHaveBeenCalledWith("run1", "user1", {
      modelKey: "gpt-5.6-sol",
      credentialId: "cred1",
      reasoningEffort: "medium",
    });
  });

  it("accepts an empty body and falls back to the definition", async () => {
    mocks.runner.executePersistedWorkflow.mockResolvedValue({ status: "succeeded", executions: [], elapsedMs: 1 });

    const response = await executeRun(request(), params({ id: "run1" }));

    expect(response.status).toBe(200);
    expect(mocks.runner.executePersistedWorkflow).toHaveBeenCalledWith("run1", "user1", {});
  });

  it("rejects unknown fields instead of silently ignoring them", async () => {
    const response = await executeRun(json({ modelKey: "gpt-5.6-sol", admin: true }), params({ id: "run1" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(mocks.runner.executePersistedWorkflow).not.toHaveBeenCalled();
  });

  it("returns 404 when the run is missing or already claimed", async () => {
    mocks.runner.executePersistedWorkflow.mockResolvedValue(null);

    const response = await executeRun(request(), params({ id: "run1" }));

    expect(response.status).toBe(404);
  });
});

describe("workflow detail and review routes", () => {
  it("returns 404 for an unpublished workflow", async () => {
    mocks.service.getPublishedWorkflow.mockResolvedValue(null);

    const response = await getWorkflow(request(), params({ slug: "weekly" }));

    expect(response.status).toBe(404);
  });

  it("requires a session for scope=mine", async () => {
    const response = await getWorkflow(request("http://localhost/api/workflows/weekly?scope=mine"), params({ slug: "weekly" }));

    expect(response.status).toBe(200);
    expect(mocks.service.getWorkflowForEditor).toHaveBeenCalledWith("weekly", "user1");
  });

  it("returns 403 for an admin queue request without permission", async () => {
    mocks.requireAdminPermission.mockResolvedValue(null);

    const response = await adminQueueRoute();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(mocks.service.listWorkflowQueue).not.toHaveBeenCalled();
  });

  it("validates the review payload before calling the service", async () => {
    const response = await adminReviewRoute(json({ action: "publish" }), params({ slug: "weekly" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(mocks.service.reviewWorkflow).not.toHaveBeenCalled();
  });

  it("passes the trimmed review note through", async () => {
    mocks.service.reviewWorkflow.mockResolvedValue({ id: "w1", status: "PUBLISHED" });

    const response = await adminReviewRoute(
      json({ action: "publish", note: "  内容合规  " }),
      params({ slug: "weekly" }),
    );

    expect(response.status).toBe(200);
    expect(mocks.service.reviewWorkflow).toHaveBeenCalledWith("weekly", "admin1", {
      action: "publish",
      note: "内容合规",
    });
  });

  it("returns 403 for a recheck without content-management permission", async () => {
    mocks.requireAdminPermission.mockResolvedValue(null);

    const response = await adminRecheckRoute(request(), params({ slug: "weekly" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(mocks.service.recheckWorkflowReview).not.toHaveBeenCalled();
  });

  it("runs a recheck for an admin and returns the fresh verdict", async () => {
    mocks.service.recheckWorkflowReview.mockResolvedValue({
      workflowId: "w1",
      review: { verdict: "PASS", reason: "内容合规" },
    });

    const response = await adminRecheckRoute(request(), params({ slug: "weekly" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.service.recheckWorkflowReview).toHaveBeenCalledWith("weekly", "admin1");
    expect(body.data.review.verdict).toBe("PASS");
  });

  it("maps a recheck on a workflow that left the queue to 409", async () => {
    mocks.service.recheckWorkflowReview.mockRejectedValue(
      new mocks.service.WorkflowServiceError("工作流不在待审状态，请刷新后重试。", "INVALID_STATE", 409),
    );

    const response = await adminRecheckRoute(request(), params({ slug: "weekly" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("INVALID_STATE");
  });
});

describe("favorites routes", () => {
  it("returns 201 on the first favorite and 200 when it already existed", async () => {
    mocks.favorites.addFavorite.mockResolvedValueOnce({ favorited: true, created: true });
    mocks.favorites.addFavorite.mockResolvedValueOnce({ favorited: true, created: false });

    const created = await addFavoriteRoute(json({ targetType: "PROMPT", targetId: "p1" }));
    const existing = await addFavoriteRoute(json({ targetType: "PROMPT", targetId: "p1" }));

    expect(created.status).toBe(201);
    expect(existing.status).toBe(200);
  });

  it("reads the delete target from the query string", async () => {
    mocks.favorites.removeFavorite.mockResolvedValue({ favorited: false, removed: true });

    const response = await removeFavoriteRoute(
      request("http://localhost/api/favorites?targetType=WORKFLOW&targetId=w1"),
    );

    expect(response.status).toBe(200);
    expect(mocks.favorites.removeFavorite).toHaveBeenCalledWith("user1", "WORKFLOW", "w1");
  });

  it("propagates the target-unavailable error as a 404", async () => {
    mocks.favorites.addFavorite.mockRejectedValue(
      new mocks.favorites.FavoriteServiceError("提示词不存在或已下架。", "TARGET_UNAVAILABLE", 404),
    );

    const response = await addFavoriteRoute(json({ targetType: "PROMPT", targetId: "gone" }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("TARGET_UNAVAILABLE");
  });
});

describe("model credential routes", () => {
  it("never returns the plaintext key", async () => {
    mocks.credentials.listCredentials.mockResolvedValue([
      { id: "cred1", label: "我的网关", baseUrl: "https://x.test/v1", keyMasked: "********1234", keyLast4: "1234", active: true },
    ]);

    const response = await listCredentialsRoute();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain("sk-");
    expect(body.data.credentials[0].keyMasked).toBe("********1234");
  });

  it("maps a duplicate label to 409", async () => {
    mocks.credentials.createCredential.mockRejectedValue(
      new mocks.credentials.CredentialServiceError("已存在同名凭证，请更换名称。", "LABEL_EXISTS", 409),
    );

    const response = await createCredentialRoute(json({ label: "重复" }));

    expect(response.status).toBe(409);
  });

  it("maps a missing credential on delete to 404", async () => {
    mocks.credentials.deleteCredential.mockRejectedValue(
      new mocks.credentials.CredentialServiceError("凭证不存在。", "NOT_FOUND", 404),
    );

    const response = await deleteCredentialRoute(request(), params({ id: "cred1" }));

    expect(response.status).toBe(404);
  });
});
