// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/competitions/agrihackathon/tasks", () => ({ getAgriTaskHistory: vi.fn() }));
import { auth } from "@/lib/auth";
import { getAgriTaskHistory } from "@/server/competitions/agrihackathon/tasks";
import { AgriTaskError } from "@/server/competitions/agrihackathon/error";
import { GET } from "@/app/api/competitions/agrihackathon/tasks/[id]/history/route";
const context = { params: Promise.resolve({ id: "task-a" }) }; let count = 0; let actor: string;
const request = (query = "", header = actor) => new Request("https://ans.example/api/competitions/agrihackathon/tasks/task-a/history" + query, { headers: { "x-ans-task-actor": header } });
beforeEach(() => {
  vi.clearAllMocks(); actor = "history-api-" + count++;
  vi.mocked(auth).mockResolvedValue({ user: { id: actor } } as never);
  vi.mocked(getAgriTaskHistory).mockResolvedValue({ taskId: "task-a", competitionId: "edition", ownerId: actor, history: [], nextBeforeRevision: null });
});
describe("private history HTTP", () => {
  it("requires login and matching actor headers before service access", async () => {
    vi.mocked(auth).mockResolvedValue(null as never); expect((await GET(request(), context)).status).toBe(401);
    vi.mocked(auth).mockResolvedValue({ user: { id: actor } } as never);
    for (const read of [request("", "stale-actor"), new Request(request().url)]) {
      const response = await GET(read, context); expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ error: { code: "ACCOUNT_CHANGED" } });
    }
    expect(getAgriTaskHistory).not.toHaveBeenCalled();
  });
  it("reads the session owner's page with a numeric cursor and no-store", async () => {
    const response = await GET(request("?beforeRevision=74"), context);
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(getAgriTaskHistory).toHaveBeenCalledWith(actor, "task-a", 74);
    await GET(request(), context); expect(getAgriTaskHistory).toHaveBeenLastCalledWith(actor, "task-a", undefined);
  });
  it.each(["beforeRevision=0", "beforeRevision=-1", "beforeRevision=1.5", "beforeRevision=1e2", "beforeRevision=01", "beforeRevision=", "beforeRevision=%201", "beforeRevision=2147483647", "beforeRevision=999999999999", "beforeRevision=74&beforeRevision=74", "ownerId=forged", "beforeRevision=74&unknown=value"])("rejects invalid queries before service access: %s", async query => {
    const response = await GET(request("?" + query), context); expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "INVALID_INPUT" } }); expect(getAgriTaskHistory).not.toHaveBeenCalled();
  });
  it("does not expose backend diagnostics and preserves owner-only 404", async () => {
    vi.mocked(getAgriTaskHistory).mockRejectedValueOnce(new Error("PRIVATE_DATABASE_URL"));
    const failed = await GET(request(), context); expect(failed.status).toBe(500);
    expect(failed.headers.get("cache-control")).toBe("no-store"); expect(JSON.stringify(await failed.json())).not.toContain("PRIVATE_DATABASE_URL");
    vi.mocked(getAgriTaskHistory).mockRejectedValueOnce(new AgriTaskError("NOT_FOUND", 404));
    const hidden = await GET(request(), context); expect(hidden.status).toBe(404); expect(hidden.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects invalid route IDs", async () => {
    expect((await GET(request(), { params: Promise.resolve({ id: "x".repeat(81) }) })).status).toBe(400);
    expect(getAgriTaskHistory).not.toHaveBeenCalled();
  });
  it("limits history reads per account", async () => {
    for (let i = 0; i < 120; i++) expect((await GET(request(), context)).status).toBe(200);
    expect((await GET(request(), context)).status).toBe(429); expect(getAgriTaskHistory).toHaveBeenCalledTimes(120);
  });
});
