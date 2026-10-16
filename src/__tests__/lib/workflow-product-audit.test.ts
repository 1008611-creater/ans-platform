// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { user: { findUnique: vi.fn() }, workflow: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() }, workflowVersion: { create: vi.fn() }, auditLog: { create: vi.fn(), findMany: vi.fn() }, $transaction: vi.fn(), $queryRaw: vi.fn() },
  review: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/server/growth/service", () => ({ safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/server/workflows/review", async importOriginal => ({ ...await importOriginal<typeof import("@/server/workflows/review")>(), reviewWorkflowDefinition: mocks.review }));
import { createWorkflowVersion, publishWorkflow, recheckWorkflowReview, reviewWorkflow, submitWorkflowForReview } from "@/server/workflows/service";
const definition = { version: 1, maxNodes: 20, nodes: [{ id: "draft", type: "prompt", label: "Draft", config: { prompt: "old" } }, { id: "final", type: "output", label: "Output", config: {} }], edges: [{ id: "e1", from: "draft", to: "final", mapping: {} }] };
const pass = { verdict: "PASS", source: "AI", pass: true, scores: { compliance: 92, quality: 88, intent: 90 }, reason: "pass", model: "fixture", checkedAt: "2026-10-11T00:00:00.000Z" };
afterEach(() => vi.resetAllMocks());
type FixtureState = { id: string; authorId: string; isOfficial: boolean; title: string; summary: string | null; description: string | null; status: string; publishedVersion: number | null; reviewScore: Record<string, unknown> | null; versions: Array<{ id: string; version: number; definition: typeof definition }> };
function database(initial: Partial<FixtureState>) {
  let state: FixtureState = { status: "DRAFT", id: "audit-workflow", authorId: "author", isOfficial: false, title: "Audit workflow", summary: null, description: null, publishedVersion: null, reviewScore: null, versions: [{ id: "v1", version: 1, definition }], ...initial };
  mocks.db.user.findUnique.mockResolvedValue({ id: "author", role: "USER", flagged: false, deletedAt: null });
  mocks.db.$transaction.mockImplementation(async fn => fn(mocks.db));
  mocks.db.auditLog.create.mockResolvedValue({ id: "audit" });
  mocks.db.auditLog.findMany.mockResolvedValue(initial.status === "PUBLISHED" ? [{ createdAt: new Date("2026-10-13T01:00:00Z"), after: { status: "PUBLISHED", publishedVersion: 1, versionId: "v1" } }] : []);
  mocks.db.workflow.findUnique.mockImplementation(async () => structuredClone(state));
  mocks.db.workflow.updateMany.mockImplementation(async args => { if ((typeof args.where.status === "string" && state.status !== args.where.status) || (typeof args.where.status === "object" && !args.where.status.in.includes(state.status))) return { count: 0 }; if (args.where.AND?.some((filter: { reviewScore: { path: string[]; equals: unknown } }) => state.reviewScore?.[filter.reviewScore.path[0]] !== filter.reviewScore.equals)) return { count: 0 }; if (args.where.versions && state.versions.some(v => v.version > args.where.versions.none.version.gt)) return { count: 0 }; state = { ...state, ...args.data }; return { count: 1 }; });
  mocks.db.workflow.update.mockImplementation(async args => { state = { ...state, ...args.data }; return structuredClone(state); });
  mocks.db.workflowVersion.create.mockImplementation(async args => { const version = { id: `v${args.data.version}`, ...args.data }; state.versions = [version, ...state.versions]; return version; });
  return () => state;
}
describe("product audit defect witnesses (no real database or model)", () => {
  it("rejects late v1 PASS after appending never-reviewed v2", async () => {
    const state = database({ status: "DRAFT" });
    let completeReview!: (value: typeof pass) => void;
    let reviewStarted!: () => void;
    const started = new Promise<void>(resolve => { reviewStarted = resolve; });
    mocks.review.mockImplementation(() => { reviewStarted(); return new Promise(resolve => { completeReview = resolve; }); });
    const pending = submitWorkflowForReview("audit-workflow", "author");
    const rejected = expect(pending).rejects.toMatchObject({ code: "INVALID_STATE" });
    await started;
    await createWorkflowVersion("audit-workflow", "author", { definition: { ...definition, nodes: definition.nodes.map(node => node.id === "draft" ? { ...node, config: { prompt: "new unchecked content" } } : node) } });
    completeReview(pass);
    await rejected;
    await expect(publishWorkflow("audit-workflow", "author")).rejects.toMatchObject({ code: "REVIEW_REQUIRED" });
    expect(mocks.review).toHaveBeenCalledTimes(1);
    expect(mocks.review.mock.calls[0][0].definition.nodes[0].config.prompt).toBe("old");
    expect(state().status).toBe("DRAFT");
    expect(state().publishedVersion).toBeNull();
  });
  it("rejects latest review PASS when publishing historical unreviewed v1", async () => {
    const state = database({ status: "PENDING", reviewScore: { ...pass, reviewVersion: 2, reviewRequestId: "00000000-0000-4000-8000-000000000001", reviewPending: true }, versions: [{ id: "v2", version: 2, definition }, { id: "v1", version: 1, definition: { ...definition, nodes: definition.nodes.map(node => node.id === "draft" ? { ...node, config: { prompt: "old blocked content" } } : node) } }] });
    await expect(publishWorkflow("audit-workflow", "author", 1)).rejects.toMatchObject({ code: "REVIEW_REQUIRED" });
    expect(state().publishedVersion).toBeNull();
    expect(mocks.review).not.toHaveBeenCalled();
  });
  it("keeps the approved old version online while reviewing and publishing v2", async () => {
    const state = database({ status: "PUBLISHED", publishedVersion: 1, reviewScore: pass });
    mocks.review.mockResolvedValue(pass);
    await createWorkflowVersion("audit-workflow", "author", { definition });
    await submitWorkflowForReview("audit-workflow", "author");
    expect(state().status).toBe("PUBLISHED");
    expect(state().publishedVersion).toBe(1);
    expect(state().reviewScore).toMatchObject({ reviewVersion: 2, reviewPending: true });
    await reviewWorkflow("audit-workflow", "moderator", { expectedVersion: 2, expectedReviewRequestId: state().reviewScore!.reviewRequestId as string, action: "publish", note: "verified" });
    expect(state().publishedVersion).toBe(2);
    expect(state().reviewScore).toMatchObject({ reviewPending: false });
  });
});


