import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { NextRequest } from "next/server";

export type Image2FreeQuotaStatus = {
  blocked: boolean;
  limit: number;
  remaining: number;
  used: number;
};

export type Image2FreeQuotaReservation = {
  clientKey: string;
  quota: Image2FreeQuotaStatus;
};

type Image2QuotaRecord = {
  firstSeenAt: string;
  limit: number;
  updatedAt: string;
  used: number;
};

type Image2QuotaStore = {
  records: Record<string, Image2QuotaRecord>;
  version: 1;
};

type DurableQuotaConfig = {
  token: string;
  url: string;
};

const fallbackStore: { state?: Image2QuotaStore } = {};
const quotaKeyPrefix = "image2:free-quota";

export class Image2FreeQuotaExceededError extends Error {
  code = "FREE_QUOTA_EXHAUSTED" as const;
  quota: Image2FreeQuotaStatus;

  constructor(quota: Image2FreeQuotaStatus) {
    super("请先登录 ANS 账号，使用 ANS 算力积分生图（2 点/张）。");
    this.name = "Image2FreeQuotaExceededError";
    this.quota = quota;
  }
}

function quotaLimit() {
  return 0;
}

function quotaStorePath() {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "image2-free-quota.json");
  }

  return path.join(process.cwd(), ".data", "image2-free-quota.json");
}

function createDefaultStore(): Image2QuotaStore {
  return {
    version: 1,
    records: {}
  };
}

function durableQuotaConfig(): DurableQuotaConfig | null {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_REST_API_URL ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REDIS_REST_API_TOKEN ||
    "";

  if (!url.trim() || !token.trim()) return null;
  return {
    url: url.trim().replace(/\/+$/, ""),
    token: token.trim()
  };
}

function durableQuotaKey(clientKey: string) {
  const prefix = process.env.IMAGE2_QUOTA_REDIS_PREFIX?.trim() || quotaKeyPrefix;
  return `${prefix}:${clientKey}`;
}

async function redisCommand(config: DurableQuotaConfig, command: string, ...args: Array<number | string>) {
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([command, ...args])
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; result?: unknown };

  if (!response.ok || data.error) {
    throw new Error(data.error || `额度存储请求失败：${response.status}`);
  }

  return data.result;
}

function numberFromRedisValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusFromUsed(used: number, limit: number): Image2FreeQuotaStatus {
  const normalizedUsed = Math.max(0, used);
  const remaining = Math.max(0, limit - normalizedUsed);
  return {
    used: normalizedUsed,
    limit,
    remaining,
    blocked: remaining <= 0
  };
}

async function getDurableQuotaStatus(config: DurableQuotaConfig, clientKey: string, limit: number) {
  const result = await redisCommand(config, "GET", durableQuotaKey(clientKey));
  return statusFromUsed(numberFromRedisValue(result), limit);
}

async function reserveDurableQuota(
  config: DurableQuotaConfig,
  clientKey: string,
  limit: number
): Promise<Image2FreeQuotaReservation> {
  const script = `
local used = tonumber(redis.call("GET", KEYS[1]) or "0")
local limit = tonumber(ARGV[1])
if used >= limit then
  return {used, limit, 1}
end
used = redis.call("INCR", KEYS[1])
if used > limit then
  redis.call("DECR", KEYS[1])
  return {limit, limit, 1}
end
return {used, limit, 0}
`;
  const result = await redisCommand(config, "EVAL", script, 1, durableQuotaKey(clientKey), limit);
  const [usedValue, limitValue, blockedValue] = Array.isArray(result) ? result : [0, limit, 1];
  const status = statusFromUsed(numberFromRedisValue(usedValue), numberFromRedisValue(limitValue) || limit);

  if (Boolean(numberFromRedisValue(blockedValue))) {
    throw new Image2FreeQuotaExceededError({ ...status, blocked: true });
  }

  return {
    clientKey,
    quota: status
  };
}

async function refundDurableQuota(config: DurableQuotaConfig, reservation: Image2FreeQuotaReservation, limit: number) {
  const script = `
local used = tonumber(redis.call("GET", KEYS[1]) or "0")
if used <= 0 then
  redis.call("SET", KEYS[1], 0)
  return 0
end
used = redis.call("DECR", KEYS[1])
if used < 0 then
  redis.call("SET", KEYS[1], 0)
  return 0
end
return used
`;
  const result = await redisCommand(config, "EVAL", script, 1, durableQuotaKey(reservation.clientKey));
  return statusFromUsed(numberFromRedisValue(result), limit);
}

async function readQuotaStore(): Promise<Image2QuotaStore> {
  const file = quotaStorePath();
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Image2QuotaStore;
    fallbackStore.state = parsed;
    return structuredClone(parsed);
  } catch {
    if (fallbackStore.state) return structuredClone(fallbackStore.state);

    const state = createDefaultStore();
    fallbackStore.state = state;
    await writeQuotaStore(state);
    return structuredClone(state);
  }
}

