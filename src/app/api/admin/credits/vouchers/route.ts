import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { readSameOriginJson,HttpRequestError,assertRequestActor } from "@/server/http/json";
import { createVoucherBatch,listVoucherBatches,revokeVoucherBatch } from "@/server/quota/vouchers";
import { QuotaError } from "@/server/quota/service";
const headers={"Cache-Control":"private, no-store"};
export async function GET(request:Request){const a=await requireAdminPermission("USERS_MANAGE");if(!a)return NextResponse.json({error:"FORBIDDEN"},{status:403});try{assertRequestActor(request,a.userId);return NextResponse.json(await listVoucherBatches(),{headers});}catch(e){return failure(e);}}
export async function POST(request:Request){const a=await requireAdminPermission("USERS_MANAGE");if(!a)return NextResponse.json({error:"FORBIDDEN"},{status:403});try{assertRequestActor(request,a.userId);return NextResponse.json(await createVoucherBatch(a.userId,await readSameOriginJson(request)),{status:201,headers});}catch(e){return failure(e);}}
export async function PATCH(request:Request){const a=await requireAdminPermission("USERS_MANAGE");if(!a)return NextResponse.json({error:"FORBIDDEN"},{status:403});try{assertRequestActor(request,a.userId);const b=z.object({batchId:z.string().uuid()}).strict().parse(await readSameOriginJson(request));return NextResponse.json(await revokeVoucherBatch(a.userId,b.batchId),{headers});}catch(e){return failure(e);}}
function failure(e:unknown){if(e instanceof HttpRequestError)return NextResponse.json({error:e.code},{status:e.status});if(e instanceof QuotaError)return NextResponse.json({error:e.message},{status:e.status});if(e instanceof z.ZodError)return NextResponse.json({error:"INVALID_INPUT"},{status:400});return NextResponse.json({error:"VOUCHER_OPERATION_FAILED"},{status:500});}
