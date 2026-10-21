import { prelockAgriTeamCharge } from "@/server/competitions/agrihackathon/credits";
import { refreshMeteredParentCost } from "./metered-cost";
import { upstreamFailureCode } from "./upstream-rejection";
import { createHash, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { TX_OPTIONS } from "@/lib/tx-options";
import { isStaleTransactionError, withStaleTransactionRetry } from "./tx-resilience";
import type { Prisma } from "@prisma/client";
import { ClaudePolicyError } from "./claude-policy";
import { hashApiKey, isValidApiKeyFormat } from "@/lib/api-key";
import { RUN_MODEL_OPTIONS } from "@/lib/run-models";
import { debitQuota, refundQuota, QuotaError } from "@/server/quota/service";
import { readApicCharge, type ApicCharge } from "./apic-billing";
import { hasNonexecutionEvidence, recordGatewayEvidence, lockGatewayBillingAccount } from "./gateway-evidence";

import { ModelBillingError, readModelBillingSnapshot, reserveModelPoints, receiptToMemberPoints, type ModelBillingSnapshot } from "./model-billing-policy";

import { ComputeBenefitError } from "@/contracts/compute-benefits";
import { benefitsEnabled, reserveBenefit, completeBenefit } from "@/server/compute-benefits/service";
import { readBenefitFunding, officialUsdMicrosForPointsReserve, officialUsdMicrosFromReceipt } from "./benefit-billing";

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
  const billing = readModelBillingSnapshot(String(body.model));
  const reserve = reserveModelPoints(billing, bytes + 16384, limit);
  return { text, model: String(body.model), limit, reserve, streaming: body.stream === true, billing };

}
export async function authenticateCodex(request: Request, options: { reconcile?: boolean } = {}) {
  if (process.env.ANS_CODEX_GATEWAY_ENABLED !== "1") return null;
  const key = request.headers.get("authorization")?.replace(/^Bearer /i, "") || "";
  if (!isValidApiKeyFormat(key)) return null;
  const user = await db.user.findFirst({ where: { apiKey: hashApiKey(key), flagged: false, deletedAt: null }, select: { id: true } });
  if(user && options.reconcile !== false) await reconcileCodexCharges(user.id);
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
    try{const charge=await readApicCharge(task.outcome, 1);const member=cappedMemberCharge(task.price,receiptToMemberPoints(task.price,charge.quota),Number(task.authorizedPoints));
      await db.$transaction(async tx=>{
        await lockGatewayBillingAccount(tx, userId, true);
        const current = await tx.apiComputeRequest.findFirst({ where: { id: task.id, userId, provider: PROVIDER, state: "UNCERTAIN" } });
        if (!current) return;
        await recordGatewayEvidence(tx,userId,task.id,{kind:"VERIFIED",charge,billedPoints:readBenefitFunding(current.price)?0:member.billedPoints});
        const changed=await tx.apiComputeRequest.updateMany({where:{id:task.id,userId,state:"UNCERTAIN"},data:{state:"SETTLED",settledPoints:readBenefitFunding(current.price)?0:member.billedPoints,finishedAt:new Date()}});
        if(changed.count!==1) throw new Error("REQUEST_CONFLICT");
        if (readBenefitFunding(current.price)) {
          await completeBenefit(tx,{userId,requestId:task.id,actualUsdMicros:officialUsdMicrosFromReceipt(current.price,charge.quota),state:"SETTLED"});
        }
        if(!readBenefitFunding(current.price) && member.billedPoints<Number(current.authorizedPoints)) await refundQuota(tx,{userId,costPoints:Number(current.authorizedPoints)-member.billedPoints,ref:{type:"api_compute_request",id:task.id},note:"Codex recovered actual usage settlement"});
        await refreshMeteredParentCost(tx,userId,task.price);
      }, TX_OPTIONS);
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
  return meteredGatewayRequest(request, userId, parent, budget);
}

/** Native protocol adapters share the same account lock, durable attempts,
 * receipt evidence and wallet. Never call this with a user id from request data. */
export interface MeteredGatewayAdapter {
  idempotencyKey?: (request: Request, normalizedBody: string) => string;
  parse(value: unknown): ReturnType<typeof validateCodexPayload>;
  maxBodyBytes: number;
  path: "messages";
  policyVersion: string;
  priceSnapshot: { protocol: "anthropic-messages"; policy: Prisma.InputJsonObject; billing: ModelBillingSnapshot };
  maxConcurrent: 1;
  rollingDayMaxPoints: number;
  timeoutMs: number;
}
export async function meteredGatewayRequest(request: Request, userId: string, parent?: { type: "run" | "workflow_run"; id: string }, budget?: { memberPointsCap: number; timeoutMs?: number }, adapter?: MeteredGatewayAdapter) {
  const failure = (message: string, status: number) => {
    if (!adapter) return Response.json({ error: { message, type: "ans_gateway_error", code: message } }, { status, headers: { "Cache-Control": "no-store" } });
    const type = status === 401 ? "authentication_error" : status === 429 ? "rate_limit_error" : status >= 500 ? "api_error" : "invalid_request_error";
    return Response.json({ type: "error", error: { type, message } }, { status, headers: { "Cache-Control": "private, no-store" } });
  };
  const fundingMode = request.headers.get("x-ans-funding") ?? "auto";
  if (!["auto", "gift", "paid"].includes(fundingMode)) return failure("INVALID_FUNDING_MODE",400);
  if (fundingMode === "gift" && !benefitsEnabled()) return failure("BENEFITS_NOT_ENABLED",503);
  const maxBody = adapter?.maxBodyBytes ?? MAX_BODY;
  if (adapter && !budget) return failure("MEMBER_BUDGET_REQUIRED", 400);
  const user = { id: userId };
  if (request.signal.aborted) return failure("REQUEST_CANCELLED", 409);
  if (Number(request.headers.get("content-length")) > maxBody) return failure("INPUT_LIMIT_EXCEEDED",413);
  let parsed: ReturnType<typeof validateCodexPayload>;
  try {
    const reader=request.body?.getReader(); if(!reader) return failure("INVALID_REQUEST",400);
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>maxBody){await reader.cancel();return failure("INPUT_LIMIT_EXCEEDED",413);}chunks.push(next.value);}
    parsed=(adapter?.parse ?? validateCodexPayload)(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))));
  } catch (error) { return error instanceof ClaudePolicyError || error instanceof ModelBillingError ? failure(error.code, error.status) : failure("INVALID_REQUEST_OR_MODEL",400); }
  if (budget && (!Number.isFinite(budget.memberPointsCap) || budget.memberPointsCap <= 0 || budget.memberPointsCap < parsed.reserve || (budget.timeoutMs !== undefined && (!Number.isSafeInteger(budget.timeoutMs) || budget.timeoutMs < 5000 || budget.timeoutMs > 300000)))) return failure("MEMBER_BUDGET_INVALID", 400);
  let idempotency: string;
  try { idempotency = adapter?.idempotencyKey?.(request, parsed.text) ?? request.headers.get("idempotency-key") ?? randomUUID(); }
  catch (error) { return error instanceof ClaudePolicyError ? failure(error.code, error.status) : failure("INVALID_IDEMPOTENCY_KEY", 400); }
  if(idempotency.length>128 || idempotency.startsWith(RETRY_KEY_PREFIX)) return failure("INVALID_IDEMPOTENCY_KEY",400);
  const requestHash=createHash("sha256").update(parsed.text).digest("hex");
  // 预留事务分步打点：失败时能直接看出卡在哪一步、每步花了多久（2026-10-21 生产事故定位）。
  let reservationStep = "start";
  const reservationMarks: Array<{ step: string; atMs: number }> = [{ step: "start", atMs: Date.now() }];
  const markReservationStep = (step: string) => { reservationStep = step; reservationMarks.push({ step, atMs: Date.now() }); };
  const reservationTimingSummary = () => reservationMarks.map((entry, index) => ({
    step: entry.step,
    ms: (reservationMarks[index + 1]?.atMs ?? Date.now()) - entry.atMs,
  }));
  let reservation:{id:string;price:Prisma.InputJsonObject};
  try {
    reservation=await withStaleTransactionRetry(() => db.$transaction(async tx=>{
      markReservationStep("prelockAgriTeamCharge");
      const eventFunding = await prelockAgriTeamCharge(tx, user.id, parent);
      markReservationStep("lockGatewayBillingAccount");
      await lockGatewayBillingAccount(tx, user.id);
      let attemptKey=idempotency;
      let rootRequestId:string|undefined;
      let previousRequestId:string|undefined;
      // The user lock serializes reservations for every attempt of this key. Keep each
      // failed attempt and its debit/refund intact rather than recycling its task id.
      while(true){
        markReservationStep("idempotencyLookup");
        const previous=await tx.apiComputeRequest.findUnique({
          where:{userId_provider_idempotencyKey:{userId:user.id,provider:PROVIDER,idempotencyKey:attemptKey}},
          select:{id:true,requestHash:true,state:true,settledPoints:true,finishedAt:true,price:true,outcome:true,policyVersion:true},
        });
        if(!previous)break;
        if(previous.requestHash!==requestHash)throw new Error("REQUEST_HASH_CONFLICT");
        const previousFundingMode = previous.price && typeof previous.price === "object" && !Array.isArray(previous.price)
          ? (previous.price as { fundingMode?: unknown }).fundingMode ?? "auto" : "auto";
        if (previousFundingMode !== fundingMode) throw new Error("REQUEST_FUNDING_CONFLICT");
        if(adapter && previous.policyVersion!==adapter.policyVersion)throw new Error("REQUEST_POLICY_CHANGED");
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
        markReservationStep("hasNonexecutionEvidence");
        const explicitNonexecution=await hasNonexecutionEvidence(tx,user.id,previous.id);
        const rejectedWithoutExecution=explicitNonexecution===null ? [400,401,403,404,422,429].includes(Number(rejectedStatus)) || (rejectedStatus===undefined && previous.outcome==="RELEASED") : explicitNonexecution;
        if(previous.state!=="RELEASED" || previous.settledPoints===null || Number(previous.settledPoints)!==0 || !previous.finishedAt || !rejectedWithoutExecution)throw new Error("REQUEST_ALREADY_RUNNING");
        rootRequestId ??= previous.id;
        previousRequestId=previous.id;
        attemptKey=RETRY_KEY_PREFIX+createHash("sha256").update(JSON.stringify([idempotency,previous.id])).digest("hex");
      }
      markReservationStep("activeCount");
      const active=await tx.apiComputeRequest.count({where:{userId:user.id,provider:PROVIDER,...(adapter ? { modelId: parsed.model } : {}),state:{in:adapter ? ["AUTHORIZED","RUNNING","UNCERTAIN"] : ["RUNNING","UNCERTAIN"]}}});
      if(active >= (adapter?.maxConcurrent ?? 4))throw new Error("TOO_MANY_ACTIVE_REQUESTS");
      if (adapter) {
        // Include old unresolved holds as liabilities even when older than the
        // rolling window. A timed-out receipt must not reopen expensive credit.
        markReservationStep("liabilityScan");
        const liabilities = await tx.apiComputeRequest.findMany({ where: {
          userId: user.id, provider: PROVIDER, modelId: parsed.model,
          OR: [{ state: "SETTLED", finishedAt: { gte: new Date(Date.now() - 86_400_000) } }, { state: { in: ["AUTHORIZED", "RUNNING", "UNCERTAIN"] } }],
        }, select: { state: true, authorizedPoints: true, settledPoints: true, price: true } });
        let micros = 0;
        for (const row of liabilities) {
          if (row.state === "SETTLED" && row.settledPoints === null) throw new Error("BUDGET_STATE_UNAVAILABLE");
          const amount = row.state === "SETTLED" ? Number(readBenefitFunding(row.price) ? row.authorizedPoints : row.settledPoints)
            : ["AUTHORIZED", "RUNNING", "UNCERTAIN"].includes(row.state) ? Number(row.authorizedPoints) : 0;
          if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(Math.round(amount * 1e6))) throw new Error("BUDGET_STATE_UNAVAILABLE");
          micros += Math.round(amount * 1e6);
        }
        if (!Number.isSafeInteger(micros) || micros + Math.ceil(parsed.reserve * 1e6) > Math.floor(adapter.rollingDayMaxPoints * 1e6)) throw new Error("DAILY_BUDGET_EXCEEDED");
      }
      const requestTaskId = randomUUID();
      markReservationStep("reserveBenefit");
      const gift = fundingMode === "paid" ? null : await reserveBenefit(tx,{
        userId:user.id,requestId:requestTaskId,modelId:parsed.model,
        usdMicros:officialUsdMicrosForPointsReserve(parsed.billing,parsed.reserve),
      });
      if (fundingMode === "gift" && !gift) throw new ComputeBenefitError("BENEFIT_UNAVAILABLE",402);
      const price={source:"APIC",quotaPerUsd:500000,billing:parsed.billing,fundingMode,
        ...(gift ? {benefitFunding:{version:"official-usd-gift-v1",...gift}} : {}),...(adapter ? adapter.priceSnapshot : {}),...(budget ? {memberPointsCap:budget.memberPointsCap} : {}),...(parent ? {parent} : {}),...(rootRequestId && previousRequestId ? {retry:{rootRequestId,previousRequestId}} : {})};
      markReservationStep("createRequest");
      const task=await tx.apiComputeRequest.create({data:{id:requestTaskId,userId:user.id,provider:PROVIDER,idempotencyKey:attemptKey,requestHash,modelId:parsed.model,policyVersion:adapter?.policyVersion ?? "apic-usd-cny-points-v2",price,maxUnits:parsed.limit,authorizedPoints:parsed.reserve,state:"RUNNING",startedAt:new Date()},select:{id:true}});
      markReservationStep("debitQuota");
      if (!gift) await debitQuota(tx,{userId:user.id,costPoints:parsed.reserve,ref:{type:"api_compute_request",id:task.id},note:adapter ? "Claude request reservation" : "Codex request reservation",...(eventFunding ? {eventFunding} : {})});return {id:task.id,price};
    }, TX_OPTIONS), {
      onRetry: (error, attempt) =>
        console.warn("[codex-gateway] reservation transaction was invalidated, retrying once", {
          userId: user.id, modelId: parsed.model, attempt, step: reservationStep,
          timings: reservationTimingSummary(), message: error instanceof Error ? error.message : String(error),
        }),
    });
  } catch(error){
    // Keep a genuine "this key already has an unfinished attempt" distinguishable
    // from any unexpected reservation failure. Masking both as REQUEST_CONFLICT
    // made clients tell members "your request is already running" for every
    // internal error and hid the real cause from the logs.
    const passthrough = error instanceof Error && ["REQUEST_HASH_CONFLICT","REQUEST_FUNDING_CONFLICT","REQUEST_PARENT_CONFLICT","REQUEST_POLICY_CHANGED","REQUEST_ALREADY_RUNNING","TOO_MANY_ACTIVE_REQUESTS","DAILY_BUDGET_EXCEEDED","BUDGET_STATE_UNAVAILABLE"].includes(error.message);
    const code=error instanceof ComputeBenefitError ? error.code : error instanceof QuotaError ? error.code : passthrough ? (error as Error).message : "GATEWAY_RESERVATION_FAILED";
    const status = error instanceof ComputeBenefitError ? error.status : error instanceof QuotaError ? error.status : adapter && ["TOO_MANY_ACTIVE_REQUESTS", "DAILY_BUDGET_EXCEEDED"].includes(code) ? 429 : adapter && code === "BUDGET_STATE_UNAVAILABLE" ? 503 : 409;
    if (code === "GATEWAY_RESERVATION_FAILED") console.error("[codex-gateway] reservation failed", { userId: user.id, modelId: parsed.model, step: reservationStep, timings: reservationTimingSummary(), message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return failure(code, status);
  }
  const taskId=reservation.id;
  const transition=async(state:"SETTLED"|"RELEASED"|"UNCERTAIN",upstreamPoints:number|null,requestId?:string,rejectedUpstreamStatus?:number,charge?:ApicCharge)=>db.$transaction(async tx=>{
    await lockGatewayBillingAccount(tx, user.id, true);
    const current = await tx.apiComputeRequest.findFirst({ where: { id: taskId, userId: user.id, provider: PROVIDER, state: "RUNNING" } });
    if (!current) return;
    const member=upstreamPoints!==null && state==="SETTLED" ? cappedMemberCharge(current.price,charge ? receiptToMemberPoints(current.price,charge.quota) : upstreamPoints,Number(current.authorizedPoints)) : null;
    const gift = readBenefitFunding(current.price);
    const points=gift && state === "SETTLED" ? 0 : member ? member.billedPoints : upstreamPoints;
    if (gift && state !== "UNCERTAIN") {
      if (state === "SETTLED" && !charge) throw new Error("BENEFIT_RECEIPT_REQUIRED");
      await completeBenefit(tx,{userId:user.id,requestId:taskId,state,
        actualUsdMicros:charge ? officialUsdMicrosFromReceipt(current.price,charge.quota) : BigInt(0)});
    }
    if (state === "SETTLED" && member && charge) await recordGatewayEvidence(tx,user.id,taskId,{kind:"VERIFIED",charge,billedPoints:gift?0:member.billedPoints});
    if (state === "RELEASED" && rejectedUpstreamStatus !== undefined) await recordGatewayEvidence(tx,user.id,taskId,{kind:"REJECTED",status:rejectedUpstreamStatus,upstreamRequestId:requestId});
    const changed=await tx.apiComputeRequest.updateMany({where:{id:taskId,userId:user.id,state:"RUNNING"},data:{state,settledPoints:points,outcome:requestId || state,finishedAt:state==="UNCERTAIN"?null:new Date()}});
    if(changed.count!==1) throw new Error("REQUEST_CONFLICT");
    if(!gift && points!==null && points<Number(current.authorizedPoints)) await refundQuota(tx,{userId:user.id,costPoints:Number(current.authorizedPoints)-points,ref:{type:"api_compute_request",id:taskId},note:adapter ? "Claude unused reservation settlement" : "Codex unused reservation settlement"});
    if(parent && state!=="UNCERTAIN")await refreshMeteredParentCost(tx,user.id,{parent});
  }, TX_OPTIONS);
  let upstream:Response;
  try {
    upstream=await fetch(`${process.env.RUN_BASE_URL?.replace(/\/$/,"")}/${adapter?.path ?? "responses"}`,{method:"POST",headers:{Authorization:`Bearer ${process.env.RUN_API_KEY}`,"Content-Type":"application/json",...(adapter ? { "anthropic-version": "2023-06-01" } : {})},body:parsed.text,signal:AbortSignal.timeout(budget?.timeoutMs ?? adapter?.timeoutMs ?? 300000),redirect:"error"});
  } catch {await transition("UNCERTAIN",null);return failure("UPSTREAM_RESULT_UNCERTAIN",502);}
  const requestId=upstream.headers.get("x-oneapi-request-id");
  if(requestId)await db.apiComputeRequest.updateMany({where:{id:taskId,state:"RUNNING"},data:{outcome:requestId}});
  if(!upstream.ok){
    // Only explicit validation/auth rejection is known not to have generated output.
    await transition([400,401,403,404,422,429].includes(upstream.status)?"RELEASED":"UNCERTAIN",[400,401,403,404,422,429].includes(upstream.status)?0:null,requestId || undefined,upstream.status);
    return failure(await upstreamFailureCode(upstream),upstream.status);
  }
  const settle=async()=>{
    if(!requestId)throw new Error("BILLING_REQUEST_ID_MISSING");
    const charge=await readApicCharge(requestId);
    
    await transition("SETTLED",receiptToMemberPoints(reservation.price,charge.quota),requestId,undefined,charge);
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
      }catch{await transition("UNCERTAIN",null,requestId || undefined);if(!disconnected) {
          if (adapter) {
            controller.enqueue(new TextEncoder().encode('event: error\ndata: ' + JSON.stringify({ type: "error", error: { type: "api_error", message: "BILLING_OR_UPSTREAM_PENDING" } }) + '\n\n'));
            controller.close();
          } else controller.error(new Error("BILLING_OR_UPSTREAM_PENDING"));
        }}
    },cancel(){disconnected=true;}
  });
  return new Response(stream,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-store","X-Accel-Buffering":"no","x-ans-request-id":taskId}});
}
