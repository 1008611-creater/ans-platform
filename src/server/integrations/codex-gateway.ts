import { refreshMeteredParentCost } from "./metered-cost";
import { createHash, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { hashApiKey, isValidApiKeyFormat } from "@/lib/api-key";
import { RUN_MODEL_OPTIONS, RUN_MODEL_METERING, type RunModelKey } from "@/lib/run-models";
import { debitQuota, refundQuota, QuotaError } from "@/server/quota/service";
import { readApicCharge, type ApicCharge } from "./apic-billing";
import { hasNonexecutionEvidence, recordGatewayEvidence, lockGatewayBillingAccount } from "./gateway-evidence";

const PROVIDER = "apic-codex";
const MAX_BODY = 524288;
// Reserved namespace for durable attempts; callers cannot address an attempt directly.
const RETRY_KEY_PREFIX = "ans-internal-retry:";
export function validateCodexPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_REQUEST");
  const body = value as Record<string, unknown>;
  if (!RUN_MODEL_OPTIONS.some(m => m.key === body.model)) throw new Error("MODEL_UNAVAILABLE");
  if (body.previous_response_id || body.conversation || body.background === true) throw new Error("STATEFUL_REQUEST_UNSUPPORTED");
  const limit = body.max_output_tokens === undefined ? 16384 : Number(body.max_output_tokens);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 16384) throw new Error("OUTPUT_LIMIT_EXCEEDED");
  if (Array.isArray(body.tools) && body.tools.some(tool => !tool || !["function", "custom"].includes(String((tool as Record<string,unknown>).type)))) throw new Error("HOSTED_TOOL_UNSUPPORTED");
  const rejectMedia = (value:unknown):boolean => Array.isArray(value) ? value.some(rejectMedia) : Boolean(value && typeof value === "object" && (["input_image","input_file","input_audio"].includes(String((value as Record<string,unknown>).type)) || Object.values(value).some(rejectMedia)));
  if (rejectMedia(body.input)) throw new Error("MEDIA_INPUT_UNSUPPORTED");
  const sanitized = { ...body, store: false, service_tier: "default", max_output_tokens: limit };
  const text = JSON.stringify(sanitized);
  const bytes = Buffer.byteLength(text);
  if (bytes > MAX_BODY) throw new Error("INPUT_LIMIT_EXCEEDED");
  // Conservative reservation: UTF-8 bytes bound token count, including tool definitions.
  // GPT long-context rates and 0.16 multiplier cover the highest supported tier.
  const rates = RUN_MODEL_METERING[body.model as RunModelKey];
  const reserve = Math.ceil(((bytes + 16384) * rates.inputReservePerMillion + limit * rates.outputReservePerMillion) * rates.consumptionMultiplier) / 1e6;
  return { text, model: String(body.model), limit, reserve, streaming: body.stream === true };
}
export async function authenticateCodex(request: Request) {
  if (process.env.ANS_CODEX_GATEWAY_ENABLED !== "1") return null;
  const key = request.headers.get("authorization")?.replace(/^Bearer /i, "") || "";
  if (!isValidApiKeyFormat(key)) return null;
  const user = await db.user.findFirst({ where: { apiKey: hashApiKey(key), flagged: false, deletedAt: null }, select: { id: true } });
  if(user) await reconcileCodexCharges(user.id);
  return user;
}
/** An internal feature may cap the member's approved spend. Preserve the
 * verified supplier cost separately; unexpected excess is platform-covered. */
