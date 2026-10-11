import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/competitions/agrihackathon/records/[submissionId]/summary/route";
import { auth } from "@/lib/auth";
import { readAgriRecordSummary } from "@/server/competitions/agrihackathon/record-summary";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/competitions/agrihackathon/record-summary", () => ({ readAgriRecordSummary: vi.fn() }));
const actor = "summary-staff", ctx = { params: Promise.resolve({ submissionId: "exact-old-submission" }) };
const request = (query = "") => new Request("https://ans.example.invalid/api/competitions/agrihackathon/records/exact-old-submission/summary" + query, { headers: { "x-ans-submission-actor": actor } });
beforeEach(() => { vi.clearAllMocks(); vi.mocked(auth).mockResolvedValue({ user: { id: actor } } as never); vi.mocked(readAgriRecordSummary).mockResolvedValue({ source: "ANS_AGRI_LIVE_RECORD_SUMMARY", generatedAt: "2026-10-08T00:00:00.000Z" } as never); });
describe("staff summary route", () => {
  it("requires session and stable actor intent before reading", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never); expect((await GET(request(), ctx)).status).toBe(401);
    expect((await GET(new Request(request().url), ctx)).status).toBe(409); expect(readAgriRecordSummary).not.toHaveBeenCalled();
  });
  it("binds exact route and strict explicit selections with no-store response", async () => {
    const response = await GET(request("?includePrivate=false&includeInternal=true"), ctx); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(readAgriRecordSummary).toHaveBeenCalledWith(actor, "exact-old-submission", { includePrivate: false, includeInternal: true, mode: "view" });
    for (const query of ["?scope=public", "?includePrivate=1", "?mode=public", "?actorId=other"]) expect((await GET(request(query), ctx)).status).toBe(400);
  });
  it("exports a real JSON attachment with fixed safe filename and explicit export mode", async () => {
    const response = await GET(request("?mode=exportJSON"), ctx); expect(response.status).toBe(200); expect(response.headers.get("content-disposition")).toBe('attachment; filename="ans-agri-record-summary-2026-10-08.json"');
    expect(response.headers.get("x-content-type-options")).toBe("nosniff"); expect(response.headers.get("cache-control")).toBe("no-store"); expect(await response.json()).toMatchObject({ source: "ANS_AGRI_LIVE_RECORD_SUMMARY" });
  });
  it("maps permission and overflow failures without leaking private diagnostics", async () => {
    vi.mocked(readAgriRecordSummary).mockRejectedValueOnce(new AgriWorkspaceError("AGRI_SCOPE_REQUIRED", 403)); expect((await GET(request("?mode=exportJSON"), ctx)).status).toBe(403);
    vi.mocked(readAgriRecordSummary).mockRejectedValueOnce(new AgriWorkspaceError("AGRI_SUMMARY_TOO_LARGE", 422)); expect((await GET(request(), ctx)).status).toBe(422);
    vi.mocked(readAgriRecordSummary).mockRejectedValueOnce(new Error("PRIVATE_DB_DIAGNOSTIC")); const response = await GET(request(), ctx); expect(response.status).toBe(500); expect(JSON.stringify(await response.json())).not.toContain("PRIVATE_DB_DIAGNOSTIC");
  });
  it("rejects ambiguous repeated query keys before reading or exporting any summary", async () => {
    for (const query of ["?mode=exportJSON&mode=view", "?mode=view&mode=exportJSON", "?mode=view&mode=view", "?includePrivate=true&includePrivate=false", "?includeInternal=false&includeInternal=true"]) {
      const response = await GET(request(query), ctx);
      expect(response.status).toBe(400);
      expect(response.headers.get("content-disposition")).toBeNull();
    }
    expect(readAgriRecordSummary).not.toHaveBeenCalled();
  });
});
