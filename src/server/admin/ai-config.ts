import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { decryptCredential, encryptCredential, maskStoredCredential } from "@/server/integrations/credential-crypto";

export const ADMIN_AI_CONFIG_ID = "default";
export const REVIEW_REASONING_EFFORTS = ["none", "low", "medium", "high"] as const;
export type ReviewReasoningEffort = (typeof REVIEW_REASONING_EFFORTS)[number];

export type AdminAiConfigInput = {
  baseUrl: string;
  apiKey?: string;
  selectedModel: string;
  availableModels: string[];
  reasoningEffort: ReviewReasoningEffort;
  timeoutMs: number;
  enabled: boolean;
};

export type AdminAiConfigPublic = {
  baseUrl: string;
  apiKey: string;
  selectedModel: string;
  availableModels: string[];
  reasoningEffort: ReviewReasoningEffort;
  timeoutMs: number;
  enabled: boolean;
  updatedAt: string;
};

export function validateAiBaseUrl(value: string): string {
  const baseUrl = value.trim().replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("API 地址格式不正确");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("API 地址必须是 http(s) 地址，且不能包含账号、密码、查询参数或片段");
  }
  return baseUrl;
}

export function normalizeModelList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean))].slice(0, 500);
}

export function modelListFromJson(value: unknown): string[] {
  return normalizeModelList(value);
}

export function buildPublicAiConfig(config: {
  baseUrl: string;
  encryptedApiKey: string;
  apiKeyLast4: string;
  selectedModel: string;
  availableModels: unknown;
  reasoningEffort: string;
  timeoutMs: number;
  enabled: boolean;
  updatedAt: Date;
} | null): AdminAiConfigPublic | null {
  if (!config) return null;
  return {
    baseUrl: config.baseUrl,
    apiKey: maskStoredCredential(config.encryptedApiKey) || `****${config.apiKeyLast4}`,
    selectedModel: config.selectedModel,
    availableModels: modelListFromJson(config.availableModels),
    reasoningEffort: REVIEW_REASONING_EFFORTS.includes(config.reasoningEffort as ReviewReasoningEffort)
      ? config.reasoningEffort as ReviewReasoningEffort
      : "none",
    timeoutMs: config.timeoutMs,
    enabled: config.enabled,
    updatedAt: config.updatedAt.toISOString(),
  };
}

export async function getAdminAiConfig() {
  return db.adminAiConfig.findUnique({ where: { id: ADMIN_AI_CONFIG_ID } });
}

export async function saveAdminAiConfig(input: AdminAiConfigInput, updatedById: string) {
  const baseUrl = validateAiBaseUrl(input.baseUrl);
  const models = normalizeModelList(input.availableModels);
  const selectedModel = input.selectedModel.trim();
  if (!selectedModel || selectedModel.length > 200) throw new Error("默认模型不能为空");
  if (!models.includes(selectedModel)) models.unshift(selectedModel);
  if (!Number.isInteger(input.timeoutMs) || input.timeoutMs < 5_000 || input.timeoutMs > 120_000) {
    throw new Error("超时时间必须在 5 到 120 秒之间");
  }
  if (!REVIEW_REASONING_EFFORTS.includes(input.reasoningEffort)) throw new Error("思考强度不正确");

  const existing = await getAdminAiConfig();
  const apiKey = input.apiKey?.trim();
  const encryptedApiKey = apiKey ? encryptCredential(apiKey) : existing?.encryptedApiKey;
  const apiKeyLast4 = apiKey ? apiKey.slice(-4) : existing?.apiKeyLast4;
  if (!encryptedApiKey || !apiKeyLast4) throw new Error("请填写 API Key");

  return db.adminAiConfig.upsert({
    where: { id: ADMIN_AI_CONFIG_ID },
    create: {
      id: ADMIN_AI_CONFIG_ID,
      baseUrl,
      encryptedApiKey,
      apiKeyLast4,
      selectedModel,
      availableModels: models,
      reasoningEffort: input.reasoningEffort,
      timeoutMs: input.timeoutMs,
      enabled: input.enabled,
      updatedById,
    },
    update: {
      baseUrl,
      encryptedApiKey,
      apiKeyLast4,
      selectedModel,
      availableModels: models,
      reasoningEffort: input.reasoningEffort,
      timeoutMs: input.timeoutMs,
      enabled: input.enabled,
      updatedById,
    },
  });
}

export async function saveAdminAiConfigWithAudit(input: AdminAiConfigInput, updatedById: string) {
  const before = await getAdminAiConfig();
  const saved = await saveAdminAiConfig(input, updatedById);
  await writeAuditLog({
    actorId: updatedById,
    action: "ADMIN_AI_CONFIG_UPDATE",
    resourceType: "ADMIN_AI_CONFIG",
    resourceId: saved.id,
    before: before ? { baseUrl: before.baseUrl, selectedModel: before.selectedModel, reasoningEffort: before.reasoningEffort, timeoutMs: before.timeoutMs, enabled: before.enabled } : null,
    after: { baseUrl: saved.baseUrl, selectedModel: saved.selectedModel, reasoningEffort: saved.reasoningEffort, timeoutMs: saved.timeoutMs, enabled: saved.enabled },
  });
  return saved;
}

export async function recordAdminAiModelsSync(config: { id: string; count: number; selectedModel: string }, actorId: string) {
  await writeAuditLog({
    actorId,
    action: "ADMIN_AI_MODELS_SYNC",
    resourceType: "ADMIN_AI_CONFIG",
    resourceId: config.id,
    after: { count: config.count, selectedModel: config.selectedModel },
  });
}

function modelsUrl(baseUrl: string): string {
  const url = new URL(validateAiBaseUrl(baseUrl));
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = `${path.endsWith("/v1") ? path : `${path}/v1`}/models`;
  return url.toString();
}

async function fetchAdminAiModels(baseUrl: string, apiKey: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(modelsUrl(baseUrl), {
      method: "GET",
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error(`上游模型同步失败（${response.status}）`);
    const payload = (await response.json()) as { data?: Array<{ id?: unknown }> };
    const models = normalizeModelList(payload.data?.map((item) => item.id));
    if (!models.length) throw new Error("上游没有返回可用模型");
    return models;
  } finally {
    clearTimeout(timer);
  }
}

export async function syncAdminAiModels(config: { baseUrl: string; encryptedApiKey: string }) {
  return fetchAdminAiModels(config.baseUrl, decryptCredential(config.encryptedApiKey));
}

/** 用于后台首次填写时的非持久化连通性与模型列表检查。*/
export async function syncAdminAiModelsWithKey(config: { baseUrl: string; apiKey: string }) {
  return fetchAdminAiModels(config.baseUrl, config.apiKey);
}
