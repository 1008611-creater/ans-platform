import { DEFAULT_RUN_MODEL, getRunModel, type RunReasoningEffort } from "@/lib/run-models";

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

export type ModelTokenUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type ModelTextResult = { text: string; usage: ModelTokenUsage | null };

function tokenCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parseUsage(value: unknown): ModelTokenUsage | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const usage = {
    inputTokens: tokenCount(raw.prompt_tokens ?? raw.input_tokens),
    outputTokens: tokenCount(raw.completion_tokens ?? raw.output_tokens),
    totalTokens: tokenCount(raw.total_tokens),
  };
  return Object.values(usage).some((count) => count !== null) ? usage : null;
}

function parseStreamOutput(raw: string): ModelTextResult {
  let text = "";
  let usage: ModelTokenUsage | null = null;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const payload = JSON.parse(data) as {
        choices?: { delta?: { content?: unknown } }[];
        usage?: unknown;
      };
      const delta = payload.choices?.[0]?.delta?.content;
      if (typeof delta === "string") text += delta;
      usage = parseUsage(payload.usage) ?? usage;
    } catch {
      // Ignore malformed SSE frames; later valid frames may still complete the response.
    }
  }
  return { text, usage };
}

const SYSTEM_PROMPT = "你是一个可靠的 AI 助手，按任务要求完成工作，直接输出结果，不要解释过程。";

async function post<T>(
  target: ModelTarget,
  prompt: string,
  stream: boolean,
  timeoutMs: number,
  signal: AbortSignal | undefined,
  reasoningEffort: RunReasoningEffort | undefined,
  consume: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(chatCompletionsUrl(target.baseUrl), {
      method: "POST",
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
      headers: { Authorization: `Bearer ${target.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: target.upstream,
        stream,
        ...(reasoningEffort && reasoningEffort !== "none" ? { reasoning_effort: reasoningEffort } : {}),
        ...(stream ? { stream_options: { include_usage: true } } : {}),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });
    return await consume(response);
  } catch (error) {
    if (error instanceof ModelClientError) throw error;
    throw new ModelClientError("模型响应超时或网络不可用", "MODEL_TIMEOUT");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

/**
 * Call chat completions and preserve token usage reported by the gateway.
 * Stream fallback requests usage in the final SSE frame when supported. Missing
 * usage stays null; it is never replaced with an estimate.
 */
export async function callModelTextWithUsage(args: {
  target: ModelTarget;
  prompt: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  reasoningEffort?: RunReasoningEffort;
}): Promise<ModelTextResult> {
  const timeoutMs = args.timeoutMs ?? MODEL_TIMEOUT_MS;
  const initial = await post(args.target, args.prompt, false, timeoutMs, args.signal, args.reasoningEffort, async (response) => {
    if (!response.ok) return { kind: "http-error" as const, status: response.status };
    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      if (error instanceof SyntaxError) throw new ModelClientError("模型返回内容无法解析", "MODEL_BAD_RESPONSE");
      throw error;
    }
    const body = payload as {
      choices?: { message?: { content?: unknown } }[];
      usage?: unknown;
    };
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new ModelClientError("模型返回内容为空", "MODEL_EMPTY_OUTPUT");
    }
    return {
      kind: "success" as const,
      result: {
        text: content.length > MAX_MODEL_OUTPUT ? content.slice(0, MAX_MODEL_OUTPUT) : content,
        usage: parseUsage(body.usage),
      },
    };
  });
  if (initial.kind === "success") return initial.result;

  if (GATEWAY_RETRY_STATUSES.includes(initial.status)) {
    try {
      const fallback = await post(args.target, args.prompt, true, timeoutMs, args.signal, args.reasoningEffort, async (response) => {
        if (!response.ok) return null;
        const streamed = parseStreamOutput(await response.text());
        if (!streamed.text) return null;
        return {
          text: streamed.text.length > MAX_MODEL_OUTPUT ? streamed.text.slice(0, MAX_MODEL_OUTPUT) : streamed.text,
          usage: streamed.usage,
        };
      });
      if (fallback) return fallback;
    } catch {
      // Preserve the original gateway error for the caller to handle.
    }
  }

  throw new ModelClientError(`模型服务返回 ${initial.status}`, "MODEL_UPSTREAM_ERROR");
}

/** Keep the text-only helper for existing integrations. */
export async function callModelText(args: {
  target: ModelTarget;
  prompt: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  reasoningEffort?: RunReasoningEffort;
}): Promise<string> {
  return (await callModelTextWithUsage(args)).text;
}