async function writeQuotaStore(state: Image2QuotaStore) {
  fallbackStore.state = structuredClone(state);
  const file = quotaStorePath();
  try {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Serverless filesystems can be ephemeral; process memory keeps the short-term guard alive.
  }
}

async function mutateQuotaStore<T>(mutator: (state: Image2QuotaStore) => T | Promise<T>) {
  const state = await readQuotaStore();
  const result = await mutator(state);
  await writeQuotaStore(state);
  return result;
}

function normalizeIp(value: string | null) {
  const first = value?.split(",")[0]?.trim() ?? "";
  if (!first) return "";
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(first)) {
    return first.replace(/:\d+$/, "");
  }
  return first.replace(/^\[|\]$/g, "");
}

function clientIpFromRequest(request: NextRequest) {
  return (
    normalizeIp(request.headers.get("cf-connecting-ip")) ||
    normalizeIp(request.headers.get("x-forwarded-for")) ||
    normalizeIp(request.headers.get("x-real-ip")) ||
    normalizeIp(request.headers.get("x-vercel-forwarded-for")) ||
    "unknown"
  );
}

function clientKeyFromRequest(request: NextRequest) {
  return clientKeyFromIp(clientIpFromRequest(request));
}

export function clientKeyFromIp(ip: string) {
  const salt = process.env.IMAGE2_QUOTA_SALT || "image2-free-quota-v1";
  return crypto.createHash("sha256").update(`${salt}:${ip || "unknown"}`).digest("hex");
}

function statusFromRecord(record: Image2QuotaRecord | undefined, limit: number): Image2FreeQuotaStatus {
  const used = Math.max(0, record?.used ?? 0);
  const remaining = Math.max(0, limit - used);
  return {
    used,
    limit,
    remaining,
    blocked: remaining <= 0
  };
}

export function isImage2FreeQuotaExceeded(error: unknown): error is Image2FreeQuotaExceededError {
  return error instanceof Image2FreeQuotaExceededError;
}

export function image2FreeQuotaExceededPayload(error: Image2FreeQuotaExceededError) {
  return {
    code: error.code,
    error: error.message,
    quota: error.quota
  };
}

export async function getImage2FreeQuotaStatus(request: NextRequest) {
  const limit = quotaLimit();
  const clientKey = clientKeyFromRequest(request);
  return getImage2FreeQuotaStatusByClientKey(clientKey);
}

export async function getImage2FreeQuotaStatusByClientKey(clientKey: string) {
  const limit = quotaLimit();
  const durableConfig = durableQuotaConfig();

  if (durableConfig) {
    return getDurableQuotaStatus(durableConfig, clientKey, limit);
  }

  return mutateQuotaStore((state) => {
    const now = new Date().toISOString();
    let record = state.records[clientKey];
    if (!record) {
      record = {
        firstSeenAt: now,
        limit,
        updatedAt: now,
        used: 0
      };
      state.records[clientKey] = record;
    }
    record.limit = limit;
    return statusFromRecord(record, limit);
  });
}

export async function reserveImage2FreeQuota(request: NextRequest): Promise<Image2FreeQuotaReservation> {
  const limit = quotaLimit();
  const clientKey = clientKeyFromRequest(request);
  return reserveImage2FreeQuotaByClientKey(clientKey);
}

export async function reserveImage2FreeQuotaByClientKey(clientKey: string): Promise<Image2FreeQuotaReservation> {
  const limit = quotaLimit();
  const durableConfig = durableQuotaConfig();

  if (durableConfig) {
    return reserveDurableQuota(durableConfig, clientKey, limit);
  }

  return mutateQuotaStore((state) => {
    const now = new Date().toISOString();
    let record = state.records[clientKey];
    if (!record) {
      record = {
        firstSeenAt: now,
        limit,
        updatedAt: now,
        used: 0
      };
      state.records[clientKey] = record;
    }

    record.limit = limit;
    const current = statusFromRecord(record, limit);
    if (current.blocked) {
      throw new Image2FreeQuotaExceededError(current);
    }

    record.used += 1;
    record.updatedAt = now;
    return {
      clientKey,
      quota: statusFromRecord(record, limit)
    };
  });
}

export async function refundImage2FreeQuota(reservation: Image2FreeQuotaReservation) {
  const limit = quotaLimit();
  const durableConfig = durableQuotaConfig();

  if (durableConfig) {
    return refundDurableQuota(durableConfig, reservation, limit);
  }

  return mutateQuotaStore((state) => {
    const record = state.records[reservation.clientKey];
    if (!record) return statusFromRecord(undefined, limit);

    record.limit = limit;
    record.used = Math.max(0, record.used - 1);
    record.updatedAt = new Date().toISOString();
    return statusFromRecord(record, limit);
  });
}
