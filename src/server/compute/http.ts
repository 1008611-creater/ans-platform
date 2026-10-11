import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { computeCommandSchema } from "@/contracts/compute";
import { fail, ok } from "@/server/http/respond";
import { QuotaError } from "@/server/quota/service";
import { ComputeError } from "./policy";

const path = "/api/integrations/toonflow/compute";
const limit = 32_768;
export async function readSignedComputeCommand(request: Request) {
  const secret = process.env.ANS_TOONFLOW_COMPUTE_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new ComputeError("COMPUTE_SERVICE_NOT_CONFIGURED", 503);
  const url = new URL(request.url);
  const timestamp = request.headers.get("x-ans-compute-timestamp") ?? "";
  const signature = request.headers.get("x-ans-compute-signature") ?? "";
  if (request.method !== "POST" || url.pathname !== path || url.search || !/^[0-9]{13}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 60_000 || !/^[a-f0-9]{64}$/.test(signature)) {
    throw new ComputeError("COMPUTE_SERVICE_UNAUTHORIZED", 401);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new ComputeError("INVALID_INPUT", 415);
  if (Number(request.headers.get("content-length")) > limit) throw new ComputeError("REQUEST_TOO_LARGE", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ComputeError("INVALID_JSON", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new ComputeError("REQUEST_TOO_LARGE", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = Buffer.concat(chunks);
  const bodyHash = createHash("sha256").update(bytes).digest("hex");
  const expected = createHmac("sha256", secret).update(`POST\n${path}\n${timestamp}\n${bodyHash}`).digest();
  if (!timingSafeEqual(Buffer.from(signature, "hex"), expected)) throw new ComputeError("COMPUTE_SERVICE_UNAUTHORIZED", 401);
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new ComputeError("INVALID_JSON", 400); }
  return computeCommandSchema.parse(value);
}
export async function computeResponse(run: () => Promise<unknown>) {
  try { return ok(await run()); }
  catch (error) {
    const code = error instanceof ComputeError ? error.code : error instanceof QuotaError ? error.code : error instanceof ZodError ? "INVALID_INPUT" : "COMPUTE_INTERNAL_ERROR";
    const status = error instanceof ComputeError || error instanceof QuotaError ? error.status : error instanceof ZodError ? 400 : 500;
    // No raw database, request, provider or validation details in public output.
    return fail(code, code, { status });
  }
}
