import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:vi.fn(),admin:vi.fn(),redeem:vi.fn(),batch:vi.fn(),list:vi.fn()}));
vi.mock("@/lib/auth",()=>({auth:mocks.auth}));
vi.mock("@/lib/admin-permissions",()=>({requireAdminPermission:mocks.admin}));
vi.mock("@/server/quota/vouchers",()=>({redeemVoucher:mocks.redeem,createVoucherBatch:mocks.batch,listVoucherBatches:mocks.list,revokeVoucherBatch:vi.fn()}));
import { POST as redeem } from "@/app/api/quota/redeem/route";
import { GET as batches, POST as create } from "@/app/api/admin/credits/vouchers/route";
const request=(actor?:string)=>new Request("https://ans.example/api/quota/redeem",{method:"POST",headers:{"Content-Type":"application/json","sec-fetch-site":"same-origin",...(actor?{"x-ans-actor":actor}:{})},body:JSON.stringify({code:"ANS-"+"A".repeat(40)})});
beforeEach(()=>{vi.clearAllMocks();mocks.auth.mockResolvedValue({user:{id:"current"}});mocks.admin.mockResolvedValue({userId:"current"});mocks.redeem.mockResolvedValue({points:10,balance:10,duplicate:false});});
describe("voucher HTTP account binding",()=>{
 it.each([undefined,"old-account"])("rejects stale page actor %s before touching balances",async actor=>{const response=await redeem(request(actor));expect(response.status).toBe(409);expect(await response.json()).toEqual({error:"ACCOUNT_CHANGED"});expect(mocks.redeem).not.toHaveBeenCalled();});
 it("binds an accepted redemption to the authenticated page account",async()=>{expect((await redeem(request("current"))).status).toBe(200);expect(mocks.redeem).toHaveBeenCalledWith("current",expect.any(String));});
 it("does not reveal admin batches to a stale page",async()=>{expect((await batches(new Request("https://ans.example/api/admin/credits/vouchers",{headers:{"x-ans-actor":"old-admin"}}))).status).toBe(409);expect(mocks.list).not.toHaveBeenCalled();});
 it("does not mint vouchers for an unexpected administrator",async()=>{expect((await create(request("old-admin"))).status).toBe(409);expect(mocks.batch).not.toHaveBeenCalled();});
});
