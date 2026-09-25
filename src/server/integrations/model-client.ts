import { DEFAULT_RUN_MODEL, getRunModel } from "@/lib/run-models";

/**
 * 统一的模型调用客户端。
 *
 * 平台模型池与用户自带 Key（BYOK）都通过这里发起请求，保证超时、
 * 网关错误回退、输出截断和日志脱敏的行为一致。
 */

export const MODEL_TIMEOUT_MS = 60_000;
export const MAX_MODEL_OUTPUT = 60_000;
const GATEWAY_RETRY_STATUSES = [502, 503, 504, 524];

export type ModelTarget = {
  baseUrl: string;
  apiKey: string;
  /** 网关实际识别的模型 ID。 */
  upstream: string;
  /** ANS 侧稳定标识，用于日志和账单展示。 */
  label: string;
};

export class ModelClientError extends Error {
  constructor(
    message: string,
    public readonly code = "MODEL_ERROR",
  ) {
    super(message);
    this.name = "ModelClientError";
  }
}

export function platformModelConfigured(): boolean {
  return Boolean(process.env.RUN_BASE_URL?.trim() && process.env.RUN_API_KEY?.trim());
}

export function resolvePlatformModel(modelKey?: string | null): ModelTarget {
  const key = modelKey?.trim() || DEFAULT_RUN_MODEL;
  const model = getRunModel(key);
  if (!model) throw new ModelClientError("该模型暂未开放，可选择白名单内的模型", "MODEL_UNAVAILABLE");
  const baseUrl = process.env.RUN_BASE_URL?.trim() || "";
  const apiKey = process.env.RUN_API_KEY?.trim() || "";
  if (!baseUrl || !apiKey) {
    throw new ModelClientError("模型运行服务未配置，请稍后再试", "MODEL_NOT_CONFIGURED");
  }
  return { baseUrl, apiKey, upstream: model.upstream, label: model.key };
}

function chatCompletionsUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = `${path.endsWith("/v1") ? path : `${path}/v1`}/chat/completions`;
  return url.toString();
}

function parseStreamOutput(raw: string): string {
  let output = "";
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
      if (typeof delta === "string") output += delta;
    } catch {
      // 忽略心跳或损坏的 SSE 帧；后续合法帧仍可补全结果。
    }
  }
  return output;
}

const SYSTEM_PROMPT = "你是一个可靠的 AI 助手，按任务要求完成工作，直接输出结果，不要解释过程。";

async function post(target: ModelTarget, prompt: string, stream: boolean, timeoutMs: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    return await fetch(chatCompletionsUrl(target.baseUrl), {
      method: "POST",
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
      headers: { Authorization: `Bearer ${target.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: target.upstream,
        stream,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

/**
 * 调用一次对话补全并返回纯文本。
 *
 * 网关对非流式请求返回 502/503/504/524 时，会用流式请求重试一次，
 * 因为平台网关在超时场景下流式通道仍然健康。
 */
export async function callModelText(args: {
  target: ModelTarget;
  prompt: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const timeoutMs = args.timeoutMs ?? MODEL_TIMEOUT_MS;
  let response: Response;
  try {
    response = await post(args.target, args.prompt, false, timeoutMs, args.signal);
  } catch {
    throw new ModelClientError("模型响应超时或网络不可用", "MODEL_TIMEOUT");
  }

  if (response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ModelClientError("模型返回内容无法解析", "MODEL_BAD_RESPONSE");
    }
    const content = (payload as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new ModelClientError("模型返回内容为空", "MODEL_EMPTY_OUTPUT");
    }
    return content.length > MAX_MODEL_OUTPUT ? content.slice(0, MAX_MODEL_OUTPUT) : content;
  }

  if (GATEWAY_RETRY_STATUSES.includes(response.status)) {
    try {
      const fallback = await post(args.target, args.prompt, true, timeoutMs, args.signal);
      if (fallback.ok) {
        const streamed = parseStreamOutput(await fallback.text());
        if (streamed) return streamed.length > MAX_MODEL_OUTPUT ? streamed.slice(0, MAX_MODEL_OUTPUT) : streamed;
      }
    } catch {
      // 保留原始网关错误，交由调用方决定退费或重试。
    }
  }

  throw new ModelClientError(`模型服务返回 ${response.status}`, "MODEL_UPSTREAM_ERROR");
}
