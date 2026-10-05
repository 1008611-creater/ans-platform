// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), saveProjectArtifact: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/server/projects/service", () => ({ saveProjectArtifact: mocks.saveProjectArtifact }));
import { POST } from "@/app/api/projects/[id]/artifacts/route";

const input = { baseVersionId: "version-1", expectedVersion: 1, markdown: "Reviewed facts" };
const request = (body = JSON.stringify(input)) => new Request("http://localhost/api/projects/project-1/artifacts", {
  method: "POST", headers: { "Content-Type": "application/json" }, body,
});
const params = () => ({ params: Promise.resolve({ id: "project-1" }) });

describe("manual artifact revision route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "owner-1" } });
    mocks.saveProjectArtifact.mockResolvedValue({ id: "version-2", version: 2 });
  });

  it("rejects anonymous users without saving", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await POST(request(), params());
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    expect(mocks.saveProjectArtifact).not.toHaveBeenCalled();
  });

  it("passes the session identity to the service and returns a non-cacheable new version", async () => {
    const response = await POST(request(), params());
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.saveProjectArtifact).toHaveBeenCalledWith("project-1", "owner-1", input);
    expect(await response.json()).toMatchObject({ ok: true, data: { id: "version-2", version: 2 } });
  });

  it("rejects malformed JSON without saving", async () => {
    const response = await POST(request("{"), params());
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_JSON");
    expect(mocks.saveProjectArtifact).not.toHaveBeenCalled();
  });

  it.each([["NOT_FOUND", 404], ["VERSION_CONFLICT", 409], ["INVALID_INPUT", 400]])("preserves %s errors", async (code, status) => {
    mocks.saveProjectArtifact.mockRejectedValue(Object.assign(new Error("Cannot save"), { code, status }));
    const response = await POST(request(), params());
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ ok: false, error: { code, message: "Cannot save" } });
  });
});
