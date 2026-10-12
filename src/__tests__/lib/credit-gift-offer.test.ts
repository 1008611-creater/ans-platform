// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({user:vi.fn(),pool:vi.fn()}));
vi.mock("@/lib/db",()=>({db:{user:{findUnique:mocks.user},quotaPool:{findFirst:mocks.pool}}}));
import { readCreditGiftOffer } from "@/server/quota/gift-offer";
beforeEach(()=>{vi.resetAllMocks();mocks.user.mockResolvedValue({flagged:false,deletedAt:null,quotaClaimedAt:null});mocks.pool.mockResolvedValue({perUserPoints:1000,totalPoints:BigInt(10000),claimedPoints:BigInt(1000)});});
it("offers the configured amount only when the full grant remains",async()=>{expect(await readCreditGiftOffer("member")).toEqual({state:"available",points:1000});mocks.pool.mockResolvedValue({perUserPoints:1000,totalPoints:BigInt(10000),claimedPoints:BigInt(9001)});expect(await readCreditGiftOffer("member")).toEqual({state:"unavailable"});});
it("shows prior claim without promising a second grant from a new pool",async()=>{mocks.user.mockResolvedValue({quotaClaimedAt:new Date(),flagged:false,deletedAt:null});expect(await readCreditGiftOffer("member")).toEqual({state:"claimed"});expect(mocks.pool).not.toHaveBeenCalled();});
it.each([null,{flagged:true},{deletedAt:new Date()}])("does not offer credits to an unavailable account %j",async user=>{mocks.user.mockResolvedValue(user);expect(await readCreditGiftOffer("member")).toEqual({state:"unavailable"});expect(mocks.pool).not.toHaveBeenCalled();});
it.each([null,{perUserPoints:0},{perUserPoints:1.2},{perUserPoints:Infinity}])("does not invent a gift when the pool is invalid %j",async pool=>{mocks.pool.mockResolvedValue(pool);expect(await readCreditGiftOffer("member")).toEqual({state:"unavailable"});});
