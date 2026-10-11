import { beforeEach,describe,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({tx:{creditVoucher:{findUnique:vi.fn(),updateMany:vi.fn()},user:{findFirst:vi.fn(),update:vi.fn(),findUniqueOrThrow:vi.fn()},quotaOperation:{create:vi.fn()},quotaLedger:{create:vi.fn()}}}));
vi.mock("@/lib/db",()=>({db:{}}));
vi.mock("@/server/marketplace/shared",()=>({marketTransaction:(fn:(tx:typeof mocks.tx)=>unknown)=>fn(mocks.tx)}));
import { redeemVoucher,hashVoucher,normalizeVoucher } from "@/server/quota/vouchers";
const code="ANS-"+"A".repeat(40);
beforeEach(()=>{vi.clearAllMocks();mocks.tx.creditVoucher.findUnique.mockResolvedValue({id:"v1",codeHash:hashVoucher(code),points:10,redeemedBy:null,revokedAt:null,expiresAt:null});mocks.tx.creditVoucher.updateMany.mockResolvedValue({count:1});mocks.tx.user.findFirst.mockResolvedValue({quotaPoints:100});mocks.tx.user.findUniqueOrThrow.mockResolvedValue({quotaPoints:110});mocks.tx.quotaOperation.create.mockResolvedValue({id:"op1"});});
describe("credit vouchers",()=>{
it("normalizes separators and casing without changing the hash",()=>{expect(normalizeVoucher(code.toLowerCase())).toBe("ANS"+"A".repeat(40));expect(hashVoucher(" "+code.toLowerCase()+" ")).toBe(hashVoucher(code));});
it("writes the balance and ledger for a claimed voucher",async()=>{expect(await redeemVoucher("u1",code)).toEqual({points:10,balance:110,duplicate:false});expect(mocks.tx.user.update).toHaveBeenCalledWith({where:{id:"u1"},data:{quotaPoints:{increment:10}}});expect(mocks.tx.quotaOperation.create.mock.calls[0][0].data.operationKey).toBe("voucher:v1");expect(mocks.tx.quotaLedger.create).toHaveBeenCalledTimes(1);});
it("does not credit again when the owner retries",async()=>{mocks.tx.creditVoucher.findUnique.mockResolvedValue({points:10,redeemedBy:"u1"});expect((await redeemVoucher("u1",code)).duplicate).toBe(true);expect(mocks.tx.user.update).not.toHaveBeenCalled();});
it("rejects redemption by another account",async()=>{mocks.tx.creditVoucher.findUnique.mockResolvedValue({points:10,redeemedBy:"other"});await expect(redeemVoucher("u1",code)).rejects.toThrow("VOUCHER_USED");expect(mocks.tx.quotaLedger.create).not.toHaveBeenCalled();});
it("does not credit if a concurrent claim wins",async()=>{mocks.tx.creditVoucher.updateMany.mockResolvedValue({count:0});await expect(redeemVoucher("u1",code)).rejects.toThrow("VOUCHER_USED");expect(mocks.tx.user.update).not.toHaveBeenCalled();});
it.each([{revokedAt:new Date()},{expiresAt:new Date(0)}])("rejects unavailable vouchers",async state=>{mocks.tx.creditVoucher.findUnique.mockResolvedValue({points:10,redeemedBy:null,...state});await expect(redeemVoucher("u1",code)).rejects.toThrow("VOUCHER_INVALID");expect(mocks.tx.user.update).not.toHaveBeenCalled();});
});
