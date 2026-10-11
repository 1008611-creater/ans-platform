// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/projects/resume-website", async (original) => {
  const actual = await original<typeof import("@/server/projects/resume-website")>();
  return { ...actual, enqueueResumeWebsite: vi.fn(), cancelResumeWebsiteRun: vi.fn() };
});
import { auth } from "@/lib/auth";
import { enqueueResumeWebsite, cancelResumeWebsiteRun, ResumeWebsiteError } from "@/server/projects/resume-website";
import { POST, DELETE } from "@/app/api/projects/[id]/website/runs/route";
const origin = "https://ans.example";
const context = { params: Promise.resolve({ id: "private-project" }) };
function request(body: unknown, method = "POST", requestOrigin = origin) {
  return new Request(origin + "/api/projects/private-project/website/runs", { method, headers: { origin: requestOrigin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
let nextUser = 0;
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ["AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]) vi.stubEnv(key, "");
  vi.mocked(auth).mockResolvedValue({ user: { id: `website-api-${nextUser++}` } } as never);
  vi.mocked(enqueueResumeWebsite).mockResolvedValue({ id: "run", status: "QUEUED", costPoints: 2 });
});
describe("resume website run HTTP boundary", () => {
  it("rejects anonymous generation and cancellation without writes", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect((await POST(request({}), context)).status).toBe(401);
    expect((await DELETE(request({ runId: "run" }, "DELETE"), context)).status).toBe(401);
    expect(enqueueResumeWebsite).not.toHaveBeenCalled(); expect(cancelResumeWebsiteRun).not.toHaveBeenCalled();
  });
  it("rejects cross-origin and malformed JSON before any model work", async () => {
    expect((await POST(request({}, "POST", "https://outsider.example"), context)).status).toBe(403);
    const malformed = new Request(origin + "/api/projects/p/website/runs", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: "{" });
    expect((await POST(malformed, context)).status).toBe(400);
    expect(enqueueResumeWebsite).not.toHaveBeenCalled();
  });
  it("uses authenticated identity and responds with accepted status", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "real-user" } } as never);
    const input = { revision: 1, acknowledged: true, idempotencyKey: "run-key-1234" };
    const response = await POST(request(input), context);
    expect(response.status).toBe(202);
    expect(enqueueResumeWebsite).toHaveBeenCalledWith("private-project", "real-user", input);
    expect(await response.json()).toMatchObject({ ok: true, data: { id: "run", costPoints: 2 } });
  });
  it("allows six requests per account then refuses without writes; other accounts are independent", async () => {
    for (let i = 0; i < 6; i++) expect((await POST(request({}), context)).status).toBe(202);
    const response = await POST(request({}), context);
    expect(response.status).toBe(429); expect(await response.json()).toMatchObject({ error: { code: "RATE_LIMITED" } });
    expect(enqueueResumeWebsite).toHaveBeenCalledTimes(6);
    vi.mocked(auth).mockResolvedValue({ user: { id: `different-${nextUser++}` } } as never);
    expect((await POST(request({}), context)).status).toBe(202);
  });
  it("returns safe service errors without exposing private diagnostics", async () => {
    vi.mocked(enqueueResumeWebsite).mockRejectedValueOnce(new ResumeWebsiteError("WORKER_UNAVAILABLE", 503));
    expect((await POST(request({}), context)).status).toBe(503);
    vi.mocked(enqueueResumeWebsite).mockRejectedValueOnce(new Error("PRIVATE_MODEL_TEXT"));
    const response = await POST(request({}), context);
    expect(response.status).toBe(500); expect(JSON.stringify(await response.json())).not.toContain("PRIVATE_MODEL_TEXT");
  });
  it("validates cancellation and uses the current account", async () => {
    expect((await DELETE(request({ runId: "run", userId: "fake" }, "DELETE"), context)).status).toBe(400);
    expect(cancelResumeWebsiteRun).not.toHaveBeenCalled();
    vi.mocked(auth).mockResolvedValue({ user: { id: "cancel-owner" } } as never);
    expect((await DELETE(request({ runId: "run" }, "DELETE"), context)).status).toBe(200);
    expect(cancelResumeWebsiteRun).toHaveBeenCalledWith("private-project", "cancel-owner", "run");
  });
});
