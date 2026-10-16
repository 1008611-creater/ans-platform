// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ raw: vi.fn(), actor: vi.fn(), moderator: vi.fn(), binding: vi.fn(), cover: vi.fn(), find: vi.fn(), unique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), versionFind: vi.fn(), versionCreate: vi.fn(), versionUpdate: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/growth/service", () => ({ safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/server/marketplace/workflow-binding", () => ({ assertMarketWorkflowBinding: m.binding }));
vi.mock("@/server/marketplace/media-access", () => ({ requireMarketCoverOwnership: m.cover }));
vi.mock("@/server/marketplace/shared", () => ({ requireMarketActor: m.actor, requireMarketModerator: m.moderator,
  marketTransaction: (run: (tx: unknown) => Promise<unknown>) => run({
    $queryRaw: m.raw,
    marketListing: { findFirst: m.find, findUnique: m.unique, create: m.create, update: m.update, updateMany: m.updateMany },
    marketListingVersion: { findUniqueOrThrow: m.versionFind, create: m.versionCreate, update: m.versionUpdate }, auditLog: { create: m.audit },
  }),
}));
import { createMarketListing, reviseMarketListing, submitMarketListing, reviewMarketListing } from "@/server/marketplace/listings";
const execution = { workflowId: "workflow", versionId: "workflow-version", version: 1, definitionHash: "a".repeat(64) };
const payload = { slug: "workflow-resource", title: "Workflow resource", summary: "An isolated fixture for workflow coexistence.", description: "This workflow is run separately from paid marketplace project tiers.", category: "web", subcategory: "documentation", execution, fulfillment: "resource", priceMinor: 0, currency: "CNY", deliveryDays: 1, revisionLimit: 0, computeIncluded: false, deliverables: ["Workflow output"], licenseTerms: "Use according to the stated workflow license." };
const tier = { id: "paid", title: "Paid", description: "Paid delivery", priceMinor: 100, deliverables: ["Source"] };
const writes = () => [m.create, m.update, m.updateMany, m.versionCreate, m.versionUpdate, m.audit];
beforeEach(() => {
  vi.resetAllMocks(); m.raw.mockResolvedValue([]);
  m.unique.mockImplementation(async ({ where }) => where.slug ? null : { id: "listing", sellerId: "seller", currentVersion: 1, official: false });
  m.find.mockResolvedValue({ id: "listing", sellerId: "seller", currentVersion: 1, slug: payload.slug });
  m.create.mockResolvedValue({ id: "listing" }); m.updateMany.mockResolvedValue({ count: 1 }); m.versionCreate.mockResolvedValue({ id: "version-2", version: 2 });
  m.versionFind.mockResolvedValue({ id: "version-1", submittedAt: null, reviewedAt: null, payload }); m.update.mockResolvedValue({ id: "listing", sellerId: "seller" });
});
async function run(action: string, input: unknown = payload) {
  if (action === "create") return createMarketListing("seller", input);
  if (action === "revise") return reviseMarketListing("listing", "seller", { expectedVersion: 1, listing: input });
  m.versionFind.mockResolvedValue({ id: "version-1", submittedAt: action === "publish" ? new Date() : null, reviewedAt: null, payload: input });
  if (action === "submit") return submitMarketListing("listing", "seller", 1);
  return reviewMarketListing("listing", "moderator", 1, true, "Isolated approval");
}
describe("workflow listings coexist with paid project tiers", () => {
  it.each(["create", "revise", "submit", "publish"])("validates seller workflow binding during %s without requiring an external URL", async action => {
    await run(action);
    expect(m.binding).toHaveBeenCalledOnce(); expect(m.binding).toHaveBeenCalledWith(expect.anything(), "seller", execution);
    expect(writes().some(fn => fn.mock.calls.length)).toBe(true);
  });
  it.each(["create", "revise", "submit", "publish"])("refuses a revoked or mismatched binding during %s before any write", async action => {
    m.binding.mockRejectedValue(Object.assign(new Error("binding unavailable"), { code: "WORKFLOW_UNAVAILABLE" }));
    await expect(run(action)).rejects.toMatchObject({ code: "WORKFLOW_UNAVAILABLE" });
    for (const fn of writes()) expect(fn).not.toHaveBeenCalled();
  });
  it.each(["create", "revise", "submit", "publish"])("refuses execution with paid tiers during %s before any write", async action => {
    await expect(run(action, { ...payload, pricingTiers: [tier] })).rejects.toMatchObject({ code: "WORKFLOW_COMPUTE_SEPARATE", status: 400 });
    expect(m.binding).not.toHaveBeenCalled(); for (const fn of writes()) expect(fn).not.toHaveBeenCalled();
  });
  it.each([{ priceMinor: 100 }, { computeIncluded: true }, { fulfillment: "service" }])("refuses an incompatible execution billing payload %j", async override => {
    await expect(run("create", { ...payload, ...override })).rejects.toMatchObject({ code: "WORKFLOW_COMPUTE_SEPARATE", status: 400 });
    for (const fn of writes()) expect(fn).not.toHaveBeenCalled();
  });
  it("continues to save ordinary paid tiers with their actual starting price", async () => {
    const { execution: _execution, ...ordinary } = payload; void _execution;
    await createMarketListing("seller", { ...ordinary, pricingTiers: [tier] });
    expect(m.binding).not.toHaveBeenCalled();
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ versions: { create: { version: 1, payload: { ...ordinary, priceMinor: 100, pricingTiers: [tier] } } } }) }));
  });
});
