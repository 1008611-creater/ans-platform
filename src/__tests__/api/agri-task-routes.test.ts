// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/competitions/agrihackathon/tasks", () => ({ listAgriTasks: vi.fn(), getAgriTask: vi.fn(), executeAgriTaskCommand: vi.fn() }));
import { auth } from "@/lib/auth";
import { listAgriTasks, getAgriTask, executeAgriTaskCommand } from "@/server/competitions/agrihackathon/tasks";
import { AgriTaskError } from "@/server/competitions/agrihackathon/error";
import { GET, POST } from "@/app/api/competitions/agrihackathon/tasks/route";
import { GET as DETAIL } from "@/app/api/competitions/agrihackathon/tasks/[id]/route";
const origin = "https://ans.example"; let user = 0; let actor = "";
const context = { params: Promise.resolve({ id: "private-task" }) };
const cmd = { action: "initialize", locale: "zh", idempotencyKey: "6ae05562-9cf5-4c99-8b3a-04ad406e1b5f" };
const read = () => new Request(origin + "/api/competitions/agrihackathon/tasks", { headers: { "x-ans-task-actor": actor } });
const write = (body: unknown = cmd, from = origin) => new Request(read().url, { method: "POST", headers: { origin: from, "content-type": "application/json", "x-ans-task-actor": actor }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks(); for (const env of ["AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]) vi.stubEnv(env, "");
  actor = "agri-api-" + user++; vi.mocked(auth).mockResolvedValue({ user: { id: actor } } as never);
  vi.mocked(listAgriTasks).mockResolvedValue({ competitionId: "c", tasks: [], nextCursor: null, serverNow: "2026-10-07T00:00:00Z", sharingLimit: 30 });
  vi.mocked(executeAgriTaskCommand).mockResolvedValue({ task: null, duplicate: false, appliedRevision: null, createdTaskCount: 6 });
});
describe("personal timetable HTTP", () => {
  it("rejects anonymous list, detail and write without service access", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    for (const response of [await GET(read()), await DETAIL(read(), context), await POST(write())]) expect(response.status).toBe(401);
    expect(listAgriTasks).not.toHaveBeenCalled(); expect(getAgriTask).not.toHaveBeenCalled(); expect(executeAgriTaskCommand).not.toHaveBeenCalled();
  });
  it("uses the session identity, not request-supplied ownership", async () => {
    actor = "actual"; vi.mocked(auth).mockResolvedValue({ user: { id: actor } } as never);
    expect((await GET(read())).status).toBe(200); expect(listAgriTasks).toHaveBeenCalledWith("actual", undefined, { scope: "all" });
    expect((await POST(write({ ...cmd, ownerId: "forged" }))).status).toBe(400);
    expect((await POST(write())).status).toBe(200); expect(executeAgriTaskCommand).toHaveBeenCalledWith("actual", cmd);
  });
  it("validates list filters before passing them to the private service", async () => {
    const filtered = new Request(read().url + "?scope=shared&stage=FINAL", { headers: { "x-ans-task-actor": actor } });
    expect((await GET(filtered)).status).toBe(200);
    expect(listAgriTasks).toHaveBeenCalledWith(actor, undefined, { scope: "shared", stage: "FINAL" });
    vi.mocked(listAgriTasks).mockClear();
    for (const query of ["scope=everyone", "stage=UNKNOWN", "ownerId=forged"]) {
      expect((await GET(new Request(read().url + "?" + query, { headers: { "x-ans-task-actor": actor } }))).status).toBe(400);
    }
    expect(listAgriTasks).not.toHaveBeenCalled();
  });
  it("rejects cross-origin, malformed and oversized streaming JSON before writes", async () => {
    expect((await POST(write(cmd, "https://outsider.example"))).status).toBe(403);
    expect((await POST(new Request(read().url, { method: "POST", headers: { origin, "content-type": "application/json", "x-ans-task-actor": actor }, body: "{" }))).status).toBe(400);
    expect((await POST(write({ padding: "x".repeat(100001) }))).status).toBe(413);
    expect(executeAgriTaskCommand).not.toHaveBeenCalled();
  });
  it("never caches private replies or serializes error diagnostics", async () => {
    expect((await GET(read())).headers.get("cache-control")).toBe("no-store");
    vi.mocked(getAgriTask).mockRejectedValueOnce(new Error("PRIVATE_INPUT_DATABASE_URL"));
    const response = await DETAIL(read(), context); expect(response.status).toBe(500); expect(JSON.stringify(await response.json())).not.toContain("PRIVATE_INPUT_DATABASE_URL");
  });
  it("preserves stable configuration and conflict errors", async () => {
    vi.mocked(listAgriTasks).mockRejectedValueOnce(new AgriTaskError("AGRI_EDITION_NOT_CONFIGURED", 503));
    expect((await GET(read())).status).toBe(503);
    vi.mocked(executeAgriTaskCommand).mockRejectedValueOnce(new AgriTaskError("AGRI_REVISION_CONFLICT"));
    const response = await POST(write()); expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ error: { code: "AGRI_REVISION_CONFLICT" } });
  });
  it("rejects stale and missing actor headers before all private service access", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other-cookie-account" } } as never);
    for (const response of [await GET(read()), await DETAIL(read(), context), await POST(write()), await POST(write({ action: "create", task: {}, idempotencyKey: cmd.idempotencyKey }))]) {
      expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ error: { code: "ACCOUNT_CHANGED" } });
    }
    actor = "other-cookie-account";
    expect((await GET(new Request(read().url))).status).toBe(409);
    expect(listAgriTasks).not.toHaveBeenCalled(); expect(getAgriTask).not.toHaveBeenCalled(); expect(executeAgriTaskCommand).not.toHaveBeenCalled();
  });
  it("rate limits writes per account", async () => {
    for (let i = 0; i < 30; i++) expect((await POST(write())).status).toBe(200);
    expect((await POST(write())).status).toBe(429); expect(executeAgriTaskCommand).toHaveBeenCalledTimes(30);
  });
});