export function cappedMemberCharge(price: unknown, upstreamPoints: number, authorizedPoints?: number) {
  if (!Number.isFinite(upstreamPoints) || upstreamPoints < 0) throw new Error("INVALID_UPSTREAM_CHARGE");
  const record = price && typeof price === "object" && !Array.isArray(price) ? price as Record<string, unknown> : {};
  const cap = record.memberPointsCap;
  if (cap !== undefined && (typeof cap !== "number" || !Number.isFinite(cap) || cap <= 0)) throw new Error("INVALID_MEMBER_BUDGET");
  if (authorizedPoints !== undefined && (!Number.isFinite(authorizedPoints) || authorizedPoints <= 0)) throw new Error("INVALID_MEMBER_BUDGET");
  const billedPoints = Math.min(upstreamPoints, typeof cap === "number" ? cap : Infinity, authorizedPoints ?? Infinity);
  return { billedPoints, price: { ...record, verifiedUpstreamPoints: upstreamPoints, platformCoveredPoints: Math.max(0, upstreamPoints - billedPoints) } };
}
/** Reconcile interrupted requests using the authoritative APIC receipt, never estimates. */
export async function reconcileCodexCharges(userId: string, options = { limit: 5, deadline: Date.now() + 12000 }) {
  const cutoff=new Date(Date.now()-360000);
  await db.apiComputeRequest.updateMany({where:{userId,provider:PROVIDER,state:"RUNNING",updatedAt:{lt:cutoff}},data:{state:"UNCERTAIN"}});
  const pending=await db.apiComputeRequest.findMany({where:{userId,provider:PROVIDER,state:"UNCERTAIN",outcome:{not:null}},take:options.limit,orderBy:{updatedAt:"asc"},select:{id:true,outcome:true,authorizedPoints:true,price:true}});
  for(const task of pending){
    if(Date.now() >= options.deadline) break;
    if(!task.outcome || !/^[A-Za-z0-9_-]{8,128}$/.test(task.outcome) || task.outcome === "UNCERTAIN")continue;
    try{const charge=await readApicCharge(task.outcome, 1);const member=cappedMemberCharge(task.price,charge.points,Number(task.authorizedPoints));
      await db.$transaction(async tx=>{
        await lockGatewayBillingAccount(tx, userId, true);
        const current = await tx.apiComputeRequest.findFirst({ where: { id: task.id, userId, provider: PROVIDER, state: "UNCERTAIN" } });
        if (!current) return;
        await recordGatewayEvidence(tx,userId,task.id,{kind:"VERIFIED",charge,billedPoints:member.billedPoints});
        const changed=await tx.apiComputeRequest.updateMany({where:{id:task.id,userId,state:"UNCERTAIN"},data:{state:"SETTLED",settledPoints:member.billedPoints,finishedAt:new Date()}});
        if(changed.count!==1) throw new Error("REQUEST_CONFLICT");
        if(member.billedPoints<Number(current.authorizedPoints)) await refundQuota(tx,{userId,costPoints:Number(current.authorizedPoints)-member.billedPoints,ref:{type:"api_compute_request",id:task.id},note:"Codex recovered actual usage settlement"});
        await refreshMeteredParentCost(tx,userId,task.price);
      });
    }catch{/* Preserve reservation until a verified receipt is available. */}
  }
}
function failure(message: string, status: number) {
  return Response.json({ error: { message, type: "ans_gateway_error", code: message } }, { status, headers: { "Cache-Control": "no-store" } });
}
export async function codexModels(request: Request) {
  if (!await authenticateCodex(request)) return failure("INVALID_API_KEY", 401);
  return Response.json({ object: "list", data: RUN_MODEL_OPTIONS.map(m => ({ id:m.key, object:"model", owned_by:"ANS" })) }, { headers:{"Cache-Control":"no-store"} });
}
export async function codexResponses(request: Request) {
  const user = await authenticateCodex(request);
  if (!user) return failure("INVALID_API_KEY",401);
  return meteredResponses(request, user.id);
}

/** Server-only entry: userId must come from an authenticated feature service.
 * Built-in runs share the exact durable reservation and settlement state machine. */
