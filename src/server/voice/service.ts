import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { voiceRequestSchema, voiceRequestKey } from "@/contracts/voice";
import { assertAccountCanSpend } from "@/server/quota/service";
import { HttpRequestError } from "@/server/http/json";
import { VOICE_PROVIDER, VOICE_MODEL, VOICE_POLICY, VOICE_MAX_BYTES, VOICE_STORAGE_CAP, VOICE_CACHE_MS, VOICE_TIMEOUT_MS, voiceOffer } from "./policy";

export class VoiceError extends HttpRequestError {}
const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const requestSelect = { id: true, state: true, settledPoints: true, policyVersion: true, modelId: true, maxUnits: true, createdAt: true, finishedAt: true } as const;

export async function readVoiceOffer(userId: string) {
  await db.$transaction(tx => assertAccountCanSpend(tx, userId, 0));
  return voiceOffer();
}

/** Only this service owns Mimo's dispatch. Retries return the durable request, never redispatch. */
export async function generateVoice(userId: string, raw: unknown) {
  const parsed = voiceRequestSchema.safeParse(raw);
  if (!parsed.success) throw new VoiceError("INVALID_INPUT", 400);
  const input = parsed.data;
  const requestHash = hash(JSON.stringify({ text: input.text, voice: input.voice, policyVersion: input.policyVersion }));
  const reservation = await db.$transaction(async tx => {
    // A provider-wide lock makes both global resource caps and per-account limits durable.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(1634628436, 1)::text AS locked`;
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    await assertAccountCanSpend(tx, userId, 0);
    const previous = await tx.apiComputeRequest.findUnique({ where: { userId_provider_idempotencyKey: { userId, provider: VOICE_PROVIDER, idempotencyKey: input.idempotencyKey } }, select: { id: true, requestHash: true } });
    if (previous) {
      if (previous.requestHash !== requestHash) throw new VoiceError("REQUEST_HASH_CONFLICT", 409);
      return { id: previous.id, dispatch: false };
    }
    const now = new Date();
    const offer = voiceOffer(now);
    if (!offer.available) throw new VoiceError("VOICE_UNAVAILABLE", 503);
    if (input.policyVersion !== offer.policyVersion) throw new VoiceError("VOICE_POLICY_CHANGED", 409);
    await tx.voiceResult.deleteMany({ where: { expiresAt: { lte: now } } });
    await tx.apiComputeRequest.updateMany({ where: { provider: VOICE_PROVIDER, state: "RUNNING", startedAt: { lt: new Date(now.getTime() - 2 * VOICE_TIMEOUT_MS) } }, data: { state: "UNCERTAIN", outcome: "VOICE_INTERRUPTED_UNKNOWN" } });
    const [recent, daily, active, globalRecent, globalActive, stored] = await Promise.all([
      tx.apiComputeRequest.count({ where: { userId, provider: VOICE_PROVIDER, createdAt: { gt: new Date(now.getTime() - 60_000) } } }),
      tx.apiComputeRequest.count({ where: { userId, provider: VOICE_PROVIDER, createdAt: { gt: new Date(now.getTime() - VOICE_CACHE_MS) } } }),
      tx.apiComputeRequest.count({ where: { userId, provider: VOICE_PROVIDER, state: { in: ["RUNNING", "UNCERTAIN"] } } }),
      tx.apiComputeRequest.count({ where: { provider: VOICE_PROVIDER, createdAt: { gt: new Date(now.getTime() - 60 * 60_000) } } }),
      tx.apiComputeRequest.count({ where: { provider: VOICE_PROVIDER, state: "RUNNING" } }),
      tx.voiceResult.aggregate({ _sum: { byteLength: true } }),
    ]);
    if (recent >= 10 || daily >= 100 || active >= 2) throw new VoiceError("VOICE_RATE_LIMITED", 429);
    if (globalRecent >= 200 || globalActive >= 8 || Number(stored._sum.byteLength ?? 0) + (globalActive + 1) * VOICE_MAX_BYTES > VOICE_STORAGE_CAP) throw new VoiceError("VOICE_CAPACITY_LIMITED", 503);
    const row = await tx.apiComputeRequest.create({ data: { userId, provider: VOICE_PROVIDER, idempotencyKey: input.idempotencyKey, requestHash,
      modelId: VOICE_MODEL, policyVersion: VOICE_POLICY.version, price: { ...VOICE_POLICY, voice: input.voice, unit: "unicode-character", audioRetentionHours: 24 },
      maxUnits: [...input.text].length, authorizedPoints: 0, state: "RUNNING", startedAt: now }, select: { id: true } });
    // Zero-price calls live in the unified usage audit, not fake zero-amount balance ledger entries.
    return { id: row.id, dispatch: true };
  }, { timeout: 15_000, maxWait: 10_000 });
  if (!reservation.dispatch) return readVoiceRequest(userId, input.idempotencyKey, true);
  let result: { audio: Uint8Array; sha256: string };
  try {
    const upstream = await fetch("https://api.xiaomimimo.com/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.MIMO_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: VOICE_MODEL, messages: [{ role: "user", content: "Read the following Chinese text naturally and warmly. Add no extra words." }, { role: "assistant", content: input.text }], audio: { format: "wav", voice: input.voice } }),
      signal: AbortSignal.timeout(VOICE_TIMEOUT_MS), cache: "no-store", redirect: "error",
    });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      // No provider replay/receipt lookup is claimed. Only explicit validation/auth rejection proves no generation.
      const rejected = [400, 401, 403, 404, 422, 429].includes(upstream.status);
      await recordFailure(reservation.id, rejected ? "RELEASED" : "UNCERTAIN", rejected ? "VOICE_REJECTED" : "VOICE_UPSTREAM_UNKNOWN");
      return readVoiceRequest(userId, input.idempotencyKey, true);
    }
    const body = await boundedBody(upstream, Math.ceil(VOICE_MAX_BYTES * 4 / 3) + 128_000);
    const payload: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
    const encoded = readEncodedAudio(payload);
    const audio = Buffer.from(encoded, "base64");
    if (!validWav(audio)) throw new Error("Invalid audio");
    result = { audio, sha256: hash(audio) };
  } catch {
    await recordFailure(reservation.id, "UNCERTAIN", "VOICE_UPSTREAM_UNKNOWN");
    return readVoiceRequest(userId, input.idempotencyKey, true);
  }
  // Persist delivery and settlement atomically. A client disconnect does not abort provider work.
  try {
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(1634628436, 1)::text AS locked`;
      const changed = await tx.apiComputeRequest.updateMany({ where: { id: reservation.id, provider: VOICE_PROVIDER, state: "RUNNING" },
        data: { state: "SETTLED", settledPoints: 0, outcome: "VOICE_AUDIO_STORED", finishedAt: new Date() } });
      if (changed.count !== 1) throw new VoiceError("VOICE_STATE_CONFLICT", 409);
      await tx.voiceResult.create({ data: { requestId: reservation.id, audio: new Uint8Array(result.audio), byteLength: result.audio.byteLength,
        sha256: result.sha256, expiresAt: new Date(Date.now() + VOICE_CACHE_MS) } });
    });
  } catch {
    await recordFailure(reservation.id, "UNCERTAIN", "VOICE_STORAGE_UNKNOWN");
  }
  return readVoiceRequest(userId, input.idempotencyKey, true);
}

async function recordFailure(id: string, state: "RELEASED" | "UNCERTAIN", outcome: string) {
  await db.apiComputeRequest.updateMany({ where: { id, provider: VOICE_PROVIDER, state: "RUNNING" },
    data: { state, outcome, settledPoints: state === "RELEASED" ? 0 : null, finishedAt: state === "RELEASED" ? new Date() : null } });
}

export async function readVoiceRequest(userId: string, key: string, withAudio = false) {
  if (!voiceRequestKey.safeParse(key).success) throw new VoiceError("INVALID_INPUT", 400);
  return db.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    await assertAccountCanSpend(tx, userId, 0);
    const row = await tx.apiComputeRequest.findUnique({ where: { userId_provider_idempotencyKey: { userId, provider: VOICE_PROVIDER, idempotencyKey: key } }, select: requestSelect });
    if (!row) throw new VoiceError("NOT_FOUND", 404);
    const stored = row.state === "SETTLED" ? await tx.voiceResult.findUnique({ where: { requestId: row.id }, select: { expiresAt: true, byteLength: true, sha256: true, ...(withAudio ? { audio: true } : {}) } }) : null;
    const available = !!stored && stored.expiresAt.getTime() > Date.now();
    const metadata = { requestId: row.id, state: row.state, points: row.state === "SETTLED" || row.state === "RELEASED" ? 0 : null,
      reservedPoints: 0, modelId: row.modelId, policyVersion: row.policyVersion, characters: row.maxUnits,
      createdAt: row.createdAt.toISOString(), finishedAt: row.finishedAt?.toISOString() ?? null,
      audioAvailable: available, expiresAt: stored?.expiresAt.toISOString() ?? null };
    if (withAudio && row.state === "SETTLED" && !available) throw new VoiceError("VOICE_AUDIO_EXPIRED", 410);
    if (withAudio && available && stored && "audio" in stored && stored.audio) {
      const audio = stored.audio as Uint8Array;
      if (audio.byteLength !== stored.byteLength || hash(audio) !== stored.sha256) throw new VoiceError("VOICE_AUDIO_UNAVAILABLE", 503);
      return { metadata, audio };
    }
    return { metadata, audio: null };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

/** Maintenance only: retain uncertainty, never infer supplier rejection from elapsed time. */
export async function sweepVoiceUsage() {
  return db.$transaction(async tx => {
    const expired = await tx.voiceResult.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    const interrupted = await tx.apiComputeRequest.updateMany({ where: { provider: VOICE_PROVIDER, state: "RUNNING", startedAt: { lt: new Date(Date.now() - 2 * VOICE_TIMEOUT_MS) } }, data: { state: "UNCERTAIN", outcome: "VOICE_INTERRUPTED_UNKNOWN" } });
    const pending = await tx.apiComputeRequest.count({ where: { provider: VOICE_PROVIDER, state: "UNCERTAIN" } });
    return { expiredAudio: expired.count, interrupted: interrupted.count, pending };
  });
}

async function boundedBody(response: Response, limit: number) {
  if (Number(response.headers.get("content-length")) > limit) { await response.body?.cancel(); throw new Error("Oversize audio"); }
  const reader = response.body?.getReader(); if (!reader) throw new Error("Empty audio");
  const parts: Uint8Array[] = []; let size = 0;
  try { for (;;) { const part = await reader.read(); if (part.done) break;
    size += part.value.byteLength; if (size > limit) { await reader.cancel(); throw new Error("Oversize audio"); } parts.push(part.value);
  } } finally { reader.releaseLock(); }
  return Buffer.concat(parts, size);
}
function readEncodedAudio(payload: unknown) {
  const encoded = (payload as { choices?: { message?: { audio?: { data?: unknown } } }[] } | null)?.choices?.[0]?.message?.audio?.data;
  if (typeof encoded !== "string" || encoded.length > Math.ceil(VOICE_MAX_BYTES * 4 / 3) + 4 || (encoded.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(encoded) || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))) throw new Error("Invalid audio");
  return encoded;
}
function validWav(audio: Uint8Array) {
  const buffer = Buffer.from(audio);
  if (audio.length < 44 || audio.length > VOICE_MAX_BYTES || buffer.toString("ascii", 0, 4) !== "RIFF"
    || buffer.toString("ascii", 8, 12) !== "WAVE" || buffer.readUInt32LE(4) + 8 !== audio.length) return false;
  let format = false, dataBytes = 0, blockAlign = 0;
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const name = buffer.toString("ascii", offset, offset + 4), length = buffer.readUInt32LE(offset + 4);
    const start = offset + 8, end = start + length;
    if (end > buffer.length) return false;
    if (name === "fmt ") {
      if (format || length < 16) return false;
      const code = buffer.readUInt16LE(start), channels = buffer.readUInt16LE(start + 2), rate = buffer.readUInt32LE(start + 4);
      const bits = buffer.readUInt16LE(start + 14); blockAlign = buffer.readUInt16LE(start + 12);
      if (![1, 3].includes(code) || channels < 1 || channels > 2 || rate < 8000 || rate > 96000
        || ![8, 16, 24, 32].includes(bits) || blockAlign !== channels * bits / 8
        || buffer.readUInt32LE(start + 8) !== rate * blockAlign) return false;
      format = true;
    } else if (name === "data") {
      if (!format || !length || length % blockAlign !== 0 || dataBytes) return false;
      dataBytes = length;
    }
    offset = end + length % 2;
  }
  return format && dataBytes > 0;
}
