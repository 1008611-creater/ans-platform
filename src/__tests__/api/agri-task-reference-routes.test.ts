// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/competitions/agrihackathon/task-references", () => ({ listAgriReferenceChoices: vi.fn(), readAgriReferenceRecord: vi.fn() }));
import { auth } from "@/lib/auth";
import { listAgriReferenceChoices, readAgriReferenceRecord } from "@/server/competitions/agrihackathon/task-references";
import { GET } from "@/app/api/competitions/agrihackathon/tasks/candidates/route";
import { GET as DETAIL } from "@/app/api/competitions/agrihackathon/tasks/candidates/[submissionId]/route";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
let actor = "", index = 0;
const request = (query = "", header = actor) => new Request("https://ans.example/api/competitions/agrihackathon/tasks/candidates" + query, { headers: { "x-ans-task-actor": header } });
const context = { params: Promise.resolve({ submissionId: "s-1" }) };
beforeEach(() => { vi.clearAllMocks(); actor = "reference-route-" + index++; vi.mocked(auth).mockResolvedValue({ user: { id: actor } } as never); vi.mocked(listAgriReferenceChoices).mockResolvedValue({ records: [], nextCursor: null }); });
describe("task reference HTTP boundary", () => {
 it("denies anonymous and stale actor headers before private lookups", async () => { vi.mocked(auth).mockResolvedValue(null as never); expect((await GET(request())).status).toBe(401);expect((await DETAIL(request(),context)).status).toBe(401);vi.mocked(auth).mockResolvedValue({user:{id:actor}} as never);expect((await GET(request("","old"))).status).toBe(409);expect(listAgriReferenceChoices).not.toHaveBeenCalled();expect(readAgriReferenceRecord).not.toHaveBeenCalled(); });
 it("validates staff scope and forbids owner/edition injection", async () => { expect((await GET(request("?scope=staff&q=Team"))).status).toBe(200); expect(listAgriReferenceChoices).toHaveBeenCalledWith(actor,{scope:"staff",q:"Team"});vi.mocked(listAgriReferenceChoices).mockClear();for(const query of ["?ownerId=other","?competitionId=other","?scope=all"])expect((await GET(request(query))).status).toBe(400);expect(listAgriReferenceChoices).not.toHaveBeenCalled(); });
 it("forwards precise selected issue and keeps responses uncached",async()=>{vi.mocked(readAgriReferenceRecord).mockResolvedValue({record:{} as never,issues:[],nextCursor:null});const response=await DETAIL(request("?scope=team&issue=i-1"),context);expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("no-store");expect(readAgriReferenceRecord).toHaveBeenCalledWith(actor,"s-1",{scope:"team",issue:"i-1"});});
 it("preserves workspace configuration errors without diagnostics",async()=>{vi.mocked(listAgriReferenceChoices).mockRejectedValueOnce(new AgriWorkspaceError("AGRI_WORKSPACE_NOT_CONFIGURED",503));expect((await GET(request())).status).toBe(503);vi.mocked(readAgriReferenceRecord).mockRejectedValueOnce(new Error("PRIVATE_DATABASE_AND_INPUT"));const response=await DETAIL(request(),context);expect(response.status).toBe(500);expect(JSON.stringify(await response.json())).not.toContain("PRIVATE_DATABASE_AND_INPUT");});
});