export async function meteredResponses(request: Request, userId: string, parent?: { type: "run" | "workflow_run"; id: string }, budget?: { memberPointsCap: number; timeoutMs?: number }) {
  const user = { id: userId };
  if (request.signal.aborted) return failure("REQUEST_CANCELLED", 409);
  if (Number(request.headers.get("content-length")) > MAX_BODY) return failure("INPUT_LIMIT_EXCEEDED",413);
  let parsed: ReturnType<typeof validateCodexPayload>;
  try {
    const reader=request.body?.getReader(); if(!reader) return failure("INVALID_REQUEST",400);
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>MAX_BODY){await reader.cancel();return failure("INPUT_LIMIT_EXCEEDED",413);}chunks.push(next.value);}
    parsed=validateCodexPayload(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch { return failure("INVALID_REQUEST_OR_MODEL",400); }
  if (budget && (!Number.isFinite(budget.memberPointsCap) || budget.memberPointsCap <= 0 || budget.memberPointsCap < parsed.reserve || (budget.timeoutMs !== undefined && (!Number.isSafeInteger(budget.timeoutMs) || budget.timeoutMs < 5000 || budget.timeoutMs > 300000)))) return failure("MEMBER_BUDGET_INVALID", 400);
  const idempotency=request.headers.get("idempotency-key") || randomUUID();
  if(idempotency.length>128 || idempotency.startsWith(RETRY_KEY_PREFIX)) return failure("INVALID_IDEMPOTENCY_KEY",400);
  const requestHash=createHash("sha256").update(parsed.text).digest("hex");
  let reservation:{id:string;price:{source:string;quotaPerPoint:number;memberPointsCap?:number;parent?:{type:"run"|"workflow_run";id:string};retry?:{rootRequestId:string;previousRequestId:string}}};
  try {
    reservation=await db.$transaction(async tx=>{
      await lockGatewayBillingAccount(tx, user.id);
      let attemptKey=idempotency;
      let rootRequestId:string|undefined;
      let previousRequestId:string|undefined;
      // The user lock serializes reservations for every attempt of this key. Keep each
      // failed attempt and its debit/refund intact rather than recycling its task id.
      while(true){
        const previous=await tx.apiComputeRequest.findUnique({
          where:{userId_provider_idempotencyKey:{userId:user.id,provider:PROVIDER,idempotencyKey:attemptKey}},
          select:{id:true,requestHash:true,state:true,settledPoints:true,finishedAt:true,price:true,outcome:true},
        });
        if(!previous)break;
        if(previous.requestHash!==requestHash)throw new Error("REQUEST_HASH_CONFLICT");
        const previousParent=previous.price && typeof previous.price==="object" && !Array.isArray(previous.price)
          ? (previous.price as {parent?:{type?:unknown;id?:unknown}}).parent : undefined;
        const previousCap=previous.price && typeof previous.price==="object" && !Array.isArray(previous.price) ? (previous.price as {memberPointsCap?:unknown}).memberPointsCap : undefined;
        if(previousCap!==budget?.memberPointsCap)throw new Error("REQUEST_PARENT_CONFLICT");
        if(previousParent?.type!==parent?.type || previousParent?.id!==parent?.id)throw new Error("REQUEST_PARENT_CONFLICT");
        const rejectedStatus=previous.price && typeof previous.price==="object" && !Array.isArray(previous.price)
          ? (previous.price as {rejectedUpstreamStatus?:unknown}).rejectedUpstreamStatus : undefined;
        // An operator can waive UNCERTAIN charges into RELEASED without proving
        // non-execution. Only explicit rejection evidence permits a fresh attempt.
        // Legacy outcome="RELEASED" was written solely by rejection transition();
        // operator waivers preserve UNCERTAIN or the upstream receipt id instead.
        const explicitNonexecution=await hasNonexecutionEvidence(tx,user.id,previous.id);
        const rejectedWithoutExecution=explicitNonexecution===null ? [400,401,403,404,422,429].includes(Number(rejectedStatus)) || (rejectedStatus===undefined && previous.outcome==="RELEASED") : explicitNonexecution;
        if(previous.state!=="RELEASED" || previous.settledPoints===null || Number(previous.settledPoints)!==0 || !previous.finishedAt || !rejectedWithoutExecution)throw new Error("REQUEST_CONFLICT");
        rootRequestId ??= previous.id;
        previousRequestId=previous.id;
        attemptKey=RETRY_KEY_PREFIX+createHash("sha256").update(JSON.stringify([idempotency,previous.id])).digest("hex");
      }
      const active=await tx.apiComputeRequest.count({where:{userId:user.id,provider:PROVIDER,state:{in:["RUNNING","UNCERTAIN"]}}});
      if(active>=4)throw new Error("TOO_MANY_ACTIVE_REQUESTS");
      const price={source:"APIC",quotaPerPoint:500000,...(budget ? {memberPointsCap:budget.memberPointsCap} : {}),...(parent ? {parent} : {}),...(rootRequestId && previousRequestId ? {retry:{rootRequestId,previousRequestId}} : {})};
      const task=await tx.apiComputeRequest.create({data:{userId:user.id,provider:PROVIDER,idempotencyKey:attemptKey,requestHash,modelId:parsed.model,policyVersion:"apic-final-quota-v1",price,maxUnits:parsed.limit,authorizedPoints:parsed.reserve,state:"RUNNING",startedAt:new Date()},select:{id:true}});
      await debitQuota(tx,{userId:user.id,costPoints:parsed.reserve,ref:{type:"api_compute_request",id:task.id},note:"Codex request reservation"});return {id:task.id,price};
    });
  } catch(error){
    const code=error instanceof QuotaError ? error.code : error instanceof Error && ["REQUEST_HASH_CONFLICT","REQUEST_PARENT_CONFLICT","TOO_MANY_ACTIVE_REQUESTS"].includes(error.message) ? error.message : "REQUEST_CONFLICT";
    return failure(code,error instanceof QuotaError?error.status:409);
  }
  const taskId=reservation.id;
  const transition=async(state:"SETTLED"|"RELEASED"|"UNCERTAIN",upstreamPoints:number|null,requestId?:string,rejectedUpstreamStatus?:number,charge?:ApicCharge)=>db.$transaction(async tx=>{
    await lockGatewayBillingAccount(tx, user.id, true);
    const current = await tx.apiComputeRequest.findFirst({ where: { id: taskId, userId: user.id, provider: PROVIDER, state: "RUNNING" } });
    if (!current) return;
    const member=upstreamPoints!==null && state==="SETTLED" ? cappedMemberCharge(current.price,upstreamPoints,Number(current.authorizedPoints)) : null;
    const points=member ? member.billedPoints : upstreamPoints;
    if (state === "SETTLED" && member && charge) await recordGatewayEvidence(tx,user.id,taskId,{kind:"VERIFIED",charge,billedPoints:member.billedPoints});
    if (state === "RELEASED" && rejectedUpstreamStatus !== undefined) await recordGatewayEvidence(tx,user.id,taskId,{kind:"REJECTED",status:rejectedUpstreamStatus,upstreamRequestId:requestId});
    const changed=await tx.apiComputeRequest.updateMany({where:{id:taskId,userId:user.id,state:"RUNNING"},data:{state,settledPoints:points,outcome:requestId || state,finishedAt:state==="UNCERTAIN"?null:new Date()}});
    if(changed.count!==1) throw new Error("REQUEST_CONFLICT");
    if(points!==null && points<Number(current.authorizedPoints)) await refundQuota(tx,{userId:user.id,costPoints:Number(current.authorizedPoints)-points,ref:{type:"api_compute_request",id:taskId},note:"Codex unused reservation settlement"});
    if(parent && state!=="UNCERTAIN")await refreshMeteredParentCost(tx,user.id,{parent});
  });
  let upstream:Response;
  try {
    upstream=await fetch(`${process.env.RUN_BASE_URL?.replace(/\/$/,"")}/responses`,{method:"POST",headers:{Authorization:`Bearer ${process.env.RUN_API_KEY}`,"Content-Type":"application/json"},body:parsed.text,signal:AbortSignal.timeout(budget?.timeoutMs ?? 300000),redirect:"error"});
  } catch {await transition("UNCERTAIN",null);return failure("UPSTREAM_RESULT_UNCERTAIN",502);}
  const requestId=upstream.headers.get("x-oneapi-request-id");
  if(requestId)await db.apiComputeRequest.updateMany({where:{id:taskId,state:"RUNNING"},data:{outcome:requestId}});
  if(!upstream.ok){
    // Only explicit validation/auth rejection is known not to have generated output.
    await transition([400,401,403,404,422,429].includes(upstream.status)?"RELEASED":"UNCERTAIN",[400,401,403,404,422,429].includes(upstream.status)?0:null,requestId || undefined,upstream.status);
    return failure("UPSTREAM_REJECTED",upstream.status);
  }
  const settle=async()=>{
    if(!requestId)throw new Error("BILLING_REQUEST_ID_MISSING");
    const charge=await readApicCharge(requestId);
    
    await transition("SETTLED",charge.points,requestId,undefined,charge);
  };
  if(!parsed.streaming){
    try{const text=await upstream.text();await settle();return new Response(text,{headers:{"Content-Type":"application/json","Cache-Control":"no-store","x-ans-request-id":taskId}});}
    catch{await transition("UNCERTAIN",null,requestId || undefined);return failure("BILLING_PENDING",502);}
  }
  let disconnected=false;
  const stream=new ReadableStream<Uint8Array>({
    async start(controller){
      try {
        const reader=upstream.body?.getReader();if(!reader)throw new Error("EMPTY_STREAM");
        // Drain upstream even when client disconnects, then settle exactly once.
        while(true){const next=await reader.read();if(next.done)break;if(!disconnected)controller.enqueue(next.value);}
        await settle();if(!disconnected)controller.close();
      }catch{await transition("UNCERTAIN",null,requestId || undefined);if(!disconnected)controller.error(new Error("BILLING_OR_UPSTREAM_PENDING"));}
    },cancel(){disconnected=true;}
  });
  return new Response(stream,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-store","X-Accel-Buffering":"no","x-ans-request-id":taskId}});
}
