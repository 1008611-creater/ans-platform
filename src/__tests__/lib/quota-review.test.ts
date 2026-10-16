// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ transaction: vi.fn(), actor: vi.fn(), request: vi.fn(), changed: vi.fn(), refund: vi.fn(), audit: vi.fn(), owner: vi.fn(), lock: vi.fn(), evidence: vi.fn(), benefitComplete: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { apiComputeRequest: { findUnique: m.owner }, $transaction: m.transaction } }));
vi.mock("@/server/quota/service", async original => ({ ...await original<typeof import("@/server/quota/service")>(), refundQuota: m.refund }));
vi.mock("@/server/integrations/gateway-evidence",()=>({lockGatewayBillingAccount:m.lock,recordGatewayEvidence:m.evidence}));
vi.mock("@/server/compute-benefits/service",()=>({completeBenefit:m.benefitComplete}));
import { waiveUncertainRequest } from "@/server/quota/review";
beforeEach(() => {
 vi.resetAllMocks(); m.owner.mockResolvedValue({userId:"member"}); m.transaction.mockImplementation(fn => fn({ user: { findUnique: m.actor }, apiComputeRequest: { findUnique: m.request, updateMany: m.changed }, auditLog: { create: m.audit } }));
 m.actor.mockResolvedValue({ role: "ADMIN", flagged: false, deletedAt: null, adminPermissions: ["USERS_MANAGE"] });
 m.request.mockResolvedValue({ userId: "member", provider:"apic-codex", state: "UNCERTAIN", authorizedPoints: 0.25, outcome: null }); m.changed.mockResolvedValue({ count: 1 });
});
it("records an explicit operator waiver and returns only its reservation", async () => {
 expect(await waiveUncertainRequest("admin", "request", "Verified operator compensation")).toMatchObject({ released: true });
 expect(m.lock.mock.calls.map(call=>call[1])).toEqual(["admin","member"]);
 expect(m.evidence).toHaveBeenCalledWith(expect.anything(),"member","request",{kind:"WAIVER",actorId:"admin"});
 expect(m.refund).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ userId: "member", costPoints: 0.25 }));
 expect(m.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "API_COMPUTE_OPERATOR_WAIVER", metadata: expect.objectContaining({ upstreamCostUnknown: true }) }) });
});
it.each(["RUNNING", "SETTLED"])("does not waive %s requests", async state => { m.request.mockResolvedValue({ state }); await expect(waiveUncertainRequest("admin", "request", "Verified compensation")).rejects.toMatchObject({ status: 409 }); expect(m.refund).not.toHaveBeenCalled(); });
it("cannot waive twice", async () => { m.request.mockResolvedValue({ state: "RELEASED" }); expect(await waiveUncertainRequest("admin", "request", "Verified compensation")).toMatchObject({ duplicate: true }); expect(m.refund).not.toHaveBeenCalled(); });
it("does not refund after a lost state race", async () => { m.changed.mockResolvedValue({ count: 0 }); await expect(waiveUncertainRequest("admin", "request", "Verified compensation")).rejects.toThrow(); expect(m.refund).not.toHaveBeenCalled(); });
it.each([{ role: "USER" }, { role: "ADMIN", flagged: true }, { role: "ADMIN", adminPermissions: [] }])("checks actual admin permissions %j", async actor => { m.actor.mockResolvedValue(actor); await expect(waiveUncertainRequest("admin", "request", "Verified compensation")).rejects.toMatchObject({ status: 403 }); expect(m.request).not.toHaveBeenCalled(); });

it("preserves free non-APIC operator waiver without fabricating APIC evidence",async()=>{m.request.mockResolvedValue({userId:"member",provider:"mimo-tts",state:"UNCERTAIN",authorizedPoints:0,outcome:null});expect(await waiveUncertainRequest("admin","request","Free voice waiver")).toMatchObject({released:true});expect(m.refund).not.toHaveBeenCalled();expect(m.evidence).not.toHaveBeenCalled();});

it("waives a gift hold back to its original source, without minting paid points",async()=>{
 m.request.mockResolvedValue({userId:"member",provider:"apic-codex",state:"UNCERTAIN",authorizedPoints:10,price:{benefitFunding:{version:"official-usd-gift-v1",grantId:"11111111-1111-4111-8111-111111111111",reservedUsdMicros:"1000000"}}});
 await waiveUncertainRequest("admin","request","Gift uncertainty compensation");
 expect(m.benefitComplete).toHaveBeenCalledWith(expect.anything(),{userId:"member",requestId:"request",state:"RELEASED",actualUsdMicros:BigInt(0)});
 expect(m.refund).not.toHaveBeenCalled();
 expect(m.audit).toHaveBeenCalledWith({data:expect.objectContaining({metadata:expect.objectContaining({points:0,funding:"gift",upstreamCostUnknown:true})})});
});