describe("review request races", () => {
  it("does not revive a rejected update when its AI response arrives late", async () => {
    const state = database({ status: "PUBLISHED", publishedVersion: 1 });
    await createWorkflowVersion("audit-workflow", "author", { definition });
    let complete!: (value: typeof pass) => void; let begin!: () => void;
    const started = new Promise<void>(resolve => { begin = resolve; });
    mocks.review.mockImplementation(() => { begin(); return new Promise(resolve => { complete = resolve; }); });
    const pending = submitWorkflowForReview("audit-workflow", "author"); const rejected = expect(pending).rejects.toMatchObject({ code: "INVALID_STATE" });
    await started;
    await reviewWorkflow("audit-workflow", "moderator", { expectedVersion: 2, expectedReviewRequestId: state().reviewScore!.reviewRequestId as string, action: "reject", note: "needs changes" });
    complete(pass); await rejected;
    expect(state().status).toBe("PUBLISHED"); expect(state().publishedVersion).toBe(1); expect(state().reviewScore?.reviewPending).toBe(false);
    await expect(publishWorkflow("audit-workflow", "author", 2)).rejects.toMatchObject({ code: "REVIEW_REQUIRED" });
  });
  it("keeps a newer BLOCKED recheck when an older PASS for the same version arrives late", async () => {
    const state = database({ status: "PENDING" });
    let complete!: (value: typeof pass) => void; let begin!: () => void;
    const started = new Promise<void>(resolve => { begin = resolve; });
    mocks.review.mockImplementationOnce(() => { begin(); return new Promise(resolve => { complete = resolve; }); });
    const older = recheckWorkflowReview("audit-workflow", "moderator"); const rejected = expect(older).rejects.toMatchObject({ code: "INVALID_STATE" });
    await started;
    mocks.review.mockResolvedValueOnce({ ...pass, verdict: "BLOCKED", pass: false });
    await recheckWorkflowReview("audit-workflow", "moderator");
    const newerRequest = state().reviewScore?.reviewRequestId;
    complete(pass); await rejected;
    expect(state().reviewScore).toMatchObject({ verdict: "BLOCKED", reviewRequestId: newerRequest });
    await expect(publishWorkflow("audit-workflow", "author")).rejects.toMatchObject({ code: "REVIEW_REQUIRED" });
  });
  it("rejects author publication before any mutating row lock", async () => {
    database({ status: "PENDING", reviewScore: { ...pass, reviewVersion: 1, reviewRequestId: "00000000-0000-4000-8000-000000000001", reviewPending: true } });
    const snapshot = await mocks.db.workflow.findUnique();
    mocks.db.workflow.findUnique.mockResolvedValueOnce(snapshot).mockResolvedValueOnce({ ...snapshot, reviewScore: null });
    await expect(publishWorkflow("audit-workflow", "author")).rejects.toMatchObject({ code: "REVIEW_REQUIRED" });
    expect(mocks.db.workflow.update).not.toHaveBeenCalled();
  });
});


describe("human decisions bind the displayed review", () => {
  it.each([{ expectedVersion: 1, expectedReviewRequestId: "00000000-0000-4000-8000-000000000001" }, { expectedVersion: 2, expectedReviewRequestId: "00000000-0000-4000-8000-000000000002" }])("refuses stale displayed version or request %j", async expected => {
    database({ status: "PENDING", reviewScore: { ...pass, reviewVersion: 2, reviewRequestId: "00000000-0000-4000-8000-000000000001", reviewPending: true }, versions: [{ id: "v2", version: 2, definition }] });
    await expect(reviewWorkflow("audit-workflow", "moderator", { ...expected, action: "publish", note: "verified" })).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(mocks.db.workflow.update).not.toHaveBeenCalled();
  });
});
