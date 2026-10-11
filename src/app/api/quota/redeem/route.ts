import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { RateLimiter } from "@/lib/rate-limit";
import { readSameOriginJson,HttpRequestError,assertRequestActor } from "@/server/http/json";
import { redeemVoucher } from "@/server/quota/vouchers";
import { QuotaError } from "@/server/quota/service";
import { MarketRuleError } from "@/domain/marketplace/order";
const limiter=new RateLimiter({max:10,windowSeconds:60});
export async function POST(request:Request){
 const s=await auth();if(!s?.user?.id)return NextResponse.json({error:"UNAUTHORIZED"},{status:401});const r=limiter.check(s.user.id);if(!r.allowed)return NextResponse.json({error:"RATE_LIMITED"},{status:429,headers:{"Retry-After":String(r.retryAfterSeconds)}});
 try{assertRequestActor(request,s.user.id);const b=z.object({code:z.string().min(1).max(100)}).strict().parse(await readSameOriginJson(request));return NextResponse.json(await redeemVoucher(s.user.id,b.code),{headers:{"Cache-Control":"private, no-store"}});}
 catch(e){if(e instanceof QuotaError||e instanceof MarketRuleError)return NextResponse.json({error:e.message},{status:e.status});if(e instanceof HttpRequestError)return NextResponse.json({error:e.code},{status:e.status});if(e instanceof z.ZodError)return NextResponse.json({error:"VOUCHER_INVALID"},{status:400});return NextResponse.json({error:"REDEMPTION_FAILED"},{status:500});}
}
