// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/competitions/agrihackathon/submissions", () => ({ listAgriStages: vi.fn(), readAgriStage: vi.fn(), prepareAgriStage: vi.fn(), executeAgriSubmissionCommand: vi.fn(), listAgriTeamEntries: vi.fn(), listAgriSubmissionVersions: vi.fn(), exportAgriWorks: vi.fn() }));
import { auth } from "@/lib/auth";
import { listAgriStages, readAgriStage, prepareAgriStage, executeAgriSubmissionCommand, listAgriTeamEntries, listAgriSubmissionVersions, exportAgriWorks } from "@/server/competitions/agrihackathon/submissions";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { GET, POST } from "@/app/api/competitions/agrihackathon/submissions/route";
import { GET as DETAIL } from "@/app/api/competitions/agrihackathon/submissions/[id]/route";
import { GET as ENTRIES } from "@/app/api/competitions/agrihackathon/submissions/entries/route";
import { GET as VERSIONS } from "@/app/api/competitions/agrihackathon/submissions/[id]/versions/route";
import { GET as EXPORT } from "@/app/api/competitions/agrihackathon/submissions/export/route";
const origin = "https://ans.example"; let serial = 0; let actor = "";
const context = { params: Promise.resolve({ id: "private-stage" }) };
const prepare = { action: "prepareStage", teamCompetitionId: "entry", stage: "PRELIMINARY" };
const draft = { projectId: "p", artifactVersionId: "v", repository: null, demoUrl: null, summary: "Private", materials: { schemaVersion: 1, items: [] } };
const submit = { action: "submit", entryStageId: "private-stage", idempotencyKey: "6ae05562-9cf5-4c99-8b3a-04ad406e1b5f", expectedRevision: 1, expectedRuleVersionId: "rule", content: draft };
const read = (suffix = "") => new Request(origin + "/api/competitions/agrihackathon/submissions" + suffix, { headers: { "x-ans-submission-actor": actor } });
const write = (body: unknown = submit, from = origin) => new Request(read().url, { method: "POST", headers: { origin: from, "content-type": "application/json", "x-ans-submission-actor": actor }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks(); for (const env of ["AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]) vi.stubEnv(env, "");
  actor = "submission-api-" + serial++; vi.mocked(auth).mockResolvedValue({ user: { id: actor } } as never);
  vi.mocked(listAgriStages).mockResolvedValue({ competitionId: "c", stages: [], nextCursor: null, canExport: false, hasPrivateMaterials: false });
});
describe("stage submissions HTTP", () => {
  it("rejects anonymous list/detail/entries/writes without touching a private service", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    for (const response of [await GET(read()), await DETAIL(read(), context), await ENTRIES(read()), await VERSIONS(read(), context), await EXPORT(read()), await POST(write())]) expect(response.status).toBe(401);
    for (const fn of [listAgriStages, readAgriStage, listAgriTeamEntries, listAgriSubmissionVersions, executeAgriSubmissionCommand, exportAgriWorks]) expect(fn).not.toHaveBeenCalled();
  });
  it("uses session identity and separates preparation from formal submission", async () => {
    expect((await POST(write(prepare))).status).toBe(200); expect(prepareAgriStage).toHaveBeenCalledWith(actor, prepare);
    expect(executeAgriSubmissionCommand).not.toHaveBeenCalled();
    expect((await POST(write())).status).toBe(200); expect(executeAgriSubmissionCommand).toHaveBeenCalledWith(actor, { ...submit, syncToAgriWall: true });
  });
  it("rejects forged actors, dates, roles, publication and XP instructions", async () => {
    for (const extra of [{ submittedById: "forged" }, { acceptedAt: "2026-10-07T00:00:00Z" }, { role: "OWNER" }, { publicConsent: true }, { awardedXp: 99 }]) expect((await POST(write({ ...submit, ...extra }))).status).toBe(400);
    expect((await POST(write({ ...prepare, competitionId: "other" }))).status).toBe(400);
    expect(executeAgriSubmissionCommand).not.toHaveBeenCalled(); expect(prepareAgriStage).not.toHaveBeenCalled();
  });
  it("validates summary scopes, stages and detail pagination", async () => {
    expect((await GET(read("?scope=staff&stage=FINAL"))).status).toBe(200);
    expect(listAgriStages).toHaveBeenCalledWith(actor, { scope: "staff", stage: "FINAL", q: "", status: "ANY" });
    for (const query of ["scope=everyone", "stage=UNKNOWN", "ownerId=forged"]) expect((await GET(read("?" + query))).status).toBe(400);
    expect((await DETAIL(read("?beforeSequence=12"), context)).status).toBe(200); expect(readAgriStage).toHaveBeenCalledWith(actor, "private-stage", { beforeSequence: "12" });
  });
  it("rejects stale or missing actor headers on every private endpoint", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "new-account" } } as never);
    for (const response of [await GET(read()), await DETAIL(read(), context), await ENTRIES(read()), await VERSIONS(read(), context), await EXPORT(read()), await POST(write())]) expect(response.status).toBe(409);
    for (const fn of [listAgriStages, readAgriStage, listAgriTeamEntries, listAgriSubmissionVersions, executeAgriSubmissionCommand, exportAgriWorks]) expect(fn).not.toHaveBeenCalled();
    expect((await GET(new Request(read().url))).status).toBe(409);
  });
  it("refuses cross-origin, invalid JSON and oversized streaming bodies before persistence", async () => {
    expect((await POST(write(submit, "https://outsider.invalid"))).status).toBe(403);
    expect((await POST(new Request(read().url, { method: "POST", headers: { origin, "content-type": "application/json", "x-ans-submission-actor": actor }, body: "{" }))).status).toBe(400);
    expect((await POST(write({ padding: "x".repeat(100001) }))).status).toBe(413);
    expect(executeAgriSubmissionCommand).not.toHaveBeenCalled();
  });
  it("sets no-store and never serializes private database diagnostics", async () => {
    expect((await GET(read())).headers.get("cache-control")).toBe("no-store");
    vi.mocked(readAgriStage).mockRejectedValueOnce(new Error("PRIVATE_REPOSITORY_DATABASE_URL"));
    const result = await DETAIL(read(), context); expect(result.status).toBe(500); expect(JSON.stringify(await result.json())).not.toContain("PRIVATE_REPOSITORY_DATABASE_URL");
  });
  it("preserves stable deadline, eligibility and correction rejection codes", async () => {
    for (const code of ["AGRI_CLOSED", "AGRI_FINAL_ELIGIBILITY_REQUIRED", "AGRI_CORRECTION_PERMIT_REQUIRED"]) {
      vi.mocked(executeAgriSubmissionCommand).mockRejectedValueOnce(new AgriWorkspaceError(code));
      const result = await POST(write()); expect(result.status).toBe(409); expect(await result.json()).toMatchObject({ error: { code } });
    }
  });
  it("validates candidate filters without accepting owner IDs or content expansion", async () => {
    expect((await VERSIONS(read("?projectId=p&cursor=page"), context)).status).toBe(200);
    expect(listAgriSubmissionVersions).toHaveBeenCalledWith(actor, "private-stage", { projectId: "p", cursor: "page" });
    for (const query of ["ownerId=forged", "teamId=forged", "includeContent=true"]) expect((await VERSIONS(read("?" + query), context)).status).toBe(400);
    expect(listAgriSubmissionVersions).toHaveBeenCalledTimes(1);
  });
  it("exports the full applied range as a non-cacheable CSV attachment", async () => {
    vi.mocked(exportAgriWorks).mockResolvedValue({ csv: '\uFEFF"source"\r\n"fixture"\r\n', filename: "ans-agri-works-metadata-2026-10-08.csv", rows: 1 });
    const response = await EXPORT(read("/export?stage=FINAL&q=%20Team%20&status=SUBMITTED"));
    expect(exportAgriWorks).toHaveBeenCalledWith(actor, { stage: "FINAL", q: "Team", status: "SUBMITTED", mode: "metadata" });
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toContain('attachment; filename="ans-agri-works-metadata-2026-10-08.csv"');
    expect(response.headers.get("cache-control")).toBe("no-store"); expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toContain('"fixture"');
  });
  it("refuses export pagination, forged scope, unbounded searches and invalid modes", async () => {
    for (const query of ["cursor=old-page", "scope=team", "actorId=forged", "mode=all", "status=ALL", "q=" + "x".repeat(121)]) expect((await EXPORT(read("/export?" + query))).status).toBe(400);
    expect(exportAgriWorks).not.toHaveBeenCalled();
  });
  it("preserves export permission errors and redacts all unexpected diagnostics", async () => {
    vi.mocked(exportAgriWorks).mockRejectedValueOnce(new AgriWorkspaceError("AGRI_SCOPE_REQUIRED", 403));
    const denied = await EXPORT(read("/export?mode=materials")); expect(denied.status).toBe(403); expect(denied.headers.get("cache-control")).toBe("no-store");
    vi.mocked(exportAgriWorks).mockRejectedValueOnce(new Error("PRIVATE_EXPORT_DATABASE_URL"));
    const failed = await EXPORT(read("/export")); expect(failed.status).toBe(500); expect(JSON.stringify(await failed.json())).not.toContain("PRIVATE_EXPORT_DATABASE_URL");
  });
  it("rate limits full exports per authenticated account", async () => {
    vi.mocked(exportAgriWorks).mockResolvedValue({ csv: "fixture", filename: "fixture.csv", rows: 0 });
    for (let i = 0; i < 6; i++) expect((await EXPORT(read("/export"))).status).toBe(200);
    expect((await EXPORT(read("/export"))).status).toBe(429); expect(exportAgriWorks).toHaveBeenCalledTimes(6);
  });
  it("rate limits writes per account", async () => {
    for (let i = 0; i < 30; i++) expect((await POST(write())).status).toBe(200);
    expect((await POST(write())).status).toBe(429); expect(executeAgriSubmissionCommand).toHaveBeenCalledTimes(30);
  });
});
