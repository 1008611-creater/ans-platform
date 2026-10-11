// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ permission: vi.fn(), decide: vi.fn() }));
vi.mock("@/lib/admin-permissions", () => ({ requireAdminPermission: mocks.permission }));
vi.mock("@/server/projects/publication", () => ({ decideArtifactPublication: mocks.decide }));
import { POST } from "@/app/api/admin/project-reviews/route";
beforeEach(() => vi.resetAllMocks());
describe("project review HTTP permission", () => {
  it("denies a scoped administrator before reading the request body", async () => {
    mocks.permission.mockResolvedValue(null);
    const result = await POST(new Request("https://fixture.invalid/api/admin/project-reviews", { method: "POST", body: "malformed" }));
    expect(result.status).toBe(403); expect(mocks.permission).toHaveBeenCalledWith("PROMPTS_MANAGE"); expect(mocks.decide).not.toHaveBeenCalled();
  });
  it("uses the validated administrator identity", async () => {
    mocks.permission.mockResolvedValue({ userId: "moderator" }); mocks.decide.mockResolvedValue({ status: "public" });
    const result = await POST(new Request("https://fixture.invalid/api/admin/project-reviews", { method: "POST", body: JSON.stringify({ artifactVersionId: "fixture-version", decision: "approve", note: "verified" }) }));
    expect(result.status).toBe(200); expect(mocks.decide).toHaveBeenCalledWith("moderator", expect.objectContaining({ artifactVersionId: "fixture-version" }));
  });
});
