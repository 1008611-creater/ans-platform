import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { computeDeliveryCommandSchema } from "@/contracts/compute-delivery";
import { fail, ok } from "@/server/http/respond";
import { ComputeDeliveryError } from "./delivery-service";

export const computeDeliveryPath = "/api/integrations/toonflow/delivery";
const limit = 16384;
export async function readSignedComputeDeliveryCommand(request: Request) {
  const secret = process.env.ANS_TOONFLOW_COMPUTE_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new ComputeDeliveryError("COMPUTE_DELIVERY_SERVICE_NOT_CONFIGURED", 503);
  const url = new URL(request.url), timestamp = request.headers.get("x-ans-compute-timestamp") ?? "", signature = request.headers.get("x-ans-compute-signature") ?? "";
  if (request.method !== "POST" || url.pathname !== computeDeliveryPath || url.search || !/^[0-9]{13}$/.test(timestamp)
    || Math.abs(Date.now() - Number(timestamp)) > 60000 || !/^[a-f0-9]{64}$/.test(signature)) throw new ComputeDeliveryError("COMPUTE_DELIVERY_SERVICE_UNAUTHORIZED", 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new ComputeDeliveryError("INVALID_INPUT", 415);
  if (Number(request.headers.get("content-length")) > limit) throw new ComputeDeliveryError("REQUEST_TOO_LARGE", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ComputeDeliveryError("INVALID_JSON", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > limit) { await reader.cancel(); throw new ComputeDeliveryError("REQUEST_TOO_LARGE", 413); } chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = Buffer.concat(chunks);
  const expected = createHmac("sha256", secret).update(`POST\n${computeDeliveryPath}\n${timestamp}\n${createHash("sha256").update(body).digest("hex")}`).digest();
  if (!timingSafeEqual(Buffer.from(signature, "hex"), expected)) throw new ComputeDeliveryError("COMPUTE_DELIVERY_SERVICE_UNAUTHORIZED", 401);
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)); }
  catch { throw new ComputeDeliveryError("INVALID_JSON", 400); }
  return computeDeliveryCommandSchema.parse(value);
}
export async function computeDeliveryResponse(run: () => Promise<unknown>) {
  try { return ok(await run()); }
  catch (error) {
    if (error instanceof ZodError) return fail("INVALID_INPUT", "INVALID_INPUT", { status: 400 });
    if (error instanceof ComputeDeliveryError) return fail(error.code, error.code, { status: error.status });
    return fail("COMPUTE_DELIVERY_INTERNAL_ERROR", "COMPUTE_DELIVERY_INTERNAL_ERROR", { status: 500 });
  }
}
